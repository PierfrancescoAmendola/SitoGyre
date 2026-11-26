import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import '@fontsource/jost/600.css';
import '@fontsource/jost/700.css';
import './styles/main.css';

import * as THREE from 'three';
import { PROJECTS } from './data/projects.js';
import { TextureManager } from './engine/textures.js';
import { WellWall, WELL_TOP_Y } from './engine/well.js';
import { WellFloor } from './engine/floor.js';
import { WatcherFigure } from './engine/figure.js';
import { BigScreen, worksSlit } from './engine/bigScreen.js';
import { CameraRig, ACT_DIVE_END, ACT_WORKS_END } from './engine/camera.js';
import { SoundEngine } from './audio/synth.js';

const SITE_COUNT = PROJECTS.length;
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = reducedMotionQuery.matches;
reducedMotionQuery.addEventListener('change', (e) => {
  reducedMotion = e.matches;
});

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const canvas = $('scene');
const entryEl = $('entry');
const soundBtn = $('sound-btn');
const soundLabel = $('sound-label');
const indexOverlay = $('index-overlay');
const indexList = $('index-list');
const indexPreview = $('index-preview');
const chapters = Array.from(document.querySelectorAll('.chapter'));
const facingNameEl = $('facing-name');
const hoverLabelEl = $('hover-label');
const hoverNameEl = $('hover-name');
const hoverHintEl = $('hover-hint');
const railEl = $('work-rail');
const workCounterEl = $('work-counter');
const workTitleEl = $('work-title');
const workTaglineEl = $('work-tagline');
const workQuoteEl = $('work-quote');
const openTabLink = $('open-tab-link');
const whiteoutEl = $('whiteout');
const liveSiteEl = $('live-site');
const liveTitleEl = $('live-title');
const liveStageEl = $('live-stage');

const sound = new SoundEngine();
const pad2 = (n) => String(n).padStart(2, '0');

// --- Work panel: name slides up through a mask, letter by letter ---
let panelSite = -1;
let charInners = [];

function setPanelSite(siteIdx) {
  if (siteIdx === panelSite) return;
  panelSite = siteIdx;
  Array.from(railEl.children).forEach((btn, i) => btn.classList.toggle('on', i === siteIdx));
  const p = PROJECTS[siteIdx];
  workCounterEl.textContent = `${p.num} / ${pad2(SITE_COUNT)}`;
  workTaglineEl.textContent = p.tagline;
  workQuoteEl.textContent = p.quote;
  openTabLink.href = p.url;
  root.style.setProperty('--accent', p.accent);
  workTitleEl.setAttribute('aria-label', p.name);
  workTitleEl.replaceChildren();
  charInners = Array.from(p.name, (ch) => {
    const mask = document.createElement('span');
    mask.className = 'char-mask';
    const inner = document.createElement('span');
    inner.className = 'char-inner';
    inner.textContent = ch === ' ' ? ' ' : ch;
    mask.appendChild(inner);
    workTitleEl.appendChild(mask);
    return inner;
  });
}

/** show: 0 = letters below the mask, 1 = letters in place, -1 = letters gone out the top. */
function setTitleReveal(show) {
  const n = Math.max(1, charInners.length);
  charInners.forEach((el, i) => {
    const lag = (i / n) * 0.45;
    const t = THREE.MathUtils.clamp((Math.abs(show) - lag) / 0.55, 0, 1);
    const e = t * t * (3 - 2 * t);
    const y = show >= 0 ? (1 - e) * 105 : -e * 105;
    el.style.transform = `translate3d(0, ${y.toFixed(1)}%, 0)`;
  });
}

// --- Scroll helpers ---
const maxScroll = () => Math.max(1, root.scrollHeight - window.innerHeight);
const getScrollProgress = () => THREE.MathUtils.clamp(window.scrollY / maxScroll(), 0, 1);

function scrollToProgress(t) {
  window.scrollTo({ top: t * maxScroll(), behavior: reducedMotion ? 'auto' : 'smooth' });
}

