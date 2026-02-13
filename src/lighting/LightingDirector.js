/**
 * LightingDirector - Phase 4: Master lighting engine for Static Chapel VR
 *
 * Manages all virtual fixtures (spotlights, point lights) positioned throughout
 * the cathedral space (60m long, 20m wide, 30m tall, stage at z~24).
 * Selects from 12 inline lighting programs based on audio mood classification,
 * with smooth 0.5s crossfade transitions between programs.
 *
 * Fixture layout:
 *   - 8 front truss moving heads (SpotLight) at y=20, z=19
 *   - 8 side truss moving heads (SpotLight), 4 per side at y=15, x=+/-9
 *   - 8 PAR wash lights (PointLight) on stage floor at y=1.6
 *   - 4 laser spots (SpotLight) floor-mounted at stage corners
 *   - 6 strobe lights (PointLight) on front truss
 *
 * Total: 28 lights (12 SpotLights + 14 PointLights + strobes)
 */
import * as THREE from 'three';

// --- ROYGBIV Color Palette — Full spectrum, maximum saturation ---
// Each color sits at a pure hue position for vivid, punchy lighting.
const COL = {
  // === ROYGBIV primaries ===
  red:      new THREE.Color(0xff0000),   // R — pure red
  orange:   new THREE.Color(0xff5500),   // O — vivid orange (not muddy)
  yellow:   new THREE.Color(0xffee00),   // Y — electric yellow
  green:    new THREE.Color(0x00ff00),   // G — pure green
  blue:     new THREE.Color(0x0055ff),   // B — rich blue (not too dark)
  indigo:   new THREE.Color(0x4400cc),   // I — deep indigo
  violet:   new THREE.Color(0x9900ff),   // V — vivid violet

  // === Extended saturated palette ===
  deepRed:  new THREE.Color(0xcc0000),   // darker red (still saturated)
  crimson:  new THREE.Color(0xff0044),   // hot pink-red
  magenta:  new THREE.Color(0xff00cc),   // hot magenta
  pink:     new THREE.Color(0xff44aa),   // electric pink
  cyan:     new THREE.Color(0x00ffff),   // pure cyan
  teal:     new THREE.Color(0x00ddaa),   // vivid teal-green
  lime:     new THREE.Color(0x88ff00),   // electric lime
  gold:     new THREE.Color(0xffdd00),   // saturated gold
  amber:    new THREE.Color(0xffaa00),   // rich amber
  purple:   new THREE.Color(0xaa00ff),   // vivid purple
  deepBlue: new THREE.Color(0x0022aa),   // dark but saturated blue
  iceBlue:  new THREE.Color(0x00aaff),   // vivid sky blue

  // === Utility ===
  white:    new THREE.Color(0xffffff),
  black:    new THREE.Color(0x000000),
  warmWhite:new THREE.Color(0xfff0dd),   // warm white (less yellow than before)
};

// Reusable scratch color to avoid allocations
const _tmpColor = new THREE.Color();
const _tmpColor2 = new THREE.Color();

/**
 * Linear interpolation between two THREE.Color objects, written into `out`.
 */
function lerpColor(out, a, b, t) {
  out.r = a.r + (b.r - a.r) * t;
  out.g = a.g + (b.g - a.g) * t;
  out.b = a.b + (b.b - a.b) * t;
  return out;
}

/**
 * Converts a hue (0-1) to a THREE.Color via HSL with full saturation/lightness.
 */
function hueToColor(out, hue) {
  out.setHSL(hue % 1.0, 1.0, 0.5);
  return out;
}

// --- Mood to program mapping ---
const MOOD_TO_PROGRAM = {
  aggressive:      1,
  cold_ambient:    2,
  balanced_medium: 3,
  building:        4,
  warm_ambient:    5,
  chaos:           6,
  // Program 7 (Silhouette) is used internally for low-energy dark moments
  bass_heavy:      8,
  euphoric:        9,
  silence:         10,
  ritualistic:     11,
  glitch:          12,
};

export class LightingDirector {
  /**
   * @param {THREE.Scene} scene
   * @param {Object} [qualityConfig] - adaptive quality settings
   */
  constructor(scene, qualityConfig = {}) {
    this.scene = scene;
    this.Q = qualityConfig;

    // ---- Fixture storage ----
    this.frontTrussSpots = [];   // 8 moving head spots on front truss
    this.sideTrussSpots = [];    // 8 moving head spots on side trusses (4 per side)
    this.parWashes = [];         // 8 PAR wash point lights on stage floor
    this.laserSpots = [];        // 4 laser spotlights at stage corners
    this.strobes = [];           // 6 strobe point lights on front truss

    // All fixtures combined for batch operations
    this.allSpots = [];
    this.allPoints = [];
    this.allFixtures = [];

    // ---- Program / crossfade state ----
    this.currentProgram = 10;    // Start in Blackout Pulse (silence)
    this.targetProgram = 10;
    this.crossfadeProgress = 1.0; // 1 = fully arrived at current
    this.crossfadeDuration = 3.0; // seconds — slow, smooth transitions
    this.crossfading = false;

    // Snapshot intensities/colors from the outgoing program for crossfade blending
    this.snapshotIntensities = [];
    this.snapshotColors = [];

    // ---- Build fixtures ----
    this._createFixtures();

    // Take initial snapshot
    this._takeSnapshot();
  }

  // =========================================================================
  //  FIXTURE CREATION
  // =========================================================================

