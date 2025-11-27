import './style.css'
import { initCanvas, renderBoid } from './renderer';
import { Boid, createBoids, getBandColor } from './boid';
import { config } from './config';

const { canvas, ctx } = initCanvas();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
});

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const boid of boids) {
      const color = getBandColor(boid.band);
      renderBoid(ctx, boid.position.x, boid.position.y, color);
  }
}

let boids: Boid[] = createBoids(config.quantity);

function animate() {
    render();
    for (const boid of boids) {
        boid.update(boids, canvas.width, canvas.height);
    }
    requestAnimationFrame(animate);
}

animate();