function jumpToSite(siteIdx) {
  const idx = THREE.MathUtils.clamp(siteIdx, 0, SITE_COUNT - 1);
  scrollToProgress(ACT_DIVE_END + ((idx + 0.25) / SITE_COUNT) * (ACT_WORKS_END - ACT_DIVE_END));
}

PROJECTS.forEach((p, idx) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'rail-item';
  btn.textContent = p.name;
  btn.addEventListener('click', () => jumpToSite(idx));
  railEl.appendChild(btn);
});

// --- Sound & entry ---
function toggleSound(forceState) {
  const next = typeof forceState === 'boolean' ? forceState : !sound.enabled;
  sound.setEnabled(next);
  soundBtn.setAttribute('aria-pressed', String(next));
  soundLabel.textContent = next ? 'Sound on' : 'Sound off';
  root.classList.toggle('sound-on', next);
}

function enter(withSound) {
  toggleSound(withSound);
  entryEl.classList.add('is-dismissed');
  root.classList.add('entered');
}
$('enter-sound').addEventListener('click', () => enter(true));
$('enter-quiet').addEventListener('click', () => enter(false));
soundBtn.addEventListener('click', () => toggleSound());

// --- Index ---
function openIndex() {
  indexOverlay.hidden = false;
  root.classList.add('ix-open');
}
function closeIndex() {
  indexOverlay.hidden = true;
  root.classList.remove('ix-open');
}
$('index-btn').addEventListener('click', openIndex);
$('index-close').addEventListener('click', closeIndex);

// --- WebGL 2 ---
const gl2 = canvas.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' });
if (!gl2) {
  root.classList.add('no-webgl');
  $('no-webgl-msg').hidden = false;
  buildIndex(null);
} else {
  initScene(gl2);
}

function buildIndex(textureManager) {
  PROJECTS.forEach((p, idx) => {
    const row = document.createElement('li');
    row.className = 'index-row';
    row.innerHTML = `
      <span class="index-num">${p.num}</span>
      <span class="index-name"></span>
      <span class="index-desc"></span>
      <a class="index-visit" href="${p.url}" target="_blank" rel="noopener">Visit ↗</a>`;
    row.querySelector('.index-name').textContent = p.name;
    row.querySelector('.index-desc').textContent = p.description;
    row.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      closeIndex();
      jumpToSite(idx);
    });
    if (textureManager) {
      row.addEventListener('pointerenter', () => {
        const page = textureManager.getWallTexture(idx).image;
        const ctx = indexPreview.getContext('2d');
        ctx.drawImage(page, 0, 0, page.width, page.width * 0.625, 0, 0, indexPreview.width, indexPreview.height);
        indexPreview.style.borderColor = p.accent;
        indexPreview.classList.add('visible');
      });
      row.addEventListener('pointerleave', () => indexPreview.classList.remove('visible'));
    }
    indexList.appendChild(row);
  });
  indexOverlay.addEventListener('pointermove', (e) => {
    indexPreview.style.transform = `translate(${e.clientX + 24}px, ${e.clientY - 100}px)`;
  });
}