  _createFixtures() {
    const frontCount = this.Q.frontTrussSpots || 8;
    const sideTotal = this.Q.sideTrussSpots || 8;
    const parCount = this.Q.parWashes || 8;
    const laserCount = this.Q.laserSpots || 4;
    const strobeCount = this.Q.strobes || 6;
    const sidePerSide = Math.floor(sideTotal / 2);

    // --- Front truss moving head spots ---
    for (let i = 0; i < frontCount; i++) {
      const x = -6 + (12 / Math.max(1, frontCount - 1)) * i;
      const spot = this._createSpot(x, 20, 19, 0, 0, 0, 1.0, Math.PI / 6, 0.4);
      this.frontTrussSpots.push(spot);
    }

    // --- Side truss moving head spots ---
    // Left side
    for (let i = 0; i < sidePerSide; i++) {
      const z = 18 + (8 / Math.max(1, sidePerSide - 1)) * i;
      const spot = this._createSpot(-9, 15, z, 0, 0, 0, 0.8, Math.PI / 5, 0.4);
      this.sideTrussSpots.push(spot);
    }
    // Right side
    for (let i = 0; i < sidePerSide; i++) {
      const z = 18 + (8 / Math.max(1, sidePerSide - 1)) * i;
      const spot = this._createSpot(9, 15, z, 0, 0, 0, 0.8, Math.PI / 5, 0.4);
      this.sideTrussSpots.push(spot);
    }

    // --- PAR wash point lights on stage floor ---
    for (let i = 0; i < parCount; i++) {
      const angle = (i / parCount) * Math.PI * 2;
      const radius = 5;
      const x = Math.cos(angle) * radius;
      const z = 24 + Math.sin(angle) * radius;
      const par = this._createPoint(x, 1.6, z, 0.4, 15);
      this.parWashes.push(par);
    }

    // --- Laser spotlights (floor mounted at stage corners) ---
    const allLaserPositions = [
      [-6, 0.5, 20],
      [6, 0.5, 20],
      [-6, 0.5, 28],
      [6, 0.5, 28],
    ];
    for (let i = 0; i < Math.min(laserCount, allLaserPositions.length); i++) {
      const [lx, ly, lz] = allLaserPositions[i];
      const spot = this._createSpot(lx, ly, lz, 0, 25, 24, 1.0, Math.PI / 10, 0.3);
      this.laserSpots.push(spot);
    }

    // --- Strobe point lights on front truss ---
    for (let i = 0; i < strobeCount; i++) {
      const x = strobeCount > 1 ? -5 + (10 / (strobeCount - 1)) * i : 0;
      const strobe = this._createPoint(x, 20, 19, 0.0, 30);
      this.strobes.push(strobe);
    }

    // Build combined arrays
    this.allSpots = [
      ...this.frontTrussSpots,
      ...this.sideTrussSpots,
      ...this.laserSpots,
    ];
    this.allPoints = [
      ...this.parWashes,
      ...this.strobes,
    ];
    this.allFixtures = [...this.allSpots, ...this.allPoints];
  }

  /**
   * Create a SpotLight fixture and add it to the scene.
   */
  _createSpot(x, y, z, tx, ty, tz, intensity, angle, penumbra) {
    const spot = new THREE.SpotLight(
      0xffffff,
      intensity !== undefined ? intensity : 2.0,
      80,                                // distance (reach full 60m nave)
      angle !== undefined ? angle : Math.PI / 6,
      penumbra !== undefined ? penumbra : 0.4,
      1                                  // decay
    );
    spot.position.set(x, y, z);
    spot.castShadow = false; // save GPU; cathedral already has shadow casters
    spot.target.position.set(
      tx !== undefined ? tx : 0,
      ty !== undefined ? ty : 0,
      tz !== undefined ? tz : 24
    );
    this.scene.add(spot);
    this.scene.add(spot.target);
    return spot;
  }

  /**
   * Create a PointLight fixture and add it to the scene.
   */
  _createPoint(x, y, z, intensity, distance) {
    const point = new THREE.PointLight(
      0xffffff,
      intensity !== undefined ? intensity : 1.0,
      distance !== undefined ? distance : 15,
      1  // decay
    );
    point.position.set(x, y, z);
    point.castShadow = false;
    this.scene.add(point);
    return point;
  }

  // =========================================================================
  //  SNAPSHOT / CROSSFADE
  // =========================================================================

  /**
   * Capture current intensity and color of every fixture for crossfade blending.
   */
  _takeSnapshot() {
    this.snapshotIntensities = this.allFixtures.map(f => f.intensity);
    this.snapshotColors = this.allFixtures.map(f => f.color.clone());
  }

  /**
   * Begin a crossfade transition to a new program number.
   */
  _startCrossfade(programNumber) {
    if (programNumber === this.currentProgram && !this.crossfading) return;
    this._takeSnapshot();
    this.targetProgram = programNumber;
    this.crossfadeProgress = 0.0;
    this.crossfading = true;
  }

  // =========================================================================
  //  MAIN UPDATE
  // =========================================================================

