import './style.css'
import { initCanvas, renderBoid } from './renderer';
import { Boid, createBoids, getBandColor } from './boid';

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
      renderBoid(ctx, boid.getX(), boid.getY(), color);
  }
}

let boids: Boid[] = createBoids(100);

function animate() {
    render();
    requestAnimationFrame(animate);
}

animate();