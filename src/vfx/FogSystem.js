/**
 * FogSystem - Volumetric-looking ground fog near the stage
 * Phase 5: VFX / Polish
 *
 * ~500 large, semi-transparent particles that drift near floor level
 * around the stage area (z 18-28). Audio-reactive density and speed.
 * Additive blending for an ethereal glow.
 */
import * as THREE from 'three';

export class FogSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.count = options.count || 500;
    this.tintColor = new THREE.Color(options.color !== undefined ? options.color : 0x8B00FF);

    /** @type {THREE.Points} */
    this.mesh = null;

    // Per-particle state
    this.velocities = [];
    this.rotations = [];       // spin speeds
    this.baseOpacities = [];   // individual base opacity

    this._build();
  }

  // ---------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------
  _build() {
    const positions = new Float32Array(this.count * 3);
    const opacities = new Float32Array(this.count);
    const sizes = new Float32Array(this.count);

    const zMin = 18;
    const zMax = 28;
    const xSpread = 12;  // slightly wider than the stage
    const yMin = 0;
    const yMax = 3;

    for (let i = 0; i < this.count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * xSpread * 2;          // x
      positions[i * 3 + 1] = yMin + Math.random() * (yMax - yMin);         // y
      positions[i * 3 + 2] = zMin + Math.random() * (zMax - zMin);         // z

      const baseOp = 0.03 + Math.random() * 0.05; // 0.03 – 0.08
      opacities[i] = baseOp;
      this.baseOpacities.push(baseOp);

      sizes[i] = 1.5 + Math.random() * 1.5; // 1.5 – 3.0

      this.velocities.push({
        x: (Math.random() - 0.5) * 0.15,
        y: (Math.random() - 0.5) * 0.04,
        z: (Math.random() - 0.5) * 0.1
      });

      this.rotations.push((Math.random() - 0.5) * 0.3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    // Custom ShaderMaterial for round, soft, tinted particles
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: this.tintColor },
        uGlobalOpacity: { value: 1.0 },
        uTime: { value: 0 }
      },
      vertexShader: /* glsl */ `
        attribute float aOpacity;
        attribute float aSize;
        varying float vOpacity;

        void main() {
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uGlobalOpacity;
        varying float vOpacity;

        void main() {
          // Soft radial falloff
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, dist) * vOpacity * uGlobalOpacity;

          // Mix white core with tint color at edges
          vec3 col = mix(vec3(1.0), uColor, smoothstep(0.0, 0.45, dist));
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });

    this.mesh = new THREE.Points(geometry, material);
    this.mesh.name = 'fogSystem';
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  // ---------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------
  update(time, delta, energy = 0) {
    if (!this.mesh) return;

    const positions = this.mesh.geometry.attributes.position.array;
    const opacities = this.mesh.geometry.attributes.aOpacity.array;

    const speedMult = 1.0 + energy * 4.0;
    const opacityMult = 1.0 + energy * 2.5;

    const zMin = 18;
    const zMax = 28;
    const xHalf = 12;
    const yMin = 0;
    const yMax = 3;

    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;

      // Move
      positions[idx]     += this.velocities[i].x * delta * speedMult;
      positions[idx + 1] += this.velocities[i].y * delta * speedMult;
      positions[idx + 2] += this.velocities[i].z * delta * speedMult;

      // Gentle sine drift
      positions[idx] += Math.sin(time * 0.3 + i * 0.7) * 0.003;
      positions[idx + 1] += Math.cos(time * 0.2 + i * 1.1) * 0.001;

      // Wrap bounds
      if (positions[idx] > xHalf) positions[idx] = -xHalf;
      if (positions[idx] < -xHalf) positions[idx] = xHalf;
      if (positions[idx + 1] > yMax) positions[idx + 1] = yMin;
      if (positions[idx + 1] < yMin) positions[idx + 1] = yMax;
      if (positions[idx + 2] > zMax) positions[idx + 2] = zMin;
      if (positions[idx + 2] < zMin) positions[idx + 2] = zMax;

      // Audio-reactive opacity
      opacities[i] = Math.min(0.12, this.baseOpacities[i] * opacityMult);
    }

    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.aOpacity.needsUpdate = true;

    // Update shader uniforms
    this.mesh.material.uniforms.uTime.value = time;
    this.mesh.material.uniforms.uGlobalOpacity.value = 0.7 + energy * 0.6;
  }
}
