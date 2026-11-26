import * as THREE from 'three';
import { PROJECTS } from '../data/projects.js';
import { VIEW_RATIO } from './sitePages.js';

export const RINGS = 8;
export const SLOTS = 9;
export const TOP_RADIUS = 14.5;
export const RING_RADIUS_SCALE = 0.885; // each ring 11.5% narrower than the one above
export const TILT_ANGLE = (17 * Math.PI) / 180; // screens lean back 17° to face up the shaft
export const SCREEN_ASPECT = 1.6; // 16:10
const SLOT_FILL = 0.95; // share of each slot's arc the screen covers
export const SCREEN_ARC = ((Math.PI * 2) / SLOTS) * SLOT_FILL;
const RING_GAP = 0.045; // vertical gap between rings, as a share of screen height
const FLOOR_CLEARANCE = 0.12;

/**
 * Ring layout. With a 17° lean and 11.5% steps, each ring's lower edge meets the
 * next ring's upper edge, so the eight rings read as one continuous cone.
 */
export const RING_LAYOUT = (() => {
  const rings = [];
  for (let r = 0; r < RINGS; r++) {
    const radius = TOP_RADIUS * Math.pow(RING_RADIUS_SCALE, r);
    const width = radius * SCREEN_ARC; // uniform scale applied to the unit screen
    const height = width / SCREEN_ASPECT;
    rings.push({ radius, scale: width, height, extent: height * Math.cos(TILT_ANGLE), y: 0 });
  }
  let y = FLOOR_CLEARANCE;
  for (let r = RINGS - 1; r >= 0; r--) {
    const ring = rings[r];
    ring.y = y + ring.extent / 2;
    y += ring.extent + ring.height * RING_GAP;
  }
  return rings;
})();
export const WELL_TOP_Y = RING_LAYOUT[0].y + RING_LAYOUT[0].extent / 2;

/**
 * Unit screen (width 1) bent into a section of the cone. Keeps flat and curved
 * positions as attributes so the big screen can unroll via uFlatten.
 */
