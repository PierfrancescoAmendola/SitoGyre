/**
 * Procedural "photography" for the nine placeholder sites.
 * Every painter fills the rect (x, y, w, h) on its own; callers clip.
 */

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function linear(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function radial(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function glow(ctx, x, y, r, color) {
  ctx.fillStyle = radial(ctx, x, y, r, [[0, color], [1, 'rgba(0,0,0,0)']]);
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function ridge(ctx, x, y, w, h, base, amp, freq, phase, color) {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  for (let i = 0; i <= 64; i++) {
    const px = i / 64;
    const n =
      Math.sin(px * freq + phase) * 0.55 +
      Math.sin(px * freq * 2.3 + phase * 1.7) * 0.3 +
      Math.abs(Math.sin(px * freq * 5.1 + phase)) * 0.25;
    ctx.lineTo(x + px * w, y + h * base - n * amp * h);
  }
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function mountains(ctx, x, y, w, h, rand) {
  ctx.fillStyle = linear(ctx, 0, y, 0, y + h, [[0, '#33506e'], [0.45, '#e9a866'], [0.62, '#f7d7a0'], [1, '#f4c98a']]);
  ctx.fillRect(x, y, w, h);
  glow(ctx, x + w * 0.7, y + h * 0.48, h * 0.55, 'rgba(255,214,150,0.85)');
  const layers = [
    ['#8f9fb2', 0.5, 0.14, 7],
    ['#61778a', 0.6, 0.12, 9],
    ['#3c5446', 0.72, 0.1, 11],
    ['#243829', 0.84, 0.08, 13]
  ];
  layers.forEach(([c, base, amp, f], i) => {
    ridge(ctx, x, y, w, h, base, amp, f, rand() * 6, c);
    ctx.fillStyle = linear(ctx, 0, y + h * (base - 0.05), 0, y + h * (base + 0.08), [
      [0, 'rgba(255,240,220,0)'],
      [0.5, `rgba(255,240,225,${0.3 - i * 0.05})`],
      [1, 'rgba(255,240,220,0)']
    ]);
    ctx.fillRect(x, y + h * (base - 0.05), w, h * 0.13);
  });
}

function pack(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.52, s * 0.5, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2622';
  ctx.beginPath();
  ctx.roundRect(-s * 0.3, -s * 0.36, s * 0.07, s * 0.8, s * 0.03);
  ctx.roundRect(s * 0.23, -s * 0.36, s * 0.07, s * 0.8, s * 0.03);
  ctx.fill();
  ctx.fillStyle = linear(ctx, -s * 0.3, 0, s * 0.3, 0, [[0, '#ff8a3a'], [0.55, '#f2621a'], [1, '#a83d0c']]);
  ctx.beginPath();
  ctx.roundRect(-s * 0.28, -s * 0.38, s * 0.56, s * 0.9, s * 0.14);
  ctx.fill();
  ctx.fillStyle = linear(ctx, 0, -s * 0.5, 0, -s * 0.2, [[0, '#ff9b52'], [1, '#d4531a']]);
  ctx.beginPath();
  ctx.roundRect(-s * 0.27, -s * 0.5, s * 0.54, s * 0.24, [s * 0.16, s * 0.16, s * 0.05, s * 0.05]);
  ctx.fill();
  ctx.fillStyle = '#c9531c';
  ctx.beginPath();
  ctx.roundRect(-s * 0.2, s * 0.08, s * 0.4, s * 0.3, s * 0.08);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,10,0.55)';
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.stroke();
  ctx.fillStyle = '#3a312b';
  ctx.fillRect(-s * 0.2, -s * 0.12, s * 0.4, s * 0.035);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.roundRect(-s * 0.24, -s * 0.34, s * 0.07, s * 0.6, s * 0.04);
  ctx.fill();
  ctx.restore();
}

function paintPack(ctx, x, y, w, h, p, rand) {
  mountains(ctx, x, y, w, h, rand);
  ctx.fillStyle = '#1b1712';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.05, y + h);
  ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.78, x + w * 0.6, y + h);
  ctx.fill();
  pack(ctx, x + w * 0.32, y + h * 0.6, Math.min(w * 0.42, h * 0.62));
}

function paintCard(ctx, x, y, w, h, p, rand) {
  ctx.fillStyle = linear(ctx, x, y, x + w, y + h, [[0, '#efeee9'], [1, '#d6d3ef']]);
  ctx.fillRect(x, y, w, h);
  glow(ctx, x + w * 0.62, y + h * 0.5, h * 0.6, 'rgba(139,123,255,0.45)');
  const s = Math.min(w * 0.5, h * 0.78);
  ctx.save();
  ctx.translate(x + w * 0.6, y + h * 0.52);
  ctx.rotate(-0.22);
  ctx.fillStyle = 'rgba(20,20,40,0.25)';
  ctx.beginPath();
  ctx.roundRect(-s * 0.48, -s * 0.28, s, s * 0.63, s * 0.05);
  ctx.fill();
  ctx.fillStyle = linear(ctx, -s * 0.5, -s * 0.3, s * 0.5, s * 0.3, [[0, '#262b5c'], [0.6, '#15183a'], [1, '#0b0c1e']]);
  ctx.beginPath();
  ctx.roundRect(-s * 0.5, -s * 0.315, s, s * 0.63, s * 0.05);
  ctx.fill();
  ctx.fillStyle = linear(ctx, -s * 0.38, 0, -s * 0.26, 0, [[0, '#e9cf86'], [1, '#b5913f']]);
  ctx.beginPath();
  ctx.roundRect(-s * 0.4, -s * 0.12, s * 0.13, s * 0.1, s * 0.015);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `500 ${s * 0.06}px "Jost", sans-serif`;
  ctx.fillText('••••  ••••  ••••  0426', -s * 0.4, s * 0.12);
  ctx.font = `500 ${s * 0.09}px "Bodoni Moda Variable", serif`;
  ctx.fillText('Obverse', -s * 0.4, -s * 0.19);
  ctx.fillStyle = linear(ctx, -s * 0.5, -s * 0.3, s * 0.2, s * 0.3, [[0, 'rgba(255,255,255,0.22)'], [0.5, 'rgba(255,255,255,0)']]);
  ctx.beginPath();
  ctx.roundRect(-s * 0.5, -s * 0.315, s, s * 0.63, s * 0.05);
  ctx.fill();
  ctx.restore();
  const cr = s * 0.16;
  const cx = x + w * 0.24;
  const cy = y + h * 0.62;
  ctx.fillStyle = radial(ctx, cx - cr * 0.3, cy - cr * 0.3, cr * 1.4, [[0, '#ffffff'], [0.5, '#c7c9d6'], [1, '#6d7087']]);
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4c4f66';
  ctx.font = `600 ${cr}px "Jost", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', cx, cy);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function paintRoom(ctx, x, y, w, h, p, rand) {
  ctx.fillStyle = linear(ctx, 0, y, 0, y + h, [[0, '#1d0709'], [0.6, '#4a1a1c'], [1, '#2a0d0f']]);
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 3; i++) {
    const wx = x + w * (0.12 + i * 0.3);
    const ww = w * 0.18;
    const wy = y + h * 0.16;
    const wh = h * 0.42;
    ctx.fillStyle = linear(ctx, 0, wy, 0, wy + wh, [[0, '#2c3c55'], [1, '#6b4b46']]);
    ctx.beginPath();
    ctx.roundRect(wx, wy, ww, wh, [ww / 2, ww / 2, 2, 2]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,220,255,0.25)';
    ctx.lineWidth = 1;
    for (let r = 0; r < 14; r++) {
      const rx = wx + rand() * ww;
      const ry = wy + ww * 0.3 + rand() * (wh - ww * 0.3);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 2, ry + h * 0.04);
      ctx.stroke();
    }
    ctx.strokeStyle = '#140506';
    ctx.lineWidth = Math.max(2, w * 0.006);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const lx = x + w * (0.2 + i * 0.2);
    const ly = y + h * (0.28 + (i % 2) * 0.05);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    glow(ctx, lx, ly, h * 0.22, 'rgba(255,190,110,0.55)');
    ctx.fillStyle = '#ffd59a';
    ctx.beginPath();
    ctx.arc(lx, ly, h * 0.015, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = linear(ctx, 0, y + h * 0.68, 0, y + h, [[0, '#f3e6d6'], [1, '#b99b86']]);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.3, y + h * 0.68);
  ctx.lineTo(x + w * 0.7, y + h * 0.68);
  ctx.lineTo(x + w * 0.95, y + h);
  ctx.lineTo(x + w * 0.05, y + h);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const gx = x + w * (0.33 + t * 0.34);
    ctx.fillStyle = 'rgba(120,20,30,0.75)';
    ctx.beginPath();
    ctx.ellipse(gx, y + h * 0.74, w * 0.008, h * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#120405';
  for (let i = 0; i < 4; i++) {
    const side = i < 2 ? -1 : 1;
    const cx = x + w * (0.5 + side * (0.33 + (i % 2) * 0.08));
    ctx.beginPath();
    ctx.roundRect(cx - w * 0.03, y + h * 0.6, w * 0.06, h * 0.4, 4);
    ctx.fill();
  }
}

function paintKeyboard(ctx, x, y, w, h, p, rand) {
  ctx.fillStyle = radial(ctx, x + w * 0.5, y + h * 0.55, w * 0.7, [[0, '#26262a'], [1, '#09090a']]);
  ctx.fillRect(x, y, w, h);
  const kw = Math.min(w * 0.9, h * 1.6);
  ctx.save();
  ctx.translate(x + w * 0.5, y + h * 0.58);
  ctx.transform(1, 0, -0.45, 0.5, 0, 0);
  ctx.fillStyle = '#1d1d20';
  ctx.beginPath();
  ctx.roundRect(-kw * 0.5, -kw * 0.36, kw, kw * 0.72, kw * 0.03);
  ctx.fill();
  ctx.fillStyle = '#2e2e33';
  ctx.beginPath();
  ctx.roundRect(-kw * 0.48, -kw * 0.34, kw * 0.96, kw * 0.68, kw * 0.025);
  ctx.fill();
  const cols = 15;
  const rows = 5;
  const k = (kw * 0.92) / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const kx = -kw * 0.46 + c * k;
      const ky = -kw * 0.31 + r * k * 1.2;
      const mod = c === 0 || c === cols - 1 || r === rows - 1;
      const red = r === 0 && c === 0;
      ctx.fillStyle = '#101012';
      ctx.fillRect(kx + k * 0.08, ky + k * 0.14, k * 0.86, k * 0.9);
      ctx.fillStyle = red ? '#ff3b2f' : mod ? '#9a9a9f' : '#ecebe6';
      ctx.beginPath();
      ctx.roundRect(kx, ky, k * 0.86, k * 0.92, k * 0.14);
      ctx.fill();
    }
  }
  ctx.restore();
  const sx = x + w * 0.66;
  const sy = y + h * 0.18;
  const ss = h * 0.16;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(sx + ss * 0.5, sy + ss);
  ctx.lineTo(sx + ss * 0.5, y + h * 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ecebe6';
  ctx.beginPath();
  ctx.roundRect(sx, sy, ss, ss * 0.8, ss * 0.15);
  ctx.fill();
  ctx.fillStyle = '#ff3b2f';
  ctx.fillRect(sx + ss * 0.42, sy + ss * 0.8, ss * 0.16, ss * 0.3);
}

function paintPipes(ctx, x, y, w, h, p, rand) {
  ctx.fillStyle = linear(ctx, x, y, x, y + h, [[0, '#123843'], [1, '#0a1f26']]);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(160,210,220,0.08)';
  ctx.lineWidth = 1;
  const step = Math.max(8, w / 28);
  for (let gx = x; gx < x + w; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
    ctx.stroke();
  }
  for (let gy = y; gy < y + h; gy += step) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
  }
  const lw = Math.min(w, h) * 0.07;
  const runs = [
    [[0.45, -0.1], [0.45, 0.42], [0.75, 0.42], [0.75, 1.1]],
    [[1.1, 0.25], [0.86, 0.25], [0.86, 0.7], [0.6, 0.7], [0.6, 1.1]],
    [[0.3, 1.1], [0.3, 0.6], [0.55, 0.6]]
  ];
  runs.forEach((run) => {
    const path = () => {
      ctx.beginPath();
      run.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * w, y + py * h) : ctx.moveTo(x + px * w, y + py * h)));
    };
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    path();
    ctx.strokeStyle = '#7a3412';
    ctx.lineWidth = lw;
    ctx.stroke();
    path();
    ctx.strokeStyle = '#d9763d';
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
    path();
    ctx.strokeStyle = 'rgba(255,210,170,0.6)';
    ctx.lineWidth = lw * 0.18;
    ctx.stroke();
    run.slice(1, -1).forEach(([px, py]) => {
      ctx.fillStyle = '#b9b2a8';
      ctx.beginPath();
      ctx.arc(x + px * w, y + py * h, lw * 0.62, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  ctx.fillStyle = '#7fc3ff';
  const dx = x + w * 0.75;
  const dy = y + h * 0.55;
  ctx.beginPath();
  ctx.moveTo(dx, dy - lw);
  ctx.quadraticCurveTo(dx + lw * 0.7, dy, dx, dy + lw * 0.5);
  ctx.quadraticCurveTo(dx - lw * 0.7, dy, dx, dy - lw);
  ctx.fill();
}

function paintMap(ctx, x, y, w, h, p, rand) {
  ctx.fillStyle = '#163f4a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#1d5060';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.5, w * 0.36, h * 0.4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3d86b8';
  ctx.lineWidth = h * 0.06;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.45);
  ctx.bezierCurveTo(x + w * 0.3, y + h * 0.3, x + w * 0.6, y + h * 0.7, x + w, y + h * 0.5);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(230,240,240,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(x + rand() * w, y + rand() * h);
    ctx.lineTo(x + rand() * w, y + rand() * h);
    ctx.stroke();
  }
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#ff7a2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, y + h * 0.3);
  ctx.lineTo(x + w * 0.5, y + h * 0.55);
  ctx.lineTo(x + w * 0.72, y + h * 0.35);
  ctx.stroke();
  ctx.setLineDash([]);
  [[0.25, 0.3], [0.5, 0.55], [0.72, 0.35]].forEach(([px, py]) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + px * w, y + py * h, h * 0.02, 0, Math.PI * 2);
    ctx.fill();
  });
}

function bottleShape(ctx, cx, top, s) {
  const bw = s * 0.32;
  const nw = s * 0.11;
  ctx.beginPath();
  ctx.moveTo(cx - nw, top);
  ctx.lineTo(cx + nw, top);
  ctx.lineTo(cx + nw, top + s * 0.14);
  ctx.quadraticCurveTo(cx + bw, top + s * 0.2, cx + bw, top + s * 0.36);
  ctx.lineTo(cx + bw, top + s * 0.92);
  ctx.quadraticCurveTo(cx + bw, top + s, cx + bw - s * 0.06, top + s);
  ctx.lineTo(cx - bw + s * 0.06, top + s);
  ctx.quadraticCurveTo(cx - bw, top + s, cx - bw, top + s * 0.92);
  ctx.lineTo(cx - bw, top + s * 0.36);
  ctx.quadraticCurveTo(cx - bw, top + s * 0.2, cx - nw, top + s * 0.14);
  ctx.closePath();
}

function paintBottle(ctx, x, y, w, h, p, rand) {
  ctx.fillStyle = radial(ctx, x + w * 0.5, y + h, h * 1.1, [[0, '#4d7a55'], [0.6, '#1e3226'], [1, '#0f1a14']]);
  ctx.fillRect(x, y, w, h);
  const s = h * 0.78;
  const cx = x + w * 0.5;
  const top = y + h * 0.12;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, top + s, s * 0.42, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  glow(ctx, cx, top + s * 0.7, s * 0.6, 'rgba(185,242,106,0.25)');
  ctx.save();
  bottleShape(ctx, cx, top, s);
  ctx.clip();
  ctx.fillStyle = 'rgba(220,245,230,0.12)';
  ctx.fillRect(cx - s, top, s * 2, s);
  const level = top + s * 0.42;
  ctx.fillStyle = linear(ctx, 0, level, 0, top + s, [[0, 'rgba(160,225,255,0.85)'], [1, 'rgba(40,120,150,0.95)']]);
  ctx.fillRect(cx - s, level, s * 2, s);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(cx + (rand() - 0.5) * s * 0.55, level + rand() * s * 0.5, 1 + rand() * s * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(cx - s * 0.24, top + s * 0.25, s * 0.05, s * 0.65);
  ctx.restore();
  bottleShape(ctx, cx, top, s);
  ctx.strokeStyle = 'rgba(235,255,240,0.7)';
  ctx.lineWidth = Math.max(1.5, s * 0.008);
  ctx.stroke();
  ctx.fillStyle = '#c9d2c4';
  ctx.beginPath();
  ctx.roundRect(cx - s * 0.12, top - s * 0.07, s * 0.24, s * 0.08, s * 0.02);
  ctx.fill();
}

function paintRibbon(ctx, x, y, w, h, p, rand, hero) {
  ctx.fillStyle = hero ? '#e8193f' : '#efe9df';
  ctx.fillRect(x, y, w, h);
  if (hero) {
    ctx.fillStyle = '#1a0508';
    ctx.font = `700 ${h * 0.62}px "Jost", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText('SLICK', x + w * 0.02, y + h * 0.42);
    ctx.textBaseline = 'alphabetic';
  }
  const lw = h * 0.15;
  const curve = () => {
    ctx.beginPath();
    ctx.moveTo(x + w * 0.05, y + h * 0.85);
    ctx.bezierCurveTo(x + w * 0.3, y + h * 0.1, x + w * 0.55, y + h * 1.1, x + w * 0.75, y + h * 0.35);
    ctx.bezierCurveTo(x + w * 0.85, y + h * 0.05, x + w * 0.98, y + h * 0.25, x + w * 0.92, y + h * 0.55);
  };
  ctx.lineCap = 'round';
  if (!hero) {
    curve();
    ctx.strokeStyle = '#a80d2a';
    ctx.lineWidth = lw;
    ctx.stroke();
    curve();
    ctx.strokeStyle = '#ff2a4f';
    ctx.lineWidth = lw * 0.78;
    ctx.stroke();
    ctx.save();
    ctx.translate(-lw * 0.12, -lw * 0.14);
    curve();
    ctx.strokeStyle = 'rgba(255,190,200,0.55)';
    ctx.lineWidth = lw * 0.16;
    ctx.stroke();
    ctx.restore();
  }
  const mx = x + w * (hero ? 0.62 : 0.4);
  const my = y + h * (hero ? 0.45 : 0.72);
  const mr = h * 0.2;
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(-0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(mr * 0.15, mr * 0.2, mr * 0.62, mr, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = linear(ctx, -mr, -mr, mr, mr, [[0, 'rgba(255,255,255,0.95)'], [0.5, 'rgba(225,230,240,0.55)'], [1, 'rgba(160,170,190,0.8)']]);
  ctx.beginPath();
  ctx.ellipse(0, 0, mr * 0.6, mr, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ff2a4f';
  ctx.beginPath();
  ctx.ellipse(0, -mr * 0.45, mr * 0.08, mr * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintAngel(ctx, x, y, w, h, p, rand) {
  ctx.fillStyle = linear(ctx, 0, y, 0, y + h, [[0, '#1c1c20'], [1, '#08080a']]);
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 9; i++) {
    glow(ctx, x + rand() * w, y + rand() * h, h * (0.2 + rand() * 0.35), 'rgba(200,200,210,0.12)');
  }
  const cx = x + w * 0.5;
  const s = h * 0.9;
  const hy = y + h * 0.28;
  ctx.save();
  ctx.shadowColor = 'rgba(255,240,200,0.9)';
  ctx.shadowBlur = s * 0.06;
  ctx.strokeStyle = '#f6ecd2';
  ctx.lineWidth = Math.max(2, s * 0.012);
  ctx.beginPath();
  ctx.arc(cx, hy, s * 0.13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  for (const side of [-1, 1]) {
    for (let f = 0; f < 8; f++) {
      const a = -0.3 + f * 0.16;
      const len = s * (0.55 - f * 0.035);
      const ex = cx + side * Math.cos(a) * len;
      const ey = hy + s * 0.12 - Math.sin(a) * len * 0.8;
      ctx.fillStyle = linear(ctx, cx, hy, ex, ey, [[0, 'rgba(225,225,230,0.95)'], [1, 'rgba(120,120,130,0.4)']]);
      ctx.beginPath();
      ctx.moveTo(cx + side * s * 0.05, hy + s * 0.15);
      ctx.quadraticCurveTo(cx + side * len * 0.6, ey - s * 0.08, ex, ey);
      ctx.quadraticCurveTo(cx + side * len * 0.5, ey + s * 0.1, cx + side * s * 0.05, hy + s * 0.25);
      ctx.fill();
    }
  }
  ctx.fillStyle = linear(ctx, cx - s * 0.1, 0, cx + s * 0.1, 0, [[0, '#9d9da3'], [0.5, '#e8e8ea'], [1, '#6c6c72']]);
  ctx.beginPath();
  ctx.arc(cx, hy, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.08, hy + s * 0.09);
  ctx.lineTo(cx + s * 0.08, hy + s * 0.09);
  ctx.lineTo(cx + s * 0.16, y + h);
  ctx.lineTo(cx - s * 0.16, y + h);
  ctx.closePath();
  ctx.fill();
}

function blossom(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.32, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#c2185b';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
}

function paintPerfume(ctx, x, y, w, h, p, rand) {
  ctx.fillStyle = linear(ctx, x, y, x + w, y + h, [[0, '#d81b60'], [0.6, '#a8123f'], [1, '#6a0a2a']]);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#3b1a14';
  ctx.lineWidth = Math.max(2, h * 0.02);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + w, y + h * 0.05);
  ctx.bezierCurveTo(x + w * 0.8, y + h * 0.1, x + w * 0.7, y + h * 0.3, x + w * 0.55, y + h * 0.25);
  ctx.moveTo(x + w * 0.78, y + h * 0.12);
  ctx.quadraticCurveTo(x + w * 0.85, y + h * 0.35, x + w * 0.95, y + h * 0.45);
  ctx.stroke();
  for (let i = 0; i < 26; i++) {
    const bx = x + w * (0.55 + rand() * 0.45);
    const by = y + h * (0.02 + rand() * 0.45);
    blossom(ctx, bx, by, h * (0.025 + rand() * 0.03), rand() > 0.5 ? '#ffd6e3' : '#ffb3c9');
  }
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(255,220,232,${0.4 + rand() * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(x + rand() * w, y + rand() * h, h * 0.012, h * 0.007, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const s = h * 0.62;
  const bx = x + w * 0.62;
  const by = y + h * 0.32;
  ctx.fillStyle = linear(ctx, bx - s * 0.1, 0, bx + s * 0.1, 0, [[0, '#8a8f98'], [0.5, '#f4f5f7'], [1, '#6b7078']]);
  ctx.fillRect(bx - s * 0.12, by, s * 0.24, s * 0.22);
  const layers = ['rgba(255,200,215,0.55)', 'rgba(240,110,150,0.7)', 'rgba(150,20,60,0.85)'];
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.roundRect(bx - s * 0.3, by + s * 0.22, s * 0.6, s * 0.72, s * 0.06);
  ctx.fill();
  layers.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(bx - s * 0.27, by + s * (0.38 + i * 0.18), s * 0.54, s * 0.18);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `500 ${s * 0.07}px "Bodoni Moda Variable", serif`;
  ctx.textAlign = 'center';
  ctx.fillText('KASANE', bx, by + s * 0.33);
  ctx.textAlign = 'left';
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx - s * 0.3, by + s * 0.22, s * 0.6, s * 0.72);
}

const PAINTERS = {
  card: paintCard,
  pack: paintPack,
  room: paintRoom,
  keyboard: paintKeyboard,
  pipes: paintPipes,
  map: paintMap,
  bottle: paintBottle,
  ribbon: paintRibbon,
  angel: paintAngel,
  perfume: paintPerfume
};

/**
 * Paints `art` into (x, y, w, h), clipped. zoom/fx/fy crop into the scene for detail shots.
 */
export function drawArt(ctx, art, x, y, w, h, seed, { zoom = 1, fx = 0.5, fy = 0.5, hero = false, radius = 0 } = {}) {
  const painter = PAINTERS[art] || paintCard;
  const dw = w * zoom;
  const dh = h * zoom;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  painter(ctx, x - (dw - w) * fx, y - (dh - h) * fy, dw, dh, null, rng(seed), hero);
  ctx.restore();
}
