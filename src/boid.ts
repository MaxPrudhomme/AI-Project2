import { Vector2 } from './vector';
import { config } from './config';

export type Band = 'low' | 'mid' | 'high';

export class Boid {
    public position: Vector2;
    public velocity: Vector2;
    public acceleration: Vector2;
    public band: Band;
    private wanderSeed: number;

    constructor(x: number, y: number, band: Band) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        );
        this.acceleration = new Vector2(0, 0);
        this.band = band;
        this.wanderSeed = Math.random() * Math.PI * 2;
    }

    public distanceTo(other: Boid): number {
        return Math.sqrt((this.position.x - other.position.x) ** 2 + (this.position.y - other.position.y) ** 2);
    }

    private getSeparation(boids: Boid[]): Vector2 {
        const steer = new Vector2(0, 0);
        let count = 0;
    
        for (const other of boids) {
            const d = this.distanceTo(other);
            if (d > 0 && d < config.separationDistance) {
                const diff = this.position.clone().subtract(other.position).normalize().multiply(1 / d);
                steer.add(diff);
                count++;
            }
        }
        if (count > 0) {
            steer.multiply(1 / count);
        }
        return steer;
    }
    
    private getCohesion(boids: Boid[]): Vector2 {
        const sum = new Vector2(0, 0);
        let count = 0;
    
        for (const other of boids) {
            const d = this.distanceTo(other);
            if (d > 0 && d < config.neighborhoodDistance) {
                sum.add(other.position);
                count++;
            }
        }
    
        if (count > 0) {
            sum.multiply(1 / count);
            return sum.subtract(this.position).normalize();
        }
        return new Vector2(0, 0);
    }
    
    private getAlignment(boids: Boid[]): Vector2 {
        const avgVel = new Vector2(0, 0);
        let count = 0;
    
        for (const other of boids) {
            const d = this.distanceTo(other);
            if (d > 0 && d < config.neighborhoodDistance) {
                avgVel.add(other.velocity);
                count++;
            }
        }
    
        if (count > 0) {
            avgVel.multiply(1 / count);
            return avgVel.subtract(this.velocity).normalize();
        }
        return new Vector2(0, 0);
    }

    private getNeighbors(boids: Boid[]): Boid[] {
        return boids.filter(boid => boid.distanceTo(this) < config.neighborhoodDistance);
    }

    private getWander(): Vector2 {
        const wanderStrength = 0.015;
        const time = Date.now() * 0.0005;
        const angle = Math.sin(time + this.wanderSeed) * Math.PI;
        return new Vector2(
            Math.cos(angle) * wanderStrength,
            Math.sin(angle) * wanderStrength
        );
    }

    public update(boids: Boid[], canvasWidth: number, canvasHeight: number) {
        let neighbors = this.getNeighbors(boids);

        const sep = this.getSeparation(neighbors);
        const coh = this.getCohesion(neighbors);
        const ali = this.getAlignment(neighbors);
        const wander = this.getWander();

        const sepForce = sep.length() > 0 ? sep.normalize().multiply(config.separationWeight * 0.1) : new Vector2(0, 0);
        const cohForce = coh.length() > 0 ? coh.normalize().multiply(config.cohesionWeight * 0.1) : new Vector2(0, 0);
        const aliForce = ali.length() > 0 ? ali.normalize().multiply(config.alignmentWeight * 0.1) : new Vector2(0, 0);

        this.velocity.add(sepForce);
        this.velocity.add(cohForce);
        this.velocity.add(aliForce);
        this.velocity.add(wander);

        this.velocity.multiply(0.99);

        const speed = this.velocity.length();
        if (speed > config.maxSpeed) {
            this.velocity.normalize().multiply(config.maxSpeed);
        } else if (speed > 0 && speed < config.minVelocity) {
            this.velocity.normalize().multiply(config.minVelocity);
        }

        this.position.add(this.velocity);

        let wrapped = false;
        if (this.position.x < 0) {
            this.position.x = canvasWidth;
            wrapped = true;
        } else if (this.position.x > canvasWidth) {
            this.position.x = 0;
            wrapped = true;
        }
        if (this.position.y < 0) {
            this.position.y = canvasHeight;
            wrapped = true;
        } else if (this.position.y > canvasHeight) {
            this.position.y = 0;
            wrapped = true;
        }

        if (wrapped) {
            this.velocity.add(new Vector2(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            ));
        }
    }
}

export function getBandColor(band: Band): string {
    switch (band) {
        case 'low':
            return '#d43c2a';
        case 'mid':
            return '#ffd23c';
        case 'high':
            return '#3c9fff';
        default:
            return '#ffffff';
    }
}

export function createBoids(num: number): Boid[] {
    let boids: Boid[] = [];

    for (let i = 0; i < num; i++) {
        boids.push(new Boid(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 'low'));
        boids.push(new Boid(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 'mid'));
        boids.push(new Boid(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 'high'));
    }

    return boids;
}