export function createScreenGeometry(segX = 28, segY = 12) {
  const geo = new THREE.PlaneGeometry(1, 1, segX, segY);
  const pos = geo.attributes.position;
  const count = pos.count;
  const curved = new Float32Array(count * 3);
  const flat = new Float32Array(count * 3);
  const h = 1 / SCREEN_ASPECT;
  const coneRadius = 1 / SCREEN_ARC; // scaled by R * SCREEN_ARC this becomes the ring radius

  for (let i = 0; i < count; i++) {
    const nx = pos.getX(i);
    const localY = pos.getY(i) * h;
    flat.set([nx, localY, 0], i * 3);

    const theta = nx * SCREEN_ARC;
    const r = coneRadius + localY * Math.sin(TILT_ANGLE);
    const cx = Math.sin(theta) * r;
    const cz = coneRadius - Math.cos(theta) * r;
    const cy = localY * Math.cos(TILT_ANGLE);
    curved.set([cx, cy, cz], i * 3);
    pos.setXYZ(i, cx, cy, cz);
  }

  geo.setAttribute('aCurved', new THREE.BufferAttribute(curved, 3));
  geo.setAttribute('aFlat', new THREE.BufferAttribute(flat, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/** GLSL shared by the wall and the big screen: page window + rounded screen corners. */
export const SCREEN_GLSL = /* glsl */ `
  uniform float uPageRatio;
  vec2 pageUv(vec2 uv, float offset) {
    float py = offset * (1.0 - uPageRatio) + (1.0 - uv.y) * uPageRatio;
    return vec2(uv.x, 1.0 - py);
  }
  float screenSdf(vec2 uv, float r) {
    vec2 p = (uv - 0.5) * vec2(${SCREEN_ASPECT.toFixed(2)}, 1.0);
    vec2 q = abs(p) - (vec2(${(SCREEN_ASPECT / 2).toFixed(2)}, 0.5) - r);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
`;

const WALL_VERT = /* glsl */ `
  attribute float aRingIndex;
  attribute float aInstanceId;
  varying vec2 vUv;
  varying float vRing;
  varying float vInstanceId;
  varying float vWorldY;

  void main() {
    vUv = uv;
    vRing = aRingIndex;
    vInstanceId = aInstanceId;
    vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorldY = worldPos.y;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const WALL_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOffset;
  uniform float uRoll;
  uniform float uStreak;
  uniform float uHoveredInstance;
  uniform vec3 uAccent;
  uniform float uDim;
  ${SCREEN_GLSL}

  varying vec2 vUv;
  varying float vRing;
  varying float vInstanceId;
  varying float vWorldY;

  void main() {
    float d = screenSdf(vUv, 0.05);
    if (d > 0.0) discard;

    // The picture rolls up its screen with the scroll speed and settles square when you stop
    float o = clamp(uOffset + uRoll, 0.0, 1.0);
    vec3 col = texture2D(uMap, pageUv(vUv, o)).rgb;
    if (abs(uStreak) > 0.002) {
      for (int i = 1; i <= 5; i++) {
        float k = float(i) / 5.0;
        col += texture2D(uMap, pageUv(vUv, clamp(o + uStreak * 0.05 * k, 0.0, 1.0))).rgb * (1.0 - k * 0.5);
      }
      col /= 3.5;
    }

    // Glass: a soft inner falloff, a lit accent rim
    col *= mix(0.7, 1.0, smoothstep(0.0, -0.12, d));
    float isHovered = 1.0 - step(0.5, abs(vInstanceId - uHoveredInstance));
    float rim = 1.0 - smoothstep(0.004, 0.012 + isHovered * 0.012, -d);
    col = mix(col, uAccent * 1.15, rim * (0.55 + isHovered * 0.45));
    col += uAccent * isHovered * 0.06;

    // Blue bounce from the pool on the lowest rings
    col += vec3(0.03, 0.1, 0.32) * exp(-max(vWorldY, 0.0) * 0.35) * 0.6;

    gl_FragColor = vec4(col * uDim, 1.0);
    #include <colorspace_fragment>
  }
`;

export class WellWall {
  constructor(textureManager) {
    this.textureManager = textureManager;
    this.group = new THREE.Group();
    this.geometry = createScreenGeometry();
    this.meshes = []; // one InstancedMesh per site: nine draw calls for the whole wall
    this.ringAngles = new Float32Array(RINGS);
    this.ringSpeeds = new Float32Array(RINGS);
    this.totalDrumTurn = 0;
    this.roll = 0;
    this.fling = 0; // rad/s left over from a drag, decays like a heavy drum
    this.streak = 0;

    for (let r = 0; r < RINGS; r++) {
      this.ringAngles[r] = r * 0.42;
      this.ringSpeeds[r] = 0.04 * (1.0 + r * 0.28); // deeper rings turn faster, like water near a drain
    }

    this._dummy = new THREE.Object3D();
    this._hiddenKey = null;
    this.hovered = null;
    this._buildInstancedMeshes();
    this.group.add(this._buildDrum());
  }

  _buildInstancedMeshes() {
    for (let site = 0; site < SLOTS; site++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: WALL_VERT,
        fragmentShader: WALL_FRAG,
        uniforms: {
          uMap: { value: this.textureManager.getWallTexture(site) },
          uPageRatio: { value: VIEW_RATIO },
          uOffset: { value: 0 },
          uRoll: { value: 0 },
          uStreak: { value: 0 },
          uHoveredInstance: { value: -1 },
          uAccent: { value: new THREE.Color(PROJECTS[site].accent) },
          uDim: { value: 1.0 }
        },
        side: THREE.DoubleSide
      });

      const instGeo = this.geometry.clone();
      const ringAttr = new Float32Array(RINGS);
      const idAttr = new Float32Array(RINGS);
      for (let r = 0; r < RINGS; r++) {
        ringAttr[r] = r;
        idAttr[r] = r * SLOTS + site;
      }
      instGeo.setAttribute('aRingIndex', new THREE.InstancedBufferAttribute(ringAttr, 1));
      instGeo.setAttribute('aInstanceId', new THREE.InstancedBufferAttribute(idAttr, 1));

      const mesh = new THREE.InstancedMesh(instGeo, mat, RINGS);
      mesh.userData = { siteIndex: site };
      mesh.frustumCulled = false;
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
    this.updateMatrices();
  }

  /** Dark drum behind the screens, so the gaps read as a structure, not as void. */
  _buildDrum() {
    const pts = [];
    const lean = Math.tan(TILT_ANGLE);
    for (let r = RINGS - 1; r >= 0; r--) {
      const { radius, extent, y } = RING_LAYOUT[r];
      const back = radius * 0.012 + 0.04;
      pts.push(new THREE.Vector2(radius - (extent / 2) * lean + back, y - extent / 2));
      pts.push(new THREE.Vector2(radius + (extent / 2) * lean + back, y + extent / 2));
    }
    pts[0].y = 0; // the drum meets the floor
    const top = pts[pts.length - 1];
    pts.push(new THREE.Vector2(top.x + 0.6, top.y + 0.1), new THREE.Vector2(top.x + 40, top.y + 0.1));
    const geo = new THREE.LatheGeometry(pts, 96);
    const mat = new THREE.MeshBasicMaterial({ color: '#0b0607', side: THREE.DoubleSide });
    const drum = new THREE.Mesh(geo, mat);
    drum.renderOrder = -1;
    this.drum = drum;
    return drum;
  }

  /** Turn the drum by hand: every ring follows, the deeper ones a little more. */
  drag(dAngle) {
    for (let r = 0; r < RINGS; r++) this.ringAngles[r] += dAngle * (1 + r * 0.06);
    this.totalDrumTurn += dAngle;
  }

  setFling(radPerSec) {
    this.fling = THREE.MathUtils.clamp(radPerSec, -4, 4);
  }

  getRingRadius(ring) {
    return RING_LAYOUT[ring].radius;
  }

  getRingY(ring) {
    return RING_LAYOUT[ring].y;
  }

  getSiteForSlot(ring, slot) {
    return (slot + ring * 4) % SLOTS; // shifted four slots so a site never stacks straight down
  }

  getSlotForSite(ring, site) {
    return (site - ((ring * 4) % SLOTS) + SLOTS) % SLOTS;
  }

  setHiddenScreen(ring, slot) {
    this._hiddenKey = ring !== null ? { ring, slot } : null;
  }

  getScreenWorldTransform(ring, slot) {
    const { radius, y, scale } = RING_LAYOUT[ring];
    const a = (slot / SLOTS) * Math.PI * 2 + this.ringAngles[ring];
    return {
      pos: new THREE.Vector3(Math.sin(a) * radius, y, Math.cos(a) * radius),
      quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a + Math.PI, 0, 'YXZ')),
      scale: new THREE.Vector3(scale, scale, scale)
    };
  }

  update(dt, scrollVelocity, reducedMotion = false) {
    const motionScale = reducedMotion ? 0.2 : 1.0;
    const spinBoost = -scrollVelocity * 0.5; // climbing back spins the drum backwards

    let avgTurn = 0;
    for (let r = 0; r < RINGS; r++) {
      const delta = ((this.ringSpeeds[r] + spinBoost * (0.6 + r * 0.1)) * motionScale + this.fling * (1 + r * 0.06)) * dt;
      this.ringAngles[r] += delta;
      avgTurn += delta;
    }
    this.totalDrumTurn += avgTurn / RINGS;
    this.fling *= Math.exp(-dt * 1.4);

    const k = 1 - Math.exp(-dt * 9);
    this.roll += (THREE.MathUtils.clamp(scrollVelocity * 0.5, -0.25, 0.25) - this.roll) * k;
    this.streak += (THREE.MathUtils.clamp(scrollVelocity * 1.2, -1, 1) - this.streak) * k;

    for (let site = 0; site < SLOTS; site++) {
      const u = this.meshes[site].material.uniforms;
      u.uOffset.value = this.textureManager.scrollOf(site);
      u.uRoll.value = this.roll;
      u.uStreak.value = this.streak;
      u.uHoveredInstance.value = this.hovered && this.hovered.siteIndex === site ? this.hovered.globalId : -1;
    }

    this.updateMatrices();
  }

  updateMatrices() {
    const d = this._dummy;
    for (let site = 0; site < SLOTS; site++) {
      const mesh = this.meshes[site];
      for (let r = 0; r < RINGS; r++) {
        const slot = this.getSlotForSite(r, site);
        if (this._hiddenKey && this._hiddenKey.ring === r && this._hiddenKey.slot === slot) {
          d.position.set(0, -999, 0);
          d.scale.setScalar(0.0001);
        } else {
          const { pos, quat, scale } = this.getScreenWorldTransform(r, slot);
          d.position.copy(pos);
          d.quaternion.copy(quat);
          d.scale.copy(scale);
        }
        d.updateMatrix();
        mesh.setMatrixAt(r, d.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  raycastScreen(raycaster) {
    const hits = raycaster.intersectObjects(this.meshes, false);
    if (!hits.length) return null;
    const hit = hits[0];
    const siteIndex = hit.object.userData.siteIndex;
    const ring = hit.instanceId;
    if (ring === undefined) return null;
    return {
      siteIndex,
      ring,
      slot: this.getSlotForSite(ring, siteIndex),
      globalId: ring * SLOTS + siteIndex,
      point: hit.point
    };
  }

  /** The screen most squarely in front of the camera. */
  findFacingScreen(camera) {
    const camPos = camera.position;
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    let best = null;
    let bestScore = -Infinity;
    for (let r = 0; r < RINGS; r++) {
      for (let slot = 0; slot < SLOTS; slot++) {
        const { pos } = this.getScreenWorldTransform(r, slot);
        const toScreen = pos.sub(camPos);
        const dist = toScreen.length();
        if (dist < 2.0) continue;
        const score = toScreen.divideScalar(dist).dot(camDir) - dist * 0.012;
        if (score > bestScore) {
          bestScore = score;
          best = { siteIndex: this.getSiteForSlot(r, slot), ring: r, slot };
        }
      }
    }
    return best || { siteIndex: 0, ring: 3, slot: 0 };
  }

  dispose() {
    this.geometry.dispose();
    this.drum.geometry.dispose();
    this.drum.material.dispose();
    this.meshes.forEach((m) => {
      m.geometry.dispose();
      m.material.dispose();
    });
  }
}
