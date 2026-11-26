import { drawArt } from './sitePainters.js';

/**
 * Each site is painted once as a tall page (6.4 screens, 16:10 each).
 * The shaders scroll a 16:10 window over it, so no canvas is redrawn per frame.
 */
export const PAGE_UNITS = 400; // page height in units of width/100
export const VIEW_UNITS = 62.5; // one 16:10 screen
export const VIEW_RATIO = VIEW_UNITS / PAGE_UNITS;

const SERIF = '"Bodoni Moda Variable", "Bodoni Moda", Georgia, serif';
const SANS = '"Jost", "Helvetica Neue", Arial, sans-serif';

const COPY =
  'We work with small teams who care how a thing is made. Every page is drawn, built and tested by the people you talk to. ' +
  'Nothing ships until it feels right in the hand, on a slow phone, at two in the morning.';

function displayFont(page, size) {
  if (page.display === 'serif') return `500 ${size}px ${SERIF}`;
  if (page.display === 'block') return `700 ${size}px ${SANS}`;
  return `500 ${size}px ${SANS}`;
}

function wrap(ctx, text, x, y, maxW, lineH, maxLines = 99) {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lineH);
      lines++;
      if (lines >= maxLines) return lines;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y + lines * lineH);
  return lines + 1;
}

function nav(ctx, p, u, light) {
  const fg = light ? '#ffffff' : p.theme.fg;
  ctx.fillStyle = fg;
  ctx.font = `600 ${2.1 * u}px ${SANS}`;
  ctx.fillText(p.name.toUpperCase(), 5 * u, 6 * u);
  ctx.font = `400 ${1.5 * u}px ${SANS}`;
  ctx.globalAlpha = 0.8;
  ['Work', 'Studio', 'Journal', 'Contact'].forEach((item, i) => ctx.fillText(item, 50 * u + i * 9 * u, 6 * u));
  ctx.globalAlpha = 1;
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.roundRect(86 * u, 3.6 * u, 9.5 * u, 3.6 * u, 1.8 * u);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.font = `500 ${1.4 * u}px ${SANS}`;
  ctx.fillText('Enquire', 87.6 * u, 5.95 * u);
}

function hero(ctx, p, u, W) {
  const { page } = p;
  const h = VIEW_UNITS * u;
  drawArt(ctx, page.art, 0, 0, W, h, 11, { hero: true });
  const darkArt = !['card', 'ribbon'].includes(page.art);
  ctx.fillStyle = darkArt ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0)';
  ctx.fillRect(0, h * 0.55, W, h * 0.45);
  nav(ctx, p, u, darkArt);

  const fg = darkArt ? '#ffffff' : p.theme.fg;
  ctx.fillStyle = fg;
  if (page.art === 'angel') {
    ctx.font = displayFont(page, 15 * u);
    ctx.textAlign = 'center';
    ctx.fillText(page.hero, W / 2, 56 * u);
    ctx.textAlign = 'left';
    return;
  }
  if (page.art === 'ribbon') {
    ctx.fillStyle = '#ffffff';
    ctx.font = `italic 500 ${4.6 * u}px ${SERIF}`;
    ctx.fillText('Made to look good.', 5 * u, 50 * u);
    ctx.fillText('Built to feel different.', 5 * u, 56 * u);
    return;
  }
  if (page.display === 'block') {
    ctx.font = displayFont(page, 8.5 * u);
    ctx.textAlign = 'right';
    page.hero.split(' ').forEach((word, i) => ctx.fillText(word, 95 * u, 24 * u + i * 8.5 * u));
    ctx.textAlign = 'left';
  } else {
    ctx.font = displayFont(page, 7.5 * u);
    wrap(ctx, page.hero, 5 * u, 44 * u, 60 * u, 7.8 * u, 2);
  }
  ctx.font = `400 ${1.7 * u}px ${SANS}`;
  ctx.globalAlpha = 0.85;
  ctx.fillText(p.tagline, 5 * u, 58 * u);
  ctx.globalAlpha = 1;
}

function statement(ctx, p, u, W, y) {
  ctx.fillStyle = p.accent;
  ctx.font = `500 ${1.4 * u}px ${SANS}`;
  ctx.fillText(`01 — ${p.page.eyebrow.toUpperCase()}`, 5 * u, y + 12 * u);
  ctx.fillStyle = p.theme.fg;
  ctx.font = displayFont(p.page, 5.6 * u);
  wrap(ctx, p.quote.replace(/[“”]/g, ''), 5 * u, y + 22 * u, 72 * u, 6.2 * u, 3);
  ctx.font = `400 ${1.45 * u}px ${SANS}`;
  ctx.fillStyle = p.theme.muted;
  wrap(ctx, COPY, 5 * u, y + 40 * u, 40 * u, 2.3 * u, 5);
  wrap(ctx, COPY.slice(60), 52 * u, y + 40 * u, 40 * u, 2.3 * u, 5);
  return 55 * u;
}

function split(ctx, p, u, W, y) {
  drawArt(ctx, p.page.art === 'pipes' ? 'map' : p.page.art, 5 * u, y, 44 * u, 60 * u, 23, {
    zoom: 1.5,
    fx: 0.55,
    fy: 0.45,
    radius: 1.6 * u
  });
  const items = ['Drawn by hand', 'Built to last', 'Tested in the field'];
  items.forEach((title, i) => {
    const ry = y + 6 * u + i * 18 * u;
    ctx.strokeStyle = p.theme.fg;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(55 * u, ry);
    ctx.lineTo(95 * u, ry);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.accent;
    ctx.font = `500 ${1.3 * u}px ${SANS}`;
    ctx.fillText(`0${i + 1}`, 55 * u, ry + 4 * u);
    ctx.fillStyle = p.theme.fg;
    ctx.font = displayFont(p.page, 3 * u);
    ctx.fillText(title, 60 * u, ry + 4.6 * u);
    ctx.font = `400 ${1.35 * u}px ${SANS}`;
    ctx.fillStyle = p.theme.muted;
    wrap(ctx, COPY, 60 * u, ry + 8.6 * u, 34 * u, 2.1 * u, 3);
  });
  return 70 * u;
}

