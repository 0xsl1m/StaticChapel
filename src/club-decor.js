/**
 * ClubDecor - Ultra-premium cathedral-club ambiance
 * Crystal chandeliers, designer furniture with proper geometry,
 * commercial cocktail bar, high-frequency electric arc VFX
 *
 * Layout philosophy: Vegas-tier nightclub transition flow
 * Bar (back) → Lounge zone → Transition → Dancefloor → Stage
 * Furniture variety: no two adjacent groups identical
 */
import * as THREE from 'three';

// --- Cathedral layout ---
const NAVE_WIDTH = 20;
const NAVE_HEIGHT = 30;
const NAVE_LENGTH = 60;

// --- Premium color palette (bright enough to see in dim cathedral) ---
const GOLD_WARM       = 0xd4af37;
const CHROME_BRUSHED  = 0xb8b8b8;
const LEATHER_BLACK   = 0x2a2a2a;   // dark grey, not invisible black
const LEATHER_COGNAC  = 0x8b5e3c;   // warm cognac, brighter
const LEATHER_OXBLOOD = 0x5c1a1a;   // dark red-brown
const VELVET_CRIMSON  = 0x8b1a1a;   // rich deep red, actually visible
const VELVET_NAVY     = 0x1a2a5c;   // dark blue, visible in low light
const VELVET_EMERALD  = 0x1a4a2a;   // deep emerald green
const VELVET_PLUM     = 0x4a1a4a;   // deep plum
const MARBLE_CALACATTA= 0xf0ece4;
const BRASS_ANTIQUE   = 0xb8943c;   // brighter brass
const ONYX_BLACK      = 0x0e0e0e;
const WALNUT_DARK     = 0x5c3c1e;   // warmer, brighter walnut
const NEON_PURPLE     = 0x8800ff;

// --- Helper: place a Three.js object at a position ---
function place(obj, x, y, z) {
  obj.position.set(x, y, z);
  return obj;
}

// --- Shared material cache ---
let _matCache = null;
function getMats() {
  if (_matCache) return _matCache;
  _matCache = {
    leather: new THREE.MeshStandardMaterial({ color: LEATHER_BLACK, roughness: 0.72, metalness: 0.03 }),
    cognac:  new THREE.MeshStandardMaterial({ color: LEATHER_COGNAC, roughness: 0.6, metalness: 0.03 }),
    oxblood: new THREE.MeshStandardMaterial({ color: LEATHER_OXBLOOD, roughness: 0.65, metalness: 0.03 }),
    velvetCrimson: new THREE.MeshStandardMaterial({ color: VELVET_CRIMSON, roughness: 0.92, metalness: 0.0 }),
    velvetNavy: new THREE.MeshStandardMaterial({ color: VELVET_NAVY, roughness: 0.92, metalness: 0.0 }),
    velvetEmerald: new THREE.MeshStandardMaterial({ color: VELVET_EMERALD, roughness: 0.92, metalness: 0.0 }),
    velvetPlum: new THREE.MeshStandardMaterial({ color: VELVET_PLUM, roughness: 0.92, metalness: 0.0 }),
    chrome:  new THREE.MeshStandardMaterial({ color: CHROME_BRUSHED, roughness: 0.12, metalness: 0.95 }),
    brass:   new THREE.MeshStandardMaterial({ color: BRASS_ANTIQUE, roughness: 0.28, metalness: 0.88 }),
    gold:    new THREE.MeshStandardMaterial({ color: GOLD_WARM, roughness: 0.22, metalness: 0.88 }),
    walnut:  new THREE.MeshStandardMaterial({ color: WALNUT_DARK, roughness: 0.58, metalness: 0.02 }),
    marble:  new THREE.MeshStandardMaterial({ color: MARBLE_CALACATTA, roughness: 0.1, metalness: 0.0 }),
    onyx:    new THREE.MeshStandardMaterial({ color: ONYX_BLACK, roughness: 0.08, metalness: 0.15 }),
    mirror:  new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.02, metalness: 0.98 }),
    stainless: new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.1, metalness: 0.9 }),
    rubber:  new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, metalness: 0.0 }),
  };
  return _matCache;
}

export class ClubDecor {
  constructor(scene, textures = {}, qualityConfig = {}) {
    this.scene = scene;
    this.textures = textures;
    this.Q = qualityConfig;
    this.group = new THREE.Group();
    this.group.name = 'clubDecor';

    this.chandeliers = [];
    this.electricArcs = [];
    this.pillarGlows = [];
    this.staticParticles = null;
    this.barGlow = null;
    this.underglows = [];

    this.build();
    this.scene.add(this.group);
  }

  build() {
    this.createChandeliers();
    this.createFurniture();
    this.createCocktailBar();
    this.createPillarGlows();
    this.createElectricArcs();
    this.createStaticParticles();
  }

  // ==================================================================
  //  CRYSTAL CHANDELIERS — 3 grand tiered chandeliers
  // ==================================================================
  createChandeliers() {
    [{ x: 0, z: -12 }, { x: 0, z: 0 }, { x: 0, z: 12 }].forEach(pos => {
      this.chandeliers.push(this._buildChandelier(pos.x, 22, pos.z));
    });
  }

  _buildChandelier(x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const M = getMats();

    const frameMat = M.gold;
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.05, metalness: 0.3,
      transparent: true, opacity: 0.7,
      emissive: 0xffeedd, emissiveIntensity: 0.4,
    });

    // Suspension chain
    const chainGeo = new THREE.CylinderGeometry(0.012, 0.012, 6, 4);
    g.add(place(new THREE.Mesh(chainGeo, frameMat), 0, 3, 0));

    // Canopy
    const canopyGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.12, 12);
    g.add(place(new THREE.Mesh(canopyGeo, frameMat), 0, 6, 0));

    // Crown ring
    const crownGeo = new THREE.TorusGeometry(0.8, 0.06, 8, 24);
    const crown = new THREE.Mesh(crownGeo, frameMat);
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 0.8;
    g.add(crown);

    const crystals = [];
    const tiers = [
      { y: 0.5, ringR: 1.6, arms: 10, dropLen: 0.45, crystalR: 0.035 },
      { y: -0.1, ringR: 2.2, arms: 14, dropLen: 0.55, crystalR: 0.04 },
      { y: -0.7, ringR: 1.4, arms: 10, dropLen: 0.35, crystalR: 0.03 },
    ];

    const tierCount = this.Q.chandelierTiers || 3;
    const armsPerTier = this.Q.chandelierArmsPerTier || 10;

    tiers.slice(0, tierCount).forEach(tier => {
      const effectiveArms = Math.min(tier.arms, armsPerTier);
      const ringGeo = new THREE.TorusGeometry(tier.ringR, 0.025, 6, 32);
      const ring = new THREE.Mesh(ringGeo, frameMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = tier.y;
      g.add(ring);

      for (let a = 0; a < effectiveArms; a++) {
        const angle = (a / effectiveArms) * Math.PI * 2;
        const ax = Math.cos(angle) * tier.ringR;
        const az = Math.sin(angle) * tier.ringR;

        const armLen = tier.ringR * 0.7;
        const armGeo = new THREE.CylinderGeometry(0.01, 0.01, armLen, 4);
        const arm = new THREE.Mesh(armGeo, frameMat);
        arm.position.set(ax * 0.5, tier.y + 0.15, az * 0.5);
        arm.rotation.z = Math.atan2(az, ax);
        arm.rotation.x = Math.PI / 2;
        g.add(arm);

        const dropGeo = new THREE.ConeGeometry(tier.crystalR, tier.dropLen, 6);
        const cMat = crystalMat.clone();
        const drop = new THREE.Mesh(dropGeo, cMat);
        drop.position.set(ax, tier.y - tier.dropLen / 2, az);
        g.add(drop);
        crystals.push(drop);

        const beadGeo = new THREE.OctahedronGeometry(tier.crystalR * 0.8, 0);
        const bead = new THREE.Mesh(beadGeo, cMat);
        bead.position.set(ax, tier.y + 0.04, az);
        g.add(bead);
      }

      if (this.Q.chandelierPendants !== false) {
      for (let a = 0; a < effectiveArms; a += 2) {
        const angle1 = (a / effectiveArms) * Math.PI * 2;
        const angle2 = ((a + 1) / effectiveArms) * Math.PI * 2;
        const midAngle = (angle1 + angle2) / 2;
        const mx = Math.cos(midAngle) * (tier.ringR + 0.15);
        const mz = Math.sin(midAngle) * (tier.ringR + 0.15);
        const pendGeo = new THREE.ConeGeometry(0.025, 0.2, 4);
        const pend = new THREE.Mesh(pendGeo, crystalMat.clone());
        pend.position.set(mx, tier.y - 0.2, mz);
        g.add(pend);
        crystals.push(pend);
      }
      } // end chandelierPendants check
    });

    // Central column
    const colGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.0, 6);
    g.add(new THREE.Mesh(colGeo, frameMat));

    // Finial
    const finialGeo = new THREE.IcosahedronGeometry(0.15, 1);
    g.add(place(new THREE.Mesh(finialGeo, frameMat), 0, -1.2, 0));

    // Main warm light — increased for better room fill
    const light = new THREE.PointLight(0xffeedd, 1.6, 35, 1.0);
    light.position.y = -0.3;
    g.add(light);

    // Secondary uplight — illuminates vault ceiling
    let uplight = null;
    if ((this.Q.chandelierLightsPerUnit || 3) >= 2) {
      uplight = new THREE.PointLight(0xffeedd, 0.6, 22, 1.2);
      uplight.position.y = 1.0;
      g.add(uplight);
    }

    // Tier accent lights — brighter for crystal sparkle
    const tierLights = [];
    if ((this.Q.chandelierLightsPerUnit || 3) >= 3) {
      [0.5, -0.1, -0.7].forEach(ty => {
        const tLight = new THREE.PointLight(0xfff5e0, 0.5, 12, 1.3);
        tLight.position.y = ty;
        g.add(tLight);
        tierLights.push(tLight);
      });
    }

    this.group.add(g);
    return { group: g, light, uplight, tierLights, crystals };
  }

  // ==================================================================
  //  DESIGNER FURNITURE — Vegas-tier layout
  //
  //  Architecture-anchored seating using column bays as VIP sections.
  //  Columns at x=±10, wall at x=±15.6 → side aisles ~5.6m wide.
  //  Column spacing ~4.6m (60m / 13 bays).
  //
  //  Column Z positions: -25.4, -20.8, -16.2, -11.5, -6.9, -2.3,
  //                       2.3,   6.9,  11.5,  16.2,  20.8, 25.4
  //
  //  LAYOUT FLOW (south to north, -Z to +Z):
  //    Bar (z=-25) → Bar flanking lounges (z=-23)
  //    → Deep lounge bays (z=-20 to -12, side aisles)
  //    → Transition / standing cocktails (z=-8 to -2, side aisles)
  //    → DANCEFLOOR (z=-2 to 14, completely clear)
  //    → Stage-adjacent VIP (z=2 to 12, side aisles only)
  //
  //  RULES:
  //    - Every piece is part of a COMPLETE GROUP (booth/sofa + table)
  //    - Furniture backs against outer wall, openings face nave
  //    - 1.5m clear path along inner edge (column side) of each aisle
  //    - No two adjacent bays have same furniture type
  //    - Left and right aisles use DIFFERENT sequences
  //    - Each group has LED underglow for "glow island" effect
  // ==================================================================
  createFurniture() {
    // ==================================================================
    //  STAGE-FACING CLUB LAYOUT
    //
    //  Architecture: columns at x=±10, walls at x=±15.6, stage at z=19
    //  Side aisles ~5.6m wide. Column spacing ~4.6m.
    //
    //  KEY DESIGN PRINCIPLE: Every seat faces the STAGE / DANCEFLOOR.
    //  In real Vegas clubs (Hakkasan, Omnia, XS), VIP booths are ANGLED
    //  toward the stage — not perpendicular. People come to watch the DJ.
    //
    //  ROTATION CONVENTION (local space):
    //    back (local -Z) = against wall, front/table (local +Z) = view direction
    //
    //  ANGLE STRATEGY (stage is at +Z):
    //    Left side (x=-14.5): negative rotation → back toward -X wall,
    //      front angled between +X (nave) and +Z (stage)
    //    Right side (x=+14.5): positive rotation → back toward +X wall,
    //      front angled between -X (nave) and +Z (stage)
    //    Pieces further from stage get steeper angles toward it.
    //    Pieces near stage face more straight out (they're already close).
    //
    //  LAYOUT FLOW (south to north, -Z to +Z):
    //    Bar (z=-25) → Bar-flanking lounges
    //    → Deep lounge bays (z=-20 to -10, side aisles)
    //    → Transition cocktails (z=-6 to -3)
    //    → DANCEFLOOR (z=-2 to 14, completely clear in nave)
    //    → Stage-adjacent VIP (z=4 to 12, side aisles only)
    // ==================================================================

    // Angle constants — steeper for back rows, gentler near stage
    const ANG_FAR_L   = -Math.PI * 0.35;  // ~63° — back lounge, steep toward stage
    const ANG_MID_L   = -Math.PI * 0.30;  // ~54° — mid lounge
    const ANG_NEAR_L  = -Math.PI * 0.22;  // ~40° — near stage, more sideways
    const ANG_STAGE_L = -Math.PI * 0.15;  // ~27° — right next to stage, mostly facing out
    const ANG_FAR_R   =  Math.PI * 0.35;
    const ANG_MID_R   =  Math.PI * 0.30;
    const ANG_NEAR_R  =  Math.PI * 0.22;
    const ANG_STAGE_R =  Math.PI * 0.15;

    // Push furniture against walls — x=±14.2 leaves ~4.2m clear to columns
    const LEFT_X  = -14.2;
    const RIGHT_X =  14.2;

    // ============ BAR-FLANKING LOUNGES (z ≈ -22, between columns 1–2) ============
    // Guests waiting for drinks — these face the stage so they can see from the bar
    this._buildBanquette(LEFT_X, 0, -22, ANG_FAR_L, 'navy');
    this._buildChesterfieldGroup(RIGHT_X, 0, -22, ANG_FAR_R, 'plum');

    // ============ LEFT SIDE AISLE — angled toward stage ============
    // Bay 2–3 (z ≈ -18.5): U-booth — premium VIP, steep stage angle
    this._buildUBooth(LEFT_X, 0, -18.5, ANG_FAR_L, 'crimson');

    // Bay 3–4 (z ≈ -14): Chesterfield group — mid distance
    this._buildChesterfieldGroup(LEFT_X, 0, -14.0, ANG_MID_L, 'emerald');

    // Bay 4–5 (z ≈ -9.2): Corner booth — getting closer to dancefloor
    this._buildCornerBooth(LEFT_X, 0, -9.2, ANG_NEAR_L, 'plum');

    // Bay 5–6 (z ≈ -4.6): TRANSITION — standing cocktail table
    this._buildHighTop(-12.5, 0, -4.6);

    // Bay 7–8 (z ≈ 4.6): Stage-side VIP — nearly facing straight out
    this._buildCornerBooth(LEFT_X, 0, 4.6, ANG_STAGE_L, 'navy');

    // Bay 8–9 (z ≈ 9.2): Daybed — luxury piece near stage
    this._buildDaybed(LEFT_X, 0, 9.2, ANG_STAGE_L, 'crimson');

    // ============ RIGHT SIDE AISLE — mirrored angles ============
    // Bay 2–3 (z ≈ -18.5): Chesterfield (different from left's U-booth)
    this._buildChesterfieldGroup(RIGHT_X, 0, -18.5, ANG_FAR_R, 'crimson');

    // Bay 3–4 (z ≈ -14): U-booth
    this._buildUBooth(RIGHT_X, 0, -14.0, ANG_MID_R, 'navy');

    // Bay 4–5 (z ≈ -9.2): Banquette — different from left's corner booth
    this._buildBanquette(RIGHT_X, 0, -9.2, ANG_NEAR_R, 'emerald');

    // Bay 5–6 (z ≈ -4.6): TRANSITION — standing cocktail table
    this._buildHighTop(12.5, 0, -4.6);

    // Bay 7–8 (z ≈ 4.6): Daybed — different from left's corner booth
    this._buildDaybed(RIGHT_X, 0, 4.6, ANG_STAGE_R, 'plum');

    // Bay 8–9 (z ≈ 9.2): Banquette — near-stage VIP
    this._buildBanquette(RIGHT_X, 0, 9.2, ANG_STAGE_R, 'crimson');

    // ============ BACK LOUNGE — center nave (z ≈ -16 to -14) ============
    // Both face DIRECTLY at stage (rotation = 0 = local +Z = world +Z = toward stage)
    this._buildBanquette(-5.5, 0, -16, 0, 'emerald');
    this._buildLoungeChairPair(5.5, 0, -16, 0);

    // ============ DANCEFLOOR (z = -2 to 14) — main nave ============
    // COMPLETELY CLEAR — no furniture whatsoever
  }

  // ======== U-SHAPED BOOTH — premium VIP with 3-sided enclosure ========
  // The workhorse of Vegas VIP seating. Seats 6-8 around a low table.
  // Back and sides create privacy; open front faces the nave.
  _buildUBooth(x, y, z, rotation, colorScheme) {
    const lg = new THREE.Group();
    lg.position.set(x, y, z);
    lg.rotation.y = rotation;
    const M = getMats();

    const sofaMat = colorScheme === 'crimson' ? M.velvetCrimson :
                    colorScheme === 'navy' ? M.velvetNavy :
                    colorScheme === 'plum' ? M.velvetPlum : M.velvetEmerald;

    const seatH = 0.42;
    const backH = 1.05; // tall booth back for VIP privacy
    const cushDepth = 0.65;
    const boothW = 3.2; // wide enough for 3 people across the back
    const sideLen = 1.6; // side bench length (2 people per side)

    // === BACK SECTION (long bench against wall) ===
    // Walnut plinth
    lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(boothW + 0.08, 0.06, cushDepth + 0.06), M.walnut), 0, seatH - 0.03, 0));

    // Seat — 3 cushions across
    const cushW = (boothW - 0.08) / 3;
    for (let c = 0; c < 3; c++) {
      const cx = -boothW / 2 + 0.04 + cushW / 2 + c * (cushW + 0.02);
      lg.add(place(new THREE.Mesh(
        new THREE.BoxGeometry(cushW - 0.02, 0.12, cushDepth - 0.12), sofaMat
      ), cx, seatH + 0.06, 0));
    }

    // Tall tufted back panel
    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(boothW - 0.02, backH, 0.13), sofaMat);
    backPanel.position.set(0, seatH + backH / 2 + 0.03, -cushDepth / 2 + 0.07);
    backPanel.rotation.x = 0.03;
    lg.add(backPanel);

    // Diamond tufting on back
    if (this.Q.furnitureTufting !== false) {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 8; c++) {
        const offX = (r % 2 === 1) ? 0.19 : 0;
        const bx = -boothW / 2 + 0.28 + c * 0.38 + offX;
        if (Math.abs(bx) > boothW / 2 - 0.12) continue;
        const by = seatH + 0.18 + r * 0.17;
        if (by > seatH + backH - 0.05) continue;
        lg.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.015, 5, 5), M.gold), bx, by, -cushDepth / 2 + 0.14));
      }
    }
    } // end furnitureTufting check

    // Walnut top rail along back
    lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(boothW + 0.02, 0.04, 0.14), M.walnut),
      0, seatH + backH + 0.05, -cushDepth / 2 + 0.07));

    // === SIDE SECTIONS (U-shape wings) ===
    [-1, 1].forEach(side => {
      const sideX = side * (boothW / 2 + cushDepth / 2 - 0.04);
      const sideZ = cushDepth / 2 + sideLen / 2 - 0.04;

      // Side plinth
      lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(cushDepth + 0.06, 0.06, sideLen + 0.06), M.walnut),
        sideX, seatH - 0.03, sideZ));

      // Side seat — 2 cushions
      const sideCushW = (sideLen - 0.04) / 2;
      for (let c = 0; c < 2; c++) {
        const cz = sideLen / 2 - 0.02 - sideCushW / 2 - c * (sideCushW + 0.02);
        lg.add(place(new THREE.Mesh(
          new THREE.BoxGeometry(cushDepth - 0.12, 0.12, sideCushW - 0.02), sofaMat
        ), sideX, seatH + 0.06, sideZ - sideLen / 2 + 0.02 + sideCushW / 2 + c * (sideCushW + 0.02)));
      }

      // Side back panel (lower than back — stepped height creates a "wrap" feel)
      const sideBackH = backH * 0.8;
      const sideBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, sideBackH, sideLen - 0.02), sofaMat);
      sideBack.position.set(sideX + side * (cushDepth / 2 - 0.07), seatH + sideBackH / 2 + 0.03, sideZ);
      sideBack.rotation.z = -side * 0.03;
      lg.add(sideBack);

      // Side top rail
      lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, sideLen), M.walnut),
        sideX + side * (cushDepth / 2 - 0.07), seatH + sideBackH + 0.05, sideZ));
    });

    // Nailhead trim along bottom of back panel
    if (this.Q.furnitureTufting !== false) {
    for (let n = 0; n < 24; n++) {
      const nx = -boothW / 2 + 0.18 + n * (boothW - 0.36) / 23;
      lg.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.006, 4, 4), M.brass),
        nx, seatH + 0.08, -cushDepth / 2 + 0.14));
    }
    } // end furnitureTufting check

    // Legs
    [[-boothW / 2 + 0.08, -cushDepth / 2 + 0.08], [-boothW / 2 + 0.08, cushDepth / 2 - 0.08],
     [boothW / 2 - 0.08, -cushDepth / 2 + 0.08], [boothW / 2 - 0.08, cushDepth / 2 - 0.08]].forEach(([lx, lz]) => {
      lg.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, seatH - 0.08, 6), M.brass),
        lx, (seatH - 0.08) / 2, lz));
    });

    // Low cocktail table centered inside the U
    this._addPedestalTable(lg, 0, 0, cushDepth / 2 + sideLen * 0.4);

    // LED underglow
    if (this.Q.furnitureUnderglow !== false) {
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(boothW - 0.3, cushDepth - 0.2),
      new THREE.MeshBasicMaterial({ color: NEON_PURPLE, transparent: true, opacity: 0.06,
        blending: THREE.AdditiveBlending, depthWrite: false })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    lg.add(glow);
    this.underglows.push(glow);
    } // end furnitureUnderglow check

    this.group.add(lg);
  }

  // ======== CHESTERFIELD SOFA GROUP (sofa + cocktail table) ========
  _buildChesterfieldGroup(x, y, z, rotation, colorScheme) {
    const lg = new THREE.Group();
    lg.position.set(x, y, z);
    lg.rotation.y = rotation;
    const M = getMats();

    const sofaMat = colorScheme === 'crimson' ? M.velvetCrimson :
                    colorScheme === 'plum' ? M.velvetPlum :
                    colorScheme === 'navy' ? M.velvetNavy : M.velvetEmerald;

    const sofaW = 2.2, sofaD = 0.82, seatH = 0.40;

    // Walnut frame base
    lg.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(sofaW + 0.12, 0.07, sofaD + 0.10), M.walnut
    ), 0, seatH - 0.04, 0));

    // Seat — 3 individual cushions with channel gaps
    const cushW = (sofaW - 0.06) / 3;
    for (let c = 0; c < 3; c++) {
      const cx = -sofaW / 2 + 0.03 + cushW / 2 + c * (cushW + 0.01);
      lg.add(place(new THREE.Mesh(
        new THREE.BoxGeometry(cushW - 0.02, 0.13, sofaD - 0.14), sofaMat
      ), cx, seatH + 0.065, 0.02));
      // Piping
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, cushW - 0.04, 6), sofaMat
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(cx, seatH + 0.13, sofaD / 2 - 0.1);
      lg.add(pipe);
    }

    // Tufted back
    const backH = 0.58;
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(sofaW - 0.04, backH, 0.13), sofaMat
    );
    back.position.set(0, seatH + backH / 2 + 0.04, -sofaD / 2 + 0.08);
    back.rotation.x = 0.06;
    lg.add(back);

    // Diamond tufting buttons
    if (this.Q.furnitureTufting !== false) {
    const btnMat = M.gold;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        const offX = (r % 2 === 1) ? 0.22 : 0;
        const bx = -sofaW / 2 + 0.35 + c * 0.38 + offX;
        if (Math.abs(bx) > sofaW / 2 - 0.12) continue;
        const by = seatH + 0.18 + r * 0.18;
        lg.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), btnMat), bx, by, -sofaD / 2 + 0.15));
      }
    }
    } // end furnitureTufting check

    // Rolled arms
    [-1, 1].forEach(side => {
      const ax = side * (sofaW / 2 - 0.01);
      lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.30, sofaD - 0.06), sofaMat), ax, seatH + 0.19, 0.02));
      lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, sofaD - 0.10), sofaMat), ax, seatH + 0.36, 0.02));
      // Arm roll
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.07, 8), sofaMat);
      roll.rotation.z = Math.PI / 2;
      roll.position.set(ax, seatH + 0.32, sofaD / 2 - 0.06);
      lg.add(roll);
      // Brass rosette
      const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.008, 10), M.brass);
      rosette.rotation.z = Math.PI / 2;
      rosette.position.set(ax + side * 0.035, seatH + 0.32, sofaD / 2 - 0.06);
      lg.add(rosette);
    });

    // Legs
    [[-sofaW / 2 + 0.1, -sofaD / 2 + 0.1], [-sofaW / 2 + 0.1, sofaD / 2 - 0.1],
     [sofaW / 2 - 0.1, -sofaD / 2 + 0.1], [sofaW / 2 - 0.1, sofaD / 2 - 0.1],
     [0, -sofaD / 2 + 0.1], [0, sofaD / 2 - 0.1]].forEach(([lx, lz]) => {
      lg.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.026, seatH - 0.1, 6), M.brass), lx, (seatH - 0.1) / 2, lz));
    });

    // LED underglow
    if (this.Q.furnitureUnderglow !== false) {
    const glowMat = new THREE.MeshBasicMaterial({
      color: NEON_PURPLE, transparent: true, opacity: 0.07,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(sofaW - 0.2, sofaD - 0.2), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    lg.add(glow);
    this.underglows.push(glow);
    } // end furnitureUnderglow check

    // Cocktail table in front
    this._addPedestalTable(lg, 0, 0, 1.0);

    this.group.add(lg);
  }

  // ======== CORNER BOOTH (L-shaped banquette) ========
  _buildCornerBooth(x, y, z, rotation, colorScheme) {
    const lg = new THREE.Group();
    lg.position.set(x, y, z);
    lg.rotation.y = rotation;
    const M = getMats();

    const sofaMat = colorScheme === 'crimson' ? M.velvetCrimson :
                    colorScheme === 'navy' ? M.velvetNavy :
                    colorScheme === 'plum' ? M.velvetPlum : M.velvetEmerald;

    const seatH = 0.40;
    const backH = 0.70; // tall booth back
    const cushDepth = 0.65;

    // L-shape: long section along back + short return section
    const longW = 2.4, shortW = 1.6;

    // === LONG SECTION (back wall) ===
    // Plinth
    lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(longW + 0.08, 0.06, cushDepth + 0.06), M.walnut), 0, seatH - 0.03, 0));

    // Seat cushions (3)
    const cW = (longW - 0.06) / 3;
    for (let c = 0; c < 3; c++) {
      const cx = -longW / 2 + 0.03 + cW / 2 + c * (cW + 0.01);
      lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(cW - 0.02, 0.12, cushDepth - 0.12), sofaMat), cx, seatH + 0.06, 0));
    }

    // Back panel with tufting
    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(longW - 0.02, backH, 0.12), sofaMat);
    backPanel.position.set(0, seatH + backH / 2 + 0.05, -cushDepth / 2 + 0.07);
    backPanel.rotation.x = 0.04;
    lg.add(backPanel);

    // Tufting on long back
    if (this.Q.furnitureTufting !== false) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        const offX = (r % 2 === 1) ? 0.19 : 0;
        const bx = -longW / 2 + 0.25 + c * 0.38 + offX;
        if (Math.abs(bx) > longW / 2 - 0.1) continue;
        lg.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.016, 5, 5), M.gold), bx, seatH + 0.2 + r * 0.2, -cushDepth / 2 + 0.14));
      }
    }
    } // end furnitureTufting check

    // === SHORT RETURN SECTION (side) ===
    const returnX = longW / 2 + cushDepth / 2 - 0.06;
    const returnZ = -cushDepth / 2 + shortW / 2 - 0.06;

    // Plinth
    lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(cushDepth + 0.06, 0.06, shortW + 0.06), M.walnut), returnX, seatH - 0.03, returnZ));

    // Seat cushions (2)
    const rCW = (shortW - 0.04) / 2;
    for (let c = 0; c < 2; c++) {
      const cz = -cushDepth / 2 + 0.02 + rCW / 2 + c * (rCW + 0.01) - 0.06;
      lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(cushDepth - 0.12, 0.12, rCW - 0.02), sofaMat), returnX, seatH + 0.06, cz));
    }

    // Return back panel
    const returnBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, backH, shortW - 0.02), sofaMat);
    returnBack.position.set(returnX + cushDepth / 2 - 0.07, seatH + backH / 2 + 0.05, returnZ);
    returnBack.rotation.z = -0.04;
    lg.add(returnBack);

    // Top rail on both sections
    lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(longW + 0.04, 0.035, 0.14), M.walnut), 0, seatH + backH + 0.07, -cushDepth / 2 + 0.07));
    lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, shortW + 0.04), M.walnut), returnX + cushDepth / 2 - 0.07, seatH + backH + 0.07, returnZ));

    // Corner table in the L
    this._addPedestalTable(lg, returnX / 2 + 0.1, 0, 0.3);

    // Legs
    [[-longW / 2 + 0.08, -cushDepth / 2 + 0.08], [-longW / 2 + 0.08, cushDepth / 2 - 0.08],
     [longW / 2 - 0.08, cushDepth / 2 - 0.08]].forEach(([lx, lz]) => {
      lg.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, seatH - 0.08, 6), M.brass), lx, (seatH - 0.08) / 2, lz));
    });

    // Underglow
    if (this.Q.furnitureUnderglow !== false) {
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(longW - 0.2, cushDepth - 0.2),
      new THREE.MeshBasicMaterial({ color: NEON_PURPLE, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    lg.add(glow);
    this.underglows.push(glow);
    } // end furnitureUnderglow check

    this.group.add(lg);
  }

  // ======== DAYBED (chaise longue — unique luxury piece) ========
  _buildDaybed(x, y, z, rotation, colorScheme) {
    const lg = new THREE.Group();
    lg.position.set(x, y, z);
    lg.rotation.y = rotation;
    const M = getMats();

    const sofaMat = colorScheme === 'emerald' ? M.velvetEmerald :
                    colorScheme === 'navy' ? M.velvetNavy :
                    colorScheme === 'plum' ? M.velvetPlum : M.velvetCrimson;

    const dbW = 2.0, dbD = 0.9, seatH = 0.38;

    // Walnut frame with brass inlay
    lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(dbW + 0.1, 0.06, dbD + 0.08), M.walnut), 0, seatH - 0.03, 0));
    lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(dbW + 0.06, 0.012, 0.01), M.brass), 0, seatH - 0.01, dbD / 2 + 0.04));

    // Single long cushion (no divisions — luxury daybed style)
    lg.add(place(new THREE.Mesh(new THREE.BoxGeometry(dbW - 0.08, 0.14, dbD - 0.1), sofaMat), 0, seatH + 0.07, 0));

    // Bolster pillow at one end (rolled cylinder)
    const bolster = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, dbD - 0.2, 12), sofaMat);
    bolster.rotation.x = Math.PI / 2;
    bolster.position.set(-dbW / 2 + 0.18, seatH + 0.2, 0);
    lg.add(bolster);

    // Raised back on one end only (asymmetric — chaise style)
    const headH = 0.45;
    const headPanel = new THREE.Mesh(new THREE.BoxGeometry(0.12, headH, dbD - 0.04), sofaMat);
    headPanel.position.set(-dbW / 2 + 0.07, seatH + headH / 2 + 0.05, 0);
    headPanel.rotation.z = 0.08;
    lg.add(headPanel);

    // Channel tufting on headboard
    if (this.Q.furnitureTufting !== false) {
    for (let ch = 0; ch < 5; ch++) {
      const cz = -dbD / 2 + 0.15 + ch * ((dbD - 0.3) / 4);
      const groove = new THREE.Mesh(
        new THREE.BoxGeometry(0.005, headH - 0.08, 0.006),
        new THREE.MeshStandardMaterial({ color: 0x0a2a12, roughness: 1.0 })
      );
      groove.position.set(-dbW / 2 + 0.14, seatH + headH / 2 + 0.05, cz);
      lg.add(groove);
    }
    } // end furnitureTufting check

    // Slim tapered legs (darker brass, splayed)
    [[-dbW / 2 + 0.1, -dbD / 2 + 0.1], [-dbW / 2 + 0.1, dbD / 2 - 0.1],
     [dbW / 2 - 0.1, -dbD / 2 + 0.1], [dbW / 2 - 0.1, dbD / 2 - 0.1]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, seatH - 0.08, 6), M.brass);
      leg.position.set(lx, (seatH - 0.08) / 2, lz);
      leg.rotation.x = lz > 0 ? 0.05 : -0.05;
      leg.rotation.z = lx > 0 ? -0.05 : 0.05;
      lg.add(leg);
    });

    // Side table next to daybed
    this._addPedestalTable(lg, dbW / 2 + 0.5, 0, 0);

    // Underglow
    if (this.Q.furnitureUnderglow !== false) {
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(dbW - 0.3, dbD - 0.2),
      new THREE.MeshBasicMaterial({ color: NEON_PURPLE, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    lg.add(glow);
    this.underglows.push(glow);
    } // end furnitureUnderglow check

    this.group.add(lg);
  }

  // ======== LOUNGE CHAIR PAIR (2 different chairs facing each other + shared table) ========
  _buildLoungeChairPair(x, y, z, rotation) {
    const lg = new THREE.Group();
    lg.position.set(x, y, z);
    lg.rotation.y = rotation;
    const M = getMats();

    // Chair 1: Wingback in cognac
    this._addWingbackChair(lg, -0.8, 0, 0, 0, M.cognac);
    // Chair 2: Channel-tufted in oxblood (different style!)
    this._addChannelChair(lg, 0.8, 0, 0, Math.PI, M.oxblood);
    // Shared cocktail table between them
    this._addPedestalTable(lg, 0, 0, 0);

    this.group.add(lg);
  }

  // --- Wingback chair component (used inside lounge chair pairs and groups) ---
  _addWingbackChair(parent, x, y, z, rot, mat) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rot;
    const M = getMats();
    const sH = 0.42;

    // Seat
    g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.12, 0.54), mat), 0, sH + 0.06, 0));
    // Frame
    g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.60), M.walnut), 0, sH - 0.025, 0));

    // Tall tufted back
    const bH = 0.52;
    g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.56, bH, 0.11), mat), 0, sH + bH / 2 + 0.09, -0.25));
    // Diamond buttons on back (3x4)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const offX = (r % 2 === 1) ? 0.07 : 0;
        const bx = -0.21 + c * 0.14 + offX;
        if (Math.abs(bx) > 0.24) continue;
        g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 5), M.gold), bx, sH + 0.2 + r * 0.15, -0.19));
      }
    }

    // Wing panels
    [-1, 1].forEach(side => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.11, bH - 0.08, 0.20), mat);
      wing.position.set(side * 0.33, sH + bH / 2 + 0.07, -0.16);
      wing.rotation.y = side * 0.2;
      g.add(wing);
    });

    // Splayed legs
    [[-0.24, -0.22], [-0.24, 0.22], [0.24, -0.22], [0.24, 0.22]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.022, 0.35, 6), M.brass);
      leg.position.set(dx, 0.175, dz);
      leg.rotation.x = dz > 0 ? 0.05 : -0.05;
      leg.rotation.z = dx > 0 ? -0.05 : 0.05;
      g.add(leg);
    });

    parent.add(g);
  }

  // --- Channel-tufted club chair (different from wingback) ---
  _addChannelChair(parent, x, y, z, rot, mat) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rot;
    const M = getMats();
    const sH = 0.40;

    // Wider, lower seat (club chair proportions)
    g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.58), mat), 0, sH + 0.07, 0));
    g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.05, 0.63), M.walnut), 0, sH - 0.025, 0));

    // Rounded back (lower than wingback, more reclined)
    const bH = 0.42;
    const backMesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, bH, 0.12), mat);
    backMesh.position.set(0, sH + bH / 2 + 0.06, -0.27);
    backMesh.rotation.x = 0.1; // more reclined
    g.add(backMesh);

    // Vertical channel tufting (distinctive from diamond pattern)
    for (let ch = 0; ch < 6; ch++) {
      const cx = -0.24 + ch * 0.096;
      const groove = new THREE.Mesh(
        new THREE.BoxGeometry(0.005, bH - 0.06, 0.005),
        new THREE.MeshStandardMaterial({ color: 0x3a1010, roughness: 1.0 })
      );
      groove.position.set(cx, sH + bH / 2 + 0.06, -0.20);
      g.add(groove);
    }

    // Thick padded arms (no wings — club style)
    [-1, 1].forEach(side => {
      g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.52), mat), side * 0.33, sH + 0.15, -0.02));
      g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.50), mat), side * 0.33, sH + 0.28, -0.02));
    });

    // Chrome legs (different from brass wingback)
    [[-0.28, -0.25], [-0.28, 0.25], [0.28, -0.25], [0.28, 0.25]].forEach(([dx, dz]) => {
      g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 6), M.chrome), dx, 0.17, dz));
    });

    parent.add(g);
  }

  // --- Shared pedestal cocktail table ---
  _addPedestalTable(parent, x, y, z) {
    const M = getMats();
    // Thick marble top with brass rim
    parent.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.045, 20), M.marble), x, 0.48, z));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.01, 6, 20), M.brass);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, 0.49, z);
    parent.add(rim);
    // Brass pedestal
    parent.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.048, 0.38, 8), M.brass), x, 0.27, z));
    // Onyx base with brass rim
    parent.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.03, 14), M.onyx), x, 0.015, z));
    const baseRim = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.007, 4, 14), M.brass);
    baseRim.rotation.x = Math.PI / 2;
    baseRim.position.set(x, 0.02, z);
    parent.add(baseRim);
  }

  // ---- High-top cocktail table with stools ----
  _buildHighTop(x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const M = getMats();

    // Marble top
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.32, 0.045, 20), M.marble), 0, 1.06, 0));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.008, 6, 20), M.brass);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.07;
    g.add(rim);

    // Chrome pedestal
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.04, 1.0, 8), M.chrome), 0, 0.52, 0));

    // Weighted base
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.03, 14), M.chrome), 0, 0.015, 0));

    // Two stools (placed asymmetrically — not exactly opposite)
    this._buildStool(g, -0.55, 0, 0.15);
    this._buildStool(g, 0.45, 0, -0.25);

    this.group.add(g);
  }

  // ---- Bar stool ----
  _buildStool(parent, x, y, z) {
    const sg = new THREE.Group();
    sg.position.set(x, y, z);
    const M = getMats();

    // Chrome stem
    sg.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.66, 8), M.chrome), 0, 0.33, 0));
    // Base disc
    sg.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.20, 0.022, 14), M.chrome), 0, 0.011, 0));

    // Padded seat
    const cushionPoints = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      cushionPoints.push(new THREE.Vector2(0.16 * Math.sin(t * Math.PI), t * 0.07));
    }
    sg.add(place(new THREE.Mesh(new THREE.LatheGeometry(cushionPoints, 14), M.leather), 0, 0.66, 0));

    // Chrome seat ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.007, 4, 14), M.chrome);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.68;
    sg.add(ring);

    // Low back
    sg.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.022), M.leather), 0, 0.80, -0.13));
    [-1, 1].forEach(side => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.022), M.leather);
      wing.position.set(side * 0.12, 0.79, -0.11);
      wing.rotation.y = side * 0.28;
      sg.add(wing);
    });
    // Chrome back rail
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.28, 6), M.chrome);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 0.89, -0.13);
    sg.add(rail);

    // Footrest ring
    const foot = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 4, 12), M.chrome);
    foot.rotation.x = Math.PI / 2;
    foot.position.y = 0.24;
    sg.add(foot);

    parent.add(sg);
  }

  // ---- Wall banquette ----
  _buildBanquette(x, y, z, rotation, colorScheme) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotation;
    const M = getMats();

    const sofaMat = colorScheme === 'navy' ? M.velvetNavy :
                    colorScheme === 'plum' ? M.velvetPlum :
                    colorScheme === 'crimson' ? M.velvetCrimson : M.velvetEmerald;

    const bW = 2.8, bD = 0.62, seatH = 0.42;
    const backH = 0.80;

    // Walnut plinth
    g.add(place(new THREE.Mesh(new THREE.BoxGeometry(bW + 0.08, 0.07, bD + 0.08), M.walnut), 0, seatH - 0.035, 0));

    // Seat — 3 cushions
    const cushW = (bW - 0.06) / 3;
    for (let c = 0; c < 3; c++) {
      const cx = -bW / 2 + 0.03 + cushW / 2 + c * (cushW + 0.01);
      g.add(place(new THREE.Mesh(new THREE.BoxGeometry(cushW - 0.02, 0.11, bD - 0.08), sofaMat), cx, seatH + 0.055, 0.02));
    }

    // Tufted back
    const backMesh = new THREE.Mesh(new THREE.BoxGeometry(bW - 0.04, backH, 0.11), sofaMat);
    backMesh.position.set(0, seatH + backH / 2 + 0.06, -bD / 2 + 0.07);
    backMesh.rotation.x = 0.04;
    g.add(backMesh);

    // Diamond buttons
    if (this.Q.furnitureTufting !== false) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 7; c++) {
        const offX = (r % 2 === 1) ? 0.19 : 0;
        const bx = -bW / 2 + 0.28 + c * 0.38 + offX;
        if (Math.abs(bx) > bW / 2 - 0.14) continue;
        g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.014, 5, 5), M.gold), bx, seatH + 0.18 + r * 0.17, -bD / 2 + 0.13));
      }
    }
    } // end furnitureTufting check

    // Walnut top rail
    g.add(place(new THREE.Mesh(new THREE.BoxGeometry(bW, 0.035, 0.14), M.walnut), 0, seatH + backH + 0.08, -bD / 2 + 0.07));

    // Nailhead trim
    if (this.Q.furnitureTufting !== false) {
    for (let n = 0; n < 22; n++) {
      const nx = -bW / 2 + 0.18 + n * (bW - 0.36) / 21;
      g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.006, 4, 4), M.brass), nx, seatH + 0.08, -bD / 2 + 0.14));
    }
    } // end furnitureTufting check

    // Legs
    [[-bW / 2 + 0.08, -bD / 2 + 0.08], [-bW / 2 + 0.08, bD / 2 - 0.08],
     [bW / 2 - 0.08, -bD / 2 + 0.08], [bW / 2 - 0.08, bD / 2 - 0.08]].forEach(([lx, lz]) => {
      g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.020, seatH - 0.08, 6), M.brass), lx, (seatH - 0.08) / 2, lz));
    });

    // Low coffee table in front
    const tW = 1.1, tD = 0.48, tH = 0.40;
    g.add(place(new THREE.Mesh(new THREE.BoxGeometry(tW, 0.035, tD), M.marble), 0, tH, 0.72));
    g.add(place(new THREE.Mesh(new THREE.BoxGeometry(tW + 0.02, 0.01, tD + 0.02), M.brass), 0, tH + 0.018, 0.72));
    // Sled legs
    [-0.42, 0.42].forEach(tx => {
      g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.022, tH - 0.03, 0.022), M.brass), tx, (tH - 0.03) / 2, 0.72 - tD / 2 + 0.05));
      g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.022, tH - 0.03, 0.022), M.brass), tx, (tH - 0.03) / 2, 0.72 + tD / 2 - 0.05));
      g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, tD - 0.06), M.brass), tx, 0.013, 0.72));
    });

    // Underglow
    if (this.Q.furnitureUnderglow !== false) {
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(bW - 0.3, bD - 0.2),
      new THREE.MeshBasicMaterial({ color: NEON_PURPLE, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0, 0.02, 0.04);
    g.add(glow);
    this.underglows.push(glow);
    } // end furnitureUnderglow check

    this.group.add(g);
  }

  // ==================================================================
  //  COCKTAIL BAR — Full-service commercial layout
  // ==================================================================
  createCocktailBar() {
    const bar = new THREE.Group();
    bar.position.set(0, 0, -25);
    const M = getMats();

    const barW = 10, barH = 1.1, barD = 0.7;
    const wellDepth = 1.2, backBarD = 0.55, backBarH = 0.9;

    // ======== PATRON-SIDE BAR COUNTER ========
    bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(barW + 0.3, 0.055, barD + 0.2), M.marble), 0, barH, 0));

    // Brass top rail
    const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, barW + 0.2, 8), M.brass);
    topRail.rotation.z = Math.PI / 2;
    topRail.position.set(0, barH + 0.02, barD / 2 + 0.1);
    bar.add(topRail);

    // Front panel (onyx)
    bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(barW, barH - 0.06, 0.06), M.onyx), 0, (barH - 0.06) / 2, barD / 2));

    // Vertical brass fluting
    for (let i = 0; i < 9; i++) {
      const stripX = -barW / 2 + 0.5 + i * (barW - 1) / 8;
      bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.012, barH - 0.12, 0.012), M.brass), stripX, (barH - 0.12) / 2, barD / 2 + 0.035));
    }

    // Under-bar glow
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4400aa, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(barW - 0.6, 0.06), glowMat);
    glow.position.set(0, 0.04, barD / 2 + 0.04);
    bar.add(glow);
    this.barGlow = glow;

    // Foot rail
    const footRail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, barW - 0.6, 8), M.brass);
    footRail.rotation.z = Math.PI / 2;
    footRail.position.set(0, 0.18, barD / 2 + 0.14);
    bar.add(footRail);
    for (let i = 0; i < 6; i++) {
      const bx = -barW / 2 + 1.0 + i * (barW - 2) / 5;
      bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.035), M.brass), bx, 0.09, barD / 2 + 0.14));
    }

    // Back panel
    bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(barW, barH - 0.06, 0.04), M.walnut), 0, (barH - 0.06) / 2, -barD / 2));

    // End caps
    [-1, 1].forEach(side => {
      bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.06, barH, barD), M.onyx), side * barW / 2, barH / 2, 0));
    });

    // ======== BARTENDER WELL ========
    if (this.Q.cocktailBarDetail !== 'simple') {
    bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(barW - 0.4, 0.02, wellDepth - 0.2), M.rubber), 0, 0.01, -barD / 2 - wellDepth / 2));

    // Speed rail
    bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(barW - 1.0, 0.04, 0.1), M.stainless), 0, barH - 0.2, -barD / 2 - 0.08));

    // Speed well bottles
    const bottleColors = [0x1a4d1a, 0x8b1a1a, 0xc49a2a, 0x1a1a5c, 0x5c1a4a, 0x3d2b1a, 0x1a4a5c];
    for (let i = 0; i < 14; i++) {
      const bx = -barW / 2 + 1.0 + i * ((barW - 2) / 13);
      const bottleH = 0.22 + Math.random() * 0.06;
      const bottleR = 0.022 + Math.random() * 0.008;
      const wbMat = new THREE.MeshStandardMaterial({
        color: bottleColors[i % 7], roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.85,
      });
      bar.add(place(new THREE.Mesh(new THREE.CylinderGeometry(bottleR, bottleR * 1.05, bottleH, 5), wbMat), bx, barH - 0.2 + bottleH / 2 + 0.04, -barD / 2 - 0.08));
    }

    // Ice wells
    [-2.5, 2.5].forEach(ix => {
      bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.4), M.stainless), ix, barH - 0.25, -barD / 2 - 0.25));
    });

    // Sink
    bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.35), M.stainless), 0, barH - 0.22, -barD / 2 - 0.3));

    // POS terminals
    [-3.5, 3.5].forEach(px => {
      bar.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.4, 8), M.chrome), px, barH + 0.2, -0.1));
      const posScreen = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.02), new THREE.MeshBasicMaterial({ color: 0x111122 }));
      posScreen.position.set(px, barH + 0.42, -0.1);
      posScreen.rotation.x = -0.3;
      bar.add(posScreen);
    });
    } // end cocktailBarDetail !== 'simple' (well, speed rail, bottles, ice, sink, POS)

    // ======== BACK BAR ========
    const backBarZ = -barD / 2 - wellDepth;

    bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(barW + 0.2, 0.04, backBarD), M.marble), 0, backBarH, backBarZ - backBarD / 2));
    bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(barW, backBarH - 0.04, backBarD - 0.05), M.walnut), 0, (backBarH - 0.04) / 2, backBarZ - backBarD / 2));

    // Mirror
    const mirrorZ = backBarZ - backBarD - 0.05;
    bar.add(place(new THREE.Mesh(new THREE.PlaneGeometry(barW - 0.6, 2.5), M.mirror), 0, 1.6, mirrorZ));

    // Display shelving
    const shelfW = barW - 0.8;
    const shelfHeights = [backBarH + 0.35, backBarH + 0.75, backBarH + 1.15];
    shelfHeights.forEach(sy => {
      bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(shelfW, 0.03, 0.25), M.walnut), 0, sy, mirrorZ + 0.15));
    });

    // Shelf uprights
    [-shelfW / 2, -shelfW / 6, shelfW / 6, shelfW / 2].forEach(sx => {
      bar.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.04), M.walnut), sx, backBarH + 0.7, mirrorZ + 0.12));
    });

    // Shelf lighting
    bar.add(place(new THREE.PointLight(0xffeedd, 0.1, 5, 2), 0, backBarH + 1.2, mirrorZ + 0.25));
    bar.add(place(new THREE.PointLight(0xffeedd, 0.06, 4, 2), 0, backBarH + 0.5, mirrorZ + 0.25));

    // Display bottles
    if (this.Q.cocktailBarDetail !== 'simple') {
    const displayColors = [0x1a4d1a, 0x8b1a1a, 0x1a1a5c, 0xc49a2a, 0x5c1a4a, 0x1a4a5c, 0x3d2b1a, 0x2a1a5c, 0x5c4a1a, 0x1a5c3d, 0x4a1a3d, 0x1a5c5c];
    shelfHeights.forEach((sy, si) => {
      const count = si === 1 ? 16 : 12;
      for (let b = 0; b < count; b++) {
        const bx = -shelfW / 2 + 0.3 + b * ((shelfW - 0.6) / (count - 1));
        const h = 0.2 + Math.random() * 0.08;
        const r = 0.02 + Math.random() * 0.012;
        const bodyMat = new THREE.MeshStandardMaterial({
          color: displayColors[(b + si * 4) % displayColors.length],
          roughness: 0.06, metalness: 0.15, transparent: true, opacity: 0.85,
        });
        bar.add(place(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 6), bodyMat), bx, sy + h / 2 + 0.02, mirrorZ + 0.15));
        bar.add(place(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.5, 0.05, 4), bodyMat), bx, sy + h + 0.045, mirrorZ + 0.15));
      }
    });

    // Work bottles
    for (let b = 0; b < 8; b++) {
      const bx = -barW / 2 + 1.5 + b * ((barW - 3) / 7);
      const h = 0.22 + Math.random() * 0.05;
      const bodyMat = new THREE.MeshStandardMaterial({
        color: displayColors[(b + 3) % displayColors.length],
        roughness: 0.06, metalness: 0.15, transparent: true, opacity: 0.85,
      });
      bar.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.023, h, 6), bodyMat), bx, backBarH + h / 2 + 0.02, backBarZ - backBarD / 2));
    }
    } // end cocktailBarDetail !== 'simple' (display & work bottles)

    // Bar stools
    for (let i = 0; i < 8; i++) {
      this._buildStool(bar, -3.5 + i * 1.0, 0, barD / 2 + 0.55);
    }

    // Signage
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 96;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#0a0a0e';
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#c8a84e';
    ctx.font = '300 36px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STATIC CHAPEL', 256, 38);
    ctx.strokeStyle = '#c8a84e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 62);
    ctx.lineTo(412, 62);
    ctx.stroke();
    const signTex = new THREE.CanvasTexture(signCanvas);
    bar.add(place(new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.5), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: false })), 0, 3.0, mirrorZ - 0.05));

    this.group.add(bar);
  }

  // ==================================================================
  //  PILLAR GLOW CYLINDERS
  // ==================================================================
  createPillarGlows() {
    const spacing = NAVE_LENGTH / 13;
    const pillarH = 28;
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x6688ff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const glowGeo = new THREE.CylinderGeometry(0.65, 0.65, pillarH, 8, 1, true);

    for (let i = 0; i < 12; i++) {
      const z = -NAVE_LENGTH / 2 + spacing * (i + 1);
      const leftGlow = new THREE.Mesh(glowGeo, glowMat.clone());
      leftGlow.position.set(-NAVE_WIDTH / 2, pillarH / 2, z);
      this.group.add(leftGlow);
      const rightGlow = new THREE.Mesh(glowGeo, glowMat.clone());
      rightGlow.position.set(NAVE_WIDTH / 2, pillarH / 2, z);
      this.group.add(rightGlow);
      this.pillarGlows.push({ left: leftGlow, right: rightGlow, leftIntensity: 0, rightIntensity: 0, index: i });
    }
  }

  // ==================================================================
  //  ELECTRIC ARCS
  // ==================================================================
  createElectricArcs() {
    const arcCount = this.Q.electricArcs || 12;
    const spacing = NAVE_LENGTH / 13;
    // Build all 12 column pair positions along the nave
    const allPairs = [];
    for (let i = 0; i < 12; i++) {
      const z = -NAVE_LENGTH / 2 + spacing * (i + 1);
      allPairs.push({
        from: { x: -NAVE_WIDTH / 2, z, y: 20 },
        to:   { x:  NAVE_WIDTH / 2, z, y: 20 },
      });
    }

    // Evenly distribute arcs across all column pairs (not just first N)
    const step = allPairs.length / arcCount;
    for (let i = 0; i < arcCount; i++) {
      const pairIdx = Math.min(Math.floor(i * step), allPairs.length - 1);
      const from = allPairs[pairIdx].from, to = allPairs[pairIdx].to;

      const arcGeo = this._createLightningGeo(from, to, 24, 0.8);
      const arcMat = new THREE.LineBasicMaterial({ color: 0xccddff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, linewidth: 1 });
      const arc = new THREE.Line(arcGeo, arcMat);
      this.group.add(arc);

      const midPt1 = { x: (from.x + to.x) / 2 + (Math.random() - 0.5) * 4, y: from.y + (Math.random() - 0.5) * 2, z: from.z + (Math.random() - 0.5) * 2 };
      const branchEnd1 = { x: midPt1.x + (Math.random() - 0.5) * 5, y: midPt1.y - 1 - Math.random() * 4, z: midPt1.z + (Math.random() - 0.5) * 3 };
      const branchMat1 = new THREE.LineBasicMaterial({ color: 0xaabbff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
      const branch1 = new THREE.Line(this._createLightningGeo(midPt1, branchEnd1, 10, 0.4), branchMat1);
      this.group.add(branch1);

      const midPt2 = { x: from.x + (to.x - from.x) * (0.3 + Math.random() * 0.4), y: from.y + (Math.random() - 0.5) * 3, z: from.z + (Math.random() - 0.5) * 2 };
      const branchEnd2 = { x: midPt2.x + (Math.random() - 0.5) * 3, y: midPt2.y - 2 - Math.random() * 5, z: midPt2.z + (Math.random() - 0.5) * 2 };
      const branchMat2 = new THREE.LineBasicMaterial({ color: 0x9999ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
      const branch2 = new THREE.Line(this._createLightningGeo(midPt2, branchEnd2, 8, 0.3), branchMat2);
      this.group.add(branch2);

      this.electricArcs.push({
        mainLine: arc, mainMat: arcMat,
        branchLine: branch1, branchMat: branchMat1,
        branch2Line: branch2, branch2Mat: branchMat2,
        from, to, pillarIndex: pairIdx,
        midPoint: midPt1, branchEnd: branchEnd1,
        midPoint2: midPt2, branchEnd2: branchEnd2,
        nextFlicker: 0.5 + Math.random() * 1.5,
        isOn: false, duration: 0, cooldown: 0,
      });
    }
  }

  _createLightningGeo(from, to, segments, jitterScale) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const envelope = Math.sin(t * Math.PI);
      const jitter = envelope * jitterScale;
      points.push(new THREE.Vector3(
        from.x + (to.x - from.x) * t + (Math.random() - 0.5) * jitter * 2,
        from.y + (to.y - from.y) * t + (Math.random() - 0.5) * jitter,
        from.z + (to.z - from.z) * t + (Math.random() - 0.5) * jitter * 2,
      ));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }

  // ==================================================================
  //  STATIC PARTICLES
  // ==================================================================
  createStaticParticles() {
    const count = this.Q.staticParticles !== undefined ? this.Q.staticParticles : 200;
    if (count <= 0) return;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const isNearColumn = Math.random() > 0.35;
      if (isNearColumn) {
        const side = Math.random() > 0.5 ? 1 : -1;
        positions[i * 3] = side * (NAVE_WIDTH / 2) + (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = 10 + Math.random() * 18;
        positions[i * 3 + 2] = (Math.random() - 0.5) * NAVE_LENGTH;
      } else {
        positions[i * 3] = (Math.random() - 0.5) * NAVE_WIDTH * 0.7;
        positions[i * 3 + 1] = 18 + Math.random() * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * NAVE_LENGTH;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xccddff, size: 0.06, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    this.staticParticles = new THREE.Points(geo, mat);
    this.group.add(this.staticParticles);
  }

  // ==================================================================
  //  UPDATE — Audio-reactive animations
  // ==================================================================
  update(time, bandValues, energy, isBeat) {
    if (!bandValues) bandValues = {};
    if (energy === undefined) energy = 0;

    this._updateChandeliers(time, energy, isBeat);
    this._updateArcs(time, energy, isBeat);
    this._updatePillarGlows();
    this._updateParticles(time, energy, isBeat);
    this._updateBarGlow(time, energy);
    this._updateUnderglows(time, energy);
  }

  _updateChandeliers(time, energy, isBeat) {
    this.chandeliers.forEach((ch, idx) => {
      const sway = 0.005 + energy * 0.008;
      ch.group.rotation.x = Math.sin(time * 0.2 + idx * 2) * sway;
      ch.group.rotation.z = Math.cos(time * 0.15 + idx * 3) * sway;

      const baseBrightness = 1.2 + Math.sin(time * 0.8 + idx * 1.5) * 0.2;
      ch.light.intensity = baseBrightness + energy * 0.5 + (isBeat ? 0.3 : 0);

      if (ch.uplight) ch.uplight.intensity = 0.4 + energy * 0.25;
      if (ch.tierLights) {
        ch.tierLights.forEach((tl, ti) => {
          tl.intensity = 0.4 + Math.sin(time * 3.5 + idx * 2.3 + ti * 4.1) * 0.15 + energy * 0.2 + (isBeat ? 0.15 : 0);
        });
      }

      ch.crystals.forEach((crystal, ci) => {
        const baseEmissive = 0.5 + Math.sin(time * 2.5 + ci * 0.7 + idx * 3) * 0.2;
        const sparkle = Math.sin(time * 7.3 + ci * 2.9) > 0.82 ? 0.8 : 0;
        crystal.material.emissiveIntensity = Math.min(1.0, baseEmissive + sparkle + (isBeat ? 0.4 : 0) + energy * 0.3);
      });
    });
  }

  _updatePillarGlows() {
    this.pillarGlows.forEach(pg => {
      pg.leftIntensity = Math.max(0, pg.leftIntensity - 0.06);
      pg.rightIntensity = Math.max(0, pg.rightIntensity - 0.06);
      pg.left.material.opacity = pg.leftIntensity * 0.25;
      pg.right.material.opacity = pg.rightIntensity * 0.25;
      pg.left.material.color.setRGB(0.4 + pg.leftIntensity * 0.6, 0.53 + pg.leftIntensity * 0.47, 1.0);
      pg.right.material.color.setRGB(0.4 + pg.rightIntensity * 0.6, 0.53 + pg.rightIntensity * 0.47, 1.0);
    });
  }

  _updateArcs(time, energy, isBeat) {
    const dt = 0.016;
    this.electricArcs.forEach(arc => {
      arc.cooldown = Math.max(0, arc.cooldown - dt);
      if (arc.isOn) {
        arc.duration -= dt;
        if (arc.duration <= 0) {
          arc.isOn = false;
          arc.mainMat.opacity = 0;
          arc.branchMat.opacity = 0;
          arc.branch2Mat.opacity = 0;
          arc.cooldown = 0.15 + Math.random() * 0.6;
        } else {
          const flicker = 0.3 + Math.random() * 0.6;
          const energyMult = 0.5 + energy * 0.8;
          arc.mainMat.opacity = flicker * energyMult;
          arc.branchMat.opacity = flicker * energyMult * 0.65;
          arc.branch2Mat.opacity = flicker * energyMult * 0.4;
        }
      } else if (arc.cooldown <= 0) {
        const fireChance = 0.008 + energy * 0.06;
        const beatChance = isBeat ? 0.7 : 0;
        if (Math.random() < fireChance || (isBeat && energy > 0.15 && Math.random() < beatChance)) {
          arc.isOn = true;
          arc.duration = 0.03 + Math.random() * 0.15 + (isBeat ? 0.08 : 0);
          arc.mainLine.geometry.dispose();
          arc.mainLine.geometry = this._createLightningGeo(arc.from, arc.to, 24, 0.8);
          arc.branchLine.geometry.dispose();
          arc.branchLine.geometry = this._createLightningGeo(arc.midPoint, arc.branchEnd, 10, 0.4);
          arc.branch2Line.geometry.dispose();
          arc.branch2Line.geometry = this._createLightningGeo(arc.midPoint2, arc.branchEnd2, 8, 0.3);
          const pg = this.pillarGlows[arc.pillarIndex];
          if (pg) {
            const si = 0.4 + energy * 0.5 + (isBeat ? 0.3 : 0);
            pg.leftIntensity = Math.min(1.0, si);
            pg.rightIntensity = Math.min(1.0, si);
          }
        }
      }
    });
  }

  _updateParticles(time, energy, isBeat) {
    if (!this.staticParticles) return;
    this.staticParticles.material.opacity = Math.min(0.45, energy * 0.4 + (isBeat ? 0.15 : 0));
    this.staticParticles.material.size = 0.05 + energy * 0.04 + (isBeat ? 0.03 : 0);
    const positions = this.staticParticles.geometry.attributes.position;
    const drift = energy * 0.015 + (isBeat ? 0.02 : 0);
    for (let i = 0; i < positions.count; i++) {
      positions.array[i * 3] += (Math.random() - 0.5) * drift;
      positions.array[i * 3 + 1] += (Math.random() - 0.5) * drift * 0.5;
      positions.array[i * 3 + 2] += (Math.random() - 0.5) * drift;
      if (Math.abs(positions.array[i * 3]) > NAVE_WIDTH / 2 + 1) positions.array[i * 3] = (Math.random() - 0.5) * NAVE_WIDTH;
      if (positions.array[i * 3 + 1] < 10 || positions.array[i * 3 + 1] > 29) positions.array[i * 3 + 1] = 13 + Math.random() * 14;
      if (Math.abs(positions.array[i * 3 + 2]) > NAVE_LENGTH / 2) positions.array[i * 3 + 2] = (Math.random() - 0.5) * NAVE_LENGTH;
    }
    positions.needsUpdate = true;
  }

  _updateBarGlow(time, energy) {
    if (!this.barGlow) return;
    this.barGlow.material.opacity = 0.08 + energy * 0.12 + Math.sin(time * 0.5) * 0.02;
  }

  _updateUnderglows(time, energy) {
    const pulse = 0.03 + energy * 0.06 + Math.sin(time * 1.5) * 0.01;
    this.underglows.forEach(g => { if (g.material) g.material.opacity = Math.min(0.12, pulse); });
  }

  // ==================================================================
  //  DISPOSE
  // ==================================================================
  dispose() {
    this.electricArcs.forEach(arc => {
      arc.mainLine.geometry.dispose(); arc.mainMat.dispose();
      arc.branchLine.geometry.dispose(); arc.branchMat.dispose();
      arc.branch2Line.geometry.dispose(); arc.branch2Mat.dispose();
    });
    if (this.staticParticles) { this.staticParticles.geometry.dispose(); this.staticParticles.material.dispose(); }
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
    this.scene.remove(this.group);
  }
}
