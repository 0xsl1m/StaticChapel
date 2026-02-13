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
    this.createPARCans();
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

    // --- VIDEO ELEMENT — energy sphere plays on all LED panels ---
    this._ledVideo = document.createElement('video');
    this._ledVideo.src = 'assets/video/energy-sphere.mp4';
    this._ledVideo.loop = true;
    this._ledVideo.muted = true;
    this._ledVideo.playsInline = true;
    this._ledVideo.setAttribute('playsinline', '');
    this._ledVideo.setAttribute('webkit-playsinline', '');
    this._ledVideo.preload = 'auto';
    this._ledVideoReady = false;

    // Track readiness — video needs at least one frame decoded
    this._ledVideo.addEventListener('canplay', () => {
      this._ledVideoReady = true;
    });
    this._ledVideo.addEventListener('playing', () => {
      this._ledVideoReady = true;
    });

    // Try autoplay immediately (works on most browsers with muted video)
    const tryPlay = () => {
      if (this._ledVideo.paused) {
        this._ledVideo.play().catch(() => {});
      }
    };
    tryPlay();

    // Also retry on any user gesture (needed for Safari / mobile)
    const gesturePlay = () => {
      tryPlay();
      document.removeEventListener('click', gesturePlay);
      document.removeEventListener('touchstart', gesturePlay);
      document.removeEventListener('pointerdown', gesturePlay);
    };
    document.addEventListener('click', gesturePlay);
    document.addEventListener('touchstart', gesturePlay);
    document.addEventListener('pointerdown', gesturePlay);
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

    // Respect quality config for fixture counts (handle 0 correctly)
    const frontCount = this.Q.frontTrussSpots !== undefined ? this.Q.frontTrussSpots : 8;
    const sideTotal = this.Q.sideTrussSpots !== undefined ? this.Q.sideTrussSpots : 8;
    const sidePerSide = Math.floor(sideTotal / 2);

    // Front truss fixtures, evenly spaced
    for (let i = 0; i < frontCount; i++) {
      const t = (i + 0.5) / frontCount;
      const x = (t - 0.5) * (STAGE_WIDTH + 1);
      this.createFixture(x, frontTrussY - 0.5, frontTrussZ, 'front', i);
    }

    // Left truss fixtures
    for (let i = 0; i < sidePerSide; i++) {
      const t = (i + 0.5) / sidePerSide;
      const z = STAGE_FRONT_Z + t * (STAGE_DEPTH + 1);
      this.createFixture(-(STAGE_WIDTH / 2 + 0.5), sideTrussY - 0.5, z, 'left', i);
    }

    // Right truss fixtures
    for (let i = 0; i < sidePerSide; i++) {
      const t = (i + 0.5) / sidePerSide;
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
  //  PAR CAN MODELS  (visible fixtures on stage floor matching LightingDirector PARs)
  // ==================================================================
  createPARCans() {
    const parCount = this.Q.parWashes !== undefined ? this.Q.parWashes : 8;
    if (parCount === 0) return;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x111111, roughness: 0.4, metalness: 0.6,
    });
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x222222, roughness: 0.2, metalness: 0.3,
      emissive: new THREE.Color(0x8B00FF),
      emissiveIntensity: 0.8,
    });

    // Match LightingDirector PAR positions: circle of radius 5 around (0, 4.0, 24)
    // But models sit on stage floor (y=STAGE_Y) aimed upward
    const parGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.35, 8);
    const lensGeo = new THREE.CircleGeometry(0.12, 8);
    const yokeGeo = new THREE.BoxGeometry(0.04, 0.3, 0.04);

    this.parCanMeshes = [];

    for (let i = 0; i < parCount; i++) {
      const angle = (i / parCount) * Math.PI * 2;
      const radius = 5;
      const x = Math.cos(angle) * radius;
      const z = 24 + Math.sin(angle) * radius;

      const parGroup = new THREE.Group();

      // Yoke / stand (vertical bar)
      const yoke = new THREE.Mesh(yokeGeo, bodyMat);
      yoke.position.y = 0.15;
      parGroup.add(yoke);

      // PAR can body (cylinder, tilted upward ~60 degrees)
      const canGroup = new THREE.Group();
      canGroup.position.y = 0.3;
      canGroup.rotation.x = -Math.PI / 3; // tilt upward

      const body = new THREE.Mesh(parGeo, bodyMat);
      canGroup.add(body);

      // Lens face (glowing front)
      const lens = new THREE.Mesh(lensGeo, lensMat.clone());
      lens.position.y = 0.18;
      canGroup.add(lens);

      parGroup.add(canGroup);
      parGroup.position.set(x, STAGE_Y, z);
      this.group.add(parGroup);

      this.parCanMeshes.push({ lens: lens, canGroup });
    }
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
    this.updatePARCans();
  }

  // ------------------------------------------------------------------
  //  LED Panel — plays energy sphere video on all panels
  // ------------------------------------------------------------------
  updateLEDPanels(time, bandValues, energy) {
    this._ledFrame = (this._ledFrame || 0) + 1;
    if (this._ledFrame % (this._ledUpdateInterval || 1) !== 0) return;

    // Try to start video if not playing yet
    if (this._ledVideo && this._ledVideo.paused) {
      this._ledVideo.play().catch(() => {});
    }

    const videoReady = this._ledVideoReady &&
                       this._ledVideo &&
                       !this._ledVideo.paused &&
                       this._ledVideo.readyState >= 2; // HAVE_CURRENT_DATA

    for (let i = 0; i < this.ledPanels.length; i++) {
      const panel = this.ledPanels[i];
      const { canvas, ctx, texture } = panel;
      const w = canvas.width;
      const h = canvas.height;

      if (videoReady) {
        ctx.drawImage(this._ledVideo, 0, 0, w, h);
      } else {
        // Simple dark fallback until video loads
        ctx.fillStyle = '#020206';
        ctx.fillRect(0, 0, w, h);
      }

      texture.needsUpdate = true;
    }

    if (this.ledBacklight) {
      this.ledBacklight.intensity = 0.15 + energy * 0.25;
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
        // Extend beams 60% past target so cones don't end abruptly mid-air
        const beamLen = dist * 1.6;
        const spotAngle = 0.52; // ~PI/6
        const coreAngle = 0.15; // tighter core
        const beamRadius = beamLen * Math.tan(spotAngle);
        const coreRadius = beamLen * Math.tan(coreAngle);

        fixture.beam.scale.set(beamRadius, beamLen, beamRadius);
        if (fixture.core) fixture.core.scale.set(coreRadius, beamLen, coreRadius);
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

  // ------------------------------------------------------------------
  //  PAR can lens color sync with LightingDirector
  // ------------------------------------------------------------------
  updatePARCans() {
    if (!this.parCanMeshes || !this.lightingDirector) return;
    const pars = this.lightingDirector.parWashes;
    for (let i = 0; i < this.parCanMeshes.length && i < pars.length; i++) {
      const par = pars[i];
      const mesh = this.parCanMeshes[i];
      mesh.lens.material.emissive.copy(par.color);
      mesh.lens.material.emissiveIntensity = 0.3 + (par.intensity / 2.0) * 2.0;
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