  /**
   * Called every frame from the main animation loop.
   *
   * @param {number} time     - elapsed time in seconds (from clock.getElapsedTime or similar)
   * @param {number} delta    - frame delta in seconds
   * @param {string} mood     - mood classification string from AudioEngine.getMood()
   * @param {Object} bandValues - { subBass, bass, lowMid, mid, highMid, presence, treble } each 0-1
   * @param {number} energy   - overall audio energy 0-1
   * @param {boolean} isBeat  - true on detected beat frames
   */
  update(time, delta, mood, bandValues, energy, isBeat) {
    // ----- Determine target program from mood -----
    let desiredProgram = MOOD_TO_PROGRAM[mood];
    if (desiredProgram === undefined) desiredProgram = 3; // fallback to Void Pulse

    // Special case: use Silhouette (7) for very low energy dark moments
    if (energy < 0.03 && mood !== 'silence') {
      desiredProgram = 7;
    }

    // Check if we need to change programs
    if (desiredProgram !== this.currentProgram && desiredProgram !== this.targetProgram) {
      this._startCrossfade(desiredProgram);
    }

    // ----- Advance crossfade -----
    if (this.crossfading) {
      this.crossfadeProgress += delta / this.crossfadeDuration;
      if (this.crossfadeProgress >= 1.0) {
        this.crossfadeProgress = 1.0;
        this.crossfading = false;
        this.currentProgram = this.targetProgram;
      }
    }

    // ----- Run the active program(s) -----
    if (this.crossfading) {
      // We need to compute both the outgoing snapshot blend and the incoming program.
      // Run the incoming (target) program to set fixture values:
      this._runProgram(this.targetProgram, time, delta, bandValues, energy, isBeat);

      // Now blend each fixture between snapshot and newly-set values
      const t = this._easeCrossfade(this.crossfadeProgress);
      for (let i = 0; i < this.allFixtures.length; i++) {
        const fixture = this.allFixtures[i];
        const snapshotIntensity = this.snapshotIntensities[i];
        const snapshotColor = this.snapshotColors[i];
        const targetIntensity = fixture.intensity;

        // Blend intensity
        fixture.intensity = snapshotIntensity + (targetIntensity - snapshotIntensity) * t;

        // Blend color
        lerpColor(_tmpColor, snapshotColor, fixture.color, t);
        fixture.color.copy(_tmpColor);
      }
    } else {
      // Only the current program runs
      this._runProgram(this.currentProgram, time, delta, bandValues, energy, isBeat);
    }

    // --- Global intensity scaling ---
    // Programs set dramatic intensity values (3.0-8.0) which creates
    // compounding brightness when 20+ fixtures overlap in the same space.
    // Rather than changing individual program intensities, we apply a
    // global post-program multiplier that preserves relative dynamics
    // while preventing wash-out. This is the ONLY place brightness is
    // controlled — individual program values remain untouched.
    const GLOBAL_SCALE = 0.6;

    // Per-fixture-type clamping (applied AFTER scaling)
    const SPOT_MAX = 2.5;
    const PAR_MAX = 1.5;
    const STROBE_MAX = 3.0;

    for (const spot of this.frontTrussSpots) {
      spot.intensity = Math.min(spot.intensity * GLOBAL_SCALE, SPOT_MAX);
    }
    for (const spot of this.sideTrussSpots) {
      spot.intensity = Math.min(spot.intensity * GLOBAL_SCALE, SPOT_MAX);
    }
    for (const par of this.parWashes) {
      par.intensity = Math.min(par.intensity * GLOBAL_SCALE, PAR_MAX);
    }
    for (const laser of this.laserSpots) {
      laser.intensity = Math.min(laser.intensity * GLOBAL_SCALE, SPOT_MAX);
    }
    for (const strobe of this.strobes) {
      strobe.intensity = Math.min(strobe.intensity * GLOBAL_SCALE, STROBE_MAX);
    }
  }

