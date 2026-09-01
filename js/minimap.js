/* ================================================================
   MINIMAP RENDERER
================================================================ */
function drawMinimap(canvasRef, camera, interactables) {
    if (!canvasRef.current) return;
    const c   = canvasRef.current;
    const ctx = c.getContext('2d');
    const W   = c.width, H = c.height;
    const S   = W / 50; // 1 unit = S px, map spans ±25 units

    ctx.clearRect(0, 0, W, H);

    // rooms outline
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth   = 0.8;

    const rooms = [
        [-5, 3, 10, 21],      // entrance hall
        [-2, -15, 4, 18],     // corridor
        [-20, -15, 18, 30],   // left wing
        [2, -12.5, 18, 12.5], // right wing
    ];
    rooms.forEach(([rx, rz, rw, rh]) => {
        const px = (rx + 25) * S;
        const py = H - (rz + 25 + rh) * S;
        ctx.strokeRect(px, py, rw * S, rh * S);
    });

    // player dot
    const px = (camera.position.x + 25) * S;
    const pz = H - (camera.position.z + 25) * S;
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-camera.rotation.y);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, -5); ctx.lineTo(3, 4); ctx.lineTo(-3, 4);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // suspect dots
    interactables
        .filter(i => i.userData.type === 'chat')
        .forEach(i => {
            const sx = (i.position.x + 25) * S;
            const sz = H - (i.position.z + 25) * S;
            ctx.fillStyle = '#ff6666';
            ctx.beginPath(); ctx.arc(sx, sz, 3, 0, Math.PI * 2); ctx.fill();
        });
}
