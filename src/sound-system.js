/**
 * SoundSystem - Void Reality professional PA rig
 * Floor-stacked subwoofer bins + flown line array speakers + rigging hardware
 * Static display only — no audio-reactive effects
 *
 * Reference: Void Acoustics touring rig style — dark charcoal cabinets,
 * large sub stacks 3-high flanking stage, line arrays flown close to stage
 * Deep recessed ports, embossed branding, aggressive industrial aesthetic
 */
import * as THREE from 'three';

// --- Layout constants (match stage.js) ---
const STAGE_Z = 24;
const STAGE_Y = 1.5;
const STAGE_WIDTH = 15;
const STAGE_FRONT_Z = STAGE_Z - 5; // z = 19

// --- Positioning ---
const SUB_X = 8.5;         // just outside stage edges
const SUB_Z = 19.5;        // at stage front edge
const ARRAY_X = 8.5;       // outside side trusses (at x=±8)
const ARRAY_Z = 17;        // in front of front truss (at z=18.5)
const ARRAY_TOP_Y = 11;    // above truss height (trusses at y=9-9.5)
const MOTOR_Y = 25;        // rigging point height (below vault)

// --- Sub dimensions (large Void Stasys style) ---
const SUB_W = 1.8;         // wide
const SUB_H = 1.0;         // tall per cabinet
const SUB_D = 1.2;         // deep
const SUBS_PER_STACK = 3;  // 3-high stacks

// --- Line array box dimensions (large Void Air series style) ---
const BOX_TOP_W = 1.1;
const BOX_BOT_W = 1.3;
const BOX_H = 0.5;
const BOX_D = 0.7;
const BOXES_PER_ARRAY = 8;

// --- Colors (refined dark industrial aesthetic) ---
const VOID_CABINET = 0x1e1e22;     // dark charcoal cabinet — professional matte finish
const VOID_DARK = 0x111114;        // near-black accents/edges
const GRILLE_GREY = 0x2a2a30;      // dark grille
const GRILLE_DARK = 0x141418;      // sub grille (very dark)
const METAL_GREY = 0x555555;       // rigging hardware
const PORT_BLACK = 0x030303;       // deep port interior
const LOGO_SILVER = 0x888890;      // embossed logo — subtle silver contrast

// J-curve angles (cumulative degrees per box, top to bottom)
const J_CURVE = [0, 1, 3, 5, 8, 12, 16, 21];

export class SoundSystem {
  constructor(scene, textures = {}, qualityConfig = {}) {
    this.scene = scene;
    this.textures = textures;
    this.Q = qualityConfig;
    this.group = new THREE.Group();
    this.group.name = 'soundSystem';

    this.chainMeshes = []; // InstancedMesh refs for disposal

    this.build();
    this.scene.add(this.group);
  }

  build() {
    this.createSubwooferStacks();
    this.createLineArrays();
    this.createRigging();
  }

  // ==================================================================
  //  SUBWOOFER STACKS — 3-high, Void Acoustics industrial style
  // ==================================================================
  createSubwooferStacks() {
    // Two stacks per side (double-wide like the reference photo)
    [-1, 1].forEach(side => {
      // Inner stack (closer to center)
      this.createSingleSubStack(side * (SUB_X - SUB_W * 0.52), SUB_Z, side);
      // Outer stack
      this.createSingleSubStack(side * (SUB_X + SUB_W * 0.52), SUB_Z, side);
    });
  }

  createSingleSubStack(x, z, side) {
    for (let i = 0; i < SUBS_PER_STACK; i++) {
      const baseY = i * SUB_H;
      this.createSubCabinet(x, baseY + SUB_H / 2, z, i === 0, side);
    }
  }

