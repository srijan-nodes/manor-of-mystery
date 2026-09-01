function makeWoodTexture(tileSize = 256) {
    const c = document.createElement('canvas');
    c.width = c.height = tileSize;
    const ctx = c.getContext('2d');
    // Rich dark mahogany base
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(0, 0, tileSize, tileSize);
    // Plank lines with subtle color variation
    const plankH = 32;
    for (let y = 0; y < tileSize; y += plankH) {
        const shade = 0.85 + Math.random() * 0.15;
        ctx.fillStyle = `rgb(${Math.floor(42*shade)},${Math.floor(26*shade)},${Math.floor(14*shade)})`;
        ctx.fillRect(0, y, tileSize, plankH - 1);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, y + plankH - 1, tileSize, 1);
    }
    // Wood grain
    for (let i = 0; i < 200; i++) {
        ctx.strokeStyle = `rgba(${60 + Math.random()*60},${30 + Math.random()*30},${5 + Math.random()*15},${0.06 + Math.random()*0.08})`;
        ctx.lineWidth = 0.5 + Math.random();
        ctx.beginPath();
        const x0 = Math.random() * tileSize;
        ctx.moveTo(x0, 0); ctx.lineTo(x0 + (Math.random()-0.5)*30, tileSize);
        ctx.stroke();
    }
    // Subtle knots
    for (let i = 0; i < 3; i++) {
        const kx = Math.random() * tileSize, ky = Math.random() * tileSize;
        const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, 5 + Math.random()*5);
        grad.addColorStop(0, 'rgba(20,10,2,0.5)');
        grad.addColorStop(1, 'rgba(20,10,2,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(kx, ky, 8, 0, Math.PI * 2); ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    return t;
}

function makeStoneTexture(tileSize = 256) {
    const c = document.createElement('canvas');
    c.width = c.height = tileSize;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1e1e22';
    ctx.fillRect(0, 0, tileSize, tileSize);
    // Stone block pattern
    const blockH = 32, blockW = 64;
    for (let row = 0; row < tileSize / blockH; row++) {
        const offset = (row % 2) * (blockW / 2);
        for (let col = -1; col < tileSize / blockW + 1; col++) {
            const bx = col * blockW + offset, by = row * blockH;
            const shade = 0.8 + Math.random() * 0.2;
            ctx.fillStyle = `rgb(${Math.floor(30*shade)},${Math.floor(30*shade)},${Math.floor(34*shade)})`;
            ctx.fillRect(bx + 1, by + 1, blockW - 2, blockH - 2);
        }
        // Mortar lines
        ctx.fillStyle = 'rgba(10,10,12,0.8)';
        ctx.fillRect(0, row * blockH, tileSize, 1);
    }
    // Surface noise
    for (let i = 0; i < 400; i++) {
        const x = Math.random() * tileSize, y = Math.random() * tileSize;
        const r = 0.5 + Math.random() * 2;
        ctx.fillStyle = `rgba(${50 + Math.random()*40},${50 + Math.random()*40},${55 + Math.random()*40},0.2)`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
    return t;
}

function makeWallTexture(tileSize = 256) {
    const c = document.createElement('canvas');
    c.width = c.height = tileSize;
    const ctx = c.getContext('2d');
    // Dark plaster base
    ctx.fillStyle = '#1c1c20';
    ctx.fillRect(0, 0, tileSize, tileSize);
    // Subtle plaster variation
    for (let i = 0; i < 600; i++) {
        const x = Math.random() * tileSize, y = Math.random() * tileSize;
        const r = 1 + Math.random() * 4;
        const v = 25 + Math.random() * 15;
        ctx.fillStyle = `rgba(${v},${v},${v+5},0.15)`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // Faint cracks
    for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = `rgba(15,15,18,${0.3 + Math.random()*0.3})`;
        ctx.lineWidth = 0.5 + Math.random() * 0.5;
        ctx.beginPath();
        let cx = Math.random() * tileSize, cy = Math.random() * tileSize;
        ctx.moveTo(cx, cy);
        for (let s = 0; s < 4 + Math.random() * 4; s++) {
            cx += (Math.random() - 0.5) * 40;
            cy += Math.random() * 30;
            ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }
    // Wainscoting line (lower third)
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, Math.floor(tileSize * 0.65), tileSize, 2);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 2);
    return t;
}
