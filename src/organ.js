/**
 * PipeOrgan - Massive gothic pipe organ rising behind the altar
 * Phase 3: Audio-reactive pipe illumination by frequency band
 *
 * Position: against the front wall (z ~ 29), rising from stage height (1.5m) to ~25m
 * ~200 instanced pipes arranged in classic organ facade pattern
 * 5 tiers of keyboard manuals (visual only)
 */
import * as THREE from 'three';

// --- Color constants ---
const MARBLE_COLOR = 0x2e2e34;   // dark charcoal marble with gold veins
const METAL_COLOR = 0xc0c0cc;    // bright silver metallic for pipes
const GOLD_COLOR = 0xFFD700;

// --- Frequency band glow colors (metallic tones) ---
const BAND_COLORS = {
  subBass: new THREE.Color(0x4a4a55),   // dark steel / iron
  bass:    new THREE.Color(0x8B4513),   // dark bronze
  lowMid:  new THREE.Color(0xB87333),   // copper
  mid:     new THREE.Color(0xDAA520),   // warm gold
  highMid: new THREE.Color(0xFFD700),   // bright gold
  treble:  new THREE.Color(0xD0D0DD),   // bright silver / platinum
};

/**
 * Map a pipe index (0 = leftmost, count-1 = rightmost) to a frequency band.
 * Bass pipes are on the flanks, treble pipes in the center.
 */
function pipeBandFromNormalized(t) {
  // t = 0..1 where 0 = far left, 1 = far right
  // distance from center: 0 at edges, 1 at center
  const center = Math.abs(t - 0.5) * 2; // 1 at edges, 0 at center
  // Invert so center = 1, edges = 0
  const fromCenter = 1 - center;

  if (center > 0.85)  return 'subBass';
  if (center > 0.70)  return 'bass';
  if (center > 0.50)  return 'lowMid';
  if (center > 0.30)  return 'mid';
  if (center > 0.15)  return 'highMid';
  return 'treble';
}

export class PipeOrgan {
  /**
   * @param {THREE.Scene} scene
   * @param {Object} [textures] - { wood, metal } from TextureGenerator
   */
  constructor(scene, textures = {}, qualityConfig = {}) {
    this.scene = scene;
    this.textures = textures;
    this.Q = qualityConfig;
    this.group = new THREE.Group();
    this.group.name = 'pipeOrgan';

    // Organ placement: centered on x, against the front wall
    this.organX = 0;
    this.organZ = 29;         // just in front of the front wall at z=30
    this.baseY = 1.5;         // stage surface height
    this.totalHeight = 25;    // top of tallest pipes

    // Pipe data for audio reactivity
    this.pipes = [];          // { mesh, band, baseEmissive }
    this.pipeMaterials = [];  // shared materials per band for batched updates

    this.build();
    this.scene.add(this.group);
  }

  // ------------------------------------------------------------------
  //  BUILD
  // ------------------------------------------------------------------
  build() {
    this.createCaseFrame();
    this.createPipes();
    this.createKeyboardManuals();
    this.createDecorations();
  }

