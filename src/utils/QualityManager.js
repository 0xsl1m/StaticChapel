/**
 * QualityManager — Auto-detects device capabilities and provides
 * quality presets for mobile, Quest 3, and desktop.
 *
 * Quality tiers:
 *   'low'    — Quest 3 / mobile phones (strict budgets)
 *   'medium' — tablets, low-end laptops
 *   'high'   — desktop with dedicated GPU (current full quality)
 */

export class QualityManager {
  constructor() {
    this.tier = this._detectTier();
    this.config = QUALITY_CONFIGS[this.tier];
    console.log(`[QualityManager] Detected tier: ${this.tier}`);
  }

  _detectTier() {
    const ua = navigator.userAgent.toLowerCase();

    // Quest 3 / Quest Pro / any Meta Quest device
    if (/quest/i.test(ua) || /oculus/i.test(ua)) return 'low';

    // Check for XR support indicator (WebXR immersive devices)
    if (navigator.xr) {
      // Will be refined after XR session check, but default conservatively
    }

    // Mobile phones
    if (/android/i.test(ua) && /mobile/i.test(ua)) return 'low';
    if (/iphone/i.test(ua)) return 'low';

    // Tablets
    if (/ipad/i.test(ua)) return 'medium';
    if (/android/i.test(ua)) return 'medium'; // Android tablet (no "mobile")

    // Low-end detection via hardware concurrency & memory
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 8; // GB, Chrome only
    if (cores <= 4 || memory <= 4) return 'medium';

    // Check GPU via WebGL renderer string
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL).toLowerCase();
          // Integrated GPUs
          if (/intel|mesa|swiftshader|llvmpipe/i.test(renderer) &&
              !/arc|xe/i.test(renderer)) {
            return 'medium';
          }
        }
      }
    } catch (e) { /* ignore */ }

    return 'high';
  }
}

// ===================================================================
//  Quality configuration objects
//  Each system reads these to decide what to build / how to update.
// ===================================================================

