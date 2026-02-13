/**
 * DJBooth - Wrap-around LED booth with avatar, CDJs, mixer, and laptop
 * Phase 3: DJ presence and equipment on the cathedral stage
 *
 * Position: center of stage at roughly (0, stageY + 0.5, 24)
 * The booth is 3m wide x 1.2m deep x 1.1m tall with LED screens on
 * front, left, and right sides playing energy-sphere.mp4 video.
 */
import * as THREE from 'three';

// --- Layout constants ---
const STAGE_Y = 1.5;
const STAGE_Z = 24;
const BOOTH_Y = STAGE_Y;        // sits on stage surface
const BOOTH_CENTER_Z = STAGE_Z; // center of stage depth

// Booth dimensions
const BOOTH_W = 3.0;
const BOOTH_D = 1.2;
const BOOTH_H = 1.1;

// --- Colors ---
const DARK_ROBES = 0x0c0c16;
const HEADSET_COLOR = 0xDDDDDD;
const SACRED_GOLD = 0xFFD700;

export class DJBooth {
  /**
   * @param {THREE.Scene} scene
   * @param {Object} [textures] - { stone, fabric } from TextureGenerator
   */
  constructor(scene, textures = {}, qualityConfig = {}) {
    this.scene = scene;
    this.textures = textures;
    this.Q = qualityConfig;
    this.group = new THREE.Group();
    this.group.name = 'djBooth';

    // Animation state
    this.headBobPhase = 0;
    this.armPhase = 0;
    this.beatImpact = 0; // decays over time, spikes on beat

    // Canvas textures for screens
    this.laptopCanvas = null;
    this.laptopCtx = null;
    this.laptopTexture = null;

    this.cdjCanvases = [];  // { canvas, ctx, texture }

    // Avatar part references for animation
    this.avatar = {
      head: null,
      torso: null,
      leftUpperArm: null,
      leftForearm: null,
      rightUpperArm: null,
      rightForearm: null,
      chestGlow: null,
      chestGlowMat: null,
    };

    this.build();
    this.scene.add(this.group);
  }

  // ==================================================================
  //  BUILD
  // ==================================================================
  build() {
    this.createAltarBooth();
    this.createCDJs();
    this.createMixer();
    this.createLaptop();
    this.createDJAvatar();
  }

