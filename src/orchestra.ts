import { Vector2 } from './vector';

export interface FrequencyData {
  zones: {
    low: SubBandData;
    mid: SubBandData;
    high: SubBandData;
  };
  amplitude: number;
  beat: boolean;
}

export interface SubBandData {
  energies: number[]; // 5 sub-bands per zone
  dominantBandIndex: number;
  averageEnergy: number;
  target: Vector2; // x: horizontal (weighted by sub-band), y: vertical (by amplitude)
}

export class Orchestra {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private audioBuffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private frequencyData: Uint8Array;
  
  // Smoothing and temporal data
  private smoothedSubBands: number[] = new Array(15).fill(0);
  private smoothFactor = 0.1;
  private beatThreshold = 1.5;
  private previousAmplitude = 0;
  
  // Processing parameters
  private readonly FFT_SIZE = 2048;
  private readonly ZONES = 3;
  private readonly SUBBANDS = 5;
  private readonly NYQUIST_HZ = 22050; // Standard Nyquist frequency
  
  // Frequency zone boundaries (Hz)
  private readonly ZONE_BOUNDARIES = [
    { name: 'low', min: 20, max: 250 },
    { name: 'mid', min: 250, max: 2000 },
    { name: 'high', min: 2000, max: 8000 }
  ];

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.FFT_SIZE;
    this.analyser.connect(this.audioContext.destination);
    
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  /**
   * Load audio file and prepare for playback
   */
  public async loadAudio(file: File | string): Promise<void> {
    try {
      let arrayBuffer: ArrayBuffer;
      
      if (file instanceof File) {
        arrayBuffer = await file.arrayBuffer();
      } else {
        // Assume it's a URL/path
        const response = await fetch(file);
        arrayBuffer = await response.arrayBuffer();
      }
      
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Failed to load audio:', error);
      throw error;
    }
  }

  /**
   * Start playing loaded audio
   */
  public play(): void {
    if (!this.audioBuffer) {
      console.error('No audio loaded');
      return;
    }
    
    // Stop current playback if any
    if (this.source) {
      this.source.stop();
    }
    
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.source.start(0);
  }

  /**
   * Stop audio playback
   */
  public stop(): void {
    if (this.source) {
      this.source.stop();
      this.source = null;
    }
  }

  /**
   * Process audio data and return frequency analysis
   * Called once per animation frame (typically ~60Hz)
   */
  public processAudio(): FrequencyData {
    this.analyser.getByteFrequencyData(new Uint8Array(this.frequencyData));
    
    // Extract sub-band energies for each zone
    const subBandEnergies = this.extractSubBands();
    
    // Apply temporal smoothing
    this.smoothFrequencyData(subBandEnergies);
    
    // Compute zone-level metrics
    const zoneData = this.computeZoneData();
    
    // Detect beats (amplitude spike detection)
    const beat = this.detectBeat(zoneData.totalAmplitude);
    this.previousAmplitude = zoneData.totalAmplitude;
    
    return {
      zones: zoneData.zones,
      amplitude: zoneData.totalAmplitude,
      beat
    };
  }

  /**
   * Extract frequency data and split into 3 zones × 5 sub-bands
   */
  private extractSubBands(): number[] {
    const subBands = new Array(15).fill(0);
    const binCount = this.frequencyData.length;
    
    for (let zoneIdx = 0; zoneIdx < this.ZONES; zoneIdx++) {
      const zone = this.ZONE_BOUNDARIES[zoneIdx];
      
      // Convert Hz to bin indices
      const minBin = Math.floor((zone.min / this.NYQUIST_HZ) * binCount);
      const maxBin = Math.floor((zone.max / this.NYQUIST_HZ) * binCount);
      
      const zoneBinRange = maxBin - minBin;
      const subBandSize = Math.ceil(zoneBinRange / this.SUBBANDS);
      
      // Extract energy for each sub-band
      for (let subIdx = 0; subIdx < this.SUBBANDS; subIdx++) {
        const binStart = minBin + subIdx * subBandSize;
        const binEnd = Math.min(binStart + subBandSize, maxBin);
        
        let energy = 0;
        for (let bin = binStart; bin < binEnd; bin++) {
          if (bin < binCount) {
            energy += this.frequencyData[bin];
          }
        }
        
        // Normalize by sub-band width
        energy = (energy / (binEnd - binStart)) / 255;
        subBands[zoneIdx * this.SUBBANDS + subIdx] = energy;
      }
    }
    
    return subBands;
  }

  /**
   * Apply exponential moving average smoothing
   */
  private smoothFrequencyData(rawSubBands: number[]): void {
    for (let i = 0; i < rawSubBands.length; i++) {
      this.smoothedSubBands[i] = 
        this.smoothedSubBands[i] * (1 - this.smoothFactor) +
        rawSubBands[i] * this.smoothFactor;
    }
  }

  /**
   * Compute zone-level data (dominant band, average energy, targets)
   */
  private computeZoneData(): {
    zones: FrequencyData['zones'];
    totalAmplitude: number;
  } {
    const zones: FrequencyData['zones'] = {
      low: this.createSubBandData(0),
      mid: this.createSubBandData(1),
      high: this.createSubBandData(2)
    };
    
    // Compute average amplitude across all zones
    const totalAmplitude = (
      zones.low.averageEnergy +
      zones.mid.averageEnergy +
      zones.high.averageEnergy
    ) / 3;
    
    return { zones, totalAmplitude };
  }

  /**
   * Create sub-band data for a specific zone
   */
  private createSubBandData(zoneIdx: number): SubBandData {
    const startIdx = zoneIdx * this.SUBBANDS;
    const energies = this.smoothedSubBands.slice(startIdx, startIdx + this.SUBBANDS);
    
    // Find dominant (highest energy) sub-band
    let maxEnergy = 0;
    let dominantBandIndex = 0;
    for (let i = 0; i < energies.length; i++) {
      if (energies[i] > maxEnergy) {
        maxEnergy = energies[i];
        dominantBandIndex = i;
      }
    }
    
    // Compute average energy
    const averageEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
    
    // Compute weighted horizontal target (x: 0-1 based on dominant band position)
    const horizontalTarget = (dominantBandIndex + 0.5) / this.SUBBANDS;
    
    // Compute vertical target (y: amplitude-driven)
    const verticalTarget = averageEnergy;
    
    return {
      energies,
      dominantBandIndex,
      averageEnergy,
      target: new Vector2(horizontalTarget, verticalTarget)
    };
  }

  /**
   * Simple beat detection based on amplitude spike
   */
  private detectBeat(currentAmplitude: number): boolean {
    const amplitudeIncrease = currentAmplitude / (this.previousAmplitude + 0.001);
    return amplitudeIncrease > this.beatThreshold && currentAmplitude > 0.1;
  }

  /**
   * Get current playback time in seconds
   */
  public getCurrentTime(): number {
    if (this.source && this.audioBuffer) {
      return this.audioContext.currentTime;
    }
    return 0;
  }

  /**
   * Get audio buffer duration in seconds
   */
  public getDuration(): number {
    return this.audioBuffer?.duration || 0;
  }

  /**
   * Check if audio is currently playing
   */
  public isPlaying(): boolean {
    return this.source !== null;
  }
}

