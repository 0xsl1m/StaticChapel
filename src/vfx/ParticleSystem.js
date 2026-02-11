/**
 * ParticleSystem - Dust motes floating in light beams
 */
import * as THREE from 'three';

export class DustMotes {
  constructor(scene, count = 3000) {
    this.scene = scene;
    this.count = count;
    this.particles = null;
    this.velocities = [];
    this.opacityScale = 0; // start invisible (slider default = 0)

    this.create();
  }

  /**
   * Set opacity scale from settings slider (0 = invisible, 1 = full)
   */
  setOpacityScale(scale) {
    this.opacityScale = scale;
    if (this.particles) {
      this.particles.visible = scale > 0;
      this.particles.material.opacity = scale > 0 ? 0 : 0; // update() will handle actual opacity
    }
  }

  create() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    const opacities = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      // Spread throughout cathedral volume
      positions[i * 3]     = (Math.random() - 0.5) * 30;  // x
      positions[i * 3 + 1] = Math.random() * 28 + 1;       // y (above floor)
      positions[i * 3 + 2] = (Math.random() - 0.5) * 58;  // z

      opacities[i] = Math.random() * 0.5 + 0.1;

      this.velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.01 + 0.005, // slight upward drift
        z: (Math.random() - 0.5) * 0.02
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    const material = new THREE.PointsMaterial({
      color: 0xFFD700,
      size: 0.08,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.name = 'dustMotes';
    this.particles.visible = false; // start invisible
    this.scene.add(this.particles);
  }

  update(delta, audioEnergy = 0) {
    if (!this.particles) return;

    const positions = this.particles.geometry.attributes.position.array;

    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;

      // Apply velocity with audio reactivity
      const energyBoost = 1 + audioEnergy * 3;
      positions[idx]     += this.velocities[i].x * energyBoost;
      positions[idx + 1] += this.velocities[i].y * energyBoost;
      positions[idx + 2] += this.velocities[i].z * energyBoost;

      // Wrap around bounds
      if (positions[idx] > 15) positions[idx] = -15;
      if (positions[idx] < -15) positions[idx] = 15;
      if (positions[idx + 1] > 29) positions[idx + 1] = 1;
      if (positions[idx + 1] < 1) positions[idx + 1] = 29;
      if (positions[idx + 2] > 29) positions[idx + 2] = -29;
      if (positions[idx + 2] < -29) positions[idx + 2] = 29;

      // Add subtle sine wave motion
      positions[idx] += Math.sin(Date.now() * 0.0003 + i) * 0.002;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;

    // Pulse brightness with audio, scaled by particle count slider
    const baseOpacity = 0.3 + audioEnergy * 0.5;
    this.particles.material.opacity = baseOpacity * this.opacityScale;
  }
}