  /**
   * Smooth ease curve for crossfade (ease-in-out quadratic).
   */
  _easeCrossfade(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Dispatch to the correct program method.
   */
  _runProgram(num, time, delta, bandValues, energy, isBeat) {
    switch (num) {
      case 1:  this._program1_BloodAltar(time, delta, bandValues, energy, isBeat); break;
      case 2:  this._program2_DeepFreeze(time, delta, bandValues, energy, isBeat); break;
      case 3:  this._program3_VoidPulse(time, delta, bandValues, energy, isBeat); break;
      case 4:  this._program4_LightningStrike(time, delta, bandValues, energy, isBeat); break;
      case 5:  this._program5_CathedralBreathe(time, delta, bandValues, energy, isBeat); break;
      case 6:  this._program6_Hellfire(time, delta, bandValues, energy, isBeat); break;
      case 7:  this._program7_Silhouette(time, delta, bandValues, energy, isBeat); break;
      case 8:  this._program8_BassTsunami(time, delta, bandValues, energy, isBeat); break;
      case 9:  this._program9_PrismScatter(time, delta, bandValues, energy, isBeat); break;
      case 10: this._program10_BlackoutPulse(time, delta, bandValues, energy, isBeat); break;
      case 11: this._program11_GothicMass(time, delta, bandValues, energy, isBeat); break;
      case 12: this._program12_StaticOverload(time, delta, bandValues, energy, isBeat); break;
      default: this._program3_VoidPulse(time, delta, bandValues, energy, isBeat); break;
    }
  }

  // =========================================================================
  //  PROGRAM 1 — BLOOD ALTAR (aggressive)
  //  Deep red, all lights snap to high intensity, rapid color cycling
  //  red/white, strobes at max on beats.
  // =========================================================================

  _program1_BloodAltar(time, delta, bandValues, energy, isBeat) {
    const cycle = Math.sin(time * 42) * 0.5 + 0.5;
    lerpColor(_tmpColor, COL.deepRed, COL.white, cycle * 0.6);

    // Front truss: sharp red/white cones sweep the nave floor
    for (let i = 0; i < this.frontTrussSpots.length; i++) {
      const spot = this.frontTrussSpots[i];
      spot.intensity = 3.0 + energy * 2.0;
      spot.color.copy(_tmpColor);
      const phase = time * 2.5 + i * (Math.PI * 2 / 8);
      spot.target.position.set(
        Math.sin(phase) * 8,
        0,
        -5 + Math.cos(phase * 0.6) * 20
      );
    }

    // Side truss: crimson/orange cross-beams aimed across the nave floor
    for (let i = 0; i < this.sideTrussSpots.length; i++) {
      const spot = this.sideTrussSpots[i];
      spot.intensity = 2.0 + Math.sin(time * 15 + i) * 1.0;
      const altColor = i % 3 === 0 ? COL.orange : i % 3 === 1 ? COL.crimson : COL.red;
      lerpColor(spot.color, altColor, COL.red, Math.sin(time * 30 + i * 2) * 0.5 + 0.5);
      const isLeft = i < 4;
      const phase = time * 1.8 + i * 1.2;
      spot.target.position.set(
        (isLeft ? 1 : -1) * (2 + Math.sin(phase) * 5),
        0,
        -5 + Math.cos(phase * 0.5) * 20
      );
    }

    // PAR washes: blood red, high
    for (const par of this.parWashes) {
      par.color.copy(COL.deepRed);
      par.intensity = 2.5 + energy * 1.5;
    }

    // Laser spots: bright red aimed at ceiling
    for (let i = 0; i < this.laserSpots.length; i++) {
      const laser = this.laserSpots[i];
      laser.color.copy(COL.red);
      laser.intensity = 3.0;
      laser.target.position.set(
        laser.position.x + Math.sin(time * 3 + i) * 2,
        28,
        laser.position.z + Math.cos(time * 2 + i) * 3
      );
    }

    // Strobes: max flash on beat, else off
    for (const strobe of this.strobes) {
      strobe.color.copy(COL.white);
      strobe.intensity = isBeat ? 8.0 : 0;
    }
  }

  // =========================================================================
  //  PROGRAM 2 — DEEP FREEZE (cold_ambient)
  //  Ice blue/cyan, slow sweeping spots, gentle fading, no strobes.
  // =========================================================================

  _program2_DeepFreeze(time, delta, bandValues, energy, isBeat) {
    const slowBreath = Math.sin(time * 0.8) * 0.5 + 0.5;
    const slowSweep = time * 0.3;

    // Front truss: gentle ice blue — slow synchronized fan across nave floor
    for (let i = 0; i < this.frontTrussSpots.length; i++) {
      const spot = this.frontTrussSpots[i];
      const phase = slowSweep + i * 0.4;
      spot.intensity = 0.5 + slowBreath * 0.8 + Math.sin(phase) * 0.3;
      lerpColor(spot.color, COL.iceBlue, COL.cyan, Math.sin(phase) * 0.5 + 0.5);
      spot.target.position.set(
        Math.sin(phase) * 7,
        0,
        Math.cos(phase * 0.5) * 20
      );
    }

    // Side truss: slow cross-nave drift, beams meeting in center aisle
    const coldSideColors = [COL.iceBlue, COL.cyan, COL.blue, COL.indigo];
    for (let i = 0; i < this.sideTrussSpots.length; i++) {
      const spot = this.sideTrussSpots[i];
      const isLeft = i < 4;
      const localIdx = isLeft ? i : i - 4;
      const phase = slowSweep + localIdx * 0.7;
      spot.intensity = 0.4 + Math.sin(time * 0.5 + i * 0.8) * 0.3;
      lerpColor(spot.color, coldSideColors[i % coldSideColors.length], COL.cyan, Math.sin(phase * 0.5) * 0.5 + 0.5);
      spot.target.position.set(
        (isLeft ? 1 : -1) * Math.sin(phase * 0.8) * 4,
        0,
        5 + Math.cos(phase * 0.4) * 18
      );
    }

    // PAR washes: faint blue glow
    for (let i = 0; i < this.parWashes.length; i++) {
      this.parWashes[i].color.copy(COL.iceBlue);
      this.parWashes[i].intensity = 0.2 + Math.sin(time * 0.6 + i * 0.9) * 0.15;
    }

    // Laser spots: dim cyan shafts aimed at ceiling
    for (let i = 0; i < this.laserSpots.length; i++) {
      const laser = this.laserSpots[i];
      laser.color.copy(COL.cyan);
      laser.intensity = 0.4 + slowBreath * 0.3;
      laser.target.position.set(
        laser.position.x + Math.sin(time * 0.5 + i) * 1.5,
        28,
        laser.position.z + Math.cos(time * 0.4 + i) * 2
      );
    }

    // Strobes: off
    for (const strobe of this.strobes) {
      strobe.intensity = 0;
    }
  }

  // =========================================================================
  //  PROGRAM 3 — VOID PULSE (balanced_medium)
  //  Purple/gold/cyan brand colors, rotating spot patterns, gold flash on beats.
  // =========================================================================

  _program3_VoidPulse(time, delta, bandValues, energy, isBeat) {
    const brandColors = [COL.violet, COL.gold, COL.cyan, COL.magenta, COL.blue];
    const rotSpeed = time * 1.2;

    // Front truss: rotating ROYGBIV color wheel — circular sweep on nave floor
    for (let i = 0; i < this.frontTrussSpots.length; i++) {
      const spot = this.frontTrussSpots[i];
      const colorIdx = Math.floor((i + time * 0.5) % brandColors.length);
      spot.color.copy(brandColors[colorIdx]);
      spot.intensity = 1.2 + energy * 1.5 + (isBeat ? 1.5 : 0);

      const angle = rotSpeed + (i / 8) * Math.PI * 2;
      spot.target.position.set(
        Math.cos(angle) * 7,
        0,
        Math.sin(angle) * 18
      );
    }

    // Side truss: alternating violet/cyan/magenta cross-beams
    const sideColors = [COL.violet, COL.cyan, COL.magenta, COL.iceBlue];
    for (let i = 0; i < this.sideTrussSpots.length; i++) {
      const spot = this.sideTrussSpots[i];
      const isLeft = i < 4;
      const phase = rotSpeed * 0.8 + i * 1.1;
      spot.color.copy(sideColors[i % sideColors.length]);
      spot.intensity = 0.8 + energy * 1.5;
      spot.target.position.set(
        (isLeft ? 1 : -1) * (2 + Math.sin(phase) * 5),
        0,
        5 + Math.cos(phase * 0.5) * 16
      );
    }

    // PAR washes: gold-violet-cyan cycle
    for (let i = 0; i < this.parWashes.length; i++) {
      const t = Math.sin(time * 1.5 + i * 0.8) * 0.5 + 0.5;
      const parColors = [COL.violet, COL.gold, COL.cyan, COL.magenta];
      const idx = Math.floor((time * 0.3 + i * 0.5) % parColors.length);
      lerpColor(this.parWashes[i].color, parColors[idx], parColors[(idx + 1) % parColors.length], t);
      this.parWashes[i].intensity = 0.6 + energy * 0.8;
    }

    // Laser spots: cyan/violet beams to ceiling, pulsing with energy
    for (let i = 0; i < this.laserSpots.length; i++) {
      const laser = this.laserSpots[i];
      laser.color.copy(i % 2 === 0 ? COL.cyan : COL.violet);
      laser.intensity = 0.8 + energy * 2.0;
      laser.target.position.set(
        laser.position.x + Math.sin(time * 2 + i * 1.5) * 2,
        28,
        laser.position.z + Math.cos(time * 1.5 + i) * 3
      );
    }

    // Strobes: gold flash on beat only
    for (const strobe of this.strobes) {
      strobe.color.copy(COL.gold);
      strobe.intensity = isBeat ? 5.0 : 0;
    }
  }

  // =========================================================================
  //  PROGRAM 4 — LIGHTNING STRIKE (building)
  //  Dark during build, all lights snap on at high energy peaks,
  //  white flash then scatter.
  // =========================================================================

  _program4_LightningStrike(time, delta, bandValues, energy, isBeat) {
    const baseLevel = energy * 0.15;

    // Front truss: near-dark, flash to white — scatter beams across nave floor
    for (let i = 0; i < this.frontTrussSpots.length; i++) {
      const spot = this.frontTrussSpots[i];
      if (isBeat) {
        spot.color.copy(COL.white);
        spot.intensity = 6.0;
        spot.target.position.set(
          (Math.random() - 0.5) * 16,
          0,
          -20 + Math.random() * 45
        );
      } else {
        spot.intensity = baseLevel;
        lerpColor(spot.color, COL.black, COL.iceBlue, energy);
      }
    }

    // Side truss: dark charge glow, scatter on beat
    for (let i = 0; i < this.sideTrussSpots.length; i++) {
      const spot = this.sideTrussSpots[i];
      spot.intensity = isBeat ? 4.0 : baseLevel * 0.5;
      spot.color.copy(isBeat ? COL.white : COL.indigo);
      if (isBeat) {
        spot.target.position.set(
          (Math.random() - 0.5) * 12,
          0,
          -15 + Math.random() * 40
        );
      }
    }

    // PAR washes: faint indigo charge, flash to cyan on beat
    for (const par of this.parWashes) {
      par.color.copy(isBeat ? COL.cyan : COL.indigo);
      par.intensity = isBeat ? 3.0 : baseLevel * 0.3;
    }

    // Laser spots: dramatic white shafts to ceiling on beat
    for (let i = 0; i < this.laserSpots.length; i++) {
      const laser = this.laserSpots[i];
      laser.color.copy(COL.white);
      laser.intensity = isBeat ? 5.0 : 0;
      laser.target.position.set(laser.position.x, 28, laser.position.z);
    }

    // Strobes: major flash on beat
    for (const strobe of this.strobes) {
      strobe.color.copy(COL.white);
      strobe.intensity = isBeat ? 10.0 : 0;
    }
  }

  // =========================================================================
  //  PROGRAM 5 — CATHEDRAL BREATHE (warm_ambient)
  //  Warm amber/gold, very gentle breathing intensity, candle-like warmth.
  // =========================================================================

  _program5_CathedralBreathe(time, delta, bandValues, energy, isBeat) {
    const breath = Math.sin(time * 1.6) * 0.5 + 0.5;

    // Front truss: warm amber figure-8 sweeps across nave floor
    for (let i = 0; i < this.frontTrussSpots.length; i++) {
      const spot = this.frontTrussSpots[i];
      const phase = time * 0.4 + i * 0.9;
      const personalBreath = Math.sin(time * 1.6 + i * 0.5) * 0.5 + 0.5;
      lerpColor(spot.color, COL.amber, COL.gold, personalBreath);
      spot.intensity = 0.6 + personalBreath * 0.8 + energy * 0.5;
      spot.target.position.set(
        Math.sin(phase) * 7,
        0,
        Math.sin(phase * 0.5) * 18
      );
    }

    // Side truss: warm cross-beams sweeping nave center
    const warmSideColors = [COL.amber, COL.orange, COL.gold, COL.yellow];
    for (let i = 0; i < this.sideTrussSpots.length; i++) {
      const spot = this.sideTrussSpots[i];
      const isLeft = i < 4;
      const phase = time * 0.3 + i * 1.2;
      lerpColor(spot.color, warmSideColors[i % warmSideColors.length], COL.amber, Math.sin(phase) * 0.5 + 0.5);
      spot.intensity = 0.4 + breath * 0.5;
      spot.target.position.set(
        (isLeft ? 1 : -1) * (1 + Math.sin(phase) * 4),
        0,
        5 + Math.cos(phase * 0.5) * 16
      );
    }

    // PAR washes: candle warmth with individual flicker
    for (let i = 0; i < this.parWashes.length; i++) {
      const flicker = (Math.sin(time * 7.3 + i * 3.7) * 0.3 +
                       Math.sin(time * 11.1 + i * 2.1) * 0.2) * 0.5 + 0.5;
      lerpColor(this.parWashes[i].color, COL.amber, COL.warmWhite, flicker);
      this.parWashes[i].intensity = 0.4 + flicker * 0.6 + energy * 0.3;
    }

    // Laser spots: warm gold aimed at ceiling, breathing
    for (let i = 0; i < this.laserSpots.length; i++) {
      const laser = this.laserSpots[i];
      laser.color.copy(COL.gold);
      laser.intensity = 0.3 + breath * 0.4;
      laser.target.position.set(laser.position.x, 28, laser.position.z);
    }

    // Strobes: off
    for (const strobe of this.strobes) {
      strobe.intensity = 0;
    }
  }

  // =========================================================================
  //  PROGRAM 6 — HELLFIRE (chaos)
  //  Orange/red/magenta rapid cycling, random spot positions every beat,
  //  maximum intensity, all strobes.
  // =========================================================================

  _program6_Hellfire(time, delta, bandValues, energy, isBeat) {
    const hellColors = [COL.red, COL.orange, COL.yellow, COL.magenta, COL.crimson];
    const rapidCycle = time * 25;

    // Front truss: chaotic scatter across nave floor, on-beat snap to random positions
    for (let i = 0; i < this.frontTrussSpots.length; i++) {
      const spot = this.frontTrussSpots[i];
      const cIdx = Math.floor((rapidCycle + i * 1.7) % hellColors.length);
      spot.color.copy(hellColors[cIdx]);
      spot.intensity = 4.0 + energy * 3.0;

      if (isBeat) {
        spot.target.position.set(
          (Math.random() - 0.5) * 16,
          0,
          -20 + Math.random() * 45
        );
      } else {
        spot.target.position.x += Math.sin(time * 30 + i) * 0.5;
        spot.target.position.z += Math.cos(time * 25 + i * 2) * 0.3;
      }
    }

    // Side truss: magenta/orange/yellow rapid swap, scatter across floor
    const sideChaos = [COL.magenta, COL.orange, COL.yellow, COL.crimson];
    for (let i = 0; i < this.sideTrussSpots.length; i++) {
      const spot = this.sideTrussSpots[i];
      const cIdx = Math.floor((rapidCycle * 0.5 + i * 3.1) % sideChaos.length);
      spot.color.copy(sideChaos[cIdx]);
      spot.intensity = 3.0 + energy * 2.0;
      if (isBeat) {
        spot.target.position.set(
          (Math.random() - 0.5) * 14,
          0,
          -15 + Math.random() * 40
        );
      }
    }

    // PAR washes: maximum intensity, color cycling
    for (let i = 0; i < this.parWashes.length; i++) {
      const cIdx = Math.floor((rapidCycle * 0.7 + i * 2.3) % hellColors.length);
      this.parWashes[i].color.copy(hellColors[cIdx]);
      this.parWashes[i].intensity = 3.0 + energy * 2.0;
    }

    // Laser spots: max output, red/orange/yellow shafts to ceiling
    const laserChaos = [COL.red, COL.orange, COL.yellow, COL.magenta];
    for (let i = 0; i < this.laserSpots.length; i++) {
      const laser = this.laserSpots[i];
      laser.color.copy(laserChaos[i % laserChaos.length]);
      laser.intensity = 4.0;
      laser.target.position.set(
        laser.position.x + Math.sin(time * 5 + i * 2) * 3,
        28,
        laser.position.z + Math.cos(time * 4 + i * 3) * 3
      );
    }

    // Strobes: constant rapid flash
    for (let i = 0; i < this.strobes.length; i++) {
      this.strobes[i].color.copy(COL.white);
      this.strobes[i].intensity = Math.sin(time * 60 + i * 11) > 0.3 ? 8.0 : 0;
    }
  }

  // =========================================================================
  //  PROGRAM 7 — SILHOUETTE (dark minimal, internal use for low energy)
  //  Strong single backlight on DJ, everything else nearly black.
  // =========================================================================

  _program7_Silhouette(time, delta, bandValues, energy, isBeat) {
    // Almost everything off
    for (const spot of this.frontTrussSpots) spot.intensity = 0;
    for (const spot of this.sideTrussSpots) spot.intensity = 0;
    for (const par of this.parWashes) par.intensity = 0;
    for (const strobe of this.strobes) strobe.intensity = 0;

    // One strong backlight aimed at DJ (use middle or last available spot)
    const backlightIdx = Math.min(4, this.frontTrussSpots.length - 1);
    if (backlightIdx >= 0) {
      const backlight = this.frontTrussSpots[backlightIdx];
      backlight.color.copy(COL.white);
      backlight.intensity = 2.5;
      backlight.target.position.set(0, 0, 24);
    }

    // Faint purple rim from one side truss aimed at DJ
    if (this.sideTrussSpots.length > 0) {
      this.sideTrussSpots[0].color.copy(COL.purple);
      this.sideTrussSpots[0].intensity = 0.3;
      this.sideTrussSpots[0].target.position.set(0, 0, 24);
    }

    // One faint laser for drama
    if (this.laserSpots.length > 0) {
      this.laserSpots[0].color.copy(COL.purple);
      this.laserSpots[0].intensity = 0.5 + Math.sin(time * 2) * 0.2;
      this.laserSpots[0].target.position.set(this.laserSpots[0].position.x, 28, this.laserSpots[0].position.z);
      for (let i = 1; i < this.laserSpots.length; i++) this.laserSpots[i].intensity = 0;
    }
  }

  // =========================================================================
  //  PROGRAM 8 — BASS TSUNAMI (bass_heavy)
  //  Deep blue/teal/green, synchronized wave motion across fixtures,
  //  intensity pumps with bass.
  // =========================================================================

  _program8_BassTsunami(time, delta, bandValues, energy, isBeat) {
    const bass = (bandValues.subBass || 0) + (bandValues.bass || 0);
    const bassNorm = Math.min(bass / 1.5, 1.0);
    const waveSpeed = time * 2.5;

    // Front truss: wave motion — beams sweep across nave floor in sequence
    for (let i = 0; i < this.frontTrussSpots.length; i++) {
      const spot = this.frontTrussSpots[i];
      const wave = Math.sin(waveSpeed - i * 0.6) * 0.5 + 0.5;
      lerpColor(spot.color, COL.blue, COL.teal, wave);
      spot.intensity = 0.5 + bassNorm * 3.0 * wave;
      spot.target.position.set(
        Math.sin(waveSpeed - i * 0.6) * 8,
        0,
        Math.cos(waveSpeed * 0.4 - i * 0.8) * 20
      );
    }

    // Side truss: indigo/green wave, cross-beams on floor
    for (let i = 0; i < this.sideTrussSpots.length; i++) {
      const spot = this.sideTrussSpots[i];
      const isLeft = i < 4;
      const wave = Math.sin(waveSpeed - i * 0.8 + Math.PI) * 0.5 + 0.5;
      lerpColor(spot.color, COL.indigo, COL.green, wave);
      spot.intensity = 0.5 + bassNorm * 2.5;
      spot.target.position.set(
        (isLeft ? 1 : -1) * (1 + Math.sin(waveSpeed * 0.7 + i * 1.3) * 5),
        0,
        5 + Math.cos(waveSpeed * 0.4 - i * 0.6) * 16
      );
    }

    // PAR washes: teal-green-cyan wave propagation
    for (let i = 0; i < this.parWashes.length; i++) {
      const wave = Math.sin(waveSpeed - i * 0.7) * 0.5 + 0.5;
      lerpColor(this.parWashes[i].color, COL.teal, COL.lime, wave);
      this.parWashes[i].intensity = 0.3 + bassNorm * 2.5 * wave;
    }

    // Laser spots: indigo/blue shafts to ceiling, pulse with sub-bass
    for (let i = 0; i < this.laserSpots.length; i++) {
      const laser = this.laserSpots[i];
      laser.color.copy(i % 2 === 0 ? COL.blue : COL.indigo);
      laser.intensity = 0.5 + (bandValues.subBass || 0) * 4.0;
      laser.target.position.set(
        laser.position.x + Math.sin(time + i) * 1.5,
        28,
        laser.position.z + Math.cos(time * 0.8 + i) * 2
      );
    }

    // Strobes: subtle blue flash on heavy beats
    for (const strobe of this.strobes) {
      strobe.color.copy(COL.cyan);
      strobe.intensity = isBeat && bassNorm > 0.6 ? 4.0 : 0;
    }
  }

  // =========================================================================
  //  PROGRAM 9 — PRISM SCATTER (euphoric)
  //  Full rainbow cycling, each fixture different color rotating, celebratory.
  // =========================================================================

  _program9_PrismScatter(time, delta, bandValues, energy, isBeat) {
    const rotSpeed = time * 0.4;

    // Front truss: each spot a different hue, circular sweep on nave floor
    for (let i = 0; i < this.frontTrussSpots.length; i++) {
      const spot = this.frontTrussSpots[i];
      const hue = (rotSpeed + i / this.frontTrussSpots.length) % 1.0;
      hueToColor(spot.color, hue);
      spot.intensity = 1.5 + energy * 2.0 + (isBeat ? 1.5 : 0);

      const radius = 5 + (isBeat ? 3 : 0);
      const angle = time * 2 + (i / 8) * Math.PI * 2;
      spot.target.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * 18
      );
    }

    // Side truss: rainbow cascade, cross-beams on floor
    for (let i = 0; i < this.sideTrussSpots.length; i++) {
      const spot = this.sideTrussSpots[i];
      const isLeft = i < 4;
      const hue = (rotSpeed + 0.5 + i / this.sideTrussSpots.length) % 1.0;
      hueToColor(spot.color, hue);
      spot.intensity = 1.0 + energy * 1.5;
      spot.target.position.set(
        (isLeft ? 1 : -1) * (2 + Math.sin(time * 1.5 + i) * 5),
        0,
        5 + Math.cos(time * 0.8 + i * 1.3) * 15
      );
    }

    // PAR washes: each a unique color, cycling
    for (let i = 0; i < this.parWashes.length; i++) {
      const hue = (rotSpeed * 1.3 + i / this.parWashes.length) % 1.0;
      hueToColor(this.parWashes[i].color, hue);
      this.parWashes[i].intensity = 0.8 + energy * 1.2;
    }

    // Laser spots: vivid rainbow shafts to ceiling
    for (let i = 0; i < this.laserSpots.length; i++) {
      const laser = this.laserSpots[i];
      const hue = (rotSpeed * 2 + i * 0.25) % 1.0;
      hueToColor(laser.color, hue);
      laser.intensity = 2.0 + energy * 2.0;
      laser.target.position.set(
        laser.position.x + Math.sin(time * 3 + i * 1.5) * 2,
        28,
        laser.position.z + Math.cos(time * 2.5 + i) * 3
      );
    }

    // Strobes: white flash on beats
    for (const strobe of this.strobes) {
      strobe.color.copy(COL.white);
      strobe.intensity = isBeat ? 5.0 : 0;
    }
  }