  createSubCabinet(x, y, z, isBottom, side) {
    const cabinet = new THREE.Group();

    // Shared materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: VOID_CABINET,
      roughness: 0.82,   // matte finish like pro PA cabinets
      metalness: 0.02,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: VOID_DARK,
      roughness: 0.6,
      metalness: 0.3,
    });
    const portMat = new THREE.MeshStandardMaterial({
      color: PORT_BLACK,
      roughness: 0.95,
      metalness: 0,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: METAL_GREY,
      roughness: 0.35,
      metalness: 0.85,
    });

    // --- Main body shell (Void white/light grey) ---
    const bodyGeo = new THREE.BoxGeometry(SUB_W, SUB_H, SUB_D);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    cabinet.add(body);

    // --- Recessed front face (deep cavity — drivers hidden behind grille) ---
    // Real pro subs (Void Stasys, d&b SL-SUB) have a CONTINUOUS front grille
    // with NO visible drivers. The port is a narrow horizontal slot, not a separate box.
    const recessDepth = 0.08;
    const recessW = SUB_W - 0.08;
    const recessH = SUB_H - 0.08;
    const recessGeo = new THREE.BoxGeometry(recessW, recessH, recessDepth);
    const recessMat = new THREE.MeshStandardMaterial({
      color: 0x080808,
      roughness: 0.95,
      metalness: 0.05,
    });
    const recess = new THREE.Mesh(recessGeo, recessMat);
    recess.position.set(0, 0, -SUB_D / 2 + recessDepth / 2 - 0.001);
    cabinet.add(recess);

    // --- Front grille — continuous perforated metal panel (covers entire face) ---
    const grilleMat = new THREE.MeshStandardMaterial({
      color: GRILLE_DARK,
      roughness: 0.45,
      metalness: 0.5,
    });
    const grilleGeo = new THREE.PlaneGeometry(recessW - 0.01, recessH - 0.01);
    const grille = new THREE.Mesh(grilleGeo, grilleMat);
    grille.position.set(0, 0, -SUB_D / 2 - 0.003);
    grille.rotation.y = Math.PI;
    cabinet.add(grille);

    // --- Perforated grille texture: tight horizontal slats ---
    // Creates the classic perforated metal look without visible drivers
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.8, metalness: 0.25 });
    const slatCount = this.Q.subSlatCount || 20; // many thin slats = fine perforated texture
    for (let s = 0; s < slatCount; s++) {
      const slatGeo = new THREE.BoxGeometry(recessW - 0.03, 0.005, 0.008);
      const slat = new THREE.Mesh(slatGeo, slatMat);
      const sy = -recessH / 2 + 0.03 + s * ((recessH - 0.06) / (slatCount - 1));
      slat.position.set(0, sy, -SUB_D / 2 - 0.007);
      cabinet.add(slat);
    }

    // --- Structural cross braces on grille (2 vertical reinforcement bars) ---
    // These break up the flat grille and add visual interest without looking like eyes
    if (this.Q.subBraces !== false) {
      const braceMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.5 });
      [-recessW * 0.28, recessW * 0.28].forEach(bx => {
        const braceGeo = new THREE.BoxGeometry(0.025, recessH - 0.04, 0.015);
        const brace = new THREE.Mesh(braceGeo, braceMat);
        brace.position.set(bx, 0, -SUB_D / 2 - 0.010);
        cabinet.add(brace);
      });
    }

    // --- BASS PORT — narrow horizontal slot at bottom of grille ---
    // Integrated into the grille as a clean slot, NOT a separate protruding box.
    // This is how Void Stasys and similar subs look — a thin dark slit.
    const portSlotW = recessW * 0.85;
    const portSlotH = 0.04; // narrow slit, not a big rectangle
    const portSlotDepth = 0.12;

    // Port cavity behind grille (visible dark depth through the slot)
    const portSlotGeo = new THREE.BoxGeometry(portSlotW, portSlotH, portSlotDepth);
    const portSlotCavity = new THREE.Mesh(portSlotGeo, portMat);
    portSlotCavity.position.set(0, -recessH / 2 + 0.06, -SUB_D / 2 + portSlotDepth / 2);
    cabinet.add(portSlotCavity);

    // Thin border around port slot opening
    if (this.Q.subPortBorder !== false) {
      const slotBorderMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.5 });
      // Top edge
      const topEdge = new THREE.Mesh(new THREE.BoxGeometry(portSlotW + 0.01, 0.006, 0.012), slotBorderMat);
      topEdge.position.set(0, -recessH / 2 + 0.06 + portSlotH / 2 + 0.003, -SUB_D / 2 - 0.005);
      cabinet.add(topEdge);
      // Bottom edge
      const botEdge = new THREE.Mesh(new THREE.BoxGeometry(portSlotW + 0.01, 0.006, 0.012), slotBorderMat);
      botEdge.position.set(0, -recessH / 2 + 0.06 - portSlotH / 2 - 0.003, -SUB_D / 2 - 0.005);
      cabinet.add(botEdge);
    }

    // --- EMBOSSED 3D LOGO on side (replaces CanvasTexture) ---
    if (this.Q.subEmbossedLogo !== false) {
      const embossedMat = new THREE.MeshStandardMaterial({
        color: LOGO_SILVER, // subtle silver contrast against dark cabinet
        roughness: 0.25,    // smoother than matte body — catches light
        metalness: 0.45,    // slightly metallic for embossed look
      });

      const logoGroup = new THREE.Group();
      const embossHeight = 0.012; // raised from surface
      const letterScale = 0.14;   // letter size

      // "VOID" — large embossed letters
      this._createEmbossedText(logoGroup, 'VOID', 0, 0.06, embossHeight, letterScale, embossedMat);
      // "REALITY" — smaller embossed letters below
      this._createEmbossedText(logoGroup, 'REALITY', 0, -0.08, embossHeight, letterScale * 0.45, embossedMat);
      // Thin embossed line separator between VOID and REALITY
      const sepGeo = new THREE.BoxGeometry(0.5, 0.006, embossHeight);
      const sep = new THREE.Mesh(sepGeo, embossedMat);
      sep.position.set(0, -0.01, embossHeight / 2);
      logoGroup.add(sep);

      logoGroup.position.set(
        side * (SUB_W / 2 + embossHeight / 2 + 0.001),
        SUB_H * 0.08,
        0
      );
      logoGroup.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      cabinet.add(logoGroup);
    }

    // --- Top/bottom edge trim (dark, aggressive edges) ---
    [SUB_H / 2, -SUB_H / 2].forEach(ty => {
      const trimGeo = new THREE.BoxGeometry(SUB_W + 0.01, 0.03, SUB_D + 0.01);
      const trim = new THREE.Mesh(trimGeo, darkMat);
      trim.position.y = ty;
      cabinet.add(trim);
    });

    // --- Aggressive corner protectors (larger, industrial) ---
    if (this.Q.subCornerProtectors !== false) {
      const cornerGeo = new THREE.BoxGeometry(0.07, SUB_H + 0.02, 0.07);
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([cx, cz]) => {
        const corner = new THREE.Mesh(cornerGeo, darkMat);
        corner.position.set(cx * SUB_W / 2, 0, cz * SUB_D / 2);
        cabinet.add(corner);
      });
    }

    // --- Steel edge rails (industrial look — 4 vertical edges) ---
    if (this.Q.subEdgeRails !== false) {
      const railGeo = new THREE.BoxGeometry(0.025, SUB_H - 0.04, 0.025);
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([cx, cz]) => {
        const rail = new THREE.Mesh(railGeo, metalMat);
        rail.position.set(cx * (SUB_W / 2 - 0.02), 0, cz * (SUB_D / 2 - 0.02));
        cabinet.add(rail);
      });
    }

    // --- Rubber feet on bottom cabinet ---
    if (isBottom && this.Q.subRubberFeet !== false) {
      const footMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
      const footGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.05, 10);
      const hw = SUB_W / 2 - 0.12;
      const hd = SUB_D / 2 - 0.12;
      [[-hw, -hd], [-hw, hd], [hw, -hd], [hw, hd]].forEach(([fx, fz]) => {
        const foot = new THREE.Mesh(footGeo, footMat);
        foot.position.set(fx, -SUB_H / 2 - 0.025, fz);
        cabinet.add(foot);
      });
    }

    // --- Recessed handles on sides (deeper, more realistic) ---
    if (this.Q.subHandles !== false) {
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.35, metalness: 0.8 });
      [-1, 1].forEach(s => {
        // Handle recess cavity
        const recessHandleGeo = new THREE.BoxGeometry(0.03, 0.1, 0.22);
        const recessHandleMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
        const handleRecess = new THREE.Mesh(recessHandleGeo, recessHandleMat);
        handleRecess.position.set(s * (SUB_W / 2 - 0.01), 0, 0);
        cabinet.add(handleRecess);

        // Handle bar (metal rod inside recess)
        const handleBarGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.18, 8);
        const handleBar = new THREE.Mesh(handleBarGeo, handleMat);
        handleBar.rotation.x = Math.PI / 2;
        handleBar.position.set(s * (SUB_W / 2 - 0.005), 0, 0);
        cabinet.add(handleBar);
      });
    }

    // --- Butterfly latch hardware on top (stacking latches) ---
    if (!isBottom && this.Q.subLatches !== false) {
      const latchGeo = new THREE.BoxGeometry(0.04, 0.02, 0.06);
      [-0.5, 0.5].forEach(lx => {
        const latch = new THREE.Mesh(latchGeo, metalMat);
        latch.position.set(lx, -SUB_H / 2 + 0.015, -SUB_D / 2 + 0.08);
        cabinet.add(latch);
      });
    }

    cabinet.position.set(x, y, z);
    this.group.add(cabinet);
  }

  // --- Embossed 3D text builder (geometric block letters) ---
  _createEmbossedText(parent, text, cx, cy, depth, scale, mat) {
    // Simple block letter definitions (relative to scale)
    // Each letter is defined as an array of [x, y, w, h] rectangles
    const LETTERS = {
      'V': [
        [-0.4, 0.5, 0.2, 0.6], [0.2, 0.5, 0.2, 0.6],  // two legs
        [-0.3, -0.1, 0.2, 0.3], [0.1, -0.1, 0.2, 0.3],  // converging
        [-0.1, -0.4, 0.2, 0.3],                           // bottom point
      ],
      'O': [
        [-0.4, 0.5, 0.2, 1.0], [0.2, 0.5, 0.2, 1.0],  // sides
        [-0.2, 0.5, 0.4, 0.2], [-0.2, -0.3, 0.4, 0.2], // top/bottom
      ],
      'I': [
        [-0.15, 0.5, 0.3, 0.2], [-0.15, -0.3, 0.3, 0.2], // serifs
        [-0.1, 0.5, 0.2, 1.0],                              // stem
      ],
      'D': [
        [-0.35, 0.5, 0.2, 1.0],                          // left bar
        [-0.15, 0.5, 0.35, 0.2], [-0.15, -0.3, 0.35, 0.2], // top/bottom
        [0.2, 0.3, 0.2, 0.6],                             // right curve
      ],
      'R': [
        [-0.35, 0.5, 0.2, 1.0],                          // left bar
        [-0.15, 0.5, 0.45, 0.2],                          // top
        [-0.15, 0.1, 0.45, 0.2],                          // middle
        [0.2, 0.5, 0.2, 0.4],                             // right upper
        [0.0, -0.1, 0.2, 0.4], [0.2, -0.3, 0.2, 0.2],   // leg
      ],
      'E': [
        [-0.35, 0.5, 0.2, 1.0],                          // left bar
        [-0.15, 0.5, 0.5, 0.2],                           // top
        [-0.15, 0.1, 0.4, 0.2],                           // middle
        [-0.15, -0.3, 0.5, 0.2],                          // bottom
      ],
      'A': [
        [-0.4, 0.5, 0.2, 1.0], [0.2, 0.5, 0.2, 1.0],  // sides
        [-0.2, 0.5, 0.4, 0.2],                           // top
        [-0.2, 0.1, 0.4, 0.2],                           // crossbar
      ],
      'L': [
        [-0.35, 0.5, 0.2, 1.0],                          // left bar
        [-0.15, -0.3, 0.5, 0.2],                          // bottom
      ],
      'T': [
        [-0.35, 0.5, 0.7, 0.2],                          // top bar
        [-0.1, 0.3, 0.2, 0.8],                            // stem
      ],
      'Y': [
        [-0.4, 0.5, 0.2, 0.4], [0.2, 0.5, 0.2, 0.4],  // upper arms
        [-0.1, 0.1, 0.2, 0.6],                            // stem
      ],
    };

    const letterSpacing = 0.75 * scale;
    const totalW = (text.length - 1) * letterSpacing;
    const startX = cx - totalW / 2;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const letterDef = LETTERS[char];
      if (!letterDef) continue;

      const lx = startX + i * letterSpacing;

      for (const [rx, ry, rw, rh] of letterDef) {
        const blockGeo = new THREE.BoxGeometry(
          rw * scale,
          rh * scale,
          depth
        );
        const block = new THREE.Mesh(blockGeo, mat);
        block.position.set(
          lx + rx * scale + rw * scale / 2,
          cy + ry * scale - rh * scale / 2,
          depth / 2
        );
        parent.add(block);
      }
    }
  }

  // ==================================================================
  //  LINE ARRAY SPEAKERS — 8 boxes per side, flown close to stage
  // ==================================================================
  createLineArrays() {
    [-1, 1].forEach(side => {
      const x = side * ARRAY_X;
      const arrayGroup = new THREE.Group();
      arrayGroup.position.set(x, ARRAY_TOP_Y, ARRAY_Z);

      let cumulativeY = 0;

      for (let i = 0; i < BOXES_PER_ARRAY; i++) {
        const result = this.createArrayBox(i);
        const angle = THREE.MathUtils.degToRad(J_CURVE[i]);

        result.boxGroup.position.y = cumulativeY;
        result.boxGroup.rotation.x = angle;

        arrayGroup.add(result.boxGroup);

        cumulativeY -= BOX_H + 0.03;
      }

      // Face audience (-Z direction)
      arrayGroup.rotation.y = Math.PI;

      this.group.add(arrayGroup);
    });
  }

  createArrayBox(index) {
    const boxGroup = new THREE.Group();

    // --- Trapezoidal cabinet (Void white) ---
    const halfTopW = BOX_TOP_W / 2;
    const halfBotW = BOX_BOT_W / 2;
    const halfH = BOX_H / 2;

    const shape = new THREE.Shape();
    shape.moveTo(-halfBotW, -halfH);
    shape.lineTo(halfBotW, -halfH);
    shape.lineTo(halfTopW, halfH);
    shape.lineTo(-halfTopW, halfH);
    shape.closePath();

    const bodyGeo = new THREE.ExtrudeGeometry(shape, {
      depth: BOX_D,
      bevelEnabled: false,
    });
    bodyGeo.translate(0, 0, -BOX_D / 2);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: VOID_CABINET,
      roughness: 0.8,
      metalness: 0.02,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    boxGroup.add(body);

    // --- Recessed front cavity (deep grille recess) ---
    const avgW = (BOX_TOP_W + BOX_BOT_W) / 2;
    const frontRecessDepth = 0.04;
    const frontRecessGeo = new THREE.BoxGeometry(avgW - 0.08, BOX_H - 0.06, frontRecessDepth);
    const frontRecessMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.9,
      metalness: 0.1,
    });
    const frontRecess = new THREE.Mesh(frontRecessGeo, frontRecessMat);
    frontRecess.position.set(0, 0, -BOX_D / 2 + frontRecessDepth / 2 - 0.001);
    boxGroup.add(frontRecess);

    // --- Front grille (dark — sits in recess) ---
    const frontMat = new THREE.MeshStandardMaterial({
      color: GRILLE_GREY,
      roughness: 0.35,
      metalness: 0.5,
    });
    const frontGeo = new THREE.PlaneGeometry(avgW - 0.1, BOX_H - 0.08);
    const front = new THREE.Mesh(frontGeo, frontMat);
    front.position.z = -BOX_D / 2 - 0.003;
    front.rotation.y = Math.PI;
    boxGroup.add(front);

    // --- Fine horizontal grille bars ---
    const barMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.3 });
    const slatCount = this.Q.arraySlatCount || 6;
    for (let s = 0; s < slatCount; s++) {
      const barGeo = new THREE.BoxGeometry(avgW - 0.12, 0.006, 0.008);
      const bar = new THREE.Mesh(barGeo, barMat);
      const sy = -BOX_H / 2 + 0.05 + s * ((BOX_H - 0.1) / (slatCount - 1));
      bar.position.set(0, sy, -BOX_D / 2 - 0.006);
      boxGroup.add(bar);
    }

    // --- Two large woofer cones with dustcaps (visible through grille) ---
    const driverConeMat = new THREE.MeshStandardMaterial({
      color: 0x111111, roughness: 0.8, metalness: 0.15,
    });
    const dustCapMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, roughness: 0.6, metalness: 0.3,
    });
    const driverSurMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a, roughness: 0.9, metalness: 0.05,
    });

    [-0.28, 0.28].forEach(dx => {
      // Surround ring
      const surGeo = new THREE.RingGeometry(0.1, 0.13, 20);
      const sur = new THREE.Mesh(surGeo, driverSurMat);
      sur.position.set(dx, 0, -BOX_D / 2 - 0.004);
      sur.rotation.y = Math.PI;
      boxGroup.add(sur);

      // Cone
      const coneGeo = new THREE.CylinderGeometry(0.09, 0.035, 0.03, 16);
      const cone = new THREE.Mesh(coneGeo, driverConeMat);
      cone.position.set(dx, 0, -BOX_D / 2 + 0.015);
      cone.rotation.x = Math.PI / 2;
      boxGroup.add(cone);

      // Dustcap
      const capGeo = new THREE.SphereGeometry(0.025, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      const cap = new THREE.Mesh(capGeo, dustCapMat);
      cap.position.set(dx, 0, -BOX_D / 2 - 0.003);
      cap.rotation.x = -Math.PI / 2;
      boxGroup.add(cap);
    });

    // --- Center compression horn (rectangular waveguide — deeper recess) ---
    if (this.Q.arrayHornThroats !== false) {
      const hornRecessGeo = new THREE.BoxGeometry(0.22, BOX_H * 0.55, 0.03);
      const hornRecessMat = new THREE.MeshStandardMaterial({
        color: 0x050505, roughness: 0.95, metalness: 0,
      });
      const hornRecess = new THREE.Mesh(hornRecessGeo, hornRecessMat);
      hornRecess.position.set(0, 0, -BOX_D / 2 + 0.015);
      boxGroup.add(hornRecess);

      // Horn flare (visible throat)
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.4 });
      const hornGeo = new THREE.PlaneGeometry(0.16, BOX_H * 0.45);
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.z = -BOX_D / 2 - 0.005;
      horn.rotation.y = Math.PI;
      boxGroup.add(horn);
    }

    // --- Rigging side plates (heavy steel brackets) ---
    const bracketMat = new THREE.MeshStandardMaterial({
      color: METAL_GREY,
      roughness: 0.35,
      metalness: 0.9,
    });
    [-1, 1].forEach(s => {
      // Main bracket plate
      const bracketGeo = new THREE.BoxGeometry(0.05, BOX_H + 0.02, 0.14);
      const bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.position.set(s * (avgW / 2 + 0.03), 0, 0);
      boxGroup.add(bracket);

      // Rigging pin holes (small dark cylinders)
      if (this.Q.arrayRiggingPins !== false) {
        const pinHoleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.055, 8);
        const pinHoleMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.5 });
        [0.12, -0.12].forEach(ph => {
          const pinHole = new THREE.Mesh(pinHoleGeo, pinHoleMat);
          pinHole.position.set(s * (avgW / 2 + 0.03), ph, 0);
          pinHole.rotation.z = Math.PI / 2;
          boxGroup.add(pinHole);
        });
      }
    });

    // --- Top/bottom dark edge trim ---
    const edgeMat = new THREE.MeshStandardMaterial({ color: VOID_DARK, roughness: 0.5, metalness: 0.2 });
    [halfH, -halfH].forEach(ey => {
      const edgeGeo = new THREE.BoxGeometry(avgW + 0.1, 0.02, BOX_D + 0.02);
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.position.y = ey;
      boxGroup.add(edge);
    });

    return { boxGroup, frontMat };
  }

  // ==================================================================
  //  RIGGING HARDWARE
  // ==================================================================
  createRigging() {
    const rigMat = new THREE.MeshStandardMaterial({
      color: METAL_GREY,
      roughness: 0.4,
      metalness: 0.9,
    });
    const motorMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.5,
      metalness: 0.7,
    });

    [-1, 1].forEach(side => {
      const x = side * ARRAY_X;

      // --- Ceiling motor housing ---
      const motorGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.6, 12);
      const motor = new THREE.Mesh(motorGeo, motorMat);
      motor.position.set(x, MOTOR_Y, ARRAY_Z);
      this.group.add(motor);

      // Motor mounting plate
      const plateMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.8 });
      const plateGeo = new THREE.BoxGeometry(0.6, 0.05, 0.6);
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.set(x, MOTOR_Y + 0.32, ARRAY_Z);
      this.group.add(plate);

      // --- Flying frame / bumper at top of array ---
      const frameY = ARRAY_TOP_Y + BOX_H / 2 + 0.12;
      const frameW = BOX_BOT_W + 0.3;
      const frameD = BOX_D + 0.2;
      const tubeR = 0.03;

      // Frame tubes (rectangle)
      const frameParts = [
        { geo: new THREE.CylinderGeometry(tubeR, tubeR, frameW, 8), pos: [x, frameY, ARRAY_Z - frameD / 2], rot: [0, 0, Math.PI / 2] },
        { geo: new THREE.CylinderGeometry(tubeR, tubeR, frameW, 8), pos: [x, frameY, ARRAY_Z + frameD / 2], rot: [0, 0, Math.PI / 2] },
        { geo: new THREE.CylinderGeometry(tubeR, tubeR, frameD, 8), pos: [x - frameW / 2, frameY, ARRAY_Z], rot: [Math.PI / 2, 0, 0] },
        { geo: new THREE.CylinderGeometry(tubeR, tubeR, frameD, 8), pos: [x + frameW / 2, frameY, ARRAY_Z], rot: [Math.PI / 2, 0, 0] },
      ];

      frameParts.forEach(({ geo, pos, rot }) => {
        const tube = new THREE.Mesh(geo, rigMat);
        tube.position.set(...pos);
        tube.rotation.set(...rot);
        this.group.add(tube);
      });

      // --- Chains (instanced torus links) ---
      const chainFromY = MOTOR_Y - 0.3;
      const chainToY = frameY + 0.05;
      const chainLength = chainFromY - chainToY;
      const linkSpacing = 0.08;
      const linkCount = Math.max(1, Math.floor(chainLength / linkSpacing));

      // Two chains per side (front and back of frame)
      [ARRAY_Z - frameD / 2 + 0.05, ARRAY_Z + frameD / 2 - 0.05].forEach(cz => {
        const linkGeo = new THREE.TorusGeometry(0.03, 0.01, 6, 12);
        const linkMat = new THREE.MeshStandardMaterial({
          color: METAL_GREY,
          roughness: 0.5,
          metalness: 0.9,
        });
        const chain = new THREE.InstancedMesh(linkGeo, linkMat, linkCount);

        const dummy = new THREE.Object3D();
        for (let i = 0; i < linkCount; i++) {
          const ly = chainFromY - i * linkSpacing;
          dummy.position.set(x, ly, cz);
          dummy.rotation.set((i % 2) * Math.PI / 2, 0, 0);
          dummy.updateMatrix();
          chain.setMatrixAt(i, dummy.matrix);
        }
        chain.instanceMatrix.needsUpdate = true;

        this.group.add(chain);
        this.chainMeshes.push(chain);
      });

      // --- Safety chain (single, slightly offset) ---
      const safetyGeo = new THREE.TorusGeometry(0.02, 0.006, 6, 10);
      const safetyMat = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.6,
        metalness: 0.8,
      });
      const safetyCount = Math.max(1, Math.floor(chainLength / 0.1));
      const safety = new THREE.InstancedMesh(safetyGeo, safetyMat, safetyCount);

      const safetyDummy = new THREE.Object3D();
      const safetyX = x + side * 0.18;
      for (let i = 0; i < safetyCount; i++) {
        const ly = chainFromY - i * 0.1;
        const slack = Math.sin(i * 0.3) * 0.025;
        safetyDummy.position.set(safetyX + slack, ly, ARRAY_Z);
        safetyDummy.rotation.set((i % 2) * Math.PI / 2, 0, 0);
        safetyDummy.updateMatrix();
        safety.setMatrixAt(i, safetyDummy.matrix);
      }
      safety.instanceMatrix.needsUpdate = true;
      this.group.add(safety);
    });
  }

  // ==================================================================
  //  UPDATE (no-op — speakers are static display only)
  // ==================================================================
  update() {
    // No audio-reactive effects — speakers are static
  }

  // ==================================================================
  //  DISPOSE
  // ==================================================================
  dispose() {
    this.chainMeshes.forEach(chain => {
      chain.geometry.dispose();
      chain.material.dispose();
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
