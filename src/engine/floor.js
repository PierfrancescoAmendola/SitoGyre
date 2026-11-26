import * as THREE from 'three';

const FLOOR_VERT = /* glsl */ `
  varying vec2 vWorldXZ;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldXZ = wp.xz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FLOOR_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec2 uLightDir;
  uniform vec3 uAccent;
  uniform float uShadowIntensity;

  varying vec2 vWorldXZ;

  void main() {
    float dist = length(vWorldXZ);

    // A pool of blue light filling the bottom of the well (linear colour)
    vec3 rimBlue = vec3(0.004, 0.025, 0.2);
    vec3 cobalt = vec3(0.02, 0.1, 0.85);
    vec3 hot = vec3(0.12, 0.3, 1.0);
    vec3 col = mix(rimBlue, cobalt, exp(-dist * dist * 0.045));
    col += hot * exp(-dist * dist * 0.5) * 0.35;
    col += sin(dist * 3.2 - uTime * 1.1) * 0.012 * exp(-dist * 0.4);
    col += uAccent * exp(-dist * dist * 0.3) * 0.05; // tint from the site he watches

    // Long analytic shadow of the figure, cast away from the screen he watches
    vec2 shadowDir = normalize(-uLightDir);
    float along = dot(vWorldXZ, shadowDir);
    float perp = abs(vWorldXZ.x * (-shadowDir.y) + vWorldXZ.y * shadowDir.x);
    float k = clamp(along / 6.5, 0.0, 1.0);
    float halfWidth = mix(0.16, 0.42, k);
    float penumbra = mix(0.04, 0.3, k);
    float sideMask = 1.0 - smoothstep(halfWidth - penumbra, halfWidth + penumbra, perp);
    float lenMask = smoothstep(-0.1, 0.15, along) * (1.0 - smoothstep(3.5, 6.8, along));
    col *= 1.0 - sideMask * lenMask * uShadowIntensity * 0.85;

    // Feet contact shadow
    col *= 1.0 - exp(-dist * dist * 18.0) * 0.6;

    // Falls off into the drum
    col *= mix(1.0, 0.25, smoothstep(3.8, 6.2, dist));

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export class WellFloor {
  constructor() {
    const geo = new THREE.CircleGeometry(7.5, 96);
    geo.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      vertexShader: FLOOR_VERT,
      fragmentShader: FLOOR_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uLightDir: { value: new THREE.Vector2(0, 1) },
        uAccent: { value: new THREE.Color('#4aa8ff') },
        uShadowIntensity: { value: 0.92 }
      }
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.y = 0;
  }

  update(time, lightDir2D, accentColor) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uLightDir.value.copy(lightDir2D);
    this.material.uniforms.uAccent.value.lerp(accentColor, 0.08);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