  // ==================================================================
  //  DJ BOOTH — dark matte body with wrap-around LED screens
  // ==================================================================
  createAltarBooth() {
    // Dark matte material for booth body (replaces stone)
    const boothMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0e,
      roughness: 0.7,
      metalness: 0.3,
    });

    // Main body
    const altarGeo = new THREE.BoxGeometry(BOOTH_W, BOOTH_H, BOOTH_D);
    const altar = new THREE.Mesh(altarGeo, boothMat);
    altar.position.set(0, BOOTH_Y + BOOTH_H / 2, BOOTH_CENTER_Z);
    altar.castShadow = true;
    altar.receiveShadow = true;
    this.group.add(altar);

    // Subtle dark metallic trim around top edge
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a22,
      roughness: 0.2,
      metalness: 0.8,
    });
    const trimW = BOOTH_W + 0.04;
    const trimD = BOOTH_D + 0.04;
    const trimH = 0.03;
    const topTrim = new THREE.Mesh(
      new THREE.BoxGeometry(trimW, trimH, trimD),
      trimMat
    );
    topTrim.position.set(0, BOOTH_Y + BOOTH_H + trimH / 2, BOOTH_CENTER_Z);
    this.group.add(topTrim);

    // --- Wrap-around LED screens (front + left + right) ---
    // One continuous display: the video is sliced across all 3 panels so
    // the side screens are extensions of the front, not separate copies.
    const panelInset = 0.06; // inset from body edges
    const panelH = BOOTH_H - 0.12; // slightly shorter than body
    const panelY = BOOTH_Y + BOOTH_H / 2; // vertically centered on booth

    const frontW = BOOTH_W - panelInset * 2;  // ~2.88m
    const sideW = BOOTH_D - panelInset * 2;   // ~1.08m
    const totalW = sideW + frontW + sideW;     // ~5.04m total wrap

    // Fractional slice of the video each panel gets
    const leftFrac = sideW / totalW;
    const frontFrac = frontW / totalW;
    // rightFrac = leftFrac (symmetric)

    this.ledPanels = [];

    const createLEDPanel = (w, h, px, py, pz, ry, sliceStart, sliceFrac) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, 256, 128);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const mat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
      const geo = new THREE.PlaneGeometry(w, h);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(px, py, pz);
      mesh.rotation.y = ry;
      this.group.add(mesh);

      // Thin bezel
      const bezelGeo = new THREE.EdgesGeometry(geo);
      const bezel = new THREE.LineSegments(bezelGeo, new THREE.LineBasicMaterial({ color: 0x222233 }));
      bezel.position.copy(mesh.position);
      bezel.rotation.copy(mesh.rotation);
      this.group.add(bezel);

      this.ledPanels.push({ canvas, ctx, texture, mesh, sliceStart, sliceFrac });
    };

    // Left side panel — gets the leftmost slice of the video
    createLEDPanel(
      sideW, panelH,
      -BOOTH_W / 2 - 0.01, panelY, BOOTH_CENTER_Z,
      Math.PI / 2,
      0, leftFrac
    );

    // Front panel — gets the center slice
    createLEDPanel(
      frontW, panelH,
      0, panelY, BOOTH_CENTER_Z - BOOTH_D / 2 - 0.01,
      0,
      leftFrac, frontFrac
    );

    // Right side panel — gets the rightmost slice
    createLEDPanel(
      sideW, panelH,
      BOOTH_W / 2 + 0.01, panelY, BOOTH_CENTER_Z,
      -Math.PI / 2,
      leftFrac + frontFrac, leftFrac
    );

    // Keep facadePanel reference for backwards compat (points to front panel)
    this.facadePanel = this.ledPanels[1];
  }

  /**
   * Set the shared video element (energy-sphere.mp4) for LED panels.
   * Called from main.js after stage is initialized.
   * @param {HTMLVideoElement} videoEl
   */
  setVideoElement(videoEl) {
    this._ledVideo = videoEl;
    this._ledVideoReady = false;
    if (videoEl) {
      videoEl.addEventListener('canplay', () => { this._ledVideoReady = true; });
      videoEl.addEventListener('playing', () => { this._ledVideoReady = true; });
      // Check if already ready
      if (!videoEl.paused && videoEl.readyState >= 2) {
        this._ledVideoReady = true;
      }
    }
  }

  // ==================================================================
  //  CDJs (2 units, left and right of mixer)
  // ==================================================================
  createCDJs() {
    const cdjPositions = [
      [-0.75, BOOTH_Y + BOOTH_H + 0.02, BOOTH_CENTER_Z], // left CDJ
      [ 0.75, BOOTH_Y + BOOTH_H + 0.02, BOOTH_CENTER_Z], // right CDJ
    ];

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.4,
      metalness: 0.5,
    });

    cdjPositions.forEach(([cx, cy, cz], idx) => {
      const cdjGroup = new THREE.Group();

      // CDJ body
      const bodyGeo = new THREE.BoxGeometry(0.36, 0.06, 0.4);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      cdjGroup.add(body);

      // Jog wheel (cylinder on top)
      const jogGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.015, 16);
      const jogMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.3,
        metalness: 0.6,
      });
      const jog = new THREE.Mesh(jogGeo, jogMat);
      jog.position.set(0, 0.04, -0.05);
      cdjGroup.add(jog);

      // LED screen (canvas texture)
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, 128, 64);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;

      const screenMat = new THREE.MeshBasicMaterial({
        map: texture,
        toneMapped: false,
      });
      const screenGeo = new THREE.PlaneGeometry(0.2, 0.08);
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 0.035, 0.1);
      screen.rotation.x = -0.3;
      cdjGroup.add(screen);

      // Small button dots
      const btnMat = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
      for (let b = 0; b < 4; b++) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), btnMat);
        btn.position.set(-0.06 + b * 0.04, 0.035, 0.15);
        cdjGroup.add(btn);
      }

      cdjGroup.position.set(cx, cy, cz);
      this.group.add(cdjGroup);

      this.cdjCanvases.push({ canvas, ctx, texture });
    });
  }

  // ==================================================================
  //  MIXER (centered between CDJs)
  // ==================================================================
  createMixer() {
    const mixerGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.4,
      metalness: 0.5,
    });

    // Main body
    const bodyGeo = new THREE.BoxGeometry(0.3, 0.05, 0.4);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    mixerGroup.add(body);

    // Channel faders (4 vertical strips)
    const faderMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.3,
      metalness: 0.6,
    });
    for (let f = 0; f < 4; f++) {
      // Fader slot
      const slotGeo = new THREE.BoxGeometry(0.015, 0.01, 0.15);
      const slot = new THREE.Mesh(slotGeo, faderMat);
      slot.position.set(-0.06 + f * 0.04, 0.03, 0.0);
      mixerGroup.add(slot);

      // Fader knob
      const knobGeo = new THREE.BoxGeometry(0.025, 0.015, 0.02);
      const knob = new THREE.Mesh(knobGeo, new THREE.MeshStandardMaterial({
        color: 0xEEEEEE,
        roughness: 0.2,
        metalness: 0.8,
      }));
      knob.position.set(-0.06 + f * 0.04, 0.04, -0.02 + Math.random() * 0.1);
      mixerGroup.add(knob);
    }

    // EQ knobs (small cylinders)
    const knobMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.3,
      metalness: 0.7,
    });
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const eqKnob = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.01, 0.012, 8),
          knobMat
        );
        eqKnob.position.set(-0.06 + col * 0.04, 0.032, -0.12 + row * 0.04);
        mixerGroup.add(eqKnob);
      }
    }

    // Cross fader
    const crossFaderGeo = new THREE.BoxGeometry(0.12, 0.01, 0.015);
    const crossFader = new THREE.Mesh(crossFaderGeo, faderMat);
    crossFader.position.set(0, 0.03, 0.15);
    mixerGroup.add(crossFader);

    mixerGroup.position.set(0, BOOTH_Y + BOOTH_H + 0.02, BOOTH_CENTER_Z);
    this.group.add(mixerGroup);
  }

  // ==================================================================
  //  LAPTOP with animated waveform screen
  // ==================================================================
  createLaptop() {
    const laptopGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.3,
      metalness: 0.6,
    });

    // Base
    const baseGeo = new THREE.BoxGeometry(0.35, 0.015, 0.22);
    const base = new THREE.Mesh(baseGeo, bodyMat);
    laptopGroup.add(base);

    // Screen (canvas texture)
    this.laptopCanvas = document.createElement('canvas');
    this.laptopCanvas.width = 256;
    this.laptopCanvas.height = 128;
    this.laptopCtx = this.laptopCanvas.getContext('2d');
    this.laptopCtx.fillStyle = '#050510';
    this.laptopCtx.fillRect(0, 0, 256, 128);

    this.laptopTexture = new THREE.CanvasTexture(this.laptopCanvas);
    this.laptopTexture.minFilter = THREE.LinearFilter;

    const screenMat = new THREE.MeshBasicMaterial({
      map: this.laptopTexture,
      toneMapped: false,
    });

    // Screen panel (tilted up)
    const screenGeo = new THREE.PlaneGeometry(0.33, 0.2);
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.12, -0.09);
    screen.rotation.x = -0.25;
    laptopGroup.add(screen);

    // Screen back (dark panel)
    const screenBackGeo = new THREE.BoxGeometry(0.34, 0.21, 0.008);
    const screenBack = new THREE.Mesh(screenBackGeo, bodyMat);
    screenBack.position.set(0, 0.12, -0.095);
    screenBack.rotation.x = -0.25;
    laptopGroup.add(screenBack);

    // Position laptop behind the mixer, tilted toward DJ
    laptopGroup.position.set(0, BOOTH_Y + BOOTH_H + 0.05, BOOTH_CENTER_Z + 0.4);
    this.group.add(laptopGroup);
  }

  // ==================================================================
  //  DJ AVATAR
  // ==================================================================
  createDJAvatar() {
    const avatarGroup = new THREE.Group();
    const robesProps = { color: DARK_ROBES, roughness: 0.8, metalness: 0.05 };
    if (this.textures.fabric) {
      const ft = this.textures.fabric;
      if (ft.map) { ft.map.repeat.set(3, 4); robesProps.map = ft.map; }
      if (ft.normalMap) { ft.normalMap.repeat.set(3, 4); robesProps.normalMap = ft.normalMap; robesProps.normalScale = new THREE.Vector2(0.3, 0.3); }
    }
    const robesMat = new THREE.MeshStandardMaterial(robesProps);

    // --- TORSO ---
    const torsoGeo = new THREE.BoxGeometry(0.45, 0.6, 0.25);
    const torso = new THREE.Mesh(torsoGeo, robesMat);
    torso.position.y = 0;
    avatarGroup.add(torso);
    this.avatar.torso = torso;

    // --- SACRED GEOMETRY CHEST GLOW ---
    const chestGlowMat = new THREE.MeshBasicMaterial({
      color: SACRED_GOLD,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Sacred geometry: concentric rings + triangle
    const chestGroup = new THREE.Group();

    // Outer ring
    const ring1 = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.115, 24),
      chestGlowMat
    );
    chestGroup.add(ring1);

    // Inner ring
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.07, 24),
      chestGlowMat.clone()
    );
    chestGroup.add(ring2);

    // Triangle (3 line segments using thin boxes)
    const triSize = 0.09;
    for (let i = 0; i < 3; i++) {
      const angle1 = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const angle2 = ((i + 1) / 3) * Math.PI * 2 - Math.PI / 2;
      const x1 = Math.cos(angle1) * triSize;
      const y1 = Math.sin(angle1) * triSize;
      const x2 = Math.cos(angle2) * triSize;
      const y2 = Math.sin(angle2) * triSize;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(dy, dx);

      const lineGeo = new THREE.PlaneGeometry(len, 0.012);
      const line = new THREE.Mesh(lineGeo, chestGlowMat);
      line.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
      line.rotation.z = ang;
      chestGroup.add(line);
    }

    // Center dot
    const dotGeo = new THREE.CircleGeometry(0.02, 8);
    const dot = new THREE.Mesh(dotGeo, chestGlowMat);
    chestGroup.add(dot);

    chestGroup.position.set(0, 0.05, -0.13);
    avatarGroup.add(chestGroup);
    this.avatar.chestGlow = chestGroup;
    this.avatar.chestGlowMat = chestGlowMat;

    // --- HEAD ---
    const headGroup = new THREE.Group();

    // Skull shape (slightly elongated box with rounded feel)
    const headGeo = new THREE.BoxGeometry(0.2, 0.24, 0.2);
    const headMesh = new THREE.Mesh(headGeo, robesMat);
    headGroup.add(headMesh);

    // Hood / cowl around head
    const hoodGeo = new THREE.BoxGeometry(0.28, 0.28, 0.24);
    const hoodMat = new THREE.MeshStandardMaterial({
      color: DARK_ROBES,
      roughness: 0.9,
      metalness: 0.0,
    });
    const hood = new THREE.Mesh(hoodGeo, hoodMat);
    hood.position.set(0, 0.02, 0.02);
    headGroup.add(hood);

    // --- META QUEST 3 HEADSET ---
    const headsetGroup = new THREE.Group();

    const headsetBodyMat = new THREE.MeshStandardMaterial({
      color: HEADSET_COLOR,
      roughness: 0.2,
      metalness: 0.3,
    });

    // Main visor body (rounded box shape)
    const visorGeo = new THREE.BoxGeometry(0.18, 0.08, 0.1);
    const visor = new THREE.Mesh(visorGeo, headsetBodyMat);
    headsetGroup.add(visor);

    // Lenses area (dark inset on back)
    const lensDarkMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.8,
    });
    const lensGeo = new THREE.PlaneGeometry(0.14, 0.06);
    const lensBack = new THREE.Mesh(lensGeo, lensDarkMat);
    lensBack.position.z = 0.051;
    headsetGroup.add(lensBack);

    // Front camera array (3 small circles)
    const camMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    [-0.04, 0, 0.04].forEach(offset => {
      const cam = new THREE.Mesh(
        new THREE.CircleGeometry(0.008, 8),
        camMat
      );
      cam.position.set(offset, 0, -0.051);
      headsetGroup.add(cam);
    });

    // Strap hints (thin boxes on sides)
    const strapMat = new THREE.MeshStandardMaterial({
      color: 0xCCCCCC,
      roughness: 0.5,
      metalness: 0.1,
    });
    [-1, 1].forEach(side => {
      const strap = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.04, 0.12),
        strapMat
      );
      strap.position.set(side * 0.1, 0, 0.02);
      headsetGroup.add(strap);
    });

    headsetGroup.position.set(0, -0.02, -0.12);
    headGroup.add(headsetGroup);

    headGroup.position.set(0, 0.42, 0);
    avatarGroup.add(headGroup);
    this.avatar.head = headGroup;

    // --- ARMS ---
    // Left arm
    const leftUpperArm = new THREE.Group();
    const upperArmGeo = new THREE.BoxGeometry(0.1, 0.35, 0.1);
    const upperArmMesh = new THREE.Mesh(upperArmGeo, robesMat);
    upperArmMesh.position.y = -0.175;
    leftUpperArm.add(upperArmMesh);

    const leftForearm = new THREE.Group();
    const forearmGeo = new THREE.BoxGeometry(0.09, 0.3, 0.09);
    const leftForearmMesh = new THREE.Mesh(forearmGeo, robesMat);
    leftForearmMesh.position.y = -0.15;
    leftForearm.add(leftForearmMesh);

    // Hand (small box)
    const handGeo = new THREE.BoxGeometry(0.08, 0.08, 0.06);
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x8B6948,
      roughness: 0.7,
      metalness: 0.0,
    });
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.y = -0.32;
    leftForearm.add(leftHand);

    leftForearm.position.y = -0.35;
    leftUpperArm.add(leftForearm);
    leftUpperArm.position.set(-0.3, 0.2, 0);
    leftUpperArm.rotation.x = -0.4; // arms reaching forward toward decks
    leftUpperArm.rotation.z = 0.15;
    avatarGroup.add(leftUpperArm);
    this.avatar.leftUpperArm = leftUpperArm;
    this.avatar.leftForearm = leftForearm;

    // Right arm (mirror)
    const rightUpperArm = new THREE.Group();
    const rightUpperMesh = new THREE.Mesh(upperArmGeo.clone(), robesMat);
    rightUpperMesh.position.y = -0.175;
    rightUpperArm.add(rightUpperMesh);

    const rightForearm = new THREE.Group();
    const rightForearmMesh = new THREE.Mesh(forearmGeo.clone(), robesMat);
    rightForearmMesh.position.y = -0.15;
    rightForearm.add(rightForearmMesh);

    const rightHand = new THREE.Mesh(handGeo.clone(), skinMat);
    rightHand.position.y = -0.32;
    rightForearm.add(rightHand);

    rightForearm.position.y = -0.35;
    rightUpperArm.add(rightForearm);
    rightUpperArm.position.set(0.3, 0.2, 0);
    rightUpperArm.rotation.x = -0.4;
    rightUpperArm.rotation.z = -0.15;
    avatarGroup.add(rightUpperArm);
    this.avatar.rightUpperArm = rightUpperArm;
    this.avatar.rightForearm = rightForearm;

    // --- LOWER BODY (robes) ---
    const robeGeo = new THREE.CylinderGeometry(0.15, 0.28, 0.8, 8);
    const robe = new THREE.Mesh(robeGeo, robesMat);
    robe.position.y = -0.7;
    avatarGroup.add(robe);

    // Position avatar behind the booth, standing on the stage
    // Avatar center (torso) Y: stage + booth height + some offset so hands reach the decks
    avatarGroup.position.set(0, BOOTH_Y + BOOTH_H + 0.5, BOOTH_CENTER_Z + 0.7);
    this.group.add(avatarGroup);
  }

  // ==================================================================
  //  UPDATE
  // ==================================================================
  /**
   * @param {number} time - elapsed time in seconds
   * @param {boolean} isBeat - true on detected beats
   * @param {number} energy - overall audio energy (0-1)
   */
  update(time, isBeat, energy) {
    if (energy === undefined) energy = 0;

    // Beat impact decay
    if (isBeat) {
      this.beatImpact = 1.0;
    }
    this.beatImpact *= 0.9; // fast decay

    this.updateAvatarAnimation(time, energy);
    if (this.Q.djScreenUpdates !== false) {
      this.updateLaptopScreen(time, energy);
      this.updateCDJScreens(time, energy);
      this.updateFacade(time, energy);
    }
  }

  // ------------------------------------------------------------------
  //  Avatar animation
  // ------------------------------------------------------------------
  updateAvatarAnimation(time, energy) {
    // --- Head bob ---
    // Faster bob rate when energy is high, bigger amplitude on beat
    const bobRate = 2.0 + energy * 4.0;
    const bobAmp = 0.02 + this.beatImpact * 0.06 + energy * 0.03;
    this.headBobPhase += bobRate * 0.016; // ~60fps increment
    const headBob = Math.sin(this.headBobPhase) * bobAmp;

    if (this.avatar.head) {
      this.avatar.head.position.y = 0.42 + headBob;
      // Slight tilt with the bob
      this.avatar.head.rotation.x = Math.sin(this.headBobPhase) * 0.04 * (1 + this.beatImpact);
    }

    // --- Torso sway ---
    if (this.avatar.torso) {
      this.avatar.torso.rotation.y = Math.sin(time * 0.3) * 0.05;
      this.avatar.torso.position.y = Math.sin(this.headBobPhase * 0.5) * 0.01;
    }

    // --- Arm movement ---
    this.armPhase += (1.5 + energy * 2.0) * 0.016;

    if (this.avatar.leftUpperArm) {
      // Left arm: subtle reaching/pulling motion (mixing)
      this.avatar.leftUpperArm.rotation.x = -0.4 + Math.sin(this.armPhase * 0.7) * 0.08;
      this.avatar.leftUpperArm.rotation.z = 0.15 + Math.sin(this.armPhase * 0.5 + 1) * 0.05;
    }
    if (this.avatar.leftForearm) {
      this.avatar.leftForearm.rotation.x = Math.sin(this.armPhase * 1.1) * 0.12;
    }

    if (this.avatar.rightUpperArm) {
      // Right arm: opposite phase for natural look
      this.avatar.rightUpperArm.rotation.x = -0.4 + Math.sin(this.armPhase * 0.7 + Math.PI) * 0.08;
      this.avatar.rightUpperArm.rotation.z = -0.15 + Math.sin(this.armPhase * 0.5 + Math.PI + 1) * 0.05;
    }
    if (this.avatar.rightForearm) {
      this.avatar.rightForearm.rotation.x = Math.sin(this.armPhase * 1.1 + Math.PI) * 0.12;
    }

    // --- Sacred geometry chest glow pulsing ---
    if (this.avatar.chestGlowMat) {
      const glowPulse = 0.3 + energy * 0.5 + this.beatImpact * 0.3;
      this.avatar.chestGlowMat.opacity = Math.min(glowPulse, 1.0);
    }
    if (this.avatar.chestGlow) {
      // Slow rotation of the sacred geometry pattern
      this.avatar.chestGlow.rotation.z = time * 0.15;
    }
  }

  // ------------------------------------------------------------------
  //  Laptop waveform screen
  // ------------------------------------------------------------------
  updateLaptopScreen(time, energy) {
    if (!this.laptopCtx) return;
    const ctx = this.laptopCtx;
    const w = this.laptopCanvas.width;
    const h = this.laptopCanvas.height;

    // Fade previous frame (trail effect)
    ctx.fillStyle = 'rgba(5, 5, 16, 0.3)';
    ctx.fillRect(0, 0, w, h);

    // Draw a scrolling waveform
    const centerY = h / 2;
    const amplitude = 20 + energy * 30;

    ctx.strokeStyle = `hsl(${(time * 40) % 360}, 100%, ${50 + energy * 30}%)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let x = 0; x < w; x++) {
      const t = x / w;
      const wave1 = Math.sin((t * 8 + time * 3) * Math.PI) * amplitude * 0.6;
      const wave2 = Math.sin((t * 15 + time * 5) * Math.PI) * amplitude * 0.3;
      const wave3 = Math.sin((t * 3 + time * 1.5) * Math.PI) * amplitude * 0.2;
      const y = centerY + wave1 + wave2 + wave3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Secondary waveform (mirrored, different color)
    ctx.strokeStyle = `hsla(${(time * 40 + 180) % 360}, 80%, 40%, 0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const t = x / w;
      const wave = Math.sin((t * 12 + time * 4) * Math.PI) * amplitude * 0.4;
      const y = centerY - wave;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Playhead line
    const playheadX = ((time * 0.1) % 1) * w;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, h);
    ctx.stroke();

    // BPM display (top-left corner)
    ctx.fillStyle = '#FFD700';
    ctx.font = '10px monospace';
    ctx.fillText('128.0 BPM', 4, 12);

    // Time display (top-right)
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    ctx.fillText(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, w - 50, 12);

    this.laptopTexture.needsUpdate = true;
  }

  // ------------------------------------------------------------------
  //  CDJ screens
  // ------------------------------------------------------------------
  updateCDJScreens(time, energy) {
    this.cdjCanvases.forEach((cdj, idx) => {
      const { canvas, ctx, texture } = cdj;
      const w = canvas.width;
      const h = canvas.height;

      // Clear
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      // Simple waveform display per CDJ
      const offset = idx * Math.PI;
      ctx.strokeStyle = idx === 0 ? '#00FFFF' : '#FF00FF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const t = x / w;
        const amp = 10 + energy * 15;
        const y = h / 2 + Math.sin((t * 10 + time * 2 + offset) * Math.PI) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Track number
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '8px monospace';
      ctx.fillText(`DECK ${idx + 1}`, 4, 10);

      // Beat grid dots at bottom
      ctx.fillStyle = '#FFD700';
      for (let b = 0; b < 16; b++) {
        const bx = 8 + b * (w - 16) / 15;
        const active = (Math.floor(time * 4 + idx * 2) % 16) === b;
        ctx.globalAlpha = active ? 1.0 : 0.3;
        ctx.fillRect(bx - 1.5, h - 8, 3, 3);
      }
      ctx.globalAlpha = 1.0;

      texture.needsUpdate = true;
    });
  }

  /**
   * Dispose of all geometries, materials, and textures
   */
  dispose() {
    // Dispose canvas textures
    if (this.laptopTexture) this.laptopTexture.dispose();
    this.cdjCanvases.forEach(c => c.texture.dispose());
    if (this.ledPanels) this.ledPanels.forEach(p => p.texture.dispose());

    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    });
    this.scene.remove(this.group);
  }

  // ------------------------------------------------------------------
  //  DJ Booth wrap-around LED panels — continuous video sliced across panels
  // ------------------------------------------------------------------
  updateFacade(time, energy) {
    if (!this.ledPanels || this.ledPanels.length === 0) return;

    // Check if shared video is ready
    const videoReady = this._ledVideoReady &&
                       this._ledVideo &&
                       !this._ledVideo.paused &&
                       this._ledVideo.readyState >= 2;

    // Try to start video if paused
    if (this._ledVideo && this._ledVideo.paused) {
      this._ledVideo.play().catch(() => {});
    }

    for (let p = 0; p < this.ledPanels.length; p++) {
      const { canvas, ctx, texture, sliceStart, sliceFrac } = this.ledPanels[p];
      const w = canvas.width;
      const h = canvas.height;

      if (videoReady) {
        // Draw the panel's slice of the video — creates one continuous image
        // across left side → front → right side
        const vw = this._ledVideo.videoWidth || this._ledVideo.width || 256;
        const vh = this._ledVideo.videoHeight || this._ledVideo.height || 128;
        const sx = Math.floor(sliceStart * vw);
        const sw = Math.floor(sliceFrac * vw);
        ctx.drawImage(this._ledVideo, sx, 0, sw, vh, 0, 0, w, h);

        // Beat flash overlay
        if (this.beatImpact > 0.3) {
          ctx.fillStyle = `rgba(255, 255, 255, ${this.beatImpact * 0.15})`;
          ctx.fillRect(0, 0, w, h);
        }
      } else {
        // Fallback: continuous color wash across all panels
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, w, h);

        const hue = ((time * 40) + 200) % 360;
        const lum = 15 + energy * 35 + this.beatImpact * 20;
        ctx.fillStyle = `hsl(${hue}, 80%, ${lum}%)`;
        ctx.fillRect(0, 0, w, h);

        const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
        grad.addColorStop(0, `hsla(${(hue + 60) % 360}, 90%, ${30 + energy * 30}%, 0.6)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        if (this.beatImpact > 0.3) {
          ctx.fillStyle = `rgba(255, 255, 255, ${this.beatImpact * 0.3})`;
          ctx.fillRect(0, 0, w, h);
        }
      }

      texture.needsUpdate = true;
    }
  }
}
