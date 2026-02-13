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
    this.barGlow = null;

    this.build();
    this.scene.add(this.group);
  }

  build() {
    this.createChandeliers();
    this.createCocktailBar();
    this.createFurniture();
    this.createElectricArcs();
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
  //  COCKTAIL BAR — Premium upscale bar against back wall
  //  Reference: dark walnut back bar, arched alcove shelving, warm
  //  backlit bottles, marble counter, brass accents, crimson velvet
  // ==================================================================
  createCocktailBar() {
    const bar = new THREE.Group();
    // Cathedral back wall: center z=-30, 0.8m thick → interior face at z=-29.6
    // Place bar group origin at the interior wall face so local z=0 = wall surface
    // Everything builds FORWARD (positive local z) from the wall
    const WALL_FACE_Z = -29.6;
    bar.position.set(0, 0, WALL_FACE_Z);
    const M = getMats();

    // Bar spans wall-to-wall between columns (x=±10), inset 0.5m from columns
    const barW = 19;       // nearly full nave width (columns at ±10)
    const barH = 1.12;     // standard bar counter height (42-44 inches)
    const barD = 0.9;      // deeper counter

    // ======== BACK BAR WALL — very dark oak paneling with grain texture ========
    const backWallH = 4.5;
    const backWallMat = (() => {
      // Procedural dark oak grain texture
      const res = 256;
      const c = document.createElement('canvas');
      c.width = res; c.height = res;
      const ctx = c.getContext('2d');
      // Very dark oak base
      ctx.fillStyle = '#0a0604';
      ctx.fillRect(0, 0, res, res);
      // Horizontal grain lines
      for (let y = 0; y < res; y++) {
        const grain = Math.sin(y * 0.25) * 0.3 +
                      Math.sin(y * 0.6 + 1.5) * 0.2 +
                      Math.sin(y * 1.3 + 3.0) * 0.1;
        const v = grain * 0.5 + 0.5;
        const r = Math.max(0, 10 + v * 8);
        const g = Math.max(0, 6 + v * 5);
        const b = Math.max(0, 4 + v * 3);
        ctx.fillStyle = `rgba(${r},${g},${b},0.5)`;
        ctx.fillRect(0, y, res, 1);
      }
      // Knots
      for (let k = 0; k < 4; k++) {
        const kx = ((k * 67 + 13) % res);
        const ky = ((k * 89 + 37) % res);
        ctx.fillStyle = 'rgba(4,2,1,0.5)';
        ctx.beginPath();
        ctx.ellipse(kx, ky, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Fine noise
      const id = ctx.getImageData(0, 0, res, res);
      for (let i = 0; i < id.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 6;
        id.data[i] = Math.max(0, Math.min(255, id.data[i] + n));
        id.data[i + 1] = Math.max(0, Math.min(255, id.data[i + 1] + n));
        id.data[i + 2] = Math.max(0, Math.min(255, id.data[i + 2] + n));
      }
      ctx.putImageData(id, 0, 0);
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 2);
      return new THREE.MeshStandardMaterial({
        map: tex, color: 0xffffff, roughness: 0.85, metalness: 0.01,
      });
    })();
    // Sits flush against wall face (z=0 in local space, 0.08m thick)
    bar.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(barW + 0.4, backWallH, 0.08), backWallMat
    ), 0, backWallH / 2, 0.04));

    // ======== ARCHED ALCOVE SHELVING (7 bays — wider bar = more alcoves) ========
    const alcoveCount = 7;
    const alcoveW = (barW - 1.0) / alcoveCount;
    const alcoveH = 3.0;
    const alcoveBaseY = barH + 0.15;
    const alcoveZ = 0.1;  // just in front of back panel

    // Alcove interior — dark walnut wood with warm backlight glow
    const alcoveBackMat = new THREE.MeshStandardMaterial({
      color: 0x0e0804, roughness: 0.75, metalness: 0.02,
      emissive: 0xffddaa, emissiveIntensity: 0.06,
    });
    const archTrimMat = new THREE.MeshStandardMaterial({
      color: GOLD_WARM, roughness: 0.25, metalness: 0.85,
    });

    for (let a = 0; a < alcoveCount; a++) {
      const ax = -barW / 2 + 0.5 + alcoveW * (a + 0.5);

      // Alcove interior recess
      bar.add(place(new THREE.Mesh(
        new THREE.BoxGeometry(alcoveW - 0.2, alcoveH, 0.06), alcoveBackMat
      ), ax, alcoveBaseY + alcoveH / 2, alcoveZ));

      // Walnut pilasters between alcoves
      if (a > 0) {
        const pilX = -barW / 2 + 0.5 + alcoveW * a;
        bar.add(place(new THREE.Mesh(
          new THREE.BoxGeometry(0.14, alcoveH + 0.3, 0.14), backWallMat
        ), pilX, alcoveBaseY + alcoveH / 2, alcoveZ + 0.04));
        // Gold capital on pilaster
        bar.add(place(new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.08, 0.2), archTrimMat
        ), pilX, alcoveBaseY + alcoveH + 0.15, alcoveZ + 0.04));
      }

      // Moon phase: bright disc + dark overlay disc to carve the shadow
      // Placed ABOVE the back bar wall, clearly above shelving
      // Symmetrical: center=full, mirror outward
      // L→R: waning crescent, 3rd quarter, waning gibbous, FULL, waxing gibbous, 1st quarter, waxing crescent
      const moonR = alcoveW / 2 - 0.25;
      const moonY = backWallH + 0.6 + moonR;
      const moonZ = alcoveZ + 0.08;
      const moonMat = new THREE.MeshStandardMaterial({
        color: 0xf0e8d0, roughness: 0.3, metalness: 0.6,
        emissive: 0xf0e8d0, emissiveIntensity: 0.4,
      });
      const shadowMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a0e, roughness: 0.8, metalness: 0.0,
      });

      // Full bright disc (always present as base)
      const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(moonR, 32), moonMat);
      moonDisc.position.set(ax, moonY, moonZ);
      bar.add(moonDisc);

      // Small warm light behind each moon to illuminate it
      const moonLight = new THREE.PointLight(0xf0e8d0, 0.12, 3, 1.0);
      moonLight.position.set(ax, moonY, moonZ + 0.15);
      bar.add(moonLight);

      // Shadow overlay — offset and scaled to create each phase
      // Shadow is a slightly larger disc placed in front, shifted left or right.
      // shadowX: offset from center. Positive = shadow moves right (waning).
      // shadowScale: x-scale of shadow disc. 1.0=full circle, <1=elliptical.
      //
      // Phase 0 (waning crescent): shadow nearly centered, thin sliver of light on LEFT
      // Phase 1 (third quarter):   shadow offset right, LEFT half lit
      // Phase 2 (waning gibbous):  shadow far right, mostly lit except right edge
      // Phase 3 (full):            no shadow
      // Phase 4 (waxing gibbous):  shadow far left, mostly lit except left edge
      // Phase 5 (first quarter):   shadow offset left, RIGHT half lit
      // Phase 6 (waxing crescent): shadow nearly centered, thin sliver of light on RIGHT
      if (a !== 3) {
        const sr = moonR * 1.01; // slightly larger to fully cover edges
        const shadow = new THREE.Mesh(new THREE.CircleGeometry(sr, 32), shadowMat);
        shadow.position.set(ax, moonY, moonZ + 0.003);

        if (a === 0) {
          // Waning crescent: shadow slightly left of center, thin left sliver visible
          shadow.position.x = ax - moonR * 0.25;
        } else if (a === 1) {
          // Third quarter: shadow covers right half
          shadow.position.x = ax + moonR * 0.5;
          shadow.scale.x = 1.0;
        } else if (a === 2) {
          // Waning gibbous: shadow on right edge only
          shadow.position.x = ax + moonR * 0.85;
          shadow.scale.x = 0.7;
        } else if (a === 4) {
          // Waxing gibbous: shadow on left edge only (mirror of 2)
          shadow.position.x = ax - moonR * 0.85;
          shadow.scale.x = 0.7;
        } else if (a === 5) {
          // First quarter: shadow covers left half (mirror of 1)
          shadow.position.x = ax - moonR * 0.5;
          shadow.scale.x = 1.0;
        } else if (a === 6) {
          // Waxing crescent: shadow slightly right of center, thin right sliver visible (mirror of 0)
          shadow.position.x = ax + moonR * 0.25;
        }
        bar.add(shadow);
      }

      // Gold arch trim ring
      bar.add(place(new THREE.Mesh(
        new THREE.BoxGeometry(alcoveW - 0.1, 0.04, 0.04), archTrimMat
      ), ax, alcoveBaseY + alcoveH - 0.02, alcoveZ + 0.08));

      // 3 shelves per alcove
      const shelfCount = 3;
      for (let s = 0; s < shelfCount; s++) {
        const sy = alcoveBaseY + 0.4 + s * (alcoveH - 0.6) / (shelfCount - 1);
        // Glass shelf
        const shelfMat = new THREE.MeshStandardMaterial({
          color: 0xeeeef0, roughness: 0.05, metalness: 0.1,
          transparent: true, opacity: 0.4,
        });
        bar.add(place(new THREE.Mesh(
          new THREE.BoxGeometry(alcoveW - 0.3, 0.02, 0.22), shelfMat
        ), ax, sy, alcoveZ + 0.06));

        // Brass shelf brackets
        [-1, 1].forEach(side => {
          bar.add(place(new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.06, 0.04), M.brass
          ), ax + side * (alcoveW / 2 - 0.25), sy - 0.03, alcoveZ + 0.06));
        });

        // Bottles on shelf (4-6 per shelf)
        if (this.Q.cocktailBarDetail !== 'simple') {
          const bottleCount = 4 + Math.floor(Math.random() * 3);
          const bottleColors = [0x1a4d1a, 0x8b1a1a, 0xc49a2a, 0x1a1a5c, 0x5c1a4a, 0x3d2b1a, 0x4a2a10, 0x2a4a1a];
          for (let b = 0; b < bottleCount; b++) {
            const bx = ax - (alcoveW - 0.5) / 2 + b * ((alcoveW - 0.5) / Math.max(1, bottleCount - 1));
            const bh = 0.2 + Math.random() * 0.12;
            const br = 0.02 + Math.random() * 0.01;
            const bMat = new THREE.MeshStandardMaterial({
              color: bottleColors[(b + a * 3 + s) % bottleColors.length],
              roughness: 0.06, metalness: 0.15, transparent: true, opacity: 0.85,
            });
            bar.add(place(new THREE.Mesh(
              new THREE.CylinderGeometry(br, br * 1.05, bh, 5), bMat
            ), bx, sy + bh / 2 + 0.02, alcoveZ + 0.06));
            // Bottle neck
            bar.add(place(new THREE.Mesh(
              new THREE.CylinderGeometry(br * 0.3, br * 0.5, 0.06, 4), bMat
            ), bx, sy + bh + 0.05, alcoveZ + 0.06));
          }
        }
      }
    }

    // Outer pilasters (ends of the back bar)
    [-1, 1].forEach(side => {
      const endX = side * (barW / 2 + 0.05);
      bar.add(place(new THREE.Mesh(
        new THREE.BoxGeometry(0.2, backWallH, 0.2), backWallMat
      ), endX, backWallH / 2, 0.08));
      bar.add(place(new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.1, 0.26), archTrimMat
      ), endX, backWallH + 0.05, 0.08));
    });

    // ======== CORNICE — gold trim along top of back bar ========
    bar.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(barW + 0.5, 0.1, 0.2), archTrimMat
    ), 0, backWallH + 0.05, 0.08));

    // ======== BARTENDER WORK AREA (between back bar and counter) ========
    // Bartender area: from back panel (z~0.1) to counter inner edge
    const workAreaD = 1.2;  // 1.2m bartender workspace
    const counterInnerZ = alcoveZ + workAreaD;
    const counterOuterZ = counterInnerZ + barD;

    // Rubber mat floor
    bar.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(barW - 0.4, 0.02, workAreaD), M.rubber
    ), 0, 0.01, alcoveZ + workAreaD / 2));

    // Speed rail (stainless steel bar below counter on bartender side)
    if (this.Q.cocktailBarDetail !== 'simple') {
      bar.add(place(new THREE.Mesh(
        new THREE.BoxGeometry(barW - 1.0, 0.04, 0.08), M.stainless
      ), 0, barH - 0.18, counterInnerZ - 0.15));

      // Ice wells
      for (let ix = -2; ix <= 2; ix += 2) {
        if (ix === 0) continue;
        bar.add(place(new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.25, 0.35), M.stainless
        ), ix * 3, barH - 0.2, alcoveZ + workAreaD / 2));
      }
    }

    // ======== PATRON-SIDE BAR COUNTER ========
    // Marble top — thick slab
    const marbleTopMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e24, roughness: 0.12, metalness: 0.15,
    });
    bar.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(barW + 0.3, 0.08, barD + 0.2), marbleTopMat
    ), 0, barH, (counterInnerZ + counterOuterZ) / 2));

    // Gold edge trim on counter (front and back edges)
    const edgeTrimGeo = new THREE.BoxGeometry(barW + 0.35, 0.025, 0.025);
    bar.add(place(new THREE.Mesh(edgeTrimGeo, archTrimMat), 0, barH + 0.04, counterOuterZ + 0.1));
    bar.add(place(new THREE.Mesh(edgeTrimGeo, archTrimMat), 0, barH - 0.04, counterOuterZ + 0.1));

    // Front panel — dark walnut with brass fluting
    const frontPanelMat = new THREE.MeshStandardMaterial({
      color: 0x2a1810, roughness: 0.45, metalness: 0.05,
    });
    bar.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(barW, barH - 0.06, 0.06), frontPanelMat
    ), 0, (barH - 0.06) / 2, counterOuterZ));

    // Vertical brass fluting on front panel
    const fluteCount = Math.round(barW / 1.3);
    for (let i = 0; i < fluteCount; i++) {
      const stripX = -barW / 2 + 0.5 + i * (barW - 1) / (fluteCount - 1);
      bar.add(place(new THREE.Mesh(
        new THREE.BoxGeometry(0.012, barH - 0.12, 0.012), M.brass
      ), stripX, (barH - 0.12) / 2, counterOuterZ + 0.035));
    }

    // Under-bar warm glow strip
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffddaa, transparent: true, opacity: 0.06,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(barW - 0.6, 0.04), glowMat);
    glow.position.set(0, 0.03, counterOuterZ + 0.04);
    bar.add(glow);
    this.barGlow = glow;

    // Brass foot rail
    const footRail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, barW - 0.6, 8), M.brass
    );
    footRail.rotation.z = Math.PI / 2;
    footRail.position.set(0, 0.18, counterOuterZ + 0.12);
    bar.add(footRail);
    // Foot rail brackets
    const bracketCount = Math.round(barW / 2.5);
    for (let i = 0; i < bracketCount; i++) {
      const bx = -barW / 2 + 1.0 + i * (barW - 2) / (bracketCount - 1);
      bar.add(place(new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.18, 0.035), M.brass
      ), bx, 0.09, counterOuterZ + 0.12));
    }

    // End caps — onyx with rounded profile
    [-1, 1].forEach(side => {
      bar.add(place(new THREE.Mesh(
        new THREE.BoxGeometry(0.08, barH, barD + 0.3), M.onyx
      ), side * barW / 2, barH / 2, (counterInnerZ + counterOuterZ) / 2));
    });

    // ======== SIGNAGE — "STATIC CHAPEL" above back bar ========
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
    ctx.moveTo(80, 62);
    ctx.lineTo(432, 62);
    ctx.stroke();
    const signTex = new THREE.CanvasTexture(signCanvas);
    bar.add(place(new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 0.65),
      new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: false })
    ), 0, backWallH + 3.5, 0.1));

    // ======== WARM LIGHTING ========
    // Shelf backlight (warm amber) — only on non-low tier
    if (this.Q.tier !== 'low') {
      bar.add(place(new THREE.PointLight(0xffddaa, 0.35, 10, 1.0), 0, 3.2, 0.2));
      bar.add(place(new THREE.PointLight(0xffddaa, 0.2, 8, 1.0), -6, 2.8, 0.2));
      bar.add(place(new THREE.PointLight(0xffddaa, 0.2, 8, 1.0), 6, 2.8, 0.2));
    }

    this.group.add(bar);
  }

  // ==================================================================
  //  FURNITURE — Ultra-premium plush sectionals, lounge chairs, tables
  //  Layout: rear half of nave from bar (z≈-27) to dancefloor (z≈-2)
  //  Columns at x=±10, side aisles extend to x=±16
  // ==================================================================
  createFurniture() {
    const M = getMats();
    const colSpacing = NAVE_LENGTH / 13; // ≈4.615m between column pairs
    // Column Z positions: z = -30 + colSpacing * (i+1)
    const colZ = i => -NAVE_LENGTH / 2 + colSpacing * (i + 1);
    // Stage at z=19. Columns at x=±10, walls at x=±15.6

    // Furniture zone: bar front (~z=-22) to dancefloor edge (z≈-2)
    // Column pairs 0-5 fall in this range

    // Helper: compute rotation.y so sofa seat (local -Z) points toward stage
    // Sofa back is at local +Z, seat faces local -Z
    const STAGE_Z = 19;
    const faceStage = (fx, fz) => {
      const dx = 0 - fx;
      const dz = STAGE_Z - fz;
      return Math.atan2(dx, dz) + Math.PI;
    };

    // ======== NAVE CENTER — Fill the space between column rows (x=±10) ========
    // Pieces sized to fit within ~4.6m bay spacing without clipping neighbors
    // x=±5.5 pushes groups toward columns, leaving clear center aisle

    // --- Bay 0-1 (z ≈ -23): Near-bar — L-sectionals flanking center path ---
    const bay01z = (colZ(0) + colZ(1)) / 2;
    this._placeSectionalGroup(-5.5, bay01z, faceStage(-5.5, bay01z), 'velvetNavy', 'L', 4.0, M);
    this._placeSectionalGroup(5.5, bay01z, faceStage(5.5, bay01z), 'velvetEmerald', 'L', 4.0, M);

    // --- Bay 1-2 (z ≈ -18.5): Deep lounge — two U-sectionals side by side ---
    const bay12z = (colZ(1) + colZ(2)) / 2;
    this._placeSectionalGroup(-5.5, bay12z, faceStage(-5.5, bay12z), 'velvetCrimson', 'U', 4.0, M);
    this._placeSectionalGroup( 5.5, bay12z, faceStage(5.5, bay12z), 'velvetPlum', 'U', 4.0, M);

    // --- Bay 2-3 (z ≈ -13.8): Mid lounge — facing sofas ---
    const bay23z = (colZ(2) + colZ(3)) / 2;
    this._placeFacingSofas(-5.5, bay23z, 'velvetEmerald', M);
    this._placeFacingSofas( 5.5, bay23z, 'velvetPlum', M);

    // --- Bay 3-4 (z ≈ -9.2): Transition — chair clusters near columns ---
    const bay34z = (colZ(3) + colZ(4)) / 2;
    this._placeChairCluster(-5.5, bay34z, 'velvetPlum', M);
    this._placeChairCluster( 5.5, bay34z, 'velvetNavy', M);

    // ======== SIDE AISLES — Intimate seating against outer walls ========

    const sideGroups = [
      // Left side aisle
      { x: -13.5, z: colZ(0), style: 'sofa',  color: 'velvetCrimson' },
      { x: -13.5, z: colZ(1), style: 'chair', color: 'cognac' },
      { x: -13.5, z: colZ(2), style: 'sofa',  color: 'velvetPlum' },
      { x: -13.5, z: colZ(3), style: 'chair', color: 'oxblood' },
      { x: -13.5, z: colZ(4), style: 'sofa',  color: 'velvetNavy' },
      // Right side aisle
      { x: 13.5, z: colZ(0), style: 'sofa',  color: 'velvetEmerald' },
      { x: 13.5, z: colZ(1), style: 'chair', color: 'oxblood' },
      { x: 13.5, z: colZ(2), style: 'sofa',  color: 'velvetCrimson' },
      { x: 13.5, z: colZ(3), style: 'chair', color: 'cognac' },
      { x: 13.5, z: colZ(4), style: 'sofa',  color: 'velvetPlum' },
    ];

    sideGroups.forEach(sg => {
      const g = new THREE.Group();
      if (sg.style === 'sofa') {
        g.add(this._buildSofa(2.4, 0.95, 0.85, M[sg.color] || M.velvetCrimson, M));
        // End table beside sofa
        const et = this._buildEndTable(M);
        et.position.set(1.4, 0, 0);
        g.add(et);
      } else {
        // Two lounge chairs with end table between
        const ch1 = this._buildLoungeChair(M[sg.color] || M.cognac, M);
        ch1.position.set(-0.6, 0, 0);
        g.add(ch1);
        const ch2 = this._buildLoungeChair(M[sg.color] || M.cognac, M);
        ch2.position.set(0.6, 0, 0);
        g.add(ch2);
        const et = this._buildEndTable(M);
        et.position.set(0, 0, 0);
        g.add(et);
      }
      g.position.set(sg.x, 0, sg.z);
      g.rotation.y = faceStage(sg.x, sg.z);
      this.group.add(g);
    });
  }

  // --- Place a large sectional grouping with coffee table ---
  _placeSectionalGroup(x, z, rotation, colorName, shape, size, M) {
    const g = new THREE.Group();
    const upholstery = M[colorName] || M.velvetCrimson;

    if (shape === 'L') {
      // L-shaped sectional: long section + short return
      // Long sofa along X, back at +Z, seat faces -Z (toward stage after rotation)
      // Return extends from right end toward -Z (stage-side)
      const longW = size;
      const shortW = size * 0.5;
      const depth = 1.0;
      const h = 0.85;
      // Long section (along X)
      g.add(this._buildSofa(longW, depth, h, upholstery, M));
      // Short return (along Z, attached to right end, extending toward -Z)
      const returnSofa = this._buildSofa(shortW, depth, h, upholstery, M);
      returnSofa.rotation.y = Math.PI / 2;
      returnSofa.position.set(longW / 2 - depth / 2, 0, -(shortW / 2 - depth / 2));
      g.add(returnSofa);
      // Coffee table in the L's inner corner (between long sofa and return)
      const ct = this._buildCoffeeTable(1.0, 0.6, M);
      ct.position.set(longW / 4, 0, -(shortW / 2));
      g.add(ct);
      // End table at far end of long sofa
      const et = this._buildEndTable(M);
      et.position.set(-longW / 2 - 0.3, 0, 0);
      g.add(et);
    } else if (shape === 'U') {
      // U-shaped: center back at +Z, returns extend toward -Z (stage-side after rotation)
      // After faceStage rotation, local -Z faces stage, so opening faces stage
      const centerW = size;
      const returnW = size * 0.4;
      const depth = 1.0;
      const h = 0.85;
      // Center back section — default orientation (back at +Z, seat at -Z)
      // This is the "back wall" of the U, furthest from stage
      const centerSofa = this._buildSofa(centerW, depth, h, upholstery, M);
      g.add(centerSofa);
      // Left return (extends toward -Z = toward stage)
      const leftReturn = this._buildSofa(returnW, depth, h, upholstery, M);
      leftReturn.rotation.y = Math.PI / 2;
      leftReturn.position.set(-centerW / 2 + depth / 2, 0, -(returnW / 2 - depth / 2));
      g.add(leftReturn);
      // Right return
      const rightReturn = this._buildSofa(returnW, depth, h, upholstery, M);
      rightReturn.rotation.y = -Math.PI / 2;
      rightReturn.position.set(centerW / 2 - depth / 2, 0, -(returnW / 2 - depth / 2));
      g.add(rightReturn);
      // Coffee table in the center of the U (toward -Z / stage side)
      const ct = this._buildCoffeeTable(1.6, 0.8, M);
      ct.position.set(0, 0, -0.6);
      g.add(ct);
    }

    g.position.set(x, 0, z);
    g.rotation.y = rotation;
    this.group.add(g);
  }

  // --- Place two sofas facing each other with coffee table between ---
  _placeFacingSofas(x, z, colorName, M) {
    const g = new THREE.Group();
    const upholstery = M[colorName] || M.velvetEmerald;
    const sofaW = 3.0;
    const sofaD = 0.9;
    const gap = 1.6; // space between facing sofas (total Z: gap + 2*sofaD ≈ 3.4m)

    // Sofa 1 (faces toward stage, sits on -z side)
    const s1 = this._buildSofa(sofaW, sofaD, 0.85, upholstery, M);
    s1.position.set(0, 0, gap / 2 + sofaD / 2);
    g.add(s1);

    // Sofa 2 (faces away from stage, sits on +z side)
    const s2 = this._buildSofa(sofaW, sofaD, 0.85, upholstery, M);
    s2.rotation.y = Math.PI;
    s2.position.set(0, 0, -(gap / 2 + sofaD / 2));
    g.add(s2);

    // Coffee table between them
    const ct = this._buildCoffeeTable(1.4, 0.7, M);
    ct.position.set(0, 0, 0);
    g.add(ct);

    // End tables at each end of the arrangement
    const et1 = this._buildEndTable(M);
    et1.position.set(sofaW / 2 + 0.3, 0, 0);
    g.add(et1);
    const et2 = this._buildEndTable(M);
    et2.position.set(-sofaW / 2 - 0.3, 0, 0);
    g.add(et2);

    g.position.set(x, 0, z);
    this.group.add(g);
  }

  // --- Place a scattered cluster of 4 lounge chairs around a coffee table ---
  _placeChairCluster(x, z, colorName, M) {
    const g = new THREE.Group();
    const upholstery = M[colorName] || M.velvetPlum;

    // Central coffee table
    const ct = this._buildCoffeeTable(1.2, 0.6, M);
    g.add(ct);

    // 4 chairs in a tighter arc facing the table
    const chairs = [
      { px: -1.1, pz:  0.7, ry: -0.4 },
      { px:  1.1, pz:  0.7, ry:  0.4 },
      { px: -1.0, pz: -0.7, ry: -0.2 + Math.PI },
      { px:  1.0, pz: -0.7, ry:  0.2 + Math.PI },
    ];
    chairs.forEach(c => {
      const ch = this._buildLoungeChair(upholstery, M);
      ch.position.set(c.px, 0, c.pz);
      ch.rotation.y = c.ry;
      g.add(ch);
    });

    // End tables between chair pairs
    const et1 = this._buildEndTable(M);
    et1.position.set(-1.7, 0, 0);
    g.add(et1);
    const et2 = this._buildEndTable(M);
    et2.position.set(1.7, 0, 0);
    g.add(et2);

    g.position.set(x, 0, z);
    this.group.add(g);
  }

  // ==================================================================
  //  FURNITURE BUILDERS — Individual piece geometry
  // ==================================================================

  // --- Plush sectional sofa segment ---
  _buildSofa(w, d, h, upholsteryMat, M) {
    const sofa = new THREE.Group();
    const seatH = 0.42;
    const cushionH = 0.16;
    const backH = h - seatH;
    const armW = 0.14;
    const legH = 0.1;

    // Legs — brushed brass, inset from corners
    const legGeo = new THREE.CylinderGeometry(0.025, 0.02, legH, 6);
    const legInsetX = w / 2 - 0.12;
    const legInsetZ = d / 2 - 0.1;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      sofa.add(place(new THREE.Mesh(legGeo, M.brass), sx * legInsetX, legH / 2, sz * legInsetZ));
    });

    // Base frame
    sofa.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.06, d), M.walnut
    ), 0, legH + 0.03, 0));

    // Seat cushion — plush, slightly rounded look via multiple layers
    const seatTop = legH + 0.06;
    sofa.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(w - armW * 2 - 0.04, cushionH, d - 0.12), upholsteryMat
    ), 0, seatTop + cushionH / 2, -0.02));
    // Seat cushion bevel (slightly wider at top for plush appearance)
    sofa.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(w - armW * 2 - 0.08, 0.03, d - 0.16), upholsteryMat
    ), 0, seatTop + cushionH + 0.015, -0.02));

    // Back cushion — taller, plush
    const backBaseY = seatTop + cushionH;
    sofa.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(w - armW * 2 - 0.06, backH, 0.22), upholsteryMat
    ), 0, backBaseY + backH / 2, d / 2 - 0.14));
    // Back cushion pillow top (softer curve approximation)
    sofa.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(w - armW * 2 - 0.1, 0.06, 0.18), upholsteryMat
    ), 0, backBaseY + backH + 0.03, d / 2 - 0.14));

    // Arms — plush padded
    [-1, 1].forEach(side => {
      const armX = side * (w / 2 - armW / 2);
      // Arm body
      sofa.add(place(new THREE.Mesh(
        new THREE.BoxGeometry(armW, seatH - legH + cushionH * 0.6, d - 0.06), upholsteryMat
      ), armX, seatTop + (seatH - legH + cushionH * 0.6) / 2 - 0.03, 0));
      // Arm top pad
      sofa.add(place(new THREE.Mesh(
        new THREE.BoxGeometry(armW + 0.04, 0.06, d - 0.04), upholsteryMat
      ), armX, seatTop + seatH - legH + cushionH * 0.6 - 0.03, 0));
    });

    // Throw pillows — contrasting accent (2-3 per sofa)
    const pillowCount = Math.max(2, Math.round(w / 1.5));
    const accentMat = (upholsteryMat === M.velvetCrimson) ? M.velvetNavy
      : (upholsteryMat === M.velvetNavy) ? M.velvetCrimson
      : (upholsteryMat === M.velvetEmerald) ? M.velvetPlum
      : M.velvetEmerald;
    for (let p = 0; p < pillowCount; p++) {
      const px = -w / 2 + armW + 0.4 + p * ((w - armW * 2 - 0.8) / Math.max(1, pillowCount - 1));
      const pillow = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.22, 0.08), accentMat
      );
      pillow.position.set(px, backBaseY + 0.12, d / 2 - 0.22);
      pillow.rotation.x = -0.15;
      pillow.rotation.y = (Math.random() - 0.5) * 0.3;
      sofa.add(pillow);
    }

    return sofa;
  }

  // --- Plush lounge chair ---
  _buildLoungeChair(upholsteryMat, M) {
    const chair = new THREE.Group();
    const w = 0.85;
    const d = 0.85;
    const seatH = 0.4;
    const legH = 0.1;
    const cushionH = 0.14;
    const backH = 0.45;

    // Legs — brass
    const legGeo = new THREE.CylinderGeometry(0.02, 0.015, legH, 6);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      chair.add(place(new THREE.Mesh(legGeo, M.brass),
        sx * (w / 2 - 0.08), legH / 2, sz * (d / 2 - 0.08)));
    });

    // Base frame
    chair.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.05, d), M.walnut
    ), 0, legH + 0.025, 0));

    // Seat cushion
    const seatTop = legH + 0.05;
    chair.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.14, cushionH, d - 0.1), upholsteryMat
    ), 0, seatTop + cushionH / 2, -0.02));

    // Back
    const backBaseY = seatTop + cushionH;
    chair.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.08, backH, 0.18), upholsteryMat
    ), 0, backBaseY + backH / 2, d / 2 - 0.12));
    // Back pillow top
    chair.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.12, 0.05, 0.14), upholsteryMat
    ), 0, backBaseY + backH + 0.025, d / 2 - 0.12));

    // Arms
    [-1, 1].forEach(side => {
      const armX = side * (w / 2 - 0.06);
      chair.add(place(new THREE.Mesh(
        new THREE.BoxGeometry(0.1, seatH - legH + cushionH * 0.5, d - 0.06), upholsteryMat
      ), armX, seatTop + (seatH - legH + cushionH * 0.5) / 2 - 0.02, 0));
    });

    return chair;
  }

  // --- Low-set coffee table (dark marble top, brass legs) ---
  _buildCoffeeTable(w, d, M) {
    const table = new THREE.Group();
    const topH = 0.04;
    const legH = 0.38;
    const totalH = legH + topH;

    // Marble top
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a22, roughness: 0.08, metalness: 0.12,
    });
    table.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(w, topH, d), topMat
    ), 0, totalH - topH / 2, 0));

    // Gold edge trim
    const edgeMat = M.brass;
    table.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.02, 0.015, d + 0.02), edgeMat
    ), 0, totalH + 0.007, 0));

    // Under-top frame (dark walnut)
    table.add(place(new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.1, 0.03, d - 0.1), M.walnut
    ), 0, legH - 0.01, 0));

    // Legs — tapered brass
    const legGeo = new THREE.CylinderGeometry(0.015, 0.025, legH, 6);
    const lx = w / 2 - 0.08;
    const lz = d / 2 - 0.06;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      table.add(place(new THREE.Mesh(legGeo, M.brass), sx * lx, legH / 2, sz * lz));
    });

    return table;
  }

  // --- End table (smaller, round dark marble top) ---
  _buildEndTable(M) {
    const table = new THREE.Group();
    const topR = 0.25;
    const legH = 0.52;
    const topH = 0.03;

    // Round marble top
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a22, roughness: 0.08, metalness: 0.12,
    });
    table.add(place(new THREE.Mesh(
      new THREE.CylinderGeometry(topR, topR, topH, 12), topMat
    ), 0, legH + topH / 2, 0));

    // Gold rim
    table.add(place(new THREE.Mesh(
      new THREE.TorusGeometry(topR, 0.008, 6, 16), M.brass
    ), 0, legH + topH, 0));

    // Single pedestal leg — brass
    table.add(place(new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, legH, 8), M.brass
    ), 0, legH / 2, 0));

    // Base disc
    table.add(place(new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.015, 10), M.brass
    ), 0, 0.008, 0));

    return table;
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
  //  UPDATE — Audio-reactive animations
  // ==================================================================
  update(time, bandValues, energy, isBeat) {
    if (!bandValues) bandValues = {};
    if (energy === undefined) energy = 0;

    this._updateChandeliers(time, energy, isBeat);
    this._updateArcs(time, energy, isBeat, bandValues);
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

  _updateArcs(time, energy, isBeat, bandValues) {
    const dt = 0.016;
    // Bass-driven: combine subBass and bass for a single "bassLevel" 0-1+
    const subBass = bandValues.subBass || 0;
    const bass = bandValues.bass || 0;
    const bassLevel = Math.max(subBass, bass) * 0.6 + (subBass + bass) * 0.2;
    // Higher threshold — electricity only comes alive to real bass
    const BASS_THRESHOLD = 0.15;
    const bassActive = bassLevel > BASS_THRESHOLD;
    // Quadratic intensity — light bass = barely visible, heavy bass = blazing
    const bassIntensity = bassLevel * bassLevel;

    this.electricArcs.forEach(arc => {
      arc.cooldown = Math.max(0, arc.cooldown - dt);
      if (arc.isOn) {
        arc.duration -= dt;
        if (arc.duration <= 0) {
          // Check for re-strike (real lightning has 2-5 return strokes)
          arc.strikeCount = (arc.strikeCount || 1) - 1;
          if (arc.strikeCount > 0 && bassActive) {
            // Brief gap between re-strikes (30-60ms dark gap)
            arc.mainMat.opacity = 0;
            arc.branchMat.opacity = 0;
            arc.branch2Mat.opacity = 0;
            arc.duration = 0.016 + Math.random() * 0.032;
            arc.cooldown = 0.03 + Math.random() * 0.03;
            arc.isOn = false;
            arc._restrike = true;
          } else {
            // End of discharge
            arc.isOn = false;
            arc._restrike = false;
            arc.mainMat.opacity = 0;
            arc.branchMat.opacity = 0;
            arc.branch2Mat.opacity = 0;
            // Heavy bass = shorter cooldown, low bass = long silence
            const bassCooldown = bassActive
              ? 0.1 + Math.random() * 0.15 - bassIntensity * 0.08
              : 0.8 + Math.random() * 1.5;
            arc.cooldown = Math.max(0.06, bassCooldown);
          }
        } else {
          // Re-randomize geometry EVERY FRAME for realistic jitter
          arc.mainLine.geometry.dispose();
          arc.mainLine.geometry = this._createLightningGeo(arc.from, arc.to, 24, 0.8);

          // Re-randomize branch endpoints toward columns each frame
          const midT = 0.2 + Math.random() * 0.6;
          const midX = arc.from.x + (arc.to.x - arc.from.x) * midT;
          const midY = arc.from.y + (Math.random() - 0.5) * 2;
          const midZ = arc.from.z + (Math.random() - 0.5) * 1.5;
          const b1End = { x: midX + (Math.random() - 0.5) * 4, y: midY - 2 - Math.random() * 4, z: midZ + (Math.random() - 0.5) * 2 };
          const b2T = 0.15 + Math.random() * 0.7;
          const b2X = arc.from.x + (arc.to.x - arc.from.x) * b2T;
          const b2End = { x: b2X + (Math.random() - 0.5) * 3, y: midY - 1.5 - Math.random() * 3, z: midZ + (Math.random() - 0.5) * 1.5 };

          arc.branchLine.geometry.dispose();
          arc.branchLine.geometry = this._createLightningGeo({ x: midX, y: midY, z: midZ }, b1End, 10, 0.4);
          arc.branch2Line.geometry.dispose();
          arc.branch2Line.geometry = this._createLightningGeo({ x: b2X, y: midY, z: midZ }, b2End, 8, 0.3);

          // Rapid on/off flicker — intensity driven by quadratic bass
          const flicker = Math.random() > 0.25 ? (0.6 + Math.random() * 0.4) : 0;
          const bassMult = 0.3 + bassIntensity * 2.0;
          arc.mainMat.opacity = Math.min(1.0, flicker * bassMult);
          arc.branchMat.opacity = Math.min(1.0, flicker * bassMult * 0.6);
          arc.branch2Mat.opacity = Math.min(1.0, flicker * bassMult * 0.35);
        }
      } else if (arc.cooldown <= 0) {
        // Re-strike continuation or fresh bass-driven strike
        const isRestrike = arc._restrike;
        // ONLY fire on bass energy — no random firing without bass
        const shouldFire = isRestrike
          ? bassActive
          : (bassLevel > 0.2 && Math.random() < bassIntensity * 0.8);
        if (shouldFire) {
          arc.isOn = true;
          arc._restrike = false;
          arc.duration = 0.016 + Math.random() * 0.035 + bassIntensity * 0.02;
          if (!isRestrike) {
            arc.strikeCount = 1 + Math.floor(bassIntensity * 5);
          }
          arc.mainLine.geometry.dispose();
          arc.mainLine.geometry = this._createLightningGeo(arc.from, arc.to, 24, 0.8);
          arc.branchLine.geometry.dispose();
          arc.branchLine.geometry = this._createLightningGeo(arc.midPoint, arc.branchEnd, 10, 0.4);
          arc.branch2Line.geometry.dispose();
          arc.branch2Line.geometry = this._createLightningGeo(arc.midPoint2, arc.branchEnd2, 8, 0.3);
        }
      }
    });
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
