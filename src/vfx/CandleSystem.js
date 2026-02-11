/**
 * CandleSystem - 48 animated candle flames on wall sconces
 * Phase 5: VFX / Polish
 *
 * 24 candles per side along the nave walls, each with:
 *   - Cream cylinder candle body
 *   - Billboard flame plane (emissive yellow-orange)
 *   - Warm PointLight with random flicker
 */
import * as THREE from 'three';

export class CandleSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'candleSystem';
    this.scene.add(this.group);

    /** @type {Array<{light: THREE.PointLight, flame: THREE.Mesh, baseIntensity: number, flickerOffset: number}>} */
    this.candles = [];

    this._build();
  }

  // ---------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------
  _build() {
    const candlesPerSide = 24;
    const zStart = -25;
    const zEnd = 18;
    const zSpan = zEnd - zStart;
    const yPos = 3; // wall bracket height

    // Shared geometries
    const bodyGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6);
    const flameGeo = new THREE.PlaneGeometry(0.08, 0.14);

    // Shared materials (cloned per-candle where needed for independent opacity)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xFFF8DC,
      roughness: 0.9,
      metalness: 0.0,
      emissive: 0xFFF8DC,
      emissiveIntensity: 0.05
    });

    for (let side = 0; side < 2; side++) {
      const xPos = side === 0 ? -9.5 : 9.5;

      for (let i = 0; i < candlesPerSide; i++) {
        const z = zStart + (i / (candlesPerSide - 1)) * zSpan;
        const baseIntensity = 0.03;

        // --- Candle body ---
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(xPos, yPos, z);
        this.group.add(body);

        // --- Small bracket / mount ---
        const bracketGeo = new THREE.BoxGeometry(0.06, 0.02, 0.06);
        const bracketMat = new THREE.MeshStandardMaterial({
          color: 0x2a2a2a,
          roughness: 0.6,
          metalness: 0.4
        });
        const bracket = new THREE.Mesh(bracketGeo, bracketMat);
        bracket.position.set(xPos, yPos - 0.075 - 0.01, z);
        this.group.add(bracket);

        // --- Flame plane (billboard) ---
        const flameMat = new THREE.MeshBasicMaterial({
          color: 0xFFAA00,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(xPos, yPos + 0.075 + 0.06, z);
        this.group.add(flame);

        // --- Warm point light ---
        const light = new THREE.PointLight(0xFFBF00, baseIntensity, 3);
        light.position.set(xPos, yPos + 0.12, z);
        this.group.add(light);

        // Store reference
        this.candles.push({
          light,
          flame,
          baseIntensity,
          flickerOffset: Math.random() * Math.PI * 2 // desync each candle
        });
      }
    }
  }

  // ---------------------------------------------------------------
  // Update (call every frame)
  // ---------------------------------------------------------------
  update(time) {
    for (let i = 0; i < this.candles.length; i++) {
      const c = this.candles[i];

      // --- Light flicker ---
      // Combine two sine waves at different frequencies + a small random jitter
      const flicker =
        Math.sin(time * 5.0 + c.flickerOffset) * 0.3 +
        Math.sin(time * 13.0 + c.flickerOffset * 2.7) * 0.15 +
        (Math.random() - 0.5) * 0.15;

      c.light.intensity = Math.max(0.02, c.baseIntensity + c.baseIntensity * flicker);

      // --- Flame billboard — always face camera ---
      // We rotate the flame to face the camera by clearing x/z rotation and
      // applying a lookAt toward the camera. A cheaper approach: just rotate
      // on Y so the flat plane always shows its face down the nave.
      // For true billboarding the caller can pass the camera, but a simple
      // quaternion copy from the camera works well since PlaneGeometry faces +Z.
      // We'll use onBeforeRender in the mesh instead for efficiency, but for
      // simplicity just wiggle the Y rotation randomly:
      c.flame.rotation.y = Math.sin(time * 2.0 + c.flickerOffset) * 0.3;

      // --- Flame scale pulsation ---
      const scaleVar = 1.0 + Math.sin(time * 4.0 + c.flickerOffset) * 0.15;
      c.flame.scale.set(scaleVar, scaleVar * (1.0 + Math.sin(time * 7.0 + c.flickerOffset) * 0.1), 1);

      // --- Flame opacity variation ---
      c.flame.material.opacity = 0.7 + Math.sin(time * 6.0 + c.flickerOffset) * 0.15;
    }
  }
}
