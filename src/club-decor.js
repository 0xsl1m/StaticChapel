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

    // ======== BACK BAR WALL — dark walnut paneling against cathedral wall ========
    const backWallH = 4.5;
    const backWallMat = new THREE.MeshStandardMaterial({
      color: 0x2a1810, roughness: 0.65, metalness: 0.02,
    });
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

    // Warm backlight material for alcove interiors
    const alcoveBackMat = new THREE.MeshStandardMaterial({
      color: 0x1a1208, roughness: 0.7, metalness: 0.0,
      emissive: 0xffddaa, emissiveIntensity: 0.1,
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

      // Arch top (semicircle)
      const archCrownGeo = new THREE.CylinderGeometry(alcoveW / 2 - 0.15, alcoveW / 2 - 0.15, 0.06, 12, 1, false, 0, Math.PI);
      const archCrown = new THREE.Mesh(archCrownGeo, archTrimMat);
      archCrown.rotation.x = Math.PI / 2;
      archCrown.rotation.z = Math.PI;
      archCrown.position.set(ax, alcoveBaseY + alcoveH, alcoveZ + 0.06);
      bar.add(archCrown);

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

    // Front panel — dark onyx with brass fluting
    const frontPanelMat = new THREE.MeshStandardMaterial({
      color: 0x12100e, roughness: 0.15, metalness: 0.12,
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
    ), 0, backWallH + 0.6, 0.1));

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
  //  PILLAR GLOW CYLINDERS
  // ==================================================================
  createPillarGlows() {
    const spacing = NAVE_LENGTH / 13;
    const pillarH = 28;
    // More height segments so the UV-based sweep looks smooth
    const glowGeo = new THREE.CylinderGeometry(0.65, 0.65, pillarH, 8, 32, true);

    // ShaderMaterial: electricity sweeps top→bottom via uWaveFront uniform
    const makeGlowMat = () => new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uWaveFront: { value: -1.0 },  // -1 = off, 0 = top, 1 = bottom (grounded)
        uIntensity: { value: 0.0 },
        uColor: { value: new THREE.Color(0x6688ff) },
      },
      vertexShader: `
        varying float vHeight;
        void main() {
          // UV.y: 0 at bottom of cylinder, 1 at top
          vHeight = 1.0 - uv.y; // invert so 0=top, 1=bottom
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uWaveFront;
        uniform float uIntensity;
        uniform vec3 uColor;
        varying float vHeight;
        void main() {
          if (uIntensity <= 0.0 || uWaveFront < -0.5) discard;
          // Bright leading edge at wavefront, fading trail above
          float dist = vHeight - uWaveFront;
          // Leading edge: sharp bright band (width ~0.08 of pillar height)
          float edge = exp(-dist * dist * 600.0);
          // Trail above wavefront: fades out behind the sweep
          float trail = dist < 0.0 ? exp(dist * 8.0) : 0.0;
          // Ground flash: when wavefront near bottom, brief bright base
          float groundFlash = uWaveFront > 0.85 ? exp(-(1.0 - vHeight) * (1.0 - vHeight) * 200.0) * (uWaveFront - 0.85) * 6.667 : 0.0;
          float alpha = (edge * 1.0 + trail * 0.4 + groundFlash * 0.8) * uIntensity;
          if (alpha < 0.005) discard;
          // Brighter white at leading edge, base color in trail
          vec3 col = mix(uColor, vec3(0.85, 0.92, 1.0), edge * 0.7);
          gl_FragColor = vec4(col, min(alpha, 0.5));
        }
      `,
    });

    for (let i = 0; i < 12; i++) {
      const z = -NAVE_LENGTH / 2 + spacing * (i + 1);
      const leftGlow = new THREE.Mesh(glowGeo, makeGlowMat());
      leftGlow.position.set(-NAVE_WIDTH / 2, pillarH / 2, z);
      this.group.add(leftGlow);
      const rightGlow = new THREE.Mesh(glowGeo, makeGlowMat());
      rightGlow.position.set(NAVE_WIDTH / 2, pillarH / 2, z);
      this.group.add(rightGlow);
      this.pillarGlows.push({
        left: leftGlow, right: rightGlow,
        leftWave: -1, rightWave: -1,       // wavefront position (-1=off, 0=top, 1=bottom)
        leftIntensity: 0, rightIntensity: 0,
        index: i,
      });
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
    this._updateArcs(time, energy, isBeat, bandValues);
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
    // Sweep speed: wavefront travels top→bottom in ~250ms (4.0/sec)
    const SWEEP_SPEED = 4.0 * 0.016; // per frame at 60fps
    const FADE_RATE = 0.08;           // fast intensity decay after grounding

    this.pillarGlows.forEach(pg => {
      // --- Left pillar ---
      if (pg.leftWave >= 0 && pg.leftWave < 1.0) {
        // Actively sweeping down
        pg.leftWave = Math.min(1.0, pg.leftWave + SWEEP_SPEED);
      } else if (pg.leftWave >= 1.0) {
        // Grounded — rapid fade
        pg.leftIntensity = Math.max(0, pg.leftIntensity - FADE_RATE);
        if (pg.leftIntensity <= 0) pg.leftWave = -1;
      }
      pg.left.material.uniforms.uWaveFront.value = pg.leftWave;
      pg.left.material.uniforms.uIntensity.value = pg.leftIntensity;

      // --- Right pillar ---
      if (pg.rightWave >= 0 && pg.rightWave < 1.0) {
        pg.rightWave = Math.min(1.0, pg.rightWave + SWEEP_SPEED);
      } else if (pg.rightWave >= 1.0) {
        pg.rightIntensity = Math.max(0, pg.rightIntensity - FADE_RATE);
        if (pg.rightIntensity <= 0) pg.rightWave = -1;
      }
      pg.right.material.uniforms.uWaveFront.value = pg.rightWave;
      pg.right.material.uniforms.uIntensity.value = pg.rightIntensity;
    });
  }

  _updateArcs(time, energy, isBeat, bandValues) {
    const dt = 0.016;
    // Bass-driven: combine subBass and bass for a single "bassLevel" 0-1+
    const subBass = bandValues.subBass || 0;
    const bass = bandValues.bass || 0;
    const bassLevel = Math.max(subBass, bass) * 0.6 + (subBass + bass) * 0.2;
    // Only fire arcs when bass is above a meaningful threshold
    const BASS_THRESHOLD = 0.08;
    const bassActive = bassLevel > BASS_THRESHOLD;

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
            // End of discharge — cooldown scales inversely with bass
            arc.isOn = false;
            arc._restrike = false;
            arc.mainMat.opacity = 0;
            arc.branchMat.opacity = 0;
            arc.branch2Mat.opacity = 0;
            // Heavy bass = shorter cooldown (more frequent), low bass = long silence
            const bassCooldown = bassActive
              ? 0.12 + Math.random() * 0.2 - bassLevel * 0.1
              : 0.5 + Math.random() * 1.0;
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

          // Rapid on/off flicker — intensity scales with bass
          const flicker = Math.random() > 0.25 ? (0.6 + Math.random() * 0.4) : 0;
          const bassMult = 0.4 + bassLevel * 1.2; // bass drives brightness
          arc.mainMat.opacity = Math.min(1.0, flicker * bassMult);
          arc.branchMat.opacity = Math.min(1.0, flicker * bassMult * 0.6);
          arc.branch2Mat.opacity = Math.min(1.0, flicker * bassMult * 0.35);

          // Trigger pillar glow sweep while arc is active — scaled by bass
          const pg = this.pillarGlows[arc.pillarIndex];
          if (pg && flicker > 0) {
            const si = 0.3 + bassLevel * 0.7;
            // Reset wavefront to top if not already sweeping
            if (pg.leftWave < 0) pg.leftWave = 0;
            if (pg.rightWave < 0) pg.rightWave = 0;
            pg.leftIntensity = Math.min(1.0, Math.max(pg.leftIntensity, si));
            pg.rightIntensity = Math.min(1.0, Math.max(pg.rightIntensity, si));
          }
        }
      } else if (arc.cooldown <= 0) {
        // Re-strike continuation or fresh bass-driven strike
        const isRestrike = arc._restrike;
        // Fresh strikes: ONLY fire on bass energy, no random chance
        const shouldFire = isRestrike
          ? bassActive   // re-strikes continue only if bass is still active
          : (bassLevel > 0.15 && Math.random() < bassLevel * 0.6)  // probability scales with bass
            || (isBeat && bassLevel > BASS_THRESHOLD);              // beat + any bass = fire
        if (shouldFire) {
          arc.isOn = true;
          arc._restrike = false;
          // Stroke duration scales with bass intensity
          arc.duration = 0.016 + Math.random() * 0.035 + bassLevel * 0.015;
          if (!isRestrike) {
            // More re-strikes when bass is heavier
            arc.strikeCount = 1 + Math.floor(bassLevel * 4) + (isBeat ? 1 : 0);
          }
          arc.mainLine.geometry.dispose();
          arc.mainLine.geometry = this._createLightningGeo(arc.from, arc.to, 24, 0.8);
          arc.branchLine.geometry.dispose();
          arc.branchLine.geometry = this._createLightningGeo(arc.midPoint, arc.branchEnd, 10, 0.4);
          arc.branch2Line.geometry.dispose();
          arc.branch2Line.geometry = this._createLightningGeo(arc.midPoint2, arc.branchEnd2, 8, 0.3);
          const pg = this.pillarGlows[arc.pillarIndex];
          if (pg) {
            const si = 0.4 + bassLevel * 0.6;
            // Start sweep from top of pillar
            pg.leftWave = 0;
            pg.rightWave = 0;
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
