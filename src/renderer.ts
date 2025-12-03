export function initCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    return { canvas, ctx };
}

export function renderBoid(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, radius: number = 5) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}

export function renderZones(ctx: CanvasRenderingContext2D, width: number, height: number, isPlaying: boolean) {
    if (!isPlaying) return;
    
    const zoneWidth = width / 3;
    
    // Zone colors with transparency
    const zoneColors = [
        'rgba(212, 60, 42, 0.08)',   // Low - red
        'rgba(255, 210, 60, 0.08)',  // Mid - yellow
        'rgba(60, 159, 255, 0.08)'   // High - blue
    ];
    
    const borderColors = [
        'rgba(212, 60, 42, 0.3)',    // Low - red
        'rgba(255, 210, 60, 0.3)',   // Mid - yellow
        'rgba(60, 159, 255, 0.3)'    // High - blue
    ];
    
    // Draw zone backgrounds
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = zoneColors[i];
        ctx.fillRect(i * zoneWidth, 0, zoneWidth, height);
    }
    
    // Draw zone dividers
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    
    // First divider (between low and mid)
    ctx.strokeStyle = borderColors[0];
    ctx.beginPath();
    ctx.moveTo(zoneWidth, 0);
    ctx.lineTo(zoneWidth, height);
    ctx.stroke();
    
    // Second divider (between mid and high)
    ctx.strokeStyle = borderColors[2];
    ctx.beginPath();
    ctx.moveTo(zoneWidth * 2, 0);
    ctx.lineTo(zoneWidth * 2, height);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Draw zone labels
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.4;
    
    ctx.fillStyle = '#d43c2a';
    ctx.fillText('LOW', zoneWidth / 2, 30);
    
    ctx.fillStyle = '#ffd23c';
    ctx.fillText('MID', zoneWidth * 1.5, 30);
    
    ctx.fillStyle = '#3c9fff';
    ctx.fillText('HIGH', zoneWidth * 2.5, 30);
    
    ctx.globalAlpha = 1;
}