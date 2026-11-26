import * as THREE from 'three';
import { createScreenGeometry, SCREEN_GLSL } from './well.js';
import { VIEW_RATIO } from './sitePages.js';

const BIG_VERT = /* glsl */ `
  attribute vec3 aCurved;
  attribute vec3 aFlat;
  uniform float uFlatten;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = mix(aCurved, aFlat, uFlatten);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const BIG_FRAG = /* glsl */ `
  uniform sampler2D uMapA;
  uniform sampler2D uMapB;
  uniform float uOffsetA;
  uniform float uOffsetB;
  uniform float uSlitProgress;
  uniform float uOpacity;
  uniform vec3 uAccent;
  ${SCREEN_GLSL}

  varying vec2 vUv;

  void main() {
    float d = screenSdf(vUv, 0.03);
    if (d > 0.0) discard;

    // Thirteen vertical slits open like a zoetrope's, each a beat after the one before
    const float SLITS = 13.0;
    float idx = floor(vUv.x * SLITS);
    float localX = fract(vUv.x * SLITS);
    float openAmt = clamp((uSlitProgress - (idx / SLITS) * 0.45) / 0.55, 0.0, 1.0);
    float mask = step(localX, openAmt);
    if (uSlitProgress <= 0.0001) mask = 0.0;
    if (uSlitProgress >= 0.9999) mask = 1.0;

    vec3 colA = texture2D(uMapA, pageUv(vUv, uOffsetA)).rgb;
    vec3 colB = texture2D(uMapB, pageUv(vUv, uOffsetB)).rgb;
    vec3 col = mix(colA, colB, mask);

    float moving = sin(clamp(uSlitProgress, 0.0, 1.0) * 3.14159265);
    float edge = (1.0 - smoothstep(0.0, 0.07, abs(localX - openAmt))) * moving * step(0.001, openAmt) * step(openAmt, 0.999);
    col = mix(col, vec3(1.0), edge * 0.8);

    float rim = 1.0 - smoothstep(0.003, 0.008, -d);
    col = mix(col, uAccent * 1.2, rim);

    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`;

export class SpringValue {
  constructor(initial = 0, stiffness = 140, damping = 24) {
    this.value = initial;
    this.target = initial;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  snap(v) {
    this.value = v;
    this.target = v;
    this.velocity = 0;
  }

  step(dt) {
    const force = (this.target - this.value) * this.stiffness;
    this.velocity += (force - this.velocity * this.damping) * dt;
    this.value += this.velocity * dt;
    return this.value;
  }
}

const POSE = {
  works: { desktop: { x: 0.15, y: 3.9, z: -3.4, s: 6.3 }, mobile: { x: 0, y: 4.9, z: -3.4, s: 4.4 } },
  // inspect: share of the visible frame the screen fills, and where its centre sits (fractions of the frame)
  inspect: { desktop: { dist: 3.6, width: 0.45, right: 0.2, up: 0.05 }, mobile: { dist: 3.4, width: 0.9, right: 0, up: 0.16 } }
};

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();

export class BigScreen {
  constructor(textureManager) {
    this.textureManager = textureManager;
    this.geometry = createScreenGeometry(40, 16);

    this.material = new THREE.ShaderMaterial({
      vertexShader: BIG_VERT,
      fragmentShader: BIG_FRAG,
      uniforms: {
        uMapA: { value: textureManager.getHiResTexture(0) },
        uMapB: { value: textureManager.getHiResTexture(1) },
        uPageRatio: { value: VIEW_RATIO },
        uOffsetA: { value: 0 },
        uOffsetB: { value: 0 },
        uFlatten: { value: 0 },
        uSlitProgress: { value: 0 },
        uOpacity: { value: 0 },
        uAccent: { value: new THREE.Color('#4aa8ff') }
      },
      transparent: true,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.visible = false;
    this.mesh.renderOrder = 2;

    this.liftSpring = new SpringValue(0, 90, 19); // its own spring out of the bottom ring
    this.inspectSpring = new SpringValue(0, 120, 21.9);
    this.rushSpring = new SpringValue(0, 160, 25.3);
    this.leafSpring = new SpringValue(1, 70, 16.7);

    this.sourcePos = new THREE.Vector3();
    this.sourceQuat = new THREE.Quaternion();
    this.sourceScale = new THREE.Vector3(1, 1, 1);

    this.mode = 'hidden'; // 'hidden' | 'works' | 'inspect'
    this.inspectSite = 0;
    this.leafFrom = 0;
  }

  startInspect(siteIndex, worldTransform) {
    this.mode = 'inspect';
    this.inspectSite = siteIndex;
    this.leafFrom = siteIndex;
    this.leafSpring.snap(1);
    this.sourcePos.copy(worldTransform.pos);
    this.sourceQuat.copy(worldTransform.quat);
    this.sourceScale.copy(worldTransform.scale);
    this.inspectSpring.snap(0);
    this.inspectSpring.target = 1;
    this.rushSpring.snap(0);
    this.mesh.visible = true;
  }

  /** Arrow keys: the next site comes in through the slits. */
  setInspectSite(siteIndex) {
    this.leafFrom = this.inspectSite;
    this.inspectSite = siteIndex;
    this.leafSpring.snap(0);
    this.leafSpring.target = 1;
  }

  endInspect() {
    this.inspectSpring.target = 0;
    this.rushSpring.target = 0;
  }

  triggerRush(entering) {
    this.rushSpring.target = entering ? 1 : 0;
  }

  _setSites(a, b, slit) {
    const u = this.material.uniforms;
    u.uMapA.value = this.textureManager.getHiResTexture(a);
    u.uMapB.value = this.textureManager.getHiResTexture(b);
    u.uOffsetA.value = this.textureManager.scrollOf(a);
    u.uOffsetB.value = this.textureManager.scrollOf(b);
    u.uSlitProgress.value = THREE.MathUtils.clamp(slit, 0, 1);
  }

  _updateInspect(dt, camera, isMobile) {
    const t = this.inspectSpring.step(dt);
    const rush = this.rushSpring.step(dt);
    const leaf = this.leafSpring.step(dt);

    if (this.inspectSpring.target === 0 && t < 0.02) {
      this.mode = 'hidden';
      this.mesh.visible = false;
      return { settledClosed: true };
    }

    this._setSites(this.leafFrom, this.inspectSite, leaf);
    const u = this.material.uniforms;
    u.uFlatten.value = THREE.MathUtils.smoothstep(t, 0.05, 0.85); // unrolls from the cone as it swings out
    u.uOpacity.value = 1;

    const pose = isMobile ? POSE.inspect.mobile : POSE.inspect.desktop;
    const frameH = 2 * pose.dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const frameW = frameH * camera.aspect;
    _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    _pos
      .copy(camera.position)
      .addScaledVector(_fwd, THREE.MathUtils.lerp(pose.dist, 0.42, rush))
      .addScaledVector(_right, THREE.MathUtils.lerp(pose.right * frameW, 0, rush))
      .addScaledVector(_up, THREE.MathUtils.lerp(pose.up * frameH, 0, rush));
    _scale.setScalar(THREE.MathUtils.lerp(pose.width * frameW, 1.0, rush));

    const ease = THREE.MathUtils.clamp(t, 0, 1.05);
    this.mesh.position.lerpVectors(this.sourcePos, _pos, ease);
    this.mesh.quaternion.slerpQuaternions(this.sourceQuat, camera.quaternion, Math.min(1, ease));
    this.mesh.scale.lerpVectors(this.sourceScale, _scale, ease);
    this.mesh.visible = true;
    return { settledClosed: false };
  }

  update(dt, { worksWeight, siteFloat, camera, isMobile, accentColor, reducedMotion }) {
    const stepDt = reducedMotion ? Math.min(0.05, dt * 4) : dt;
    this.material.uniforms.uAccent.value.copy(accentColor);

    if (this.mode === 'inspect') return this._updateInspect(stepDt, camera, isMobile);

    this.liftSpring.target = worksWeight;
    const lift = this.liftSpring.step(stepDt);
    if (lift < 0.01) {
      this.mesh.visible = false;
      this.mode = 'hidden';
      return { settledClosed: false };
    }
    this.mode = 'works';
    this.mesh.visible = true;

    // The scroll decides which two sites are on it and how far the slits have opened
    const base = THREE.MathUtils.clamp(Math.floor(siteFloat), 0, 8);
    const next = Math.min(8, base + 1);
    this._setSites(base, next, worksSlit(siteFloat - base));

    const u = this.material.uniforms;
    u.uFlatten.value = THREE.MathUtils.smoothstep(lift, 0.2, 0.9);
    u.uOpacity.value = THREE.MathUtils.smoothstep(lift, 0.0, 0.3);

    const pose = isMobile ? POSE.works.mobile : POSE.works.desktop;
    const l = THREE.MathUtils.clamp(lift, 0, 1.1);
    this.mesh.position.set(pose.x, THREE.MathUtils.lerp(-pose.s * 0.35, pose.y, l), pose.z);
    this.mesh.scale.setScalar(THREE.MathUtils.lerp(pose.s * 0.7, pose.s, Math.min(1, l)));
    this.mesh.lookAt(camera.position);
    return { settledClosed: false };
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/** Share of a site's scroll slice spent opening the slits to the next one. */
export function worksSlit(frac) {
  return THREE.MathUtils.clamp((frac - 0.62) / 0.33, 0, 1);
}
