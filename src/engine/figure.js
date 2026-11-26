import * as THREE from 'three';

const FIGURE_VERT = /* glsl */ `
  varying vec3 vNormalWorld;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FIGURE_FRAG = /* glsl */ `
  uniform vec3 uRimColor;
  uniform vec3 uLightDir;

  varying vec3 vNormalWorld;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    vec3 N = normalize(vNormalWorld);
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(uLightDir);

    // Lit from behind by the screen he watches: a dark body, a thin rim, blue from the pool below
    vec3 base = vec3(0.008, 0.009, 0.013);
    float facing = max(dot(N, V), 0.0);
    float fresnel = pow(1.0 - facing, 4.0);
    float toLight = smoothstep(-0.2, 0.9, dot(N, L));
    vec3 rim = uRimColor * fresnel * toLight * 1.4;
    vec3 key = uRimColor * max(dot(N, L), 0.0) * 0.035;
    float floorBounce = max(-N.y, 0.0) * exp(-vWorldPos.y * 1.2);
    vec3 bounce = vec3(0.02, 0.08, 0.45) * (floorBounce * 0.5 + pow(1.0 - facing, 2.0) * exp(-vWorldPos.y * 1.6) * 0.25);
    gl_FragColor = vec4(base + rim + key + bounce, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Articulated lone figure in a long overcoat standing at the bottom of the well.
 * Head, neck, and chest turn toward whatever has attention (head first),
 * with a breathing idle and look-up at the finale.
 */
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class WatcherFigure {
  constructor() {
    this.group = new THREE.Group();
    this.material = new THREE.ShaderMaterial({
      vertexShader: FIGURE_VERT,
      fragmentShader: FIGURE_FRAG,
      uniforms: {
        uRimColor: { value: new THREE.Color('#4aa8ff') },
        uLightDir: { value: new THREE.Vector3(0, 0.4, 1) }
      }
    });

    this.pelvis = new THREE.Group();
    this.chest = new THREE.Group();
    this.neck = new THREE.Group();
    this.head = new THREE.Group();

    this._buildMesh();

    this.headYaw = 0;
    this.chestYaw = 0;
    this.bodyYaw = 0;
    this.headPitch = 0;
    this.neckPitch = 0;
  }

  _buildMesh() {
    const mat = this.material;
    const mesh = (geo, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      return m;
    };
    const lathe = (pts, sx, sz) => {
      const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 32);
      geo.scale(sx, 1, sz);
      return mesh(geo);
    };
    const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 12);

    // Legs, weight on the right, the left a touch forward
    for (const side of [-1, 1]) {
      const fwd = side < 0 ? 0.035 : -0.01;
      const shin = mesh(capsule(0.052, 0.36), side * 0.095, 0.26, fwd);
      shin.rotation.z = side * 0.025;
      const thigh = mesh(capsule(0.068, 0.3), side * 0.09, 0.6, fwd * 0.6);
      const shoe = mesh(capsule(0.046, 0.15), side * 0.1, 0.045, fwd + 0.045);
      shoe.rotation.x = Math.PI / 2;
      shoe.scale.set(1, 1, 0.75);
      this.group.add(shin, thigh, shoe);
    }

    // Coat below the belt: falls straight to just under the knee
    this.pelvis.add(
      lathe([[0, 0.43], [0.232, 0.43], [0.228, 0.5], [0.212, 0.75], [0.2, 0.93], [0.178, 1.06], [0, 1.06]], 1.05, 0.66)
    );
    this.group.add(this.pelvis);

    // Chest: broad coat shoulders, collar turned up
    this.chest.position.set(0, 1.05, 0);
    this.chest.add(
      lathe([[0, 0], [0.172, 0], [0.18, 0.12], [0.198, 0.28], [0.2, 0.35], [0.15, 0.42], [0.07, 0.46], [0, 0.46]], 1.08, 0.64)
    );
    for (const side of [-1, 1]) {
      const pad = mesh(new THREE.SphereGeometry(0.07, 16, 12), side * 0.19, 0.355, 0);
      pad.scale.set(1, 0.7, 0.85);
      this.chest.add(pad);
    }
    this.chest.add(lathe([[0.072, 0.41], [0.112, 0.44], [0.1, 0.56], [0.075, 0.55]], 1, 0.92));

    // Sleeves: upper arm, a slight bend at the elbow, hands by the pockets
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.215, 0.35, 0);
      shoulder.rotation.z = side * 0.1;
      shoulder.add(mesh(capsule(0.06, 0.26), 0, -0.17, 0));
      const elbow = new THREE.Group();
      elbow.position.y = -0.33;
      elbow.rotation.x = -0.16;
      elbow.add(mesh(capsule(0.052, 0.24), 0, -0.15, 0));
      const hand = mesh(new THREE.SphereGeometry(0.042, 12, 10), 0, -0.31, 0.005);
      hand.scale.set(0.75, 1.25, 0.6);
      elbow.add(hand);
      shoulder.add(elbow);
      this.chest.add(shoulder);
    }
    this.pelvis.add(this.chest);

    this.neck.position.set(0, 0.46, 0);
    this.neck.add(mesh(new THREE.CylinderGeometry(0.046, 0.054, 0.11, 12), 0, 0.04, 0));
    this.chest.add(this.neck);

    // Head: skull, jaw, short hair
    this.head.position.set(0, 0.08, 0);
    const skull = mesh(new THREE.SphereGeometry(0.098, 24, 18), 0, 0.105, 0);
    skull.scale.set(0.82, 1.06, 0.96);
    const jaw = mesh(new THREE.SphereGeometry(0.07, 16, 12), 0, 0.05, 0.022);
    jaw.scale.set(0.88, 0.85, 0.95);
    const hair = mesh(new THREE.SphereGeometry(0.102, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, 0.112, -0.008);
    hair.scale.set(0.85, 0.95, 0.98);
    this.head.add(skull, jaw, hair);
    this.neck.add(this.head);
  }

  /**
   * Updates breathing idle, head-first look-at toward targetWorldPos,
   * and rim color matching the watched site.
   */
  update(dt, time, targetWorldPos, rimColor) {
    // Breathing idle and a slow shift of weight
    const breath = Math.sin(time * 1.45);
    this.chest.position.y = 1.05 + breath * 0.008;
    this.chest.rotation.x = breath * 0.012;
    this.pelvis.rotation.z = Math.sin(time * 0.37) * 0.012;

    const dy = targetWorldPos.y - 1.9;
    const horizDist = Math.max(0.1, Math.hypot(targetWorldPos.x, targetWorldPos.z));
    const targetYaw = Math.atan2(targetWorldPos.x, targetWorldPos.z);
    const targetPitch = THREE.MathUtils.clamp(Math.atan2(dy, horizDist), -0.4, 0.9);

    // Head first, then chest, then the whole body follows (always the short way round)
    const toward = (from, k) => from + wrapAngle(targetYaw - from) * Math.min(1, dt * k);
    this.headYaw = toward(this.headYaw, 6.5);
    this.chestYaw = toward(this.chestYaw, 2.6);
    this.bodyYaw = toward(this.bodyYaw, 0.9);

    this.headPitch = THREE.MathUtils.lerp(this.headPitch, targetPitch, Math.min(1, dt * 5.0));
    this.neckPitch = THREE.MathUtils.lerp(this.neckPitch, targetPitch * 0.4, Math.min(1, dt * 3.5));

    this.group.rotation.y = this.bodyYaw;
    this.chest.rotation.y = THREE.MathUtils.clamp(wrapAngle(this.chestYaw - this.bodyYaw), -0.6, 0.6);
    const headTurn = wrapAngle(this.headYaw - this.bodyYaw) - this.chest.rotation.y;
    this.neck.rotation.y = THREE.MathUtils.clamp(headTurn * 0.35, -0.4, 0.4);
    this.head.rotation.y = THREE.MathUtils.clamp(headTurn - this.neck.rotation.y, -0.9, 0.9);

    this.neck.rotation.x = -this.neckPitch;
    this.head.rotation.x = -(this.headPitch - this.neckPitch);

    // Update rim shader uniforms
    this.material.uniforms.uRimColor.value.lerp(rimColor, Math.min(1, dt * 6));
    const lightDir = targetWorldPos.clone().sub(new THREE.Vector3(0, 1.5, 0)).normalize();
    this.material.uniforms.uLightDir.value.copy(lightDir);
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.isMesh) obj.geometry.dispose();
    });
    this.material.dispose();
  }
}