  // =========================================================================
  //  PROGRAM 10 — BLACKOUT PULSE (silence)
  //  All lights off. Single white flash on beats if any. Mostly darkness.
  // =========================================================================

  _program10_BlackoutPulse(time, delta, bandValues, energy, isBeat) {
    // Everything off
    for (const spot of this.frontTrussSpots) spot.intensity = 0;
    for (const spot of this.sideTrussSpots) spot.intensity = 0;
    for (const par of this.parWashes) par.intensity = 0;
    for (const laser of this.laserSpots) laser.intensity = 0;
    for (const strobe of this.strobes) strobe.intensity = 0;

    // On beat: flash center spot down the nave and strobes
    if (isBeat) {
      const centerIdx = Math.min(4, this.frontTrussSpots.length - 1);
      if (centerIdx >= 0) {
        const center = this.frontTrussSpots[centerIdx];
        center.color.copy(COL.white);
        center.intensity = 4.0;
        center.target.position.set(0, 0, 0);
      }

      for (let si = 0; si < Math.min(2, this.strobes.length); si++) {
        const sIdx = Math.min(si + 2, this.strobes.length - 1);
        if (sIdx >= 0) {
          this.strobes[sIdx].color.copy(COL.white);
          this.strobes[sIdx].intensity = 6.0;
        }
      }
    }
  }

