import './style.css'
import { initCanvas, renderBoid, renderPath } from './renderer';
import { Boid, createBoids } from './boid';
import { config } from './config';
import { Vector2 } from './vector';

const { canvas, ctx } = initCanvas();

let boids: Boid[] = createBoids(config.quantity);

// Mouse path tracking
let isDrawing = false;
let mousePath: Vector2[] = [];
const pathRepulsionStrength = 2.0;
const pathRepulsionDistance = 100;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
});

// Mouse event handlers
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left click
        isDrawing = true;
        mousePath = [];
        const rect = canvas.getBoundingClientRect();
        mousePath.push(new Vector2(e.clientX - rect.left, e.clientY - rect.top));
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        const rect = canvas.getBoundingClientRect();
        const point = new Vector2(e.clientX - rect.left, e.clientY - rect.top);
        
        // Only add point if it's far enough from the last point
        if (mousePath.length === 0 || 
            mousePath[mousePath.length - 1].distanceTo(point) > 5) {
            mousePath.push(point);
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0 && isDrawing) {
        isDrawing = false;
        // Apply repulsion to boids based on the path
        applyPathRepulsion();
        // Clear path after a short delay
        setTimeout(() => {
            mousePath = [];
        }, 200);
    }
});

canvas.addEventListener('mouseleave', () => {
    if (isDrawing) {
        isDrawing = false;
        applyPathRepulsion();
        setTimeout(() => {
            mousePath = [];
        }, 200);
    }
});

function applyPathRepulsion() {
    if (mousePath.length < 2) return;
    
    for (const boid of boids) {
        // Find the closest segment of the path
        let minDistance = Infinity;
        let closestSegmentIndex = 0;
        let closestPointOnSegment = new Vector2(0, 0);
        
        for (let i = 0; i < mousePath.length - 1; i++) {
            const segmentStart = mousePath[i];
            const segmentEnd = mousePath[i + 1];
            const pointOnSegment = getClosestPointOnSegment(
                boid.position,
                segmentStart,
                segmentEnd
            );
            const distance = boid.position.distanceTo(pointOnSegment);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestSegmentIndex = i;
                closestPointOnSegment = pointOnSegment;
            }
        }
        
        // Apply repulsion if boid is close enough to the path
        if (minDistance < pathRepulsionDistance) {
            const segmentStart = mousePath[closestSegmentIndex];
            const segmentEnd = mousePath[closestSegmentIndex + 1];
            const segmentDir = segmentEnd.clone().subtract(segmentStart).normalize();
            
            // Calculate which side of the path the boid is on
            const toBoid = boid.position.clone().subtract(closestPointOnSegment);
            const crossProduct = segmentDir.x * toBoid.y - segmentDir.y * toBoid.x;
            
            // Perpendicular direction (normal to the path)
            const perpendicular = new Vector2(-segmentDir.y, segmentDir.x);
            
            // Determine which side: positive cross product = one side, negative = other
            if (crossProduct < 0) {
                perpendicular.multiply(-1);
            }
            
            // Apply repulsion force
            const repulsionForce = perpendicular.clone().normalize();
            const distanceFactor = 1 - (minDistance / pathRepulsionDistance);
            repulsionForce.multiply(pathRepulsionStrength * distanceFactor);
            
            boid.velocity.add(repulsionForce);
        }
    }
}

function getClosestPointOnSegment(point: Vector2, segmentStart: Vector2, segmentEnd: Vector2): Vector2 {
    const segment = segmentEnd.clone().subtract(segmentStart);
    const toPoint = point.clone().subtract(segmentStart);
    
    const segmentLengthSq = segment.length() ** 2;
    if (segmentLengthSq === 0) return segmentStart.clone();
    
    const t = Math.max(0, Math.min(1, (toPoint.x * segment.x + toPoint.y * segment.y) / segmentLengthSq));
    
    return new Vector2(
        segmentStart.x + t * segment.x,
        segmentStart.y + t * segment.y
    );
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw path if drawing
    if (mousePath.length > 1) {
        renderPath(ctx, mousePath);
    }

    // Draw all boids in white
    for (const boid of boids) {
        renderBoid(ctx, boid.position.x, boid.position.y, '#ffffff');
    }
}

function animate() {
    render();
    
    // Apply path repulsion continuously while drawing
    if (isDrawing && mousePath.length > 1) {
        applyPathRepulsion();
    }
    
    // Update all boids
    for (const boid of boids) {
        boid.update(boids, canvas.width, canvas.height);
    }
    
    requestAnimationFrame(animate);
}

animate();