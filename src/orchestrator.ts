import { Boid, type Band } from './boid';
import { type FrequencyData } from './orchestra';
import { Vector2 } from './vector';

export class Orchestrator {
  private separationStrength = 0.5;
  private maxSeparationDistance = 150;

  /**
   * Apply zone-based behaviors to boids based on audio frequency data
   * - Different frequency bands repel each other
   * - Boids of the same band are not affected by zone separation
   */
  public update(boids: Boid[], frequencyData: FrequencyData | null): void {
    if (!frequencyData) {
      return;
    }

    // Group boids by band
    const boidsByBand = this.groupBoidsByBand(boids);

    // Apply zone-based separation and attraction
    for (const boid of boids) {
      // Get separation force from other bands (repulsion)
      const separationForce = this.getZoneSeparation(boid, boidsByBand);

      // Apply force to boid
      if (separationForce.length() > 0) {
        boid.velocity.add(separationForce.multiply(this.separationStrength));
      }
    }
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