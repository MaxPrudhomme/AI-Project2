import './style.css'
import { initCanvas, renderBoid, renderZones } from './renderer';
import { Boid, createBoids, getBandColor } from './boid';
import { config } from './config';
import { Orchestra } from './orchestra';
import { Orchestrator } from './orchestrator';

const { canvas, ctx } = initCanvas();
const orchestra = new Orchestra();
const orchestrator = new Orchestrator();

let boids: Boid[] = createBoids(config.quantity);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
});

function render(isPlaying: boolean) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw zone indicators when music is playing
  renderZones(ctx, canvas.width, canvas.height, isPlaying);

  for (const boid of boids) {
      const color = getBandColor(boid.band);
      renderBoid(ctx, boid.position.x, boid.position.y, color);
  }
}

function animate() {
    const isPlaying = orchestra.isPlaying();
    render(isPlaying);
    
    // Process audio and get frequency data
    const frequencyData = isPlaying ? orchestra.processAudio() : null;
    
    // Update orchestrator with frequency data (zone-based separation and attraction)
    orchestrator.update(boids, frequencyData, canvas.width, canvas.height);
    
    // Update all boids
    for (const boid of boids) {
        boid.update(boids, canvas.width, canvas.height);
    }
    
    requestAnimationFrame(animate);
}

// UI Event Handlers
const fileInput = document.getElementById('audio-file') as HTMLInputElement;
const fileLabel = document.getElementById('file-input-label') as HTMLElement;
const audioFilename = document.getElementById('audio-filename') as HTMLElement;
const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;

// File upload handling
fileInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
        try {
            await orchestra.loadAudio(file);
            audioFilename.textContent = file.name;
            playBtn.disabled = false;
            console.log('Audio loaded:', file.name);
        } catch (error) {
            console.error('Failed to load audio:', error);
            audioFilename.textContent = 'Error loading file';
        }
    }
});

// Drag and drop handling
fileLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileLabel.classList.add('dragover');
});

fileLabel.addEventListener('dragleave', () => {
    fileLabel.classList.remove('dragover');
});

fileLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    fileLabel.classList.remove('dragover');
    
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('audio/')) {
        orchestra.loadAudio(file).then(() => {
            audioFilename.textContent = file.name;
            playBtn.disabled = false;
            console.log('Audio loaded via drag:', file.name);
        }).catch((error) => {
            console.error('Failed to load audio:', error);
            audioFilename.textContent = 'Error loading file';
        });
    }
});

// Playback controls
playBtn.addEventListener('click', () => {
    orchestra.play();
    playBtn.disabled = true;
    pauseBtn.disabled = false;
});

pauseBtn.addEventListener('click', () => {
    orchestra.stop();
    playBtn.disabled = false;
    pauseBtn.disabled = true;
});

animate();