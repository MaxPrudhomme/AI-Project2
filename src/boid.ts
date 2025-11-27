export type Band = 'low' | 'mid' | 'high';

export class Boid {
    private x: number;
    private y: number;
    public band: Band;  

    constructor(x: number, y: number, band: Band) {
        this.x = x;
        this.y = y;
        this.band = band;
    }

    public getX(): number {
        return this.x;
    }

    public getY(): number {
        return this.y;
    }

    public distanceTo(other: Boid): number {
        return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
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