  // =========================================================================
  //  PROGRAM 11 — GOTHIC MASS (ritualistic)
  //  Gold/purple/red churchlike, slow circular sweep patterns, incense mood.
  // =========================================================================

  _program11_GothicMass(time, delta, bandValues, energy, isBeat) {
    const slowCircle = time * 0.5;
    const incenseBreath = Math.sin(time * 0.7) * 0.5 + 0.5;
    const churchColors = [COL.gold, COL.violet, COL.crimson, COL.indigo, COL.amber];

    // Front truss: slow majestic circular sweep on nave floor
    for (let i = 0; i < this.frontTrussSpots.length; i++) {
      const spot = this.frontTrussSpots[i];
      const cIdx = Math.floor((i + time * 0.2) % churchColors.length);
      spot.color.copy(churchColors[cIdx]);
      spot.intensity = 0.8 + incenseBreath * 0.8 + energy * 0.5;

      const angle = slowCircle + (i / 8) * Math.PI * 2;
      const radius = 6 + Math.sin(time * 0.3) * 2;
      spot.target.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * 18
      );
    }

    // Side truss: violet/gold/indigo alternating cross-beams
    const gothicSideColors = [COL.violet, COL.gold, COL.indigo, COL.amber];
    for (let i = 0; i < this.sideTrussSpots.length; i++) {
      const spot = this.sideTrussSpots[i];
      const isLeft = i < 4;
      const phase = slowCircle + i * 0.8;
      spot.color.copy(gothicSideColors[i % gothicSideColors.length]);
      spot.intensity = 0.6 + incenseBreath * 0.6;
      spot.target.position.set(
        (isLeft ? 1 : -1) * (2 + Math.sin(phase) * 4),
        0,
        5 + Math.cos(phase * 0.3) * 16
      );
    }