const QUALITY_CONFIGS = {

  // -----------------------------------------------------------------
  //  LOW — Quest 3, mobile phones
  //  Target: 72 fps @ Quest 3, 30-60 fps on phones
  //  Budget: ~30 lights, minimal canvas updates, simplified geometry
  // -----------------------------------------------------------------
  low: {
    tier: 'low',

    // Renderer
    pixelRatio: 1.0,
    antialias: false,
    shadowMap: false,
    toneMappingExposure: 0.9,

    // Textures
    textureResolution: 256,

    // Cathedral
    floorSegments: [8, 16],           // PlaneGeometry segments [w, h]
    sacredGeometry: false,             // skip floor patterns entirely
    roseWindowDetail: 'simple',        // fewer circles, no Metatron lines
    windowLights: true,                // keep window lights — essential for atmosphere
    archSegments: 10,                  // TubeGeometry tubular segments
    archRadialSegments: 4,
    columnClusterShafts: 0,            // skip cluster shafts (saves 192 meshes)
    gargoyles: false,
    wallSconces: false,
    buttresses: false,
    tileGrid: false,

    // Organ
    maxPipeRows: 3,                    // only render 3 of 5 rows
    pipeRadialSegments: 5,
    pipeUpdateFrequency: 4,            // update every 4th frame

    // Stage / LED
    ledPanelCount: 1,                  // center panel only (single screen for Quest 3)
    ledCanvasRes: 64,                  // 64x64 instead of 128
    ledUpdateInterval: 3,              // update every 3rd frame
    fixtureScreens: false,             // no mini-screens on fixture heads
    beamCoreEnabled: false,            // skip inner beam cores
    beamConesEnabled: false,           // skip ALL beam cones (saves 16+ additive-blend draw calls)
    stageFixtureModels: false,         // skip visual fixture models on trusses
    fogMachines: false,

    // Sound System
    subSlatCount: 6,                   // reduced from 20
    subBraces: false,
    subPortBorder: false,
    subEmbossedLogo: false,            // skip 3D letter geometry
    subCornerProtectors: false,
    subEdgeRails: false,
    subHandles: false,
    subLatches: false,
    subRubberFeet: false,
    arraySlatCount: 4,
    arrayHornThroats: false,
    arrayRiggingPins: false,

    // Club Decor
    chandelierTiers: 1,                // only 1 tier (saves 2/3 of geometry)
    chandelierArmsPerTier: 6,
    chandelierLightsPerUnit: 1,        // just 1 main light per chandelier (saves 12)
    chandelierPendants: false,
    furnitureTufting: false,            // skip diamond/nailhead buttons
    furnitureUnderglow: false,
    electricArcs: 4,                   // 4 instead of 12
    staticParticles: 0,                // disabled on Quest 3 — distracting near ceiling
    cocktailBarDetail: 'simple',

    // Candles
    candleCount: 8,                    // 8 instead of 48
    candleLights: false,               // skip PointLights, keep flame visuals only

    // VFX
    fogParticles: 60,                  // reduced from 150 for Quest 3 72fps target
    godRays: true,                     // keep — they're cheap geometry
    godRayCount: 8,                    // reduced from 16
    dustMotes: false,

    // DJ Booth
    djScreenUpdates: false,            // static screens
    djAvatarDetail: 'simple',

    // Lighting — balanced reduction for Quest 3 Adreno GPU
    // SpotLights are expensive but we need enough for visible stage lighting
    maxLights: 20,                     // reasonable cap
    stainedGlassLights: true,          // keep window lights — essential for atmosphere
    naveFillLights: 2,                 // reduced from 5
    ambientIntensity: 0.6,             // slightly elevated ambient
    hemisphereIntensity: 0.45,
    frontTrussSpots: 4,                // reduced from 8 (4 SpotLights)
    sideTrussSpots: 4,                 // reduced from 8 (2 per side)
    parWashes: 4,                      // reduced from 8 (PointLights, cheaper)
    laserSpots: 2,                     // reduced from 4
    strobes: 2,                        // reduced from 6

    // Update throttling
    organUpdateEvery: 4,
    soundSystemUpdateEvery: 4,         // increased from 3
    clubDecorUpdateEvery: 4,           // increased from 3
    candleUpdateEvery: 4,
    lightingUpdateEvery: 2,            // update lighting programs every other frame
  },

  // -----------------------------------------------------------------
  //  MEDIUM — tablets, low-end laptops, integrated GPU
  // -----------------------------------------------------------------
  medium: {
    tier: 'medium',

    pixelRatio: 1.5,
    antialias: true,
    shadowMap: false,
    toneMappingExposure: 0.85,

    textureResolution: 512,

    // Cathedral — moderate simplification
    floorSegments: [16, 32],
    sacredGeometry: true,              // keep but with fewer segments
    roseWindowDetail: 'medium',
    windowLights: true,                // keep but at reduced intensity
    archSegments: 16,
    archRadialSegments: 5,
    columnClusterShafts: 4,            // 4 instead of 8
    gargoyles: true,
    wallSconces: true,
    buttresses: true,
    tileGrid: false,

    // Organ
    maxPipeRows: 4,
    pipeRadialSegments: 6,
    pipeUpdateFrequency: 2,

    // Stage
    ledPanelCount: 5,                  // center + inner wings
    ledCanvasRes: 96,
    ledUpdateInterval: 2,
    fixtureScreens: false,
    beamCoreEnabled: true,
    fogMachines: true,

    // Sound System
    subSlatCount: 10,
    subBraces: true,
    subPortBorder: true,
    subEmbossedLogo: false,
    subCornerProtectors: false,
    subEdgeRails: true,
    subHandles: true,
    subLatches: false,
    subRubberFeet: false,
    arraySlatCount: 8,
    arrayHornThroats: true,
    arrayRiggingPins: false,

    // Club Decor
    chandelierTiers: 2,
    chandelierArmsPerTier: 8,
    chandelierLightsPerUnit: 2,        // main + uplight
    chandelierPendants: false,
    furnitureTufting: false,
    furnitureUnderglow: true,
    electricArcs: 8,
    staticParticles: 100,
    cocktailBarDetail: 'medium',

    // Candles
    candleCount: 24,
    candleLights: true,                // keep lights but at half count

    // VFX
    fogParticles: 300,
    godRays: true,
    dustMotes: false,

    // DJ
    djScreenUpdates: true,
    djAvatarDetail: 'full',

    // Lighting
    maxLights: 60,
    stainedGlassLights: true,
    naveFillLights: 3,
    ambientIntensity: 0.35,
    hemisphereIntensity: 0.3,

    // Throttling
    organUpdateEvery: 2,
    soundSystemUpdateEvery: 2,
    clubDecorUpdateEvery: 2,
    candleUpdateEvery: 2,
  },

  // -----------------------------------------------------------------
  //  HIGH — desktop with dedicated GPU (current full quality)
  // -----------------------------------------------------------------
  high: {
    tier: 'high',

    pixelRatio: 2.0,
    antialias: true,
    shadowMap: true,
    toneMappingExposure: 0.85,

    textureResolution: 512,

    floorSegments: [32, 64],
    sacredGeometry: true,
    roseWindowDetail: 'full',
    windowLights: true,
    archSegments: 24,
    archRadialSegments: 6,
    columnClusterShafts: 8,
    gargoyles: true,
    wallSconces: true,
    buttresses: true,
    tileGrid: true,

    maxPipeRows: 5,
    pipeRadialSegments: 8,
    pipeUpdateFrequency: 1,

    ledPanelCount: 9,
    ledCanvasRes: 128,
    ledUpdateInterval: 1,
    fixtureScreens: true,
    beamCoreEnabled: true,
    fogMachines: true,

    subSlatCount: 20,
    subBraces: true,
    subPortBorder: true,
    subEmbossedLogo: true,
    subCornerProtectors: true,
    subEdgeRails: true,
    subHandles: true,
    subLatches: true,
    subRubberFeet: true,
    arraySlatCount: 20,
    arrayHornThroats: true,
    arrayRiggingPins: true,

    chandelierTiers: 3,
    chandelierArmsPerTier: 10,         // inner tiers get 10/14/10
    chandelierLightsPerUnit: 5,        // main + uplight + 3 tier
    chandelierPendants: true,
    furnitureTufting: true,
    furnitureUnderglow: true,
    electricArcs: 12,
    staticParticles: 200,
    cocktailBarDetail: 'full',

    candleCount: 48,
    candleLights: true,

    fogParticles: 500,
    godRays: true,
    dustMotes: false,                  // already disabled

    djScreenUpdates: true,
    djAvatarDetail: 'full',

    maxLights: 200,
    stainedGlassLights: true,
    naveFillLights: 5,
    ambientIntensity: 0.25,
    hemisphereIntensity: 0.2,

    organUpdateEvery: 1,
    soundSystemUpdateEvery: 1,
    clubDecorUpdateEvery: 1,
    candleUpdateEvery: 1,
  },
};

// Singleton instance — import and use everywhere
export const quality = new QualityManager();
