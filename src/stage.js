/**
 * ConcertStage - LED panels, trusses, light fixtures, fog machines
 * Phase 3: Concert production elements around the altar/stage area
 *
 * The stage platform itself is created in cathedral.js (15m wide x 10m deep x 1.5m tall, z=24).
 * This module adds production elements ON and AROUND the stage.
 */
import * as THREE from 'three';

// --- Layout constants ---
const STAGE_Z = 24;
const STAGE_Y = 1.5;
const STAGE_WIDTH = 15;
const STAGE_DEPTH = 10;
const STAGE_FRONT_Z = STAGE_Z - STAGE_DEPTH / 2; // z = 19
const STAGE_BACK_Z = STAGE_Z + STAGE_DEPTH / 2;  // z = 29

// --- Colors ---
const TRUSS_COLOR = 0x222222;
const FIXTURE_BODY_COLOR = 0x111111;
const FOG_MACHINE_COLOR = 0x1a1a1a;

export class ConcertStage {
  /**
   * @param {THREE.Scene} scene
   * @param {Object} [textures] - { metal } from TextureGenerator
   * @param {Object} [qualityConfig] - adaptive quality settings for mobile/Quest 3
   */
  constructor(scene, textures = {}, qualityConfig = {}) {
    this.scene = scene;
    this.textures = textures;
    this.Q = qualityConfig;
    this.group = new THREE.Group();
    this.group.name = 'concertStage';

    // LED panel canvases and textures for runtime update
    this.ledPanels = [];      // { canvas, ctx, texture, mesh }
    this.ledColumns = 3;
    this.ledRows = 5;

    // Light fixture references for animation
    this.fixtures = [];       // { group, beam, light, side: 'front'|'left'|'right', index }

    // Moving head display screens on each fixture
    this.fixtureScreens = []; // { canvas, ctx, texture }

    // Reference to LightingDirector for syncing visual beams
    this.lightingDirector = null;

    this.build();
    this.scene.add(this.group);
  }

  /**
   * Connect to the LightingDirector so fixture visuals sync with actual lights
   */
  setLightingDirector(ld) {
    this.lightingDirector = ld;
  }

  // ==================================================================
  //  BUILD
  // ==================================================================
  build() {
    this.createLEDWall();
    this.createTrusses();
    if (this.Q.stageFixtureModels !== false) {
      this.createLightFixtures();
    }
    if (this.Q.fogMachines !== false) {
      this.createFogMachines();
    }
  }

