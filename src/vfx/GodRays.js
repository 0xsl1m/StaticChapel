/**
 * GodRays - Volumetric light shafts through stained glass windows
 * Phase 5: VFX / Polish
 *
 * 16 light shafts (8 per side), one per window. Each shaft is an open-sided
 * volume built in world space — the gothic window outline at the wall connects
 * to a wider projection on the floor via side-face quads only (no caps).
 *
 * Sun cycle: The sun slowly moves across the sky over ~5 minutes. Only one
 * side of the cathedral is lit at a time — left wall windows when the sun is
 * on the right (east), right wall windows when the sun is on the left (west).
 * Brief dimming during overhead transit.
 */
import * as THREE from 'three';

const WINDOW_COLORS = [
  0x8B00FF, 0x4169E1, 0x00FFFF, 0xFF2200,
  0xFFD700, 0x00FF41, 0xFF00FF, 0x6600CC
];

export class GodRays {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'godRays';
    this.scene.add(this.group);
    this.shafts = [];
    this._build();
  }

  /**
   * Create a light shaft volume in world coords. No rotations needed.
   *
   * The window outline (5 verts) is on the inner wall face.
   * The floor outline (5 verts) is projected inward and down to the floor.
   * Only the side faces connecting the two outlines are created (no caps)
   * so the shaft looks like a translucent volume, not a solid object.
   */
  _createShaftGeo(wallX, windowY, windowZ, side) {
    // Window: 2m wide (along Z), 8m tall (along Y), rounded arch at top
    const wW = 2;
    const wH = 8;
    const rectH = wH * 0.7; // rectangular portion
    const halfZ = wW / 2;

    // Window vertical extents
    const botY = windowY - wH / 2;   // 14
    const rectTopY = botY + rectH;    // 19.6
    const peakY = botY + wH;          // 22

    // Inward direction: left wall (side=-1, wallX<0) -> light goes +X
    const inward = -side;

    // Build rounded arch: semicircular arc from top-right through peak to top-left
    // Arc center is at (rectTopY, windowZ), radius reaches up to peakY
    const arcRadius = peakY - rectTopY; // vertical radius of the arch
    const arcSegments = 8; // number of arc segments for smooth curve
    const archPoints = [];
    for (let a = 1; a < arcSegments; a++) {
      // Sweep from just past 0 (right side) to just before PI (left side)
      // Endpoints excluded — they match top-right and top-left corners
      const angle = (a / arcSegments) * Math.PI;
      const az = windowZ + halfZ * Math.cos(angle);  // Z along window width
      const ay = rectTopY + arcRadius * Math.sin(angle); // Y arches up
      archPoints.push([wallX, ay, az]);
    }

    // Window outline — bottom rect + rounded arch top
    const win = [
      [wallX, botY,     windowZ - halfZ], // bottom-left
      [wallX, botY,     windowZ + halfZ], // bottom-right
      [wallX, rectTopY, windowZ + halfZ], // top-right (arch start)
      ...archPoints,                       // rounded arch (interior points)
      [wallX, rectTopY, windowZ - halfZ], // top-left (arch end)
    ];

    // Floor projection — each window point casts a ray downward and inward.
    // Think of sunlight at ~30-40 degree angle from horizontal.
    // The ray from each window point travels:
    //   inward by the window-point's height above floor (so higher = further inward)
    //   down to y=0.5 (just above floor)
    //
    // This makes the arch peak project furthest inward and the bottom edge
    // project least, creating a realistic angled shaft.
    const floorLevel = 0.02; // at floor level so rays visually touch ground in VR
    const spread = 1.6; // Z-axis spread factor at floor

    const flr = win.map(([wx, wy, wz]) => {
      const drop = wy - floorLevel; // how far this point falls
      // Inward distance proportional to drop height (steeper angle for a natural look)
      // Using ~0.7 ratio: for every 1m of drop, light travels 0.7m inward
      const inwardDist = drop * 0.7;
      const fx = wallX + inward * inwardDist;
      const fz = windowZ + (wz - windowZ) * spread;
      return [fx, floorLevel, fz];
    });

    // Build only the side-face quads (no caps) — this is what makes it volumetric
    const verts = [];
    const n = win.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [w1x, w1y, w1z] = win[i];
      const [w2x, w2y, w2z] = win[j];
      const [f1x, f1y, f1z] = flr[i];
      const [f2x, f2y, f2z] = flr[j];

      // Two triangles per quad. DoubleSide handles winding.
      verts.push(w1x, w1y, w1z, f1x, f1y, f1z, w2x, w2y, w2z);
      verts.push(w2x, w2y, w2z, f1x, f1y, f1z, f2x, f2y, f2z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
  }

  _build() {
    const naveLength = 60;
    const windowSpacing = naveLength / 9;
    const windowY = 18;
    const innerWallX = 15.6;

    for (let i = 0; i < 8; i++) {
      const z = -naveLength / 2 + windowSpacing * (i + 1);
      const color = WINDOW_COLORS[i];
      const baseOpacity = 0.08 + Math.random() * 0.06;

      for (const side of [-1, 1]) {
        const wallX = side * innerWallX;
        const geo = this._createShaftGeo(wallX, windowY, z, side);

        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: baseOpacity,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        });

        const mesh = new THREE.Mesh(geo, mat);
        this.group.add(mesh);

        this.shafts.push({
          mesh,
          baseOpacity,
          side, // -1 = left wall, +1 = right wall
          windowIndex: i, // 0-7, back to front
          phaseOffset: Math.random() * Math.PI * 2
        });
      }
    }
  }

  /**
   * @param {number} time - elapsed seconds
   * @param {number} energy - audio energy 0-1
   * @returns {number} sunSide — current sun side for cathedral window lights to use
   *   -1 = sun on right (light enters left windows), +1 = sun on left (light enters right windows)
   */
  update(time, energy = 0) {
    // Sun arc: sweeps across the cathedral over ~4 minutes (240s)
    // sunAngle goes 0 → 2PI continuously
    const sunAngle = (time * Math.PI * 2 / 240) % (Math.PI * 2);

    // Side: sin determines which wall gets light
    // sin < 0 → sun on right → left windows lit (side=-1)
    // sin > 0 → sun on left → right windows lit (side=+1)
    const sideFactor = Math.sin(sunAngle);
    this.sunSide = sideFactor < 0 ? -1 : 1;
    const sideStrength = Math.min(1.0, Math.abs(sideFactor) * 2.5);

    // Sun Z-position: cosine sweeps the sunbeam along the nave (back to front)
    // This determines WHICH windows along the wall are in direct sunlight
    // Normalized 0-1 range across the 8 window positions
    const sunZ = Math.cos(sunAngle) * 0.5 + 0.5; // 0 = back wall, 1 = front

    for (let i = 0; i < this.shafts.length; i++) {
      const s = this.shafts[i];

      // Slow breathing variation per shaft
      const breath = 0.7 + 0.3 * Math.sin(time * 0.3 + s.phaseOffset);

      // Audio dims the rays when music is loud
      const audioDim = 1.0 - energy * 0.7;

      // Side factor: lit side gets light, opposite side goes dark
      let sideMult;
      if (s.side === this.sunSide) {
        sideMult = sideStrength;
      } else {
        sideMult = (1.0 - sideStrength) * 0.05; // nearly off on shadow side
      }

      // Window position factor: only 2-3 windows near the sun's Z-position get light
      // s.windowIndex is 0-7 (back to front), normalized to 0-1
      const windowPos = s.windowIndex / 7;
      const distFromSun = Math.abs(windowPos - sunZ);
      // Tight falloff: bright within ±0.15 (~1-2 windows), dark beyond
      const spotFactor = Math.exp(-distFromSun * distFromSun * 40.0);

      const targetOpacity = s.baseOpacity * breath * audioDim * sideMult * spotFactor;
      s.mesh.material.opacity = Math.min(0.22, Math.max(0.0, targetOpacity));
    }

    return this.sunSide;
  }
}