    // PAR washes: deep warm gold, breathing
    for (let i = 0; i < this.parWashes.length; i++) {
      const t = Math.sin(time * 0.6 + i * 0.9) * 0.5 + 0.5;
      lerpColor(this.parWashes[i].color, COL.gold, COL.amber, t);
      this.parWashes[i].intensity = 0.3 + incenseBreath * 0.5;
    }

    // Laser spots: violet/indigo shafts to ceiling
    for (let i = 0; i < this.laserSpots.length; i++) {
      const laser = this.laserSpots[i];
      laser.color.copy(i % 2 === 0 ? COL.violet : COL.indigo);
      laser.intensity = 0.6 + incenseBreath * 0.4;
      laser.target.position.set(
        laser.position.x + Math.sin(time * 0.3 + i) * 1,
        28,
        laser.position.z + Math.cos(time * 0.2 + i) * 1.5
      );
    }

    // Strobes: faint gold on beat (like a distant bell flash)
    for (const strobe of this.strobes) {
      strobe.color.copy(COL.gold);
      strobe.intensity = isBeat ? 2.0 : 0;
    }
  }

  // =========================================================================
  //  PROGRAM 12 — STATIC OVERLOAD (glitch)
  //  White/cyan flickering, rapid micro-movements, random blackout frames,
  //  TV static feel.
  // =========================================================================

  _program12_StaticOverload(time, delta, bandValues, energy, isBeat) {
    const glitchRand = (seed) => {
      const x = Math.sin(seed * 12.9898 + time * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    // Random blackout frames (~15% of the time)
    if (glitchRand(1) < 0.15) {
      for (const f of this.allFixtures) f.intensity = 0;
      return;
    }

    // Front truss: white/cyan/violet flickering scatter on nave floor
    const glitchColors = [COL.white, COL.cyan, COL.violet, COL.iceBlue, COL.magenta];
    for (let i = 0; i < this.frontTrussSpots.length; i++) {
      const spot = this.frontTrussSpots[i];
      const flicker = glitchRand(i * 7.1);
      const gIdx = Math.floor(glitchRand(i * 4.4) * glitchColors.length);
      spot.color.copy(glitchColors[gIdx]);
      spot.intensity = flicker > 0.3 ? (1.0 + energy * 3.0) * flicker : 0;
      spot.target.position.set(
        (glitchRand(i * 3.3) - 0.5) * 14,
        0,
        -20 + glitchRand(i * 5.7) * 45
      );
    }

    // Side truss: rapid on/off flicker across floor
    for (let i = 0; i < this.sideTrussSpots.length; i++) {
      const spot = this.sideTrussSpots[i];
      const on = glitchRand(i * 13.7) > 0.4;
      spot.color.copy(on ? COL.white : COL.cyan);
      spot.intensity = on ? 2.0 + energy * 2.0 : 0;
      if (on) {
        spot.target.position.set(
          (glitchRand(i * 2.2) - 0.5) * 12,
          0,
          -15 + glitchRand(i * 6.6) * 40
        );
      }
    }

    // PAR washes: static burst
    for (let i = 0; i < this.parWashes.length; i++) {
      const v = glitchRand(i * 17.3);
      this.parWashes[i].color.copy(v > 0.5 ? COL.white : COL.cyan);
      this.parWashes[i].intensity = v * 2.5;
    }

    // Laser spots: random on/off white shafts to ceiling
    for (let i = 0; i < this.laserSpots.length; i++) {
      const laser = this.laserSpots[i];
      laser.color.copy(COL.white);
      laser.intensity = glitchRand(i * 23.1) > 0.5 ? 3.0 : 0;
      laser.target.position.set(laser.position.x, 28, laser.position.z);
    }

    // Strobes: rapid fire static pattern
    for (let i = 0; i < this.strobes.length; i++) {
      this.strobes[i].color.copy(COL.white);
      this.strobes[i].intensity = glitchRand(i * 31.7) > 0.4 ? 6.0 : 0;
    }
  }

  // =========================================================================
  //  DISPOSAL
  // =========================================================================

  /**
   * Remove all fixture lights from the scene and clean up.
   */
  dispose() {
    for (const spot of this.allSpots) {
      this.scene.remove(spot.target);
      this.scene.remove(spot);
      spot.dispose();
    }
    for (const point of this.allPoints) {
      this.scene.remove(point);
      point.dispose();
    }
    this.allFixtures.length = 0;
    this.allSpots.length = 0;
    this.allPoints.length = 0;
    this.frontTrussSpots.length = 0;
    this.sideTrussSpots.length = 0;
    this.parWashes.length = 0;
    this.laserSpots.length = 0;
    this.strobes.length = 0;
  }
}