  // ==================================================================
  //  LED PANELS — Pro stage V-shape fan layout
  //  Center screen + angled wing panels that don't block the organ
  // ==================================================================
  createLEDWall() {
    const canvasRes = this.Q.ledCanvasRes || 128;
    const maxPanels = this.Q.ledPanelCount || 9;
    this._ledUpdateInterval = this.Q.ledUpdateInterval || 1;
    let panelCount = 0;
    const panelZ = STAGE_BACK_Z - 3.0; // z=26, pulled forward to prevent wall clipping

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x111111, roughness: 0.6, metalness: 0.4,
    });

    // Helper: create one LED panel with canvas + frame
    const makePanel = (w, h, x, y, z, rotY, col, row) => {
      if (panelCount >= maxPanels) return;
      panelCount++;

      const canvas = document.createElement('canvas');
      canvas.width = canvasRes;
      canvas.height = canvasRes;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, canvasRes, canvasRes);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const panelMat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: true });
      const panelGeo = new THREE.PlaneGeometry(w, h);
      const panelMesh = new THREE.Mesh(panelGeo, panelMat);
      panelMesh.position.set(x, y, z);
      panelMesh.rotation.y = Math.PI + rotY; // base: face audience, + angle
      this.group.add(panelMesh);

      // Thin bezel frame per panel
      const frameGeo = new THREE.EdgesGeometry(panelGeo);
      const frameLine = new THREE.LineSegments(frameGeo, new THREE.LineBasicMaterial({ color: 0x222222 }));
      frameLine.position.copy(panelMesh.position);
      frameLine.rotation.copy(panelMesh.rotation);
      this.group.add(frameLine);

      this.ledPanels.push({ canvas, ctx, texture, mesh: panelMesh, col, row });
    };

    // --- CENTER SCREEN: 6m wide × 4m tall --- (priority 1: center)
    // Sits low, organ pipes rise above it
    makePanel(6, 4, 0, STAGE_Y + 2.5, panelZ, 0, 1, 0);

    // --- UPPER WING PANELS: 2 per side, angled outward --- (priority 2: inner wings)
    // These fan out from the center screen, creating a V-shape
    const upperW = 3.0;
    const upperH = 3.0;
    const upperY = STAGE_Y + 7.5; // above center screen
    const upperAngle = 0.5; // ~30 degrees outward

    // --- LOWER WING PANELS: 2 per side, flanking center screen --- (priority 2: inner wings)
    const lowerW = 2.5;
    const lowerH = 2.5;
    const lowerY = STAGE_Y + 3.0;
    const lowerAngle = 0.7; // ~40 degrees outward

    // Inner wings (upper + lower) — priority 2
    [-1, 1].forEach(side => {
      // Inner upper wing
      makePanel(upperW, upperH,
        side * 4.5, upperY, panelZ + 0.3,
        side * upperAngle,
        side > 0 ? 2 : 0, 1);
      // Inner lower wing
      makePanel(lowerW, lowerH,
        side * 4.5, lowerY, panelZ + 0.2,
        side * lowerAngle,
        side > 0 ? 2 : 0, 3);
    });

    // Outer wings (upper + lower) — priority 3
    [-1, 1].forEach(side => {
      // Outer upper wing (more angled)
      makePanel(upperW * 0.8, upperH * 0.8,
        side * 7.5, upperY - 0.5, panelZ + 1.0,
        side * (upperAngle + 0.3),
        side > 0 ? 2 : 0, 2);
      // Outer lower wing
      makePanel(lowerW * 0.7, lowerH * 0.7,
        side * 7.0, lowerY - 0.3, panelZ + 0.8,
        side * (lowerAngle + 0.35),
        side > 0 ? 2 : 0, 4);
    });

    // Update column/row counts for updateLEDPanels iteration
    this.ledColumns = 3;
    this.ledRows = 5;

    // LED wall glow — reduced intensity
    this.ledBacklight = new THREE.PointLight(0x4444ff, 0.18, 16, 1.5);
    this.ledBacklight.position.set(0, STAGE_Y + 5, panelZ - 1.0);
    this.group.add(this.ledBacklight);
  }

  // ==================================================================
  //  TRUSSES  (front + left + right)
  // ==================================================================
  createTrusses() {
    const trussProps = { color: TRUSS_COLOR, roughness: 0.5, metalness: 0.7 };
    if (this.textures.metal) {
      const mt = this.textures.metal;
      if (mt.map) { mt.map.repeat.set(1, 1); trussProps.map = mt.map; }
      if (mt.normalMap) { mt.normalMap.repeat.set(1, 1); trussProps.normalMap = mt.normalMap; trussProps.normalScale = new THREE.Vector2(0.3, 0.3); }
      if (mt.roughnessMap) { mt.roughnessMap.repeat.set(1, 1); trussProps.roughnessMap = mt.roughnessMap; }
    }
    const trussMat = new THREE.MeshStandardMaterial(trussProps);

    // Front truss: horizontal bar across the front of the stage, elevated
    // Truss bar at z=19.5 — aligned with sub stacks so outer legs hide inside them.
    const frontTrussY = STAGE_Y + 8;
    const frontTrussZ = 19.5; // matches SUB_Z in sound-system.js — legs inside subs
    this.frontTruss = this.createTrussBar(STAGE_WIDTH + 2, frontTrussY, frontTrussZ, 'x', trussMat);

    // Side trusses: vertical-ish bars running along the sides from front to back
    const sideTrussY = STAGE_Y + 7;
    const sideTrussLength = STAGE_DEPTH + 2;
    this.leftTruss = this.createTrussBar(sideTrussLength, sideTrussY, 0, 'z', trussMat, -(STAGE_WIDTH / 2 + 0.5));
    this.rightTruss = this.createTrussBar(sideTrussLength, sideTrussY, 0, 'z', trussMat, (STAGE_WIDTH / 2 + 0.5));

    // Vertical support legs for front truss (4 uprights)
    // Outer legs at x=±8.5, z=19.5 — centered inside sub stacks (SUB_Z=19.5)
    // Inner legs at x=±3.75, z=19.5 — on stage
    const legPositions = [
      [-8.5,                      frontTrussZ],  // hidden in left sub stack
      [-(STAGE_WIDTH / 4),        frontTrussZ],
      [(STAGE_WIDTH / 4),         frontTrussZ],
      [8.5,                       frontTrussZ],   // hidden in right sub stack
    ];

    legPositions.forEach(([lx, lz]) => {
      const isOuterLeg = Math.abs(lx) > 8;  // outer legs hidden in sub stacks — no plate
      this.createTrussLeg(lx, STAGE_Y, frontTrussY, lz, trussMat, isOuterLeg);
    });

    // Vertical support legs for side trusses (2 each)
    [-1, 1].forEach(side => {
      const sx = side * (STAGE_WIDTH / 2 + 0.5);
      [STAGE_FRONT_Z, STAGE_BACK_Z - 1].forEach(sz => {
        this.createTrussLeg(sx, STAGE_Y, sideTrussY, sz, trussMat);
      });
    });
  }

  /**
   * Create a single truss bar (box-frame approximation).
   * @param {number} length - length of the truss
   * @param {number} y - height
   * @param {number} offset - z (if axis='x') or ignored (if axis='z', x supplied)
   * @param {'x'|'z'} axis - primary axis of the bar
   * @param {THREE.Material} mat
   * @param {number} [fixedX] - for z-axis trusses, the x position
   */
  createTrussBar(length, y, offset, axis, mat, fixedX) {
    const trussGroup = new THREE.Group();
    const barSize = 0.12;
    const trussHeight = 0.6;
    const trussDepth = 0.4;

    // Main rails (4 corner bars of the box truss)
    const corners = [
      [-trussDepth / 2, -trussHeight / 2],
      [-trussDepth / 2,  trussHeight / 2],
      [ trussDepth / 2, -trussHeight / 2],
      [ trussDepth / 2,  trussHeight / 2],
    ];

    corners.forEach(([cd, ch]) => {
      let geo;
      if (axis === 'x') {
        geo = new THREE.BoxGeometry(length, barSize, barSize);
      } else {
        geo = new THREE.BoxGeometry(barSize, barSize, length);
      }
      const rail = new THREE.Mesh(geo, mat);
      if (axis === 'x') {
        rail.position.set(0, ch, cd);
      } else {
        rail.position.set(cd, ch, 0);
      }
      trussGroup.add(rail);
    });

    // Cross braces (diagonals along the length)
    const braceCount = Math.floor(length / 1.5);
    for (let b = 0; b < braceCount; b++) {
      const t = (b + 0.5) / braceCount - 0.5;
      const braceGeo = new THREE.BoxGeometry(barSize * 0.8, trussHeight * 0.9, barSize * 0.8);
      const brace = new THREE.Mesh(braceGeo, mat);
      if (axis === 'x') {
        brace.position.set(t * length, 0, 0);
        brace.rotation.z = ((b % 2) * 2 - 1) * 0.5;
      } else {
        brace.position.set(0, 0, t * length);
        brace.rotation.x = ((b % 2) * 2 - 1) * 0.5;
      }
      trussGroup.add(brace);
    }

    // Position the whole truss
    if (axis === 'x') {
      trussGroup.position.set(0, y, offset);
    } else {
      trussGroup.position.set(fixedX || 0, y, STAGE_Z);
    }

    this.group.add(trussGroup);
    return trussGroup;
  }

  /**
   * Create a vertical truss leg (support pillar)
   */
  createTrussLeg(x, baseY, topY, z, mat, skipPlate = false) {
    const height = topY - baseY;
    const legGeo = new THREE.BoxGeometry(0.12, height, 0.12);
    const leg = new THREE.Mesh(legGeo, mat);
    leg.position.set(x, baseY + height / 2, z);
    this.group.add(leg);

    if (!skipPlate) {
      // Small base plate (omitted for legs hidden inside sub stacks)
      const plateGeo = new THREE.BoxGeometry(0.4, 0.05, 0.4);
      const plate = new THREE.Mesh(plateGeo, mat);
      plate.position.set(x, baseY + 0.025, z);
      this.group.add(plate);
    }
  }

  // ==================================================================
  //  LIGHT FIXTURES  (16 total: 8 front, 4 left, 4 right)
  // ==================================================================
  createLightFixtures() {
    const frontTrussY = STAGE_Y + 8;
    const frontTrussZ = 19.5; // matches truss + sub stack position
    const sideTrussY = STAGE_Y + 7;

    // 8 fixtures on front truss, evenly spaced
    for (let i = 0; i < 8; i++) {
      const t = (i + 0.5) / 8;
      const x = (t - 0.5) * (STAGE_WIDTH + 1);
      this.createFixture(x, frontTrussY - 0.5, frontTrussZ, 'front', i);
    }

    // 4 fixtures on left truss
    for (let i = 0; i < 4; i++) {
      const t = (i + 0.5) / 4;
      const z = STAGE_FRONT_Z + t * (STAGE_DEPTH + 1);
      this.createFixture(-(STAGE_WIDTH / 2 + 0.5), sideTrussY - 0.5, z, 'left', i);
    }

    // 4 fixtures on right truss
    for (let i = 0; i < 4; i++) {
      const t = (i + 0.5) / 4;
      const z = STAGE_FRONT_Z + t * (STAGE_DEPTH + 1);
      this.createFixture((STAGE_WIDTH / 2 + 0.5), sideTrussY - 0.5, z, 'right', i);
    }
  }

  /**
   * Create a single moving-head-style light fixture model.
   *
   * Architecture:
   * - fixtureGroup stays fixed at the truss mount point (never rotates)
   * - headGroup is a child of fixtureGroup that rotates to aim at the target
   * - beam and core cones are added to the SCENE (not to any group) so they
   *   can be independently positioned/oriented from fixture head to target
   */
  createFixture(x, y, z, side, index) {
    const fixtureGroup = new THREE.Group();
    fixtureGroup.position.set(x, y, z);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: FIXTURE_BODY_COLOR,
      roughness: 0.4,
      metalness: 0.6,
    });

    // Yoke (U-bracket) - stays fixed on the truss
    const yokeGeo = new THREE.BoxGeometry(0.25, 0.4, 0.08);
    const yoke = new THREE.Mesh(yokeGeo, bodyMat);
    yoke.position.y = 0;
    fixtureGroup.add(yoke);

    // Head subgroup - this rotates to aim at target
    const headGroup = new THREE.Group();
    headGroup.position.y = -0.15;

    // Head body (cylinder)
    const headGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 8);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.rotation.x = Math.PI / 2;
    headGroup.add(head);

    // Lens (emissive front face) - the glowing source
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      emissive: new THREE.Color(0x8B00FF),
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.3,
    });
    const lensGeo = new THREE.CircleGeometry(0.13, 12);
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, 0, 0.16);
    headGroup.add(lens);

    fixtureGroup.add(headGroup);

    // Small LED info screen on the yoke (optional — disabled on low quality)
    if (this.Q.fixtureScreens !== false) {
      const screenCanvas = document.createElement('canvas');
      screenCanvas.width = 64;
      screenCanvas.height = 32;
      const screenCtx = screenCanvas.getContext('2d');
      screenCtx.fillStyle = '#050510';
      screenCtx.fillRect(0, 0, 64, 32);
      const screenTex = new THREE.CanvasTexture(screenCanvas);
      screenTex.minFilter = THREE.LinearFilter;
      const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
      const screenGeo = new THREE.PlaneGeometry(0.14, 0.07);
      const screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.position.set(0, 0.06, 0);
      screenMesh.rotation.x = -Math.PI / 4;
      fixtureGroup.add(screenMesh);

      this.fixtureScreens.push({ canvas: screenCanvas, ctx: screenCtx, texture: screenTex });
    }

    this.group.add(fixtureGroup);

    // Beam cone - added to scene directly (world space), NOT to the fixture group.
    // This allows independent positioning/orientation each frame.
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x8B00FF,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    // Unit cone: height=1, radius at base=1. We scale it each frame.
    // Three.js ConeGeometry: tip at +h/2, base circle at -h/2.
    // We want: tip at origin (fixture), base (wide end) extending along +Y toward target.
    // So translate by -0.5 to put tip at origin, then rotate PI around Z to flip
    // the base from -Y to +Y. This makes the cone OPEN toward +Y.
    const beamGeo = new THREE.ConeGeometry(1.0, 1.0, 24, 1, true);
    beamGeo.rotateZ(Math.PI); // flip: now tip at -h/2 (y=-0.5), base at +h/2 (y=+0.5)
    beamGeo.translate(0, 0.5, 0); // shift tip to origin, base at y=+1
    const beam = new THREE.Mesh(beamGeo, beamMat);
    this.scene.add(beam);

    // Inner bright core beam (optional — disabled on low quality)
    let core = null;
    let coreMat = null;
    if (this.Q.beamCoreEnabled !== false) {
      coreMat = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const coreGeo = new THREE.ConeGeometry(1.0, 1.0, 12, 1, true);
      coreGeo.rotateZ(Math.PI);
      coreGeo.translate(0, 0.5, 0);
      core = new THREE.Mesh(coreGeo, coreMat);
      this.scene.add(core);
    }

    this.fixtures.push({
      group: fixtureGroup,
      headGroup: headGroup,
      beam: beam,
      core: core,
      beamMat: beamMat,
      coreMat: coreMat,
      lensMat: lensMat,
      side: side,
      index: index,
    });
  }

  // ==================================================================
  //  FOG MACHINES  (4 units on the floor near front of stage)
  // ==================================================================
  createFogMachines() {
    const fogMat = new THREE.MeshStandardMaterial({
      color: FOG_MACHINE_COLOR,
      roughness: 0.7,
      metalness: 0.3,
    });

    const positions = [
      [-5, STAGE_Y + 0.15, STAGE_FRONT_Z + 0.5],
      [-2, STAGE_Y + 0.15, STAGE_FRONT_Z + 0.3],
      [ 2, STAGE_Y + 0.15, STAGE_FRONT_Z + 0.3],
      [ 5, STAGE_Y + 0.15, STAGE_FRONT_Z + 0.5],
    ];

    positions.forEach(([fx, fy, fz]) => {
      const machineGroup = new THREE.Group();

      // Main body
      const bodyGeo = new THREE.BoxGeometry(0.5, 0.25, 0.35);
      const body = new THREE.Mesh(bodyGeo, fogMat);
      machineGroup.add(body);

      // Nozzle
      const nozzleGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.2, 6);
      const nozzle = new THREE.Mesh(nozzleGeo, fogMat);
      nozzle.position.set(0, 0.05, -0.25);
      nozzle.rotation.x = -Math.PI / 4;
      machineGroup.add(nozzle);

      // Small indicator LED
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
      const ledGeo = new THREE.SphereGeometry(0.02, 6, 6);
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(0.15, 0.13, 0.12);
      machineGroup.add(led);

      machineGroup.position.set(fx, fy, fz);
      this.group.add(machineGroup);
    });
  }

  // ==================================================================
  //  UPDATE
  // ==================================================================
  /**
   * @param {number} time - elapsed time in seconds
   * @param {Object} bandValues - frequency band energies (0-1 each)
   * @param {number} energy - overall audio energy (0-1)
   */
  update(time, bandValues, energy) {
    if (!bandValues) bandValues = {};
    if (energy === undefined) energy = 0;

    this.updateLEDPanels(time, bandValues, energy);
    if (this.fixtures.length > 0) {
      this.updateFixtures(time, bandValues, energy);
      this.updateFixtureScreens(time, energy);
    }
  }

  // ------------------------------------------------------------------
  //  LED Panel animation — 6 distinct programs, cycling every ~12 seconds
  // ------------------------------------------------------------------
  updateLEDPanels(time, bandValues, energy) {
    // Frame-skip for adaptive quality (interval=1 means every frame, 2 means every other, etc.)
    this._ledFrame = (this._ledFrame || 0) + 1;
    if (this._ledFrame % (this._ledUpdateInterval || 1) !== 0) return;

    const bass = bandValues.bass || 0;
    const mid = bandValues.mid || 0;
    const highMid = bandValues.highMid || 0;
    const treble = bandValues.treble || 0;
    const subBass = bandValues.subBass || 0;

    // Cycle through 6 programs with smooth crossfade
    const programDuration = 12.0;
    const crossfadeDuration = 2.0;
    const totalCycle = programDuration * 6;
    const cycleTime = time % totalCycle;
    const programIndex = Math.floor(cycleTime / programDuration) % 6;
    const programPhase = (cycleTime % programDuration) / programDuration;

    for (let i = 0; i < this.ledPanels.length; i++) {
      const panel = this.ledPanels[i];
      const { canvas, ctx, texture, col, row } = panel;
      const w = canvas.width;
      const h = canvas.height;

      const nx = col / Math.max(1, this.ledColumns - 1);
      const ny = row / Math.max(1, this.ledRows - 1);

      // Dark base — prevents washout
      ctx.fillStyle = '#040408';
      ctx.fillRect(0, 0, w, h);

      switch (programIndex) {
        case 0: this._ledProgram_ColorWash(ctx, w, h, time, nx, ny, bass, mid, energy); break;
        case 1: this._ledProgram_VerticalBars(ctx, w, h, time, nx, ny, bass, mid, highMid, energy); break;
        case 2: this._ledProgram_Strobe(ctx, w, h, time, nx, ny, bass, treble, energy); break;
        case 3: this._ledProgram_RadialPulse(ctx, w, h, time, nx, ny, subBass, bass, energy); break;
        case 4: this._ledProgram_Pixel(ctx, w, h, time, nx, ny, mid, highMid, treble, energy); break;
        case 5: this._ledProgram_WaveForm(ctx, w, h, time, nx, ny, bass, mid, highMid, energy); break;
      }

      texture.needsUpdate = true;
    }

    if (this.ledBacklight) {
      this.ledBacklight.intensity = 0.15 + energy * 0.25;
    }
  }

  // ==================================================================
  //  PRO VJ LED PROGRAMS — Resolume / VDMX inspired
  //
  //  Design principles:
  //  - Deep saturated gradients, not flat fills
  //  - Panel coherence: nx/ny creates unified image across all panels
  //  - Beat-reactive intensity with smooth falloff
  //  - Geometric patterns: tunnels, prisms, Lissajous, kaleidoscope
  //  - Professional color palettes (not rainbow spam)
  // ==================================================================

  // --- Program 0: TUNNEL ZOOM — depth illusion zooming toward viewer ---
  _ledProgram_ColorWash(ctx, w, h, time, nx, ny, bass, mid, energy) {
    const cx = w / 2, cy = h / 2;
    // Color palette: deep magenta → cyan shift over time
    const baseHue = (time * 8) % 360;
    const ringCount = 10;
    for (let r = ringCount - 1; r >= 0; r--) {
      const phase = ((time * 0.8 + r * 0.1) % 1);
      const scale = 0.05 + phase * 1.2;
      const rw = w * scale * 0.6;
      const rh = h * scale * 0.6;
      const hue = (baseHue + r * 25 + nx * 40) % 360;
      const lum = 8 + (1 - phase) * 30 * (0.4 + energy * 0.6) + bass * 15;
      const alpha = (1 - phase * 0.7) * (0.5 + energy * 0.4);
      ctx.fillStyle = `hsla(${hue}, 90%, ${Math.min(55, lum)}%, ${Math.min(0.9, alpha)})`;
      ctx.fillRect(cx - rw / 2, cy - rh / 2, rw, rh);
    }
    // Beat flash overlay
    if (bass > 0.5) {
      ctx.fillStyle = `hsla(${baseHue}, 100%, 70%, ${(bass - 0.5) * 0.5})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // --- Program 1: GRADIENT SWEEP — smooth horizontal wipe with layered hues ---
  _ledProgram_VerticalBars(ctx, w, h, time, nx, ny, bass, mid, highMid, energy) {
    // 3-color gradient that sweeps across the panel array (coherent across panels)
    const globalX = nx; // 0-1 across all panels left to right
    const sweep = (time * 0.15) % 1;
    const hue1 = (time * 12) % 360;
    const hue2 = (hue1 + 120) % 360;
    const hue3 = (hue1 + 240) % 360;

    for (let x = 0; x < w; x++) {
      const t = x / w;
      const globalT = (globalX + t * 0.3 + sweep) % 1;
      // Tri-color blend
      let hue, sat;
      if (globalT < 0.33) {
        hue = hue1 + (hue2 - hue1) * (globalT / 0.33);
        sat = 85;
      } else if (globalT < 0.66) {
        hue = hue2 + (hue3 - hue2) * ((globalT - 0.33) / 0.33);
        sat = 90;
      } else {
        hue = hue3 + (hue1 + 360 - hue3) * ((globalT - 0.66) / 0.34);
        sat = 85;
      }
      const lum = 10 + energy * 25 + mid * 15 + Math.sin(time * 4 + t * 6) * 5;
      ctx.fillStyle = `hsl(${hue % 360}, ${sat}%, ${Math.min(55, lum)}%)`;
      ctx.fillRect(x, 0, 1, h);
    }
    // Horizontal energy bars on beat
    if (highMid > 0.3) {
      const barCount = 3 + Math.floor(energy * 4);
      for (let b = 0; b < barCount; b++) {
        const by = ((time * 0.5 + b * 0.15 + ny * 0.3) % 1) * h;
        ctx.fillStyle = `hsla(0, 0%, 95%, ${highMid * 0.35})`;
        ctx.fillRect(0, by, w, 2);
      }
    }
  }

  // --- Program 2: PRISM FRACTURE — kaleidoscope triangles, bass-reactive ---
  _ledProgram_Strobe(ctx, w, h, time, nx, ny, bass, treble, energy) {
    const cx = w / 2, cy = h / 2;
    const baseHue = (time * 15) % 360;
    const segments = 6;
    const baseAngle = time * 0.3 + nx * Math.PI;

    for (let s = 0; s < segments; s++) {
      const angle = baseAngle + (s / segments) * Math.PI * 2;
      const nextAngle = baseAngle + ((s + 1) / segments) * Math.PI * 2;
      const radius = 40 + bass * 50 + energy * 30;

      const hue = (baseHue + s * (360 / segments)) % 360;
      const lum = 12 + energy * 25 + bass * 18;
      ctx.fillStyle = `hsla(${hue}, 88%, ${Math.min(55, lum)}%, ${0.5 + energy * 0.35})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.lineTo(cx + Math.cos(nextAngle) * radius, cy + Math.sin(nextAngle) * radius);
      ctx.closePath();
      ctx.fill();
    }

    // Inner ring glow
    const innerR = 8 + bass * 20;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
    grad.addColorStop(0, `hsla(${(baseHue + 180) % 360}, 100%, 80%, ${0.6 + bass * 0.3})`);
    grad.addColorStop(1, `hsla(${(baseHue + 180) % 360}, 100%, 20%, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Treble sparkle overlay
    if (treble > 0.3) {
      for (let d = 0; d < 4; d++) {
        const sx = (Math.sin(time * 5.7 + d * 3.1) * 0.5 + 0.5) * w;
        const sy = (Math.cos(time * 4.3 + d * 2.7) * 0.5 + 0.5) * h;
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 6);
        sg.addColorStop(0, `hsla(0, 0%, 100%, ${treble * 0.7})`);
        sg.addColorStop(1, 'hsla(0, 0%, 100%, 0)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, 0, w, h);
      }
    }
  }

  // --- Program 3: WAVE RIBBONS — flowing sine ribbons across panels ---
  _ledProgram_RadialPulse(ctx, w, h, time, nx, ny, subBass, bass, energy) {
    const ribbonCount = 5;
    const baseHue = (time * 10) % 360;

    for (let r = 0; r < ribbonCount; r++) {
      const hue = (baseHue + r * 55) % 360;
      const lum = 15 + energy * 28 + bass * 12;
      const alpha = 0.4 + energy * 0.3;

      ctx.strokeStyle = `hsla(${hue}, 92%, ${Math.min(55, lum)}%, ${alpha})`;
      ctx.lineWidth = 3 + subBass * 8 + energy * 4;
      ctx.lineCap = 'round';
      ctx.beginPath();

      for (let x = 0; x <= w; x += 2) {
        const t = x / w;
        const globalT = nx + t * 0.2;
        const freq1 = 3 + r * 1.5;
        const freq2 = 2 + r * 0.8;
        const amp = h * 0.3 * (0.5 + bass * 0.5);
        const y = h / 2
          + Math.sin(globalT * freq1 * Math.PI + time * (1.5 + r * 0.3)) * amp * 0.6
          + Math.sin(globalT * freq2 * Math.PI + time * 0.8 + r * 2) * amp * 0.4
          + r * (h / (ribbonCount + 2)) - h * 0.3;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Glow at peaks on beat
    if (bass > 0.45) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `hsla(${baseHue}, 100%, 60%, ${(bass - 0.45) * 0.4})`);
      grad.addColorStop(0.5, 'hsla(0, 0%, 0%, 0)');
      grad.addColorStop(1, `hsla(${(baseHue + 180) % 360}, 100%, 60%, ${(bass - 0.45) * 0.4})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // --- Program 4: DIGITAL RAIN — matrix-style falling columns ---
  _ledProgram_Pixel(ctx, w, h, time, nx, ny, mid, highMid, treble, energy) {
    const colCount = 12;
    const cellW = w / colCount;
    const baseHue = (time * 6 + nx * 80) % 360;

    for (let c = 0; c < colCount; c++) {
      // Each column falls at different speed with different phase
      const speed = 0.3 + (Math.sin(c * 2.7 + nx * 5) * 0.5 + 0.5) * 0.7;
      const phase = (time * speed + c * 0.37 + ny * 0.5) % 1;
      const headY = phase * h * 1.8 - h * 0.3;
      const tailLen = h * 0.5 + mid * h * 0.4;

      // Gradient trail
      const x = c * cellW;
      for (let seg = 0; seg < 16; seg++) {
        const segY = headY - seg * (tailLen / 16);
        if (segY < -10 || segY > h + 10) continue;
        const fade = 1 - seg / 16;
        const hue = (baseHue + seg * 8) % 360;
        const lum = fade * (15 + energy * 30 + highMid * 15);
        ctx.fillStyle = `hsla(${hue}, 85%, ${Math.min(55, lum)}%, ${fade * (0.5 + energy * 0.4)})`;
        ctx.fillRect(x + 1, segY, cellW - 2, tailLen / 16 + 1);
      }

      // Bright head pixel
      if (headY > -5 && headY < h + 5) {
        ctx.fillStyle = `hsla(${baseHue}, 60%, ${60 + energy * 25}%, ${0.7 + treble * 0.3})`;
        ctx.fillRect(x, headY - 2, cellW, 4);
      }
    }
  }

  // --- Program 5: SPECTRUM ANALYZER — pro EQ with gradient bars and glow ---
  _ledProgram_WaveForm(ctx, w, h, time, nx, ny, bass, mid, highMid, energy) {
    const barCount = 12;
    const barW = w / barCount;
    const gap = 2;
    // Distribute frequency bands across bars with smooth interpolation
    const bands = [bass, bass * 0.9, bass * 0.7, mid * 0.6 + bass * 0.3,
                   mid, mid * 0.95, highMid * 0.5 + mid * 0.4,
                   highMid, highMid * 0.9, highMid * 0.6,
                   highMid * 0.3, highMid * 0.15];

    const baseHue = (time * 6 + nx * 50) % 360;

    for (let b = 0; b < barCount; b++) {
      const val = bands[b] * 0.75 + energy * 0.25 + Math.sin(time * 2.5 + b * 0.6) * 0.05;
      const barH = Math.max(2, val * h * 0.9);
      const x = b * barW + gap / 2;
      const bw = barW - gap;

      // Gradient from bottom (warm) to top (cool)
      const hue1 = (baseHue + b * 12) % 360;
      const hue2 = (hue1 + 60) % 360;
      const grad = ctx.createLinearGradient(0, h, 0, h - barH);
      const lum1 = 15 + energy * 20;
      const lum2 = 25 + energy * 25 + val * 15;
      grad.addColorStop(0, `hsl(${hue1}, 90%, ${Math.min(50, lum1)}%)`);
      grad.addColorStop(0.6, `hsl(${(hue1 + hue2) / 2 % 360}, 88%, ${Math.min(55, (lum1 + lum2) / 2)}%)`);
      grad.addColorStop(1, `hsl(${hue2}, 85%, ${Math.min(60, lum2)}%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, h - barH, bw, barH);

      // Peak dot (holds briefly then falls)
      const peakY = h - barH - 3;
      ctx.fillStyle = `hsla(0, 0%, 95%, ${0.5 + val * 0.4})`;
      ctx.fillRect(x, peakY, bw, 2);

      // Bar top glow
      if (val > 0.4) {
        const glow = ctx.createLinearGradient(0, h - barH - 8, 0, h - barH + 4);
        glow.addColorStop(0, 'hsla(0, 0%, 100%, 0)');
        glow.addColorStop(0.5, `hsla(${hue2}, 100%, 70%, ${(val - 0.4) * 0.5})`);
        glow.addColorStop(1, 'hsla(0, 0%, 100%, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - 2, h - barH - 8, bw + 4, 12);
      }
    }
  }

  // ------------------------------------------------------------------
  //  Light fixture animation - synced with LightingDirector
  //
  //  Each frame we:
  //  1. Read the matched SpotLight's target position and color/intensity
  //  2. Aim the fixture's headGroup toward the target (pan/tilt)
  //  3. Position the beam cone at the fixture head, orient it toward target,
  //     and scale it so it naturally extends from head to target
  // ------------------------------------------------------------------
  updateFixtures(time, bandValues, energy) {
    const ld = this.lightingDirector;
    const _dir = this._beamDir || (this._beamDir = new THREE.Vector3());
    const _up = this._beamUp || (this._beamUp = new THREE.Vector3(0, 1, 0));
    const _white = this._white || (this._white = new THREE.Color(0xffffff));

    for (let i = 0; i < this.fixtures.length; i++) {
      const fixture = this.fixtures[i];
      let lightColor = null;
      let lightIntensity = 0;
      let targetPos = null;

      // Sync with LightingDirector's actual light data
      if (ld) {
        let spot = null;
        if (fixture.side === 'front' && fixture.index < ld.frontTrussSpots.length) {
          spot = ld.frontTrussSpots[fixture.index];
        } else if (fixture.side === 'left' && fixture.index < Math.floor(ld.sideTrussSpots.length / 2)) {
          spot = ld.sideTrussSpots[fixture.index];
        } else if (fixture.side === 'right' && fixture.index < Math.floor(ld.sideTrussSpots.length / 2)) {
          spot = ld.sideTrussSpots[fixture.index + Math.floor(ld.sideTrussSpots.length / 2)];
        }

        if (spot) {
          lightColor = spot.color;
          lightIntensity = spot.intensity;
          targetPos = spot.target.position;
        }
      }

      // Fixture world position (fixtureGroup position within the concertStage group)
      const fx = this.group.position.x + fixture.group.position.x;
      const fy = this.group.position.y + fixture.group.position.y;
      const fz = this.group.position.z + fixture.group.position.z;

      // Fallback if no LightingDirector or no matched spot
      if (!lightColor) {
        const hue = (time * 30) % 360;
        lightColor = new THREE.Color().setHSL(hue / 360, 0.9, 0.5);
        lightIntensity = 1.0 + energy * 2.0;
        // Default target: straight down
        if (!targetPos) {
          targetPos = this._fallbackTarget || (this._fallbackTarget = new THREE.Vector3());
          targetPos.set(fx + Math.sin(time * 1.5 + i * 0.7) * 3, 0, fz + Math.cos(time + i) * 3);
        }
      }

      // --- Aim the head subgroup toward target (relative to fixture position) ---
      const dx = targetPos.x - fx;
      const dy = targetPos.y - fy;
      const dz = targetPos.z - fz;
      const distXZ = Math.sqrt(dx * dx + dz * dz);
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Pan (Y rotation) and tilt (X rotation) on the head subgroup only
      if (dist > 0.1) {
        fixture.headGroup.rotation.y = Math.atan2(dx, dz);
        fixture.headGroup.rotation.x = Math.atan2(dy, distXZ);
      }

      // --- Position and orient beam cone in world space ---
      const normalizedIntensity = Math.min(lightIntensity / 3.0, 1.0);

      // Beam starts at fixture head position
      fixture.beam.position.set(fx, fy, fz);
      if (fixture.core) fixture.core.position.set(fx, fy, fz);

      if (dist > 0.5) {
        // Direction from fixture to target
        _dir.set(dx, dy, dz).normalize();

        // lookAt the target — the cone geometry extends along +Y from origin,
        // so we need to rotate so that local +Y aligns with _dir
        // Use quaternion: rotate from (0,1,0) to _dir
        fixture.beam.quaternion.setFromUnitVectors(_up, _dir);
        if (fixture.core) fixture.core.quaternion.setFromUnitVectors(_up, _dir);

        // Scale: cone base radius grows with distance (simulating beam spread)
        // SpotLight angle is ~PI/6 (30°), so spread radius = dist * tan(angle)
        const spotAngle = 0.52; // ~PI/6
        const coreAngle = 0.15; // tighter core
        const beamRadius = dist * Math.tan(spotAngle);
        const coreRadius = dist * Math.tan(coreAngle);

        fixture.beam.scale.set(beamRadius, dist, beamRadius);
        if (fixture.core) fixture.core.scale.set(coreRadius, dist, coreRadius);
      }

      // Beam color and opacity — capped low to prevent additive washout
      fixture.beamMat.color.copy(lightColor);
      fixture.beamMat.opacity = normalizedIntensity > 0.01 ? 0.02 + normalizedIntensity * 0.08 : 0;

      // Core beam - white-tinted version for bright center
      if (fixture.coreMat) {
        fixture.coreMat.color.lerpColors(lightColor, _white, 0.6);
        fixture.coreMat.opacity = normalizedIntensity > 0.01 ? 0.008 + normalizedIntensity * 0.035 : 0;
      }

      // Lens emissive glow
      fixture.lensMat.emissive.copy(lightColor);
      fixture.lensMat.emissiveIntensity = 0.5 + normalizedIntensity * 3.0;

      // Hide beams when intensity is zero
      fixture.beam.visible = lightIntensity > 0.05;
      if (fixture.core) fixture.core.visible = lightIntensity > 0.05;
    }
  }

  // ------------------------------------------------------------------
  //  Fixture LED screen animation (DMX-style readout)
  // ------------------------------------------------------------------
  updateFixtureScreens(time, energy) {
    for (let i = 0; i < this.fixtureScreens.length; i++) {
      const screen = this.fixtureScreens[i];
      const { canvas, ctx, texture } = screen;
      const w = canvas.width;
      const h = canvas.height;

      // Dark background
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, w, h);

      // Channel number
      ctx.fillStyle = '#00cc44';
      ctx.font = '8px monospace';
      ctx.fillText(`CH${String(i + 1).padStart(2, '0')}`, 2, 9);

      // Intensity bar
      const fixture = this.fixtures[i];
      const intensity = fixture ? Math.min(1, (fixture.beamMat.opacity - 0.04) / 0.22) : 0;
      const barW = Math.floor(intensity * (w - 8));
      const hue = (time * 60 + i * 30) % 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillRect(4, 14, barW, 4);

      // Border
      ctx.strokeStyle = '#00cc44';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(3, 13, w - 6, 6);

      // DMX value
      const dmxVal = Math.floor(intensity * 255);
      ctx.fillStyle = '#ffffff';
      ctx.font = '7px monospace';
      ctx.fillText(String(dmxVal).padStart(3, '0'), w - 22, 26);

      texture.needsUpdate = true;
    }
  }

  /**
   * Dispose of all geometries, materials, and textures
   */
  dispose() {
    // Dispose fixture screen textures
    this.fixtureScreens.forEach(s => s.texture.dispose());

    // Dispose LED textures
    this.ledPanels.forEach(p => {
      p.texture.dispose();
      p.mesh.material.dispose();
      p.mesh.geometry.dispose();
    });

    // Remove beam/core cones from scene (they're scene children, not group children)
    this.fixtures.forEach(f => {
      this.scene.remove(f.beam);
      f.beam.geometry.dispose();
      f.beam.material.dispose();
      if (f.core) {
        this.scene.remove(f.core);
        f.core.geometry.dispose();
        f.core.material.dispose();
      }
    });

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