function initScene(context) {
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050304');

  const cameraRig = new CameraRig(window.innerWidth / window.innerHeight);
  const textureManager = new TextureManager();
  const well = new WellWall(textureManager);
  const floor = new WellFloor();
  const figure = new WatcherFigure();
  const bigScreen = new BigScreen(textureManager);
  figure.group.scale.setScalar(1.15);
  scene.add(well.group, floor.mesh, figure.group, bigScreen.mesh);
  buildIndex(textureManager);

  // Dust in the shaft, lit by the pool
  const moteCount = 320;
  const motePos = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.8 + Math.random() * 5.5;
    motePos.set([Math.cos(a) * r, Math.random() * WELL_TOP_Y, Math.sin(a) * r], i * 3);
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({ color: '#9cc2ff', size: 0.05, transparent: true, opacity: 0.5, depthWrite: false })
  );
  scene.add(motes);

  // --- Interaction state ---
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-99, -99);
  const pointerPx = { x: 0, y: 0 };
  let inspecting = false;
  let inspectSite = 0;
  let pulledKey = null;
  let facingScreen = { siteIndex: 0, ring: 3, slot: 0 };
  let inWorks = false;

  function openScreenOffWall(siteIndex, ring, slot) {
    inspecting = true;
    inspectSite = siteIndex;
    pulledKey = { ring, slot };
    bigScreen.startInspect(siteIndex, well.getScreenWorldTransform(ring, slot));
    well.setHiddenScreen(ring, slot);
    setPanelSite(siteIndex);
    root.classList.add('is-open');
    document.body.classList.add('locked');
    hoverLabelEl.classList.remove('visible');
    sound.playClunk();
  }

  /** In the work the big screen itself comes forward, starting from where it hangs. */
  function openBigScreen(siteIndex) {
    inspecting = true;
    inspectSite = siteIndex;
    pulledKey = null;
    const m = bigScreen.mesh;
    bigScreen.startInspect(siteIndex, { pos: m.position.clone(), quat: m.quaternion.clone(), scale: m.scale.clone() });
    setPanelSite(siteIndex);
    root.classList.add('is-open');
    document.body.classList.add('locked');
  }

  function closeInspect() {
    if (!inspecting) return;
    inspecting = false; // free at once: the screen flies home on its own and the wall stays clickable
    bigScreen.endInspect();
    root.classList.remove('is-open');
    document.body.classList.remove('locked');
    sound.playClunk();
  }

  function leaf(dir) {
    if (inspecting) {
      inspectSite = (inspectSite + dir + SITE_COUNT) % SITE_COUNT;
      bigScreen.setInspectSite(inspectSite);
      panelSite = -1;
      setPanelSite(inspectSite);
      sound.playTick();
    } else if (inWorks) {
      jumpToSite(panelSite + dir);
    }
  }

  function stepInsideSite(siteIdx) {
    const p = PROJECTS[siteIdx];
    sound.playRush(true);
    if (!inspecting && inWorks) openBigScreen(siteIdx);
    else if (!inspecting) openScreenOffWall(siteIdx, facingScreen.ring, facingScreen.slot);
    bigScreen.triggerRush(true);
    whiteoutEl.classList.add('active');
    setTimeout(() => {
      liveTitleEl.textContent = `${p.num} · ${p.name}`;
      const page = textureManager.getHiResTexture(siteIdx).image;
      const copy = document.createElement('canvas');
      copy.width = page.width;
      copy.height = page.height;
      copy.getContext('2d').drawImage(page, 0, 0);
      copy.className = 'live-page';
      copy.setAttribute('role', 'img');
      copy.setAttribute('aria-label', `${p.name}: ${p.tagline}`);
      liveStageEl.replaceChildren(copy);
      liveStageEl.scrollTop = 0;
      liveSiteEl.hidden = false;
      setTimeout(() => whiteoutEl.classList.remove('active'), 160);
    }, 420);
  }

  function exitLiveSite() {
    sound.playRush(false);
    whiteoutEl.classList.add('active');
    setTimeout(() => {
      liveSiteEl.hidden = true;
      bigScreen.triggerRush(false);
      setTimeout(() => whiteoutEl.classList.remove('active'), 160);
    }, 240);
  }

  $('open-facing-btn').addEventListener('click', () =>
    openScreenOffWall(facingScreen.siteIndex, facingScreen.ring, facingScreen.slot)
  );
  $('work-prev').addEventListener('click', () => leaf(-1));
  $('work-next').addEventListener('click', () => leaf(1));
  $('work-back').addEventListener('click', () => {
    if (inspecting) closeInspect();
    else scrollToProgress(ACT_DIVE_END * 0.8);
  });
  $('step-inside-btn').addEventListener('click', () => stepInsideSite(inspecting ? inspectSite : Math.max(0, panelSite)));
  $('live-back').addEventListener('click', exitLiveSite);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!liveSiteEl.hidden) exitLiveSite();
      else if (inspecting) closeInspect();
      else if (!indexOverlay.hidden) closeIndex();
    } else if ((inspecting || inWorks) && liveSiteEl.hidden) {
      if (e.key === 'ArrowLeft') leaf(-1);
      if (e.key === 'ArrowRight') leaf(1);
    }
  });

  // Only the canvas itself can hover the scene: over type, buttons or outside the window, nothing is picked
  const releasePointer = () => pointer.set(-99, -99);
  window.addEventListener('pointermove', (e) => {
    if (e.target !== canvas) return releasePointer();
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    pointerPx.x = e.clientX;
    pointerPx.y = e.clientY;
  });
  document.documentElement.addEventListener('pointerleave', releasePointer);
  window.addEventListener('blur', releasePointer);

  // Drag across the well to turn the drum; let go and it keeps turning, then settles
  const DRAG_THRESHOLD = 6; // px before a press counts as a drag, not a click
  const drag = { down: false, moved: false, startX: 0, lastX: 0, lastT: 0, vel: 0 };
  canvas.addEventListener('pointerdown', (e) => {
    if (inspecting || !entryEl.classList.contains('is-dismissed')) return;
    Object.assign(drag, { down: true, moved: false, startX: e.clientX, lastX: e.clientX, lastT: performance.now(), vel: 0 });
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag.down) return;
    if (!drag.moved && Math.abs(e.clientX - drag.startX) < DRAG_THRESHOLD) return;
    drag.moved = true;
    root.classList.add('is-dragging');
    const now = performance.now();
    const dA = ((e.clientX - drag.lastX) / window.innerWidth) * Math.PI;
    const dt = Math.max(1, now - drag.lastT) / 1000;
    well.drag(dA);
    drag.vel = drag.vel * 0.6 + (dA / dt) * 0.4;
    drag.lastX = e.clientX;
    drag.lastT = now;
  });
  const endDrag = () => {
    if (!drag.down) return;
    drag.down = false;
    root.classList.remove('is-dragging');
    // a pause before letting go means no fling
    if (drag.moved) well.setFling(performance.now() - drag.lastT > 80 ? 0 : drag.vel);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('click', (e) => {
    if (drag.moved || !entryEl.classList.contains('is-dismissed')) return;
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    if (inspecting) {
      // On the screen: step inside. On another card: swap to it. Anywhere else: back on the wall.
      raycaster.setFromCamera(pointer, cameraRig.camera);
      if (raycaster.intersectObject(bigScreen.mesh, false).length) return stepInsideSite(inspectSite);
      const other = pulledKey ? well.raycastScreen(raycaster) : null;
      if (other) return openScreenOffWall(other.siteIndex, other.ring, other.slot);
      return closeInspect();
    }
    updateHover(); // pick at the click itself, not at the last frame
    if (bigHovered) stepInsideSite(Math.max(0, panelSite));
    else if (well.hovered) openScreenOffWall(well.hovered.siteIndex, well.hovered.ring, well.hovered.slot);
  });

  // The page is locked while a screen is out; a wheel or swipe puts it back so the scroll carries on
  window.addEventListener('wheel', () => inspecting && liveSiteEl.hidden && closeInspect(), { passive: true });

  window.addEventListener('resize', () => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    cameraRig.setAspect(window.innerWidth / window.innerHeight);
  });

  // --- Main loop ---
  const clock = new THREE.Clock();
  const accentVec = new THREE.Color('#4aa8ff');
  const lookTarget = new THREE.Vector3();
  const lightDir2D = new THREE.Vector2(0, -1);

  let bigHovered = false;

  /**
   * On the way down any wall screen can be picked ("View"). In the work the wall is
   * scenery: only the big screen answers the cursor ("Step inside").
   */
  function updateHover() {
    const active = !inspecting && entryEl.classList.contains('is-dismissed') && pointer.x > -2;
    raycaster.setFromCamera(pointer, cameraRig.camera);
    bigHovered = active && inWorks && bigScreen.mesh.visible && raycaster.intersectObject(bigScreen.mesh, false).length > 0;
    well.hovered = active && !inWorks ? well.raycastScreen(raycaster) : null;

    const site = bigHovered ? Math.max(0, panelSite) : well.hovered ? well.hovered.siteIndex : -1;
    hoverLabelEl.classList.toggle('visible', site >= 0);
    canvas.style.cursor = site >= 0 ? 'pointer' : ''; // empty lets the CSS grab cursor show
    if (site < 0) return;
    hoverNameEl.textContent = PROJECTS[site].name;
    hoverHintEl.textContent = bigHovered ? 'Step inside' : 'View';
    hoverLabelEl.style.transform = `translate(${pointerPx.x + 16}px, ${pointerPx.y - 10}px)`;
  }

  function updatePanel(siteFloat) {
    if (inspecting) {
      setTitleReveal(1);
      return;
    }
    const base = Math.min(SITE_COUNT - 1, Math.floor(siteFloat));
    const slit = base < SITE_COUNT - 1 ? worksSlit(siteFloat - base) : 0;
    setPanelSite(slit > 0.5 ? base + 1 : base);
    setTitleReveal(slit > 0.5 ? (slit - 0.5) * 2 : slit > 0 ? -slit * 2 : 1);
  }

  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;
    const isMobile = window.innerWidth <= 768;

    const { progress, velocity } = cameraRig.update(dt, getScrollProgress(), reducedMotion);
    const inHero = progress < 0.04;
    const inDive = !inHero && progress < ACT_DIVE_END - 0.004;
    inWorks = progress >= ACT_DIVE_END - 0.004 && progress < ACT_WORKS_END + 0.01;
    const inFinale = progress >= ACT_WORKS_END + 0.01;
    root.classList.toggle('in-hero', inHero);
    root.classList.toggle('in-dive', inDive);
    root.classList.toggle('in-works', inWorks);
    root.classList.toggle('in-finale', inFinale);

    const diveT = (progress - 0.04) / (ACT_DIVE_END - 0.04);
    const chapIdx = !inDive ? -1 : diveT < 0.3 ? 0 : diveT < 0.62 ? 1 : 2;
    chapters.forEach((el, i) => el.classList.toggle('active', i === chapIdx));

    const worksNorm = THREE.MathUtils.clamp((progress - ACT_DIVE_END) / (ACT_WORKS_END - ACT_DIVE_END), 0, 0.9999);
    const siteFloat = worksNorm * SITE_COUNT;
    if (inWorks || inspecting) updatePanel(siteFloat);

    textureManager.update(dt, reducedMotion);
    well.update(dt, velocity, reducedMotion);
    updateHover();

    if (inDive || inHero) {
      facingScreen = well.findFacingScreen(cameraRig.camera);
      facingNameEl.textContent = PROJECTS[facingScreen.siteIndex].name;
    }

    const focusSite = inspecting ? inspectSite : inWorks ? Math.max(0, panelSite) : facingScreen.siteIndex;
    accentVec.set(PROJECTS[focusSite].accent);

    const bigState = bigScreen.update(dt, {
      worksWeight: inWorks && !inspecting ? 1 : 0,
      siteFloat,
      camera: cameraRig.camera,
      isMobile,
      accentColor: accentVec,
      reducedMotion
    });
    if (bigState.settledClosed && !inspecting) {
      pulledKey = null;
      well.setHiddenScreen(null, null);
    }

    // He watches whatever has your attention, and looks up to you at the end
    if (inFinale) lookTarget.copy(cameraRig.camera.position);
    else if (inspecting || inWorks) lookTarget.copy(bigScreen.mesh.position);
    else lookTarget.copy(well.getScreenWorldTransform(facingScreen.ring, facingScreen.slot).pos);
    figure.update(dt, elapsed, lookTarget, accentVec);

    lightDir2D.set(lookTarget.x, lookTarget.z);
    if (lightDir2D.lengthSq() < 0.001) lightDir2D.set(0, -1);
    floor.update(elapsed, lightDir2D.normalize(), accentVec);

    motes.rotation.y += dt * (0.03 - velocity * 0.4);

    const depth01 = THREE.MathUtils.clamp(1 - cameraRig.camera.position.y / WELL_TOP_Y, 0, 1);
    sound.update(depth01, velocity, well.totalDrumTurn, inWorks ? panelSite : -1);

    renderer.render(scene, cameraRig.camera);
  }

  tick();
}
