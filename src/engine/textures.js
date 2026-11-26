import * as THREE from 'three';
import { PROJECTS } from '../data/projects.js';
import { paintPage, pageScroll, PAGE_UNITS } from './sitePages.js';

const WALL_W = 640; // wall pages: 640 x 2560 (a 640 x 400 window scrolls over it)
const HIRES_W = 1024; // big screen pages: 1024 x 4096, the safe max texture height
const HIRES_CACHE = 3; // current, next and one spare

function makePageTexture(width, project) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round((width / 100) * PAGE_UNITS);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const paint = () => {
    paintPage(canvas.getContext('2d'), width, project);
    tex.needsUpdate = true;
  };
  paint();
  return { tex, paint };
}

/**
 * Owns every site's page texture and the shared recording clock.
 * Wall and big screen read the same clock, so a site is at the same moment everywhere.
 */
export class TextureManager {
  constructor() {
    this.clockTime = 0;
    this.wall = PROJECTS.map((p) => makePageTexture(WALL_W, p));
    this.hiRes = new Map(); // siteIndex -> { tex, paint }
    this._fontsReady();
  }

  async _fontsReady() {
    // Canvas text falls back to Georgia until the bundled faces load; repaint once they have.
    try {
      await Promise.all([
        document.fonts.load('500 40px "Bodoni Moda Variable"'),
        document.fonts.load('italic 500 40px "Bodoni Moda Variable"'),
        document.fonts.load('400 40px "Jost"'),
        document.fonts.load('500 40px "Jost"'),
        document.fonts.load('600 40px "Jost"'),
        document.fonts.load('700 40px "Jost"')
      ]);
    } catch (err) {
      console.warn('Gyre: fonts failed to load, keeping fallback faces', err);
      return;
    }
    this.wall.forEach((w) => w.paint());
    this.hiRes.forEach((h) => h.paint());
  }

  getWallTexture(siteIndex) {
    return this.wall[siteIndex % PROJECTS.length].tex;
  }

  getHiResTexture(siteIndex) {
    const idx = ((siteIndex % PROJECTS.length) + PROJECTS.length) % PROJECTS.length;
    let entry = this.hiRes.get(idx);
    if (entry) {
      this.hiRes.delete(idx); // re-insert to mark as most recent
    } else {
      entry = makePageTexture(HIRES_W, PROJECTS[idx]);
      if (this.hiRes.size >= HIRES_CACHE) {
        const [oldest, old] = this.hiRes.entries().next().value;
        old.tex.dispose();
        this.hiRes.delete(oldest);
      }
    }
    this.hiRes.set(idx, entry);
    return entry.tex;
  }

  /** 0 = page top, 1 = page bottom, for site `siteIndex` right now. */
  scrollOf(siteIndex) {
    return pageScroll(this.clockTime, siteIndex);
  }

  update(dt, reducedMotion = false) {
    this.clockTime += reducedMotion ? dt * 0.2 : dt;
  }

  dispose() {
    this.wall.forEach((w) => w.tex.dispose());
    this.hiRes.forEach((h) => h.tex.dispose());
  }
}
