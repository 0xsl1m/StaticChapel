/**
 * CandleSystem - Animated candle flames on wall sconces
 * Phase 5: VFX / Polish
 *
 * Quality-adaptive: 48 candles (high), 24 (medium), 8 (low)
 * Low tier skips PointLights entirely — flame visuals only.
 */
import * as THREE from 'three';

export class CandleSystem {
  constructor(scene, qualityConfig = {}) {
    this.scene = scene;
    this.Q = qualityConfig;
    this.group = new THREE.Group();
    this.group.name = 'candleSystem';
    this.scene.add(this.group);

    /** @type {Array<{light: THREE.PointLight|null, flame: THREE.Mesh, baseIntensity: number, flickerOffset: number}>} */
    this.candles = [];

    this._build();
  }

  // ---------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------
  _build() {
    const useLights = this.Q.candleLights !== false;
    const yPos = 3; // wall sconce height (matches cathedral wall sconces)

    // Place candles ONLY at the 7 sconce positions per side (14 total)
    // Cathedral sconces: naveLength=60, spacing=60/8=7.5, z = -30 + 7.5*(i+1)
    const naveLength = 60;
    const sconceSpacing = naveLength / 8;
    const sconceZPositions = [];
    for (let i = 0; i < 7; i++) {
      sconceZPositions.push(-naveLength / 2 + sconceSpacing * (i + 1));
    }

    // Shared geometries
    const bodyGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6);
    const flameGeo = new THREE.PlaneGeometry(0.08, 0.14);

    // Shared materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xFFF8DC,
      roughness: 0.9,
      metalness: 0.0,
      emissive: 0xFFF8DC,
      emissiveIntensity: 0.05
    });

    for (const side of [-1, 1]) {
      const xPos = side * 9.7; // inner wall face (matches cathedral sconce x)

      for (const z of sconceZPositions) {
        const baseIntensity = 0.03;

        // Candle body sits in the sconce cup
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(xPos + side * 0.8, yPos + 0.06, z);
        this.group.add(body);

        // Flame plane (billboard)
        const flameMat = new THREE.MeshBasicMaterial({
          color: 0xFFAA00,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(xPos + side * 0.8, yPos + 0.06 + 0.075 + 0.04, z);
        this.group.add(flame);

        // Warm point light (skipped on low tier)
        let light = null;
        if (useLights) {
          light = new THREE.PointLight(0xFFBF00, baseIntensity, 3);
          light.position.set(xPos + side * 0.8, yPos + 0.18, z);
          this.group.add(light);
        }

        this.candles.push({
          light,
          flame,
          baseIntensity,
          flickerOffset: Math.random() * Math.PI * 2
        });
      }
    }
  }

  // ---------------------------------------------------------------
  // Update (call every frame — main.js may throttle this)
  // ---------------------------------------------------------------
  update(time) {
    for (let i = 0; i < this.candles.length; i++) {
      const c = this.candles[i];

      // --- Light flicker ---
      const flicker =
        Math.sin(time * 5.0 + c.flickerOffset) * 0.3 +
        Math.sin(time * 13.0 + c.flickerOffset * 2.7) * 0.15 +
        (Math.random() - 0.5) * 0.15;

      if (c.light) {
        c.light.intensity = Math.max(0.02, c.baseIntensity + c.baseIntensity * flicker);
      }

      // --- Flame billboard rotation ---
      c.flame.rotation.y = Math.sin(time * 2.0 + c.flickerOffset) * 0.3;

      // --- Flame scale pulsation ---
      const scaleVar = 1.0 + Math.sin(time * 4.0 + c.flickerOffset) * 0.15;
      c.flame.scale.set(scaleVar, scaleVar * (1.0 + Math.sin(time * 7.0 + c.flickerOffset) * 0.1), 1);

      // --- Flame opacity variation ---
      c.flame.material.opacity = 0.7 + Math.sin(time * 6.0 + c.flickerOffset) * 0.15;
    }
  }
}
