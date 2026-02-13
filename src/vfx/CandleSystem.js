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
    const totalCandles = this.Q.candleCount || 48;
    const useLights = this.Q.candleLights !== false;
    const candlesPerSide = Math.ceil(totalCandles / 2);

    const zStart = -25;
    const zEnd = 18;
    const zSpan = zEnd - zStart;
    const yPos = 2.5; // wall sconce height (~eye level)

    // Shared geometries
    const bodyGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6);
    const flameGeo = new THREE.PlaneGeometry(0.08, 0.14);
    const bracketGeo = new THREE.BoxGeometry(0.06, 0.02, 0.06);

    // Shared materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xFFF8DC,
      roughness: 0.9,
      metalness: 0.0,
      emissive: 0xFFF8DC,
      emissiveIntensity: 0.05
    });
    const bracketMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.6,
      metalness: 0.4
    });

    for (let side = 0; side < 2; side++) {
      const xPos = side === 0 ? -10.3 : 10.3; // on column faces (columns at ±10)

      for (let i = 0; i < candlesPerSide; i++) {
        const z = zStart + (i / (candlesPerSide - 1)) * zSpan;
        const baseIntensity = 0.03;

        // --- Candle body ---
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(xPos, yPos, z);
        this.group.add(body);

        // --- Small bracket / mount ---
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

        // --- Warm point light (skipped on low tier) ---
        let light = null;
        if (useLights) {
          light = new THREE.PointLight(0xFFBF00, baseIntensity, 3);
          light.position.set(xPos, yPos + 0.12, z);
          this.group.add(light);
        }

        // Store reference
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
