# 🎶 Music EQ Flocks
_A dynamic audio-reactive flocking visualization_

---

## Concept Summary
Boids visualize the behavior of three major frequency ranges—**Low**, **Mid**, and **High**—as living flocks that respond fluidly to music.

Each of the three vertical **zones** corresponds to a frequency range:
- **Left** → Low (20–250 Hz)
- **Center** → Mid (250–2000 Hz)
- **Right** → High (2000–8000 Hz)

Within each zone, the spectrum is further split into **5 horizontal sub‑bands**.  
The most dominant sub‑band (in energy) temporarily attracts the zone’s boids horizontally.  
Zone amplitude (average energy) drives vertical motion—louder = higher.  
All energy data is smoothed to maintain fluid, organic movement.

---

## Behavior Overview

| Layer | Rule | Effect |
|--------|------|--------|
| **Local** | Separation / Cohesion / Alignment | Flock-level fluidity and natural motion |
| **Zone-level target** | Each zone has a moving **anchor point** determined by sub-band energy and amplitude | Boids steer gently toward this anchor |
| **Sub-band priority** | Highest sub-band energy shifts horizontal anchor within zone | Boids drift horizontally toward the “winning” band |
| **Amplitude → Height** | Average energy moves the zone’s anchor vertically | Louder sounds lift boids upward |
| **Temporal Smoothing** | Exponential moving average on frequency data and target positions | Prevents jittery movement |
| **Beat / Onset (optional)** | Short-lived impulses on detected beats | Adds rhythmic bursts or tremors |

---

## Data Flow

1. **Audio Analysis**
   - Use Web Audio API `AnalyserNode`
   - Split spectrum into 3×5 = 15 sub‑bands
   - Maintain smoothed averages per sub‑band:
     ```
     smoothed[i] = lerp(smoothed[i], raw[i], 0.05)
     ```

2. **Per‑Zone Processing**
   - Compute weighted horizontal target:
     ```
     x_target = Σ(e_i * x_i) / Σ(e_i)
     ```
   - Compute vertical target:
     ```
     y_target = baseY - avg(e_i) * amplitudeRange
     ```
   - Smooth both targets (`lerp` 0.05–0.1)

3. **Render**
- Use additive blending (`ctx.globalCompositeOperation = 'lighter'`)
- Fade canvas slightly each frame for trails
- Color zones: red (Low), green (Mid), blue (High)

---

## Key Parameters

| Parameter | Typical Range | Meaning |
|------------|---------------|---------|
| `n_zones` | 3 | Low / Mid / High |
| `n_subbands` | 5 per zone | Inner frequency slices |
| `smooth_factor` | 0.05–0.1 | Strength of temporal averaging |
| `anchor_strength` | 0.1–0.3 | Pull toward zone anchor |
| `flock_size` | 200–500 boids | Visual density |
| `velocity_damp` | 0.98 | Motion smoothing |

---

## Visual Dynamics Summary

- **Calm / Balanced EQ:** all flocks merge slightly; slow motion, smooth flow.  
- **Distinct EQ separation:** zones detach more clearly; rhythmic lateral movement.  
- **Amplitude peaks:** vertical lift, brighter colors, faster motion.  
- **Beat events (optional):** bursts or pulsations through velocity impulses.

---

## Implementation Notes

**Language / Tools:** TypeScript, Vite, Canvas 2D.
