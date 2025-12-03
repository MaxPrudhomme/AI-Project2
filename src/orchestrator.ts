import { Boid, type Band } from './boid';
import { type FrequencyData } from './orchestra';
import { Vector2 } from './vector';

export class Orchestrator {
  private separationStrength = 0.5;
  private maxSeparationDistance = 150;
  
  // Zone attraction parameters (when music plays)
  private zoneAttractionStrength = 0.35;
  private rushBackBoost = 2.0; // Speed boost when outside zone
  
  // Chaos repulsion parameters (when music stops)
  private chaosRepulsionStrength = 1.5;
  private chaosRepulsionDistance = 200;
  
  // Track if music was playing last frame (to detect stop moment)
  private wasPlaying = false;
  private chaosFramesRemaining = 0;
  private chaosDuration = 60; // frames of chaos burst when music stops
  
  // Zone boundaries as fractions of screen width (0-1)
  private readonly zoneBoundaries: Record<Band, { min: number; max: number }> = {
    low: { min: 0, max: 0.33 },    // Left third
    mid: { min: 0.33, max: 0.66 }, // Center third
    high: { min: 0.66, max: 1.0 }  // Right third
  };

  /**
   * Apply zone-based behaviors to boids based on audio frequency data
   * - Music playing: boids attracted to their zones
   * - Music stops: chaos burst - all different colors repel strongly
   */
  public update(boids: Boid[], frequencyData: FrequencyData | null, canvasWidth: number, _canvasHeight: number): void {
    const isPlaying = frequencyData !== null;
    
    // Detect when music stops - trigger chaos burst
    if (this.wasPlaying && !isPlaying) {
      this.chaosFramesRemaining = this.chaosDuration;
    }
    this.wasPlaying = isPlaying;
    
    // Group boids by band
    const boidsByBand = this.groupBoidsByBand(boids);
    
    // Apply chaos repulsion when music stops
    if (this.chaosFramesRemaining > 0) {
      this.chaosFramesRemaining--;
      const chaosIntensity = this.chaosFramesRemaining / this.chaosDuration;
      
      for (const boid of boids) {
        const chaosForce = this.getChaosRepulsion(boid, boidsByBand, chaosIntensity);
        if (chaosForce.length() > 0) {
          boid.velocity.add(chaosForce);
        }
      }
    }
    
    // Only apply zone attraction when music is playing
    if (!isPlaying) {
      return; // No music = boids wander freely (with chaos burst if just stopped)
    }

    // Apply zone-based attraction
    for (const boid of boids) {
      // Apply zone attraction (pulls boids toward their zone)
      const zoneAttractionForce = this.getZoneAttraction(boid, canvasWidth);
      if (zoneAttractionForce.length() > 0) {
        boid.velocity.add(zoneAttractionForce);
      }

      // Get separation force from other bands (repulsion)
      const separationForce = this.getZoneSeparation(boid, boidsByBand);
      if (separationForce.length() > 0) {
        boid.velocity.add(separationForce.multiply(this.separationStrength));
      }
    }
  }
  
  /**
   * Strong repulsion from different colored boids when music stops
   * Creates a "scatter" effect
   */
  private getChaosRepulsion(boid: Boid, boidsByBand: Map<Band, Boid[]>, intensity: number): Vector2 {
    const steer = new Vector2(0, 0);
    let count = 0;
    
    const otherBands = this.getOtherBands(boid.band);
    
    for (const band of otherBands) {
      const boidGroup = boidsByBand.get(band)!;
      
      for (const other of boidGroup) {
        const distance = boid.distanceTo(other);
        
        if (distance > 0 && distance < this.chaosRepulsionDistance) {
          const diff = boid.position
            .clone()
            .subtract(other.position)
            .normalize()
            .multiply(1 / (distance + 0.001));
          
          steer.add(diff);
          count++;
        }
      }
    }
    
    if (count > 0) {
      steer.multiply(1 / count);
      steer.normalize();
      steer.multiply(this.chaosRepulsionStrength * intensity);
    }
    
    return steer;
  }

  /**
   * Calculate attraction force toward the boid's designated zone
   * Force is stronger when boid is farther from its zone (rush back effect)
   */
  private getZoneAttraction(boid: Boid, canvasWidth: number): Vector2 {
    const zone = this.zoneBoundaries[boid.band];
    const zoneMinX = zone.min * canvasWidth;
    const zoneMaxX = zone.max * canvasWidth;
    const zoneCenterX = (zoneMinX + zoneMaxX) / 2;
    
    const boidX = boid.position.x;
    const force = new Vector2(0, 0);
    
    // Check if boid is outside its zone
    if (boidX < zoneMinX) {
      // Boid is to the left of its zone, pull right
      const distanceToZone = zoneMinX - boidX;
      const normalizedDistance = distanceToZone / canvasWidth;
      // Stronger force when farther away (rush back effect)
      const rushMultiplier = 1 + normalizedDistance * this.rushBackBoost * 5;
      force.x = normalizedDistance * this.zoneAttractionStrength * rushMultiplier;
    } else if (boidX > zoneMaxX) {
      // Boid is to the right of its zone, pull left
      const distanceToZone = boidX - zoneMaxX;
      const normalizedDistance = distanceToZone / canvasWidth;
      // Stronger force when farther away (rush back effect)
      const rushMultiplier = 1 + normalizedDistance * this.rushBackBoost * 5;
      force.x = -normalizedDistance * this.zoneAttractionStrength * rushMultiplier;
    } else {
      // Boid is inside its zone - apply gentle centering force toward zone center
      const distanceToCenter = zoneCenterX - boidX;
      const normalizedDistance = distanceToCenter / canvasWidth;
      force.x = normalizedDistance * this.zoneAttractionStrength * 0.5;
    }
    
    return force;
  }

  /**
   * Group boids by their frequency band
   */
  private groupBoidsByBand(boids: Boid[]): Map<Band, Boid[]> {
    const grouped = new Map<Band, Boid[]>();
    grouped.set('low', []);
    grouped.set('mid', []);
    grouped.set('high', []);

    for (const boid of boids) {
      grouped.get(boid.band)!.push(boid);
    }

    return grouped;
  }

  /**
   * Calculate separation force from other frequency bands
   * Boids repel each other if they're in different bands
   */
  private getZoneSeparation(
    boid: Boid,
    boidsByBand: Map<Band, Boid[]>
  ): Vector2 {
    const steer = new Vector2(0, 0);
    let count = 0;

    // Get the other two bands
    const otherBands = this.getOtherBands(boid.band);

    for (const band of otherBands) {
      const boidGroup = boidsByBand.get(band)!;

      for (const other of boidGroup) {
        const distance = boid.distanceTo(other);

        // Only apply separation if within range
        if (distance > 0 && distance < this.maxSeparationDistance) {
          // Repulsion force: push away from other boid
          const diff = boid.position
            .clone()
            .subtract(other.position)
            .normalize()
            .multiply(1 / (distance + 0.001)); // Stronger repulsion when closer

          steer.add(diff);
          count++;
        }
      }
    }

    if (count > 0) {
      steer.multiply(1 / count);
      steer.normalize();
    }

    return steer;
  }

  /**
   * Get the two other frequency bands
   */
  private getOtherBands(currentBand: Band): Band[] {
    switch (currentBand) {
      case 'low':
        return ['mid', 'high'];
      case 'mid':
        return ['low', 'high'];
      case 'high':
        return ['low', 'mid'];
      default:
        return [];
    }
  }
}