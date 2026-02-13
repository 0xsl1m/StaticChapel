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

    this.build();
    this.scene.add(this.group);
  }

  build() {
    this.createChandeliers();
    // Furniture + bar removed — will be re-addressed later
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