  // ------------------------------------------------------------------
  //  CASE / FRAME  - dark oak housing
  // ------------------------------------------------------------------
  createCaseFrame() {
    const marbleMatProps = {
      color: MARBLE_COLOR,
      roughness: 0.25,
      metalness: 0.1,
    };
    const marbleMat = new THREE.MeshStandardMaterial(marbleMatProps);

    // Gold accent material for trim and decorative elements
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: GOLD_COLOR,
      roughness: 0.2,
      metalness: 0.9,
    });

    // Central back panel
    const backW = 14;
    const backH = this.totalHeight - this.baseY;
    const backD = 0.6;
    const backPanel = new THREE.Mesh(
      new THREE.BoxGeometry(backW, backH, backD),
      marbleMat
    );
    backPanel.position.set(this.organX, this.baseY + backH / 2, this.organZ + backD / 2);
    backPanel.castShadow = true;
    backPanel.receiveShadow = true;
    this.group.add(backPanel);

    // Gold horizontal trim bands across the back panel
    [0.2, 0.4, 0.6, 0.8].forEach(frac => {
      const trimY = this.baseY + backH * frac;
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(backW + 0.1, 0.08, backD + 0.05),
        goldTrimMat
      );
      trim.position.set(this.organX, trimY, this.organZ + backD / 2);
      this.group.add(trim);
    });

    // Side towers (taller flanking sections)
    const towerW = 1.8;
    const towerH = backH + 2;
    const towerD = 1.2;

    [-1, 1].forEach(side => {
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(towerW, towerH, towerD),
        marbleMat
      );
      tower.position.set(
        this.organX + side * (backW / 2 + towerW / 2 - 0.3),
        this.baseY + towerH / 2,
        this.organZ
      );
      tower.castShadow = true;
      this.group.add(tower);

      // Gold vertical trim on tower edges
      const edgeTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, towerH, 0.08),
        goldTrimMat
      );
      edgeTrim.position.set(
        tower.position.x - side * (towerW / 2 - 0.04),
        this.baseY + towerH / 2,
        this.organZ - towerD / 2
      );
      this.group.add(edgeTrim);

      // Pointed tower cap — gold
      const capGeo = new THREE.ConeGeometry(towerW / 1.4, 2.5, 4);
      const cap = new THREE.Mesh(capGeo, goldTrimMat);
      cap.position.set(
        tower.position.x,
        this.baseY + towerH + 1.25,
        this.organZ
      );
      cap.rotation.y = Math.PI / 4;
      this.group.add(cap);
    });

    // Central pointed crown — gold
    const crownGeo = new THREE.ConeGeometry(2, 3, 4);
    const crown = new THREE.Mesh(crownGeo, goldTrimMat);
    crown.position.set(this.organX, this.baseY + backH + 1.5, this.organZ);
    crown.rotation.y = Math.PI / 4;
    this.group.add(crown);
  }

  // ------------------------------------------------------------------
  //  PIPES  - ~200 pipes in classic facade arrangement
  // ------------------------------------------------------------------
  createPipes() {
    const metalMatProps = {
      color: METAL_COLOR,
      roughness: 0.15,
      metalness: 0.9,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
    };
    const metalMat = new THREE.MeshStandardMaterial(metalMatProps);

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: GOLD_COLOR,
      roughness: 0.25,
      metalness: 0.9,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
    });

    // We create pipes in several rows/tiers within the case.
    // Each row has a different base Y and pipe count.
    const rows = [
      { y: this.baseY + 1.0,  count: 45, minH: 0.6,  maxH: 5.0,  minR: 0.03,  maxR: 0.12, zOff: -0.3 },
      { y: this.baseY + 5.5,  count: 40, minH: 0.5,  maxH: 4.5,  minR: 0.025, maxR: 0.10, zOff: -0.15 },
      { y: this.baseY + 10.0, count: 38, minH: 0.4,  maxH: 5.0,  minR: 0.025, maxR: 0.10, zOff: 0.0 },
      { y: this.baseY + 15.0, count: 35, minH: 0.3,  maxH: 4.0,  minR: 0.02,  maxR: 0.08, zOff: 0.1 },
      { y: this.baseY + 19.5, count: 30, minH: 0.3,  maxH: 3.5,  minR: 0.02,  maxR: 0.07, zOff: 0.2 },
    ];

    const totalWidth = 12; // horizontal spread for pipes

    const maxRows = this.Q.maxPipeRows || 5;
    const pipeRadSeg = this.Q.pipeRadialSegments || 8;

    rows.slice(0, maxRows).forEach(row => {
      for (let i = 0; i < row.count; i++) {
        const t = row.count === 1 ? 0.5 : i / (row.count - 1); // 0..1

        // Classic organ facade: tallest/widest at flanks, shortest/thinnest at center
        const fromCenter = 1 - Math.abs(t - 0.5) * 2; // 0 at edges, 1 at center
        const edgeFactor = 1 - fromCenter;              // 1 at edges, 0 at center

        const height = THREE.MathUtils.lerp(row.minH, row.maxH, edgeFactor);
        const radius = THREE.MathUtils.lerp(row.minR, row.maxR, edgeFactor);

        // Pipe body
        const pipeGeo = new THREE.CylinderGeometry(radius, radius, height, pipeRadSeg);
        const pipeMat = metalMat.clone();
        const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);

        const x = this.organX + (t - 0.5) * totalWidth;
        const y = row.y + height / 2;
        const z = this.organZ + row.zOff;

        pipeMesh.position.set(x, y, z);
        pipeMesh.castShadow = true;
        this.group.add(pipeMesh);

        // Gold flare at the top of each pipe
        const flareGeo = new THREE.CylinderGeometry(radius * 1.5, radius, radius * 2, pipeRadSeg);
        const flareMat = goldAccentMat.clone();
        const flareMesh = new THREE.Mesh(flareGeo, flareMat);
        flareMesh.position.set(x, row.y + height + radius, z);
        this.group.add(flareMesh);

        // Determine which frequency band this pipe belongs to
        const band = pipeBandFromNormalized(t);

        this.pipes.push({
          body: pipeMesh,
          bodyMat: pipeMat,
          flare: flareMesh,
          flareMat: flareMat,
          band: band,
        });
      }
    });
  }

  // ------------------------------------------------------------------
  //  KEYBOARD MANUALS (5 tiers, visual only)
  // ------------------------------------------------------------------
  createKeyboardManuals() {
    const keyboardMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.6,
      metalness: 0.2,
    });
    const ivoryMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFF0,
      roughness: 0.5,
      metalness: 0.0,
    });

    const consoleX = this.organX;
    const consoleZ = this.organZ - 0.3; // tight against organ back panel, behind LED screens
    const consoleBaseY = this.baseY + 0.3;

    // Console housing — marble to match organ case
    const housingGeo = new THREE.BoxGeometry(2.5, 3.0, 1.2);
    const housingMat = new THREE.MeshStandardMaterial({
      color: MARBLE_COLOR, roughness: 0.3, metalness: 0.1
    });
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.set(consoleX, consoleBaseY + 1.5, consoleZ);
    housing.castShadow = true;
    this.group.add(housing);

    // 5 manual keyboards stacked
    for (let m = 0; m < 5; m++) {
      const kbY = consoleBaseY + 0.6 + m * 0.35;
      const kbAngle = -0.25; // slight tilt toward organist

      const keyboardGroup = new THREE.Group();

      // Black backing
      const backingGeo = new THREE.BoxGeometry(2.0, 0.04, 0.35);
      const backing = new THREE.Mesh(backingGeo, keyboardMat);
      keyboardGroup.add(backing);

      // Ivory keys (simplified as a single strip)
      const keysGeo = new THREE.BoxGeometry(1.9, 0.03, 0.28);
      const keys = new THREE.Mesh(keysGeo, ivoryMat);
      keys.position.y = 0.025;
      keys.position.z = -0.02;
      keyboardGroup.add(keys);

      // Black keys (small dark blocks)
      for (let k = 0; k < 15; k++) {
        const bkGeo = new THREE.BoxGeometry(0.04, 0.04, 0.16);
        const bk = new THREE.Mesh(bkGeo, keyboardMat);
        bk.position.set(-0.9 + k * 0.13, 0.04, -0.08);
        keyboardGroup.add(bk);
      }

      keyboardGroup.position.set(consoleX, kbY, consoleZ - 0.3);
      keyboardGroup.rotation.x = kbAngle;
      this.group.add(keyboardGroup);
    }

    // Pedalboard (at floor level)
    const pedalGeo = new THREE.BoxGeometry(2.0, 0.08, 0.8);
    const pedalMat = new THREE.MeshStandardMaterial({
      color: MARBLE_COLOR,
      roughness: 0.3,
      metalness: 0.1,
    });
    const pedals = new THREE.Mesh(pedalGeo, pedalMat);
    pedals.position.set(consoleX, this.baseY + 0.04, consoleZ - 0.6);
    this.group.add(pedals);

    // Bench
    const benchGeo = new THREE.BoxGeometry(1.8, 0.1, 0.5);
    const bench = new THREE.Mesh(benchGeo, pedalMat);
    bench.position.set(consoleX, this.baseY + 0.55, consoleZ - 1.2);
    this.group.add(bench);
    // Bench legs
    [[-0.8, -0.4], [-0.8, 0.15], [0.8, -0.4], [0.8, 0.15]].forEach(([lx, lz]) => {
      const legGeo = new THREE.BoxGeometry(0.06, 0.55, 0.06);
      const leg = new THREE.Mesh(legGeo, pedalMat);
      leg.position.set(consoleX + lx, this.baseY + 0.275, consoleZ - 1.2 + lz);
      this.group.add(leg);
    });
  }

  // ------------------------------------------------------------------
  //  DECORATIONS  - gothic tracery accents, gold trim
  // ------------------------------------------------------------------
  createDecorations() {
    // Soft white wash lights illuminating the organ facade
    // 2 PointLights (much cheaper than 5 SpotLights — Quest 3 safe)
    // Skip entirely on low tier to stay within light budget
    if (this.Q.tier === 'low') return;

    const washPositions = [
      [-4, this.baseY + 0.5, this.organZ - 2.5],
      [4, this.baseY + 0.5, this.organZ - 2.5],
    ];
    for (const [px, py, pz] of washPositions) {
      const wash = new THREE.PointLight(0xfff8ee, 0.8, 25, 0.5);
      wash.position.set(px, py, pz);
      this.group.add(wash);
    }
  }

  // ------------------------------------------------------------------
  //  UPDATE  - audio-reactive pipe illumination
  // ------------------------------------------------------------------
  /**
   * @param {Object} bandValues - { subBass: 0-1, bass: 0-1, lowMid: 0-1, mid: 0-1, highMid: 0-1, presence: 0-1, treble: 0-1 }
   *   "presence" maps to the treble band visually (6-20kHz combined).
   */
  update(bandValues) {
    if (!bandValues) return;

    // Normalize presence + treble into the visual treble band
    const effectiveBands = {
      subBass: bandValues.subBass || 0,
      bass:    bandValues.bass || 0,
      lowMid:  bandValues.lowMid || 0,
      mid:     bandValues.mid || 0,
      highMid: bandValues.highMid || 0,
      treble:  Math.max(bandValues.presence || 0, bandValues.treble || 0),
    };

    // Update each pipe's emissive based on its assigned band energy
    for (let i = 0; i < this.pipes.length; i++) {
      const pipe = this.pipes[i];
      const energy = effectiveBands[pipe.band] || 0;

      // Smoothed energy for emissive intensity
      const intensity = energy * energy * 2.5; // quadratic for more dramatic response
      const bandColor = BAND_COLORS[pipe.band];

      // Pipe body glow
      pipe.bodyMat.emissive.copy(bandColor);
      pipe.bodyMat.emissiveIntensity = intensity;

      // Gold flare glow (slightly brighter)
      pipe.flareMat.emissive.copy(bandColor);
      pipe.flareMat.emissiveIntensity = intensity * 1.3;
    }
  }

  /**
   * Dispose of all geometries and materials
   */
  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.scene.remove(this.group);
  }
}
