import * as THREE from 'three';

/**
 * Monotone cubic Hermite interpolation (Fritsch-Carlson) for 1D keyframes.
 * Guarantees zero overshoot between act boundaries.
 */
function evalMonotoneCubic(keys, vals, x) {
  const n = keys.length;
  if (x <= keys[0]) return vals[0];
  if (x >= keys[n - 1]) return vals[n - 1];

  let i = 0;
  while (i < n - 1 && x > keys[i + 1]) i++;

  const h = [];
  const d = [];
  for (let k = 0; k < n - 1; k++) {
    h.push(keys[k + 1] - keys[k]);
    d.push((vals[k + 1] - vals[k]) / h[k]);
  }

  const m = new Array(n).fill(0);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let k = 1; k < n - 1; k++) {
    if (d[k - 1] * d[k] <= 0) {
      m[k] = 0;
    } else {
      const w1 = 2 * h[k] + h[k - 1];
      const w2 = h[k] + 2 * h[k - 1];
      m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
    }
  }

  const hk = h[i];
  const t = (x - keys[i]) / hk;
  const t2 = t * t;
  const t3 = t2 * t;

  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  return h00 * vals[i] + h10 * hk * m[i] + h01 * vals[i + 1] + h11 * hk * m[i + 1];
}

// Normalized scroll acts:
// 0.00 - 0.28 : Act 1 (Hero + Dive)
// 0.28 - 0.79 : Act 2 (Works 01..09)
// 0.79 - 1.00 : Act 3 (Finale)
export const ACT_DIVE_END = 0.28;
export const ACT_WORKS_END = 0.79;

const TAU = Math.PI * 2;
// Three monotone camera paths: the dive (0 → 0.28), the work (held), the climb out (0.79 → 1)
const KEYS = [0.0, 0.06, 0.14, 0.21, 0.25, 0.28, 0.79, 0.86, 0.93, 1.0];
const HEIGHT_VALS = [54.0, 41.0, 25.0, 12.0, 4.6, 1.85, 1.85, 9.0, 24.0, 52.0];
const RADIUS_VALS = [0.25, 1.0, 2.0, 2.8, 4.0, 4.95, 4.95, 2.8, 1.2, 0.25];
const PITCH_VALS = [-1.53, -1.42, -1.2, -0.95, -0.55, 0.11, 0.11, -0.75, -1.3, -1.53];
const CORKSCREW_VALS = [0.0, 0.8, 2.3, 3.9, 5.1, TAU, TAU, TAU + 0.6, TAU + 1.6, TAU + 2.4];
const FOV_VALS = [58, 62, 66, 64, 56, 48, 48, 54, 58, 58];

export class CameraRig {
  constructor(aspect = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(FOV_VALS[0], aspect, 0.1, 220);
    this.fovSpring = FOV_VALS[0] * (aspect < 1 ? 1.4 : 1);
    this.scrollProgress = 0;
    this.targetProgress = 0;
    this.velocity = 0;
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Critically damped spring for scroll progress -> continuous camera motion.
   */
  update(dt, targetProgress, reducedMotion = false) {
    this.targetProgress = THREE.MathUtils.clamp(targetProgress, 0, 1);

    if (reducedMotion) {
      this.velocity = (this.targetProgress - this.scrollProgress) / Math.max(dt, 0.016);
      this.scrollProgress = this.targetProgress;
    } else {
      const stiffness = 85;
      const damping = 18.4; // ~critically damped (2 * sqrt(85) = 18.44)
      const force = (this.targetProgress - this.scrollProgress) * stiffness;
      this.velocity += (force - this.velocity * damping) * dt;
      this.scrollProgress = THREE.MathUtils.clamp(this.scrollProgress + this.velocity * dt, 0, 1);
    }

    const p = this.scrollProgress;
    const y = evalMonotoneCubic(KEYS, HEIGHT_VALS, p);
    const r = evalMonotoneCubic(KEYS, RADIUS_VALS, p);
    const pitch = evalMonotoneCubic(KEYS, PITCH_VALS, p);
    const angle = evalMonotoneCubic(KEYS, CORKSCREW_VALS, p);

    const x = Math.sin(angle) * r;
    const z = Math.cos(angle) * r;

    this.camera.position.set(x, y, z);

    // Look inward toward axis (0, y + tan(pitch)*dist, 0)
    const lookDist = 6.0;
    const lookY = y + Math.tan(pitch) * lookDist;
    this.camera.lookAt(0, lookY, 0);

    // Diving fast widens the lens
    const inDive = p < ACT_DIVE_END ? 1 : 0;
    const speedFov = inDive * THREE.MathUtils.clamp(Math.abs(this.velocity) * 28, 0, 20);
    const portraitWiden = this.camera.aspect < 1 ? 1.4 : 1; // phones: keep the well, not just the figure, in frame
    const targetFov = evalMonotoneCubic(KEYS, FOV_VALS, p) * portraitWiden + speedFov;
    this.fovSpring = THREE.MathUtils.lerp(this.fovSpring, targetFov, Math.min(1, dt * 8));

    if (Math.abs(this.camera.fov - this.fovSpring) > 0.02) {
      this.camera.fov = this.fovSpring;
      this.camera.updateProjectionMatrix();
    }

    return {
      progress: p,
      velocity: this.velocity
    };
  }
}