function cards(ctx, p, u, W, y) {
  const cw = 28 * u;
  for (let i = 0; i < 3; i++) {
    const cx = 5 * u + i * 31.5 * u;
    ctx.fillStyle = p.theme.surface;
    ctx.beginPath();
    ctx.roundRect(cx, y, cw, 50 * u, 1.4 * u);
    ctx.fill();
    drawArt(ctx, p.page.art, cx, y, cw, 36 * u, 40 + i, {
      zoom: 1.3 + i * 0.35,
      fx: [0.2, 0.5, 0.8][i],
      fy: [0.6, 0.4, 0.5][i],
      radius: [1.4 * u, 1.4 * u, 0, 0]
    });
    ctx.fillStyle = p.theme.fg;
    ctx.font = displayFont(p.page, 2.4 * u);
    ctx.fillText(['Field', 'Studio', 'Archive'][i], cx + 2 * u, y + 41.5 * u);
    ctx.fillStyle = p.theme.muted;
    ctx.font = `400 ${1.3 * u}px ${SANS}`;
    ctx.fillText(`From 2026 · No. ${i + 4}`, cx + 2 * u, y + 46 * u);
    ctx.fillStyle = p.accent;
    ctx.fillText('View →', cx + cw - 8 * u, y + 46 * u);
  }
  return 66 * u;
}

function band(ctx, p, u, W, y) {
  const h = 62 * u;
  ctx.fillStyle = p.theme.alt;
  ctx.fillRect(0, y, W, h);
  drawArt(ctx, p.page.art, 52 * u, y + 8 * u, 43 * u, 46 * u, 77, { zoom: 1.15, fx: 0.4, radius: 1.6 * u });
  const lightAlt = p.id === 'tasto';
  ctx.fillStyle = lightAlt ? '#111111' : p.id === 'slick' ? '#ffffff' : p.accent;
  ctx.font = displayFont(p.page, 6.4 * u);
  wrap(ctx, p.page.band, 5 * u, y + 20 * u, 44 * u, 7 * u, 3);
  ctx.font = `400 ${1.45 * u}px ${SANS}`;
  ctx.fillStyle = lightAlt ? '#444' : 'rgba(255,255,255,0.7)';
  wrap(ctx, p.description + '. ' + COPY, 5 * u, y + 44 * u, 40 * u, 2.3 * u, 3);
  return h;
}

function footer(ctx, p, u, W, y, H) {
  ctx.fillStyle = p.theme.fg;
  ctx.font = displayFont(p.page, 3.6 * u);
  ctx.fillText(p.page.eyebrow, 5 * u, y + 12 * u);
  ctx.strokeStyle = p.theme.fg;
  ctx.globalAlpha = 0.35;
  ctx.strokeRect(5 * u, y + 17 * u, 40 * u, 5 * u);
  ctx.globalAlpha = 1;
  ctx.fillStyle = p.accent;
  ctx.font = `500 ${1.4 * u}px ${SANS}`;
  ctx.fillText('SUBSCRIBE →', 36 * u, y + 20.2 * u);
  ['Shop', 'About', 'Stockists', 'Care'].forEach((col, c) => {
    ctx.fillStyle = p.theme.fg;
    ctx.font = `500 ${1.3 * u}px ${SANS}`;
    ctx.fillText(col.toUpperCase(), 55 * u + c * 10.5 * u, y + 12 * u);
    ctx.fillStyle = p.theme.muted;
    ctx.font = `400 ${1.3 * u}px ${SANS}`;
    for (let r = 0; r < 4; r++) ctx.fillText(['Index', 'Journal', 'Press', 'Help'][r], 55 * u + c * 10.5 * u, y + 16 * u + r * 2.6 * u);
  });
  ctx.fillStyle = p.theme.fg;
  ctx.font = displayFont(p.page, 17 * u);
  ctx.textAlign = 'center';
  ctx.fillText(p.name.toUpperCase(), W / 2, H - 2 * u);
  ctx.textAlign = 'left';
}

/** Paints project `p` as one tall page into a W x (W*4) canvas. */
export function paintPage(ctx, W, p) {
  const u = W / 100;
  const H = PAGE_UNITS * u;
  ctx.save();
  ctx.fillStyle = p.theme.bg;
  ctx.fillRect(0, 0, W, H);
  hero(ctx, p, u, W);
  let y = VIEW_UNITS * u;
  y += statement(ctx, p, u, W, y);
  y += split(ctx, p, u, W, y);
  y += cards(ctx, p, u, W, y);
  y += band(ctx, p, u, W, y);
  footer(ctx, p, u, W, y, H);
  ctx.restore();
}

/**
 * Where the recording is at time `t` (seconds): 0 = top of page, 1 = bottom.
 * It dwells on each screenful, then glides on; at the end it swoops back up.
 */
export function pageScroll(t, siteIndex, loop = 16) {
  const phase = (t / loop + siteIndex * 0.137) % 1;
  const stops = 5;
  if (phase < 0.88) {
    const d = (phase / 0.88) * stops;
    const k = Math.floor(d);
    const f = Math.min(1, Math.max(0, (d - k - 0.4) / 0.6));
    return (k + f * f * (3 - 2 * f)) / stops;
  }
  const f = (phase - 0.88) / 0.12;
  return 1 - f * f * (3 - 2 * f);
}
