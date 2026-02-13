/**
 * Cathedral - Gothic cathedral interior geometry builder
 * Phase 2: Enhanced architecture with detailed columns, ribbed vault,
 *          stained glass with tracery, floor detail, pointed arches
 */
import * as THREE from 'three';

export class Cathedral {
  constructor(scene, textures = {}, qualityConfig = {}) {
    this.scene = scene;
    this.textures = textures;
    this.Q = qualityConfig;
    this.group = new THREE.Group();
    this.group.name = 'cathedral';
    this.scene.add(this.group);

    // Cathedral dimensions (meters)
    this.naveLength = 60;
    this.naveWidth = 20;
    this.naveHeight = 30;
    this.aisleWidth = 6;
    this.columnCount = 12; // per side
    this.totalWidth = this.naveWidth + this.aisleWidth * 2;

    // Stained glass window references for animation
    this.windows = [];
    this.roseWindow = null;
  }

  build() {
    this.createFloor();
    this.createWalls();
    this.createColumns();
    this.createPointedArches();
    this.createCeiling();
    this.createSideAisles();
    this.createAltarPlatform();
    this.createBasicLighting();
    if (this.Q.gargoyles !== false) this.createGargoyles();
    if (this.Q.wallSconces !== false) this.createWallSconces();
  }

  createFloor() {
    // Main floor - dark marble with subtle reflections
    const _floorSegs = this.Q.floorSegments || [32, 64];
    const floorGeo = new THREE.PlaneGeometry(this.totalWidth, this.naveLength, _floorSegs[0], _floorSegs[1]);
    const floorMatOpts = {
      color: 0xc8bfb4,
      roughness: 0.18,
      metalness: 0.15,
    };
    if (this.textures.floor) {
      const ft = this.textures.floor;
      floorMatOpts.map = ft.map;
      ft.map.repeat.set(4, 7.5);
      if (ft.normalMap) {
        floorMatOpts.normalMap = ft.normalMap;
        ft.normalMap.repeat.set(4, 7.5);
        floorMatOpts.normalScale = new THREE.Vector2(0.6, 0.6);
      }
      if (ft.roughnessMap) {
        floorMatOpts.roughnessMap = ft.roughnessMap;
        ft.roughnessMap.repeat.set(4, 7.5);
      }
    }
    const floorMat = new THREE.MeshStandardMaterial(floorMatOpts);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // === SACRED GEOMETRY FLOOR PATTERN ===
    if (this.Q.sacredGeometry !== false) {
    const goldMat = new THREE.MeshBasicMaterial({
      color: 0xFFD700, transparent: true, opacity: 0.3,
      side: THREE.DoubleSide, depthWrite: false
    });
    const goldBrightMat = new THREE.MeshBasicMaterial({
      color: 0xFFD700, transparent: true, opacity: 0.5,
      side: THREE.DoubleSide, depthWrite: false
    });
    const goldSubtleMat = new THREE.MeshBasicMaterial({
      color: 0xFFD700, transparent: true, opacity: 0.15,
      side: THREE.DoubleSide, depthWrite: false
    });

    // Center axis line
    this.group.add(this._floorPlane(0.04, this.naveLength, goldMat, 0, 0));

    // Cross lines at column spacing
    const spacing = this.naveLength / (this.columnCount + 1);
    for (let i = 1; i <= this.columnCount; i++) {
      const z = -this.naveLength / 2 + spacing * i;
      this.group.add(this._floorPlane(this.naveWidth, 0.025, goldSubtleMat, 0, z));
    }

    // ======== CENTRAL FLOWER OF LIFE (dancefloor) ========
    // 7-circle Seed of Life at z=4 (center of dancefloor)
    const floorCenterZ = 4;
    const seedR = 2.0; // radius of each circle in the pattern
    const seedPositions = [[0, 0]]; // center
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      seedPositions.push([Math.cos(angle) * seedR, Math.sin(angle) * seedR]);
    }

    // Draw each circle of the Seed of Life
    seedPositions.forEach(([sx, sz]) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(seedR - 0.025, seedR + 0.025, 48),
        goldBrightMat
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(sx, 0.012, floorCenterZ + sz);
      this.group.add(ring);
    });

    // Outer bounding circle
    const outerR = seedR * 2 + 0.5;
    const outerCircle = new THREE.Mesh(
      new THREE.RingGeometry(outerR - 0.03, outerR + 0.03, 64),
      goldMat
    );
    outerCircle.rotation.x = -Math.PI / 2;
    outerCircle.position.set(0, 0.012, floorCenterZ);
    this.group.add(outerCircle);

    // Second outer circle (double border)
    const outer2 = new THREE.Mesh(
      new THREE.RingGeometry(outerR + 0.15, outerR + 0.2, 64),
      goldSubtleMat
    );
    outer2.rotation.x = -Math.PI / 2;
    outer2.position.set(0, 0.012, floorCenterZ);
    this.group.add(outer2);

    // Metatron's Cube — connect all Seed of Life centers
    for (let i = 0; i < seedPositions.length; i++) {
      for (let j = i + 1; j < seedPositions.length; j++) {
        const [ax, az] = seedPositions[i];
        const [bx, bz] = seedPositions[j];
        const dx = bx - ax, dz = bz - az;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);
        const line = new THREE.Mesh(
          new THREE.PlaneGeometry(0.02, len), goldMat
        );
        line.rotation.x = -Math.PI / 2;
        line.rotation.z = -angle;
        line.position.set((ax + bx) / 2, 0.013, floorCenterZ + (az + bz) / 2);
        this.group.add(line);
      }
    }

    // Central hexagram (Star of David) in the Seed of Life
    [0, Math.PI].forEach(baseAngle => {
      const triPts = [];
      for (let i = 0; i < 3; i++) {
        const a = baseAngle + (i / 3) * Math.PI * 2 - Math.PI / 2;
        triPts.push([Math.cos(a) * seedR * 0.85, Math.sin(a) * seedR * 0.85]);
      }
      for (let i = 0; i < 3; i++) {
        const p1 = triPts[i], p2 = triPts[(i + 1) % 3];
        const dx = p2[0] - p1[0], dz = p2[1] - p1[1];
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.03, len), goldBrightMat);
        seg.rotation.x = -Math.PI / 2;
        seg.rotation.z = -angle;
        seg.position.set((p1[0] + p2[0]) / 2, 0.014, floorCenterZ + (p1[1] + p2[1]) / 2);
        this.group.add(seg);
      }
    });

    // ======== VESICA PISCIS at bar approach (z = -16) ========
    const vpZ = -16;
    const vpR = 1.8;
    const vpSpread = 1.2;
    [-vpSpread / 2, vpSpread / 2].forEach(ox => {
      const vpRing = new THREE.Mesh(
        new THREE.RingGeometry(vpR - 0.02, vpR + 0.02, 40), goldMat
      );
      vpRing.rotation.x = -Math.PI / 2;
      vpRing.position.set(ox, 0.012, vpZ);
      this.group.add(vpRing);
    });

    // ======== SMALLER SEED OF LIFE near stage (z = 16) ========
    const stage2Z = 16;
    const smallR = 1.2;
    const smallPositions = [[0, 0]];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      smallPositions.push([Math.cos(angle) * smallR, Math.sin(angle) * smallR]);
    }
    smallPositions.forEach(([sx, sz]) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(smallR - 0.02, smallR + 0.02, 36), goldSubtleMat
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(sx, 0.012, stage2Z + sz);
      this.group.add(ring);
    });

    // ======== RADIAL GEOMETRY at key column intersections ========
    // Small rosettes at select column positions
    const rosePositions = [
      [-this.naveWidth / 2 + 1, -8], [this.naveWidth / 2 - 1, -8],
      [-this.naveWidth / 2 + 1, 6], [this.naveWidth / 2 - 1, 6],
    ];
    rosePositions.forEach(([rx, rz]) => {
      // 6-petal rosette
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.6, 0.63, 24), goldSubtleMat
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(rx + Math.cos(angle) * 0.6, 0.012, rz + Math.sin(angle) * 0.6);
        this.group.add(ring);
      }
      // Center circle
      const center = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.63, 24), goldMat);
      center.rotation.x = -Math.PI / 2;
      center.position.set(rx, 0.012, rz);
      this.group.add(center);
    });
    } // end sacredGeometry

    // Subtle tile grid
    if (this.Q.tileGrid !== false) {
    const tileMat = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e, transparent: true, opacity: 0.2,
      side: THREE.DoubleSide, depthWrite: false
    });
    for (let x = -this.totalWidth / 2; x < this.totalWidth / 2; x += 2) {
      this.group.add(this._floorPlane(0.008, this.naveLength, tileMat, x, 0));
    }
    for (let z = -this.naveLength / 2; z < this.naveLength / 2; z += 2) {
      this.group.add(this._floorPlane(this.totalWidth, 0.008, tileMat, 0, z));
    }
    } // end tileGrid
  }

  _floorPlane(w, h, mat, x, z) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.01, z);
    return mesh;
  }

  // (Pentagram removed — replaced by Flower of Life / Metatron's Cube sacred geometry)

  createWalls() {
    const wallMatOpts = {
      color: 0x8a8070,
      roughness: 0.82,
      metalness: 0.02,
    };
    if (this.textures.wall) {
      const wt = this.textures.wall;
      wallMatOpts.map = wt.map;
      wt.map.repeat.set(10, 5);
      if (wt.normalMap) {
        wallMatOpts.normalMap = wt.normalMap;
        wt.normalMap.repeat.set(10, 5);
        wallMatOpts.normalScale = new THREE.Vector2(0.8, 0.8);
      }
      if (wt.roughnessMap) {
        wallMatOpts.roughnessMap = wt.roughnessMap;
        wt.roughnessMap.repeat.set(10, 5);
      }
    }
    const wallMat = new THREE.MeshStandardMaterial(wallMatOpts);

    // Left wall (outer)
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, this.naveHeight, this.naveLength),
      wallMat
    );
    leftWall.position.set(-this.totalWidth / 2, this.naveHeight / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.group.add(leftWall);

    // Right wall
    const rightWall = leftWall.clone();
    rightWall.position.set(this.totalWidth / 2, this.naveHeight / 2, 0);
    this.group.add(rightWall);

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(this.totalWidth + 0.8, this.naveHeight, 0.8),
      wallMat
    );
    backWall.position.set(0, this.naveHeight / 2, -this.naveLength / 2);
    backWall.castShadow = true;
    this.group.add(backWall);

    // Front wall
    const frontWall = backWall.clone();
    frontWall.position.set(0, this.naveHeight / 2, this.naveLength / 2);
    this.group.add(frontWall);

    // Wall buttress details (vertical strips on walls)
    if (this.Q.buttresses !== false) {
    const buttressMat = new THREE.MeshStandardMaterial({
      color: 0x7d7568, roughness: 0.8, metalness: 0.02,
      map: wallMatOpts.map, normalMap: wallMatOpts.normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
    });
    const spacing = this.naveLength / (this.columnCount + 1);
    for (let i = 0; i <= this.columnCount + 1; i++) {
      const z = -this.naveLength / 2 + spacing * i;
      for (const side of [-1, 1]) {
        const buttress = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, this.naveHeight, 0.4),
          buttressMat
        );
        buttress.position.set(side * (this.totalWidth / 2 - 0.3), this.naveHeight / 2, z);
        this.group.add(buttress);
      }
    }
    } // end buttresses

    // Stained glass windows
    this.createStainedGlass();
  }

  createStainedGlass() {
    const windowColors = [
      0x8B00FF, 0x4169E1, 0x00FFFF, 0xFF2200,
      0xFFD700, 0x00FF41, 0xFF00FF, 0x6600CC
    ];

    const windowWidth = 2;
    const windowHeight = 8;
    const windowY = 18;
    const spacing = this.naveLength / 9;

    for (let i = 0; i < 8; i++) {
      const z = -this.naveLength / 2 + spacing * (i + 1);
      const color = windowColors[i];

      // Both sides
      for (const side of [-1, 1]) {
        const x = side * (this.totalWidth / 2);
        const windowGroup = new THREE.Group();

        // Gothic pointed arch window frame
        const frameMat = new THREE.MeshStandardMaterial({
          color: 0x0a0a14, roughness: 0.9, metalness: 0.1
        });

        // Vertical frame pieces
        const frameV = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, windowHeight, 0.15),
          frameMat
        );
        frameV.position.set(-windowWidth / 2, 0, 0);
        windowGroup.add(frameV);
        const frameV2 = frameV.clone();
        frameV2.position.x = windowWidth / 2;
        windowGroup.add(frameV2);

        // Center mullion
        const mullion = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, windowHeight * 0.85, 0.12),
          frameMat
        );
        windowGroup.add(mullion);

        // Horizontal transom
        const transom = new THREE.Mesh(
          new THREE.BoxGeometry(windowWidth, 0.06, 0.12),
          frameMat
        );
        transom.position.y = windowHeight * 0.3;
        windowGroup.add(transom);

        // Glass panels with color
        const glassMat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide
        });

        // Lower left panel
        const panel1 = new THREE.Mesh(
          new THREE.PlaneGeometry(windowWidth / 2 - 0.1, windowHeight * 0.65),
          glassMat
        );
        panel1.position.set(-windowWidth / 4, -windowHeight * 0.1, 0);
        windowGroup.add(panel1);

        // Lower right panel - slightly different shade
        const glassMat2 = glassMat.clone();
        glassMat2.color = new THREE.Color(color).multiplyScalar(0.7);
        const panel2 = new THREE.Mesh(
          new THREE.PlaneGeometry(windowWidth / 2 - 0.1, windowHeight * 0.65),
          glassMat2
        );
        panel2.position.set(windowWidth / 4, -windowHeight * 0.1, 0);
        windowGroup.add(panel2);

        // Upper tracery section (pointed arch top)
        const topGlass = new THREE.Mesh(
          new THREE.CircleGeometry(windowWidth / 2 - 0.05, 16, 0, Math.PI),
          glassMat
        );
        topGlass.position.y = windowHeight * 0.3;
        windowGroup.add(topGlass);

        // Tracery circle (rosette in upper window)
        const traceryMat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        const rosette = new THREE.Mesh(
          new THREE.RingGeometry(0.2, 0.4, 16),
          traceryMat
        );
        rosette.position.y = windowHeight * 0.35;
        windowGroup.add(rosette);

        // Position the window group on the INNER face of the wall so it's visible
        // Wall center at x=±16, thickness 0.8m, inner face at ±15.6
        windowGroup.position.set(side * (this.totalWidth / 2 - 0.4), windowY, z);
        windowGroup.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        this.group.add(windowGroup);

        // Glow light - colored illumination cast INWARD from windows
        let light = null;
        if (this.Q.windowLights !== false) {
          light = new THREE.PointLight(color, 0.09, 30, 0.5);
          light.position.set(side * (this.totalWidth / 2 - 1.5), windowY, z);
          this.group.add(light);
        }

        this.windows.push({
          group: windowGroup,
          panels: [panel1, panel2, topGlass, rosette],
          light,
          color: new THREE.Color(color),
          side,
          z
        });
      }
    }

    // Rose window (back wall)
    this.createRoseWindow();
  }

  createRoseWindow() {
    const roseGroup = new THREE.Group();
    const radius = 4.5;

    const traceryMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a14, roughness: 0.85, metalness: 0.1, side: THREE.DoubleSide
    });

    // ======== OUTER FRAME — thick stone ring ========
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.15, radius + 0.1, 64),
      traceryMat
    );
    roseGroup.add(outerRing);

    // Secondary inner border ring
    roseGroup.add(new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.2, radius - 0.12, 64), traceryMat
    ));

    // ======== BACKGROUND GLASS (deep indigo base) ========
    const bgGlass = new THREE.Mesh(
      new THREE.CircleGeometry(radius - 0.2, 64),
      new THREE.MeshBasicMaterial({
        color: 0x0a0520, transparent: true, opacity: 0.85, side: THREE.DoubleSide
      })
    );
    bgGlass.position.z = -0.01;
    roseGroup.add(bgGlass);

    // ======== FLOWER OF LIFE — 7 interlocking circles ========
    // Center circle + 6 around it at 60° intervals, radius = flowerR
    const flowerR = 1.4;
    const flowerPositions = [[0, 0]]; // center
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      flowerPositions.push([Math.cos(angle) * flowerR, Math.sin(angle) * flowerR]);
    }

    // Glass colors for the 7 circles — rich sacred spectrum
    const flowerColors = [
      0xcc44ff, // center — violet
      0xff2244, // red
      0xff8800, // orange
      0xffdd00, // gold
      0x22dd44, // green
      0x2288ff, // blue
      0x8844ff, // indigo
    ];

    flowerPositions.forEach(([fx, fy], idx) => {
      // Glowing glass circle
      const glassMat = new THREE.MeshBasicMaterial({
        color: flowerColors[idx],
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      });
      const glass = new THREE.Mesh(new THREE.CircleGeometry(flowerR - 0.04, 32), glassMat);
      glass.position.set(fx, fy, 0.003);
      roseGroup.add(glass);

      // Tracery ring around each circle
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(flowerR - 0.06, flowerR, 32),
        traceryMat
      );
      ring.position.set(fx, fy, 0.01);
      roseGroup.add(ring);
    });

    // ======== SECOND RING — 12 smaller circles at double distance ========
    if (this.Q.roseWindowDetail !== 'simple') {
    const ring2R = 0.85;
    const ring2Dist = flowerR * 2;
    const ring2Colors = [
      0xff0066, 0xff6600, 0xffcc00, 0x66ff00, 0x00ff66, 0x00ffcc,
      0x0066ff, 0x3300ff, 0x6600cc, 0xcc0099, 0xff0044, 0xff4400,
    ];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.PI / 12;
      const cx = Math.cos(angle) * ring2Dist;
      const cy = Math.sin(angle) * ring2Dist;
      // Only add if within the window radius
      if (Math.sqrt(cx * cx + cy * cy) + ring2R < radius - 0.3) {
        const glassMat = new THREE.MeshBasicMaterial({
          color: ring2Colors[i], transparent: true, opacity: 0.4, side: THREE.DoubleSide,
        });
        const glassCircle = new THREE.Mesh(new THREE.CircleGeometry(ring2R - 0.03, 24), glassMat);
        glassCircle.position.set(cx, cy, 0.002);
        roseGroup.add(glassCircle);
        const ring = new THREE.Mesh(new THREE.RingGeometry(ring2R - 0.04, ring2R, 24), traceryMat);
        ring.position.set(cx, cy, 0.012);
        roseGroup.add(ring);
      }
    }
    } // end second ring (simple mode skip)

    // ======== METATRON'S CUBE — lines connecting circle centers ========
    if (this.Q.roseWindowDetail !== 'simple') {
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xFFD700, transparent: true, opacity: 0.6,
      side: THREE.DoubleSide, depthWrite: false,
    });

    // Connect all Flower of Life centers to each other (21 lines)
    for (let i = 0; i < flowerPositions.length; i++) {
      for (let j = i + 1; j < flowerPositions.length; j++) {
        const [ax, ay] = flowerPositions[i];
        const [bx, by] = flowerPositions[j];
        const dx = bx - ax, dy = by - ay;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const lineGeo = new THREE.PlaneGeometry(len, 0.03);
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.set((ax + bx) / 2, (ay + by) / 2, 0.015);
        line.rotation.z = angle;
        roseGroup.add(line);
      }
    }
    } // end Metatron's cube (simple mode skip)

    // ======== 12 RADIAL SPOKES — from center to rim ========
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, radius * 1.7, 0.06), traceryMat
      );
      spoke.rotation.z = angle;
      spoke.position.z = 0.02;
      roseGroup.add(spoke);
    }

    // ======== CONCENTRIC TRACERY RINGS ========
    if (this.Q.roseWindowDetail !== 'simple') {
    [1.0, 2.0, 3.2, 4.0].forEach(r => {
      const traceryRing = new THREE.Mesh(new THREE.RingGeometry(r - 0.025, r + 0.025, 48), traceryMat);
      traceryRing.position.set(0, 0, 0.018);
      roseGroup.add(traceryRing);
    });
    } // end concentric tracery rings (simple mode skip)

    // ======== OUTER PETAL SEGMENTS — colored glass between spokes in outer ring ========
    const petalColors = [
      0xff1144, 0xff6600, 0xffcc00, 0x44ff00, 0x00ccff, 0x4400ff,
      0x8800cc, 0xff00aa, 0xff4400, 0x00ff88, 0x0044ff, 0xaa00ff,
    ];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.PI / 12;
      const petalMat = new THREE.MeshBasicMaterial({
        color: petalColors[i], transparent: true, opacity: 0.35, side: THREE.DoubleSide,
      });
      // Wedge-shaped segment between spokes in the outer ring
      const petal = new THREE.Mesh(
        new THREE.RingGeometry(3.3, radius - 0.25, 8, 1, angle - Math.PI / 13, Math.PI / 7.5),
        petalMat
      );
      petal.position.z = 0.001;
      roseGroup.add(petal);
    }

    // ======== CENTRAL SACRED SYMBOL — hexagram (Star of David / Seal of Solomon) ========
    if (this.Q.roseWindowDetail !== 'simple') {
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xFFD700, transparent: true, opacity: 0.7,
      side: THREE.DoubleSide, depthWrite: false,
    });
    // Two overlapping triangles
    [0, Math.PI].forEach(baseAngle => {
      const triPoints = [];
      for (let i = 0; i < 3; i++) {
        const a = baseAngle + (i / 3) * Math.PI * 2 - Math.PI / 2;
        triPoints.push(new THREE.Vector2(Math.cos(a) * 0.65, Math.sin(a) * 0.65));
      }
      // Draw triangle as 3 line segments
      for (let i = 0; i < 3; i++) {
        const p1 = triPoints[i], p2 = triPoints[(i + 1) % 3];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.04), starMat);
        seg.position.set((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, 0.02);
        seg.rotation.z = angle;
        roseGroup.add(seg);
      }
    });
    } // end hexagram (simple mode skip)

    // Central gemstone
    const gem = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.18, 1),
      new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xcc88ff, emissiveIntensity: 0.6,
        roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.8,
      })
    );
    gem.position.z = 0.04;
    roseGroup.add(gem);

    // Position on interior face of back wall
    roseGroup.position.set(0, 22, -this.naveLength / 2 + 0.45);
    this.group.add(roseGroup);
    this.roseWindow = roseGroup;

    // Multi-colored rose window light (warm with purple tint)
    const roseLight = new THREE.PointLight(0xbb66ff, 0.3, 22);
    roseLight.position.set(0, 22, -this.naveLength / 2 + 2);
    this.group.add(roseLight);
    // Secondary warm accent
    const roseWarmLight = new THREE.PointLight(0xffeedd, 0.12, 15);
    roseWarmLight.position.set(0, 22, -this.naveLength / 2 + 1.5);
    this.group.add(roseWarmLight);
  }

  createColumns() {
    const columnMatOpts = {
      color: 0x928a7e,
      roughness: 0.65,
      metalness: 0.05,
    };
    if (this.textures.column) {
      const ct = this.textures.column;
      columnMatOpts.map = ct.map;
      ct.map.repeat.set(1, 4);
      if (ct.normalMap) {
        columnMatOpts.normalMap = ct.normalMap;
        ct.normalMap.repeat.set(1, 4);
        columnMatOpts.normalScale = new THREE.Vector2(1.0, 1.0);
      }
    }
    const columnMat = new THREE.MeshStandardMaterial(columnMatOpts);
    const detailMat = new THREE.MeshStandardMaterial({
      color: 0x857d72,
      roughness: 0.7,
      metalness: 0.04,
      map: columnMatOpts.map,
      normalMap: columnMatOpts.normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
    });

    const spacing = this.naveLength / (this.columnCount + 1);

    for (let i = 0; i < this.columnCount; i++) {
      const z = -this.naveLength / 2 + spacing * (i + 1);
      this.createGothicColumn(-this.naveWidth / 2, z, columnMat, detailMat);
      this.createGothicColumn(this.naveWidth / 2, z, columnMat, detailMat);
    }
  }

  createGothicColumn(x, z, material, detailMat) {
    const columnGroup = new THREE.Group();
    const h = this.naveHeight;

    // Main shaft — octagonal cross-section
    const shaftGeo = new THREE.CylinderGeometry(0.4, 0.45, h - 3, 8);
    const shaft = new THREE.Mesh(shaftGeo, material);
    shaft.position.y = h / 2;
    shaft.castShadow = true;
    columnGroup.add(shaft);

    // Cluster shafts (engaged columns)
    const clusterCount = this.Q.columnClusterShafts ?? 8;
    for (let i = 0; i < clusterCount; i++) {
      const angle = (i / clusterCount) * Math.PI * 2;
      const cr = 0.58;
      const cx = Math.cos(angle) * cr;
      const cz = Math.sin(angle) * cr;
      const clusterGeo = new THREE.CylinderGeometry(0.08, 0.09, h - 5, 6);
      const cluster = new THREE.Mesh(clusterGeo, detailMat);
      cluster.position.set(cx, h / 2, cz);
      columnGroup.add(cluster);
    }

    // Tiered base
    const base1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.5, 8),
      material
    );
    base1.position.y = 0.25;
    columnGroup.add(base1);

    const base2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.85, 0.4, 8),
      material
    );
    base2.position.y = 0.7;
    columnGroup.add(base2);

    const base3 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.7, 0.3, 8),
      material
    );
    base3.position.y = 1.05;
    columnGroup.add(base3);

    // Capital with carved detail
    const cap1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.45, 0.8, 8),
      material
    );
    cap1.position.y = h - 2;
    columnGroup.add(cap1);

    const cap2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.75, 0.4, 8),
      detailMat
    );
    cap2.position.y = h - 1.4;
    columnGroup.add(cap2);

    // Abacus (flat top)
    const abacus = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.2, 1.8),
      material
    );
    abacus.position.y = h - 1.1;
    columnGroup.add(abacus);

    columnGroup.position.set(x, 0, z);
    this.group.add(columnGroup);
  }

  createPointedArches() {
    const archMatOpts = {
      color: 0x8a8278,
      roughness: 0.75,
      metalness: 0.02,
      side: THREE.DoubleSide,
    };
    if (this.textures.wall) {
      archMatOpts.map = this.textures.wall.map;
      if (this.textures.wall.normalMap) {
        archMatOpts.normalMap = this.textures.wall.normalMap;
        archMatOpts.normalScale = new THREE.Vector2(0.6, 0.6);
      }
    }
    const archMat = new THREE.MeshStandardMaterial(archMatOpts);

    const spacing = this.naveLength / (this.columnCount + 1);
    const archWidth = this.naveWidth;
    const archHeight = 6;
    const archY = this.naveHeight - 2;
    const _archTubularSegs = this.Q.archSegments || 24;
    const _archRadialSegs = this.Q.archRadialSegments || 6;

    // Transverse arches between column pairs
    for (let i = 0; i < this.columnCount; i++) {
      const z = -this.naveLength / 2 + spacing * (i + 1);
      const archPoints = [];
      const segments = 20;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = -archWidth / 2 + t * archWidth;
        // Pointed arch curve
        const s = Math.sin(t * Math.PI);
        const pointed = Math.pow(s, 0.7); // make it more pointed
        const y = archY + pointed * archHeight;
        archPoints.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(archPoints);
      const tubeGeo = new THREE.TubeGeometry(curve, _archTubularSegs, 0.12, _archRadialSegs, false);
      const arch = new THREE.Mesh(tubeGeo, archMat);
      this.group.add(arch);
    }

    // Longitudinal arches (along nave sides connecting columns)
    for (const side of [-1, 1]) {
      const x = side * this.naveWidth / 2;
      for (let i = 0; i < this.columnCount - 1; i++) {
        const z1 = -this.naveLength / 2 + spacing * (i + 1);
        const z2 = -this.naveLength / 2 + spacing * (i + 2);
        const midZ = (z1 + z2) / 2;
        const archH = 3;
        const archPoints = [];
        const segments = 16;
        for (let j = 0; j <= segments; j++) {
          const t = j / segments;
          const z = z1 + t * (z2 - z1);
          const s = Math.sin(t * Math.PI);
          const pointed = Math.pow(s, 0.7);
          const y = archY + pointed * archH;
          archPoints.push(new THREE.Vector3(x, y, z));
        }
        const curve = new THREE.CatmullRomCurve3(archPoints);
        const tubeGeo = new THREE.TubeGeometry(curve, _archTubularSegs, 0.08, _archRadialSegs, false);
        const arch = new THREE.Mesh(tubeGeo, archMat);
        this.group.add(arch);
      }
    }
  }

  createCeiling() {
    const ceilMatOpts = {
      color: 0x7d776e,
      roughness: 0.8,
      metalness: 0.03,
      side: THREE.DoubleSide,
    };
    if (this.textures.vault) {
      const vt = this.textures.vault;
      ceilMatOpts.map = vt.map;
      vt.map.repeat.set(4, 12);
      if (vt.normalMap) {
        ceilMatOpts.normalMap = vt.normalMap;
        vt.normalMap.repeat.set(4, 12);
        ceilMatOpts.normalScale = new THREE.Vector2(0.7, 0.7);
      }
    }
    const ceilMat = new THREE.MeshStandardMaterial(ceilMatOpts);

    const vaultWidth = this.naveWidth;
    const vaultHeight = 5;
    const segments = 20;
    const ceilingGeo = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const lengthSegments = 40;
    const halfLength = this.naveLength / 2;

    for (let iz = 0; iz <= lengthSegments; iz++) {
      const z = -halfLength + (iz / lengthSegments) * this.naveLength;
      for (let ix = 0; ix <= segments; ix++) {
        const t = ix / segments;
        const x = -vaultWidth / 2 + t * vaultWidth;
        // Pointed arch profile
        const s = Math.sin(t * Math.PI);
        const arch = Math.pow(s, 0.75);
        const y = this.naveHeight + arch * vaultHeight;
        vertices.push(x, y, z);
      }
    }

    for (let iz = 0; iz < lengthSegments; iz++) {
      for (let ix = 0; ix < segments; ix++) {
        const a = iz * (segments + 1) + ix;
        const b = a + 1;
        const c = a + segments + 1;
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    // Generate UV coordinates for texture mapping
    const uvs = [];
    for (let iz = 0; iz <= lengthSegments; iz++) {
      for (let ix = 0; ix <= segments; ix++) {
        uvs.push(ix / segments, iz / lengthSegments);
      }
    }

    ceilingGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    ceilingGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    ceilingGeo.setIndex(indices);
    ceilingGeo.computeVertexNormals();

    const ceiling = new THREE.Mesh(ceilingGeo, ceilMat);
    ceiling.receiveShadow = true;
    this.group.add(ceiling);

    // Ribbed vault structural ribs
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0xa09888, roughness: 0.65, metalness: 0.03,
      map: ceilMatOpts.map,
      normalMap: ceilMatOpts.normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
    });

    // Transverse ribs
    const spacing = this.naveLength / (this.columnCount + 1);
    for (let i = 0; i <= this.columnCount + 1; i++) {
      const z = -this.naveLength / 2 + spacing * i;
      const ribPoints = [];
      for (let ix = 0; ix <= segments; ix++) {
        const t = ix / segments;
        const x = -vaultWidth / 2 + t * vaultWidth;
        const s = Math.sin(t * Math.PI);
        const arch = Math.pow(s, 0.75);
        const y = this.naveHeight + arch * vaultHeight + 0.05;
        ribPoints.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(ribPoints);
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.1, 6, false);
      this.group.add(new THREE.Mesh(tubeGeo, ribMat));
    }

    // Diagonal ribs (cross ribs in each vault bay)
    for (let i = 0; i < this.columnCount; i++) {
      const z1 = -this.naveLength / 2 + spacing * (i + 0.5);
      const z2 = -this.naveLength / 2 + spacing * (i + 1.5);
      const midZ = (z1 + z2) / 2;

      for (const dir of [-1, 1]) {
        const diagPoints = [];
        for (let t = 0; t <= 1; t += 0.05) {
          const x = -vaultWidth / 2 + t * vaultWidth;
          const z = z1 + (dir > 0 ? t : 1 - t) * (z2 - z1);
          const sx = Math.sin(t * Math.PI);
          const arch = Math.pow(sx, 0.75);
          const y = this.naveHeight + arch * vaultHeight + 0.08;
          diagPoints.push(new THREE.Vector3(x, y, z));
        }
        const curve = new THREE.CatmullRomCurve3(diagPoints);
        const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.07, 5, false);
        this.group.add(new THREE.Mesh(tubeGeo, ribMat));
      }
    }

    // Ridge rib (longitudinal along peak)
    const ridgePoints = [];
    for (let iz = 0; iz <= lengthSegments; iz++) {
      const z = -halfLength + (iz / lengthSegments) * this.naveLength;
      ridgePoints.push(new THREE.Vector3(0, this.naveHeight + vaultHeight + 0.1, z));
    }
    const ridgeCurve = new THREE.CatmullRomCurve3(ridgePoints);
    const ridgeGeo = new THREE.TubeGeometry(ridgeCurve, 40, 0.08, 5, false);
    this.group.add(new THREE.Mesh(ridgeGeo, ribMat));

    // Boss stones at rib intersections
    const bossMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700, roughness: 0.5, metalness: 0.3,
      emissive: 0xFFD700, emissiveIntensity: 0.1
    });
    for (let i = 0; i <= this.columnCount; i++) {
      const z = -this.naveLength / 2 + spacing * (i + 0.5);
      if (z > halfLength - 2) continue;
      const boss = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        bossMat
      );
      boss.position.set(0, this.naveHeight + vaultHeight + 0.1, z);
      this.group.add(boss);
    }
  }

  createSideAisles() {
    // Lower ceiling for side aisles
    const aisleCeilMat = new THREE.MeshStandardMaterial({
      color: 0x756f66, roughness: 0.8, metalness: 0.03, side: THREE.DoubleSide,
      map: this.textures.vault ? this.textures.vault.map : undefined,
      normalMap: this.textures.vault ? this.textures.vault.normalMap : undefined,
      normalScale: new THREE.Vector2(0.5, 0.5),
    });
    const aisleHeight = 12;

    for (const side of [-1, 1]) {
      const centerX = side * (this.naveWidth / 2 + this.aisleWidth / 2);
      // Side aisle ceiling removed — was blocking stained glass light

      // Side aisle arcade arches (connecting nave columns to outer wall)
      const spacing = this.naveLength / (this.columnCount + 1);
      const archMat = new THREE.MeshStandardMaterial({
        color: 0x8a8278, roughness: 0.75, side: THREE.DoubleSide,
        map: this.textures.wall ? this.textures.wall.map : undefined,
        normalMap: this.textures.wall ? this.textures.wall.normalMap : undefined,
        normalScale: new THREE.Vector2(0.5, 0.5),
      });

      for (let i = 0; i < this.columnCount; i++) {
        const z = -this.naveLength / 2 + spacing * (i + 1);
        const archPoints = [];
        const segs = 12;
        for (let j = 0; j <= segs; j++) {
          const t = j / segs;
          const x = side * this.naveWidth / 2 + side * t * this.aisleWidth;
          const s = Math.sin(t * Math.PI);
          const y = aisleHeight - 1 + s * 2;
          archPoints.push(new THREE.Vector3(x, y, z));
        }
        const curve = new THREE.CatmullRomCurve3(archPoints);
        const tubeGeo = new THREE.TubeGeometry(curve, 12, 0.06, 5, false);
        this.group.add(new THREE.Mesh(tubeGeo, archMat));
      }
    }
  }

  createAltarPlatform() {
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x0f0f1a,
      roughness: 0.35,
      metalness: 0.25,
    });

    const stageHeight = 1.5;
    const stageWidth = 15;
    const stageDepth = 10;
    const stageZ = this.naveLength / 2 - stageDepth / 2 - 1;

    // Main platform
    const platformGeo = new THREE.BoxGeometry(stageWidth, stageHeight, stageDepth);
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, stageHeight / 2, stageZ);
    platform.receiveShadow = true;
    this.group.add(platform);

    // Stage edge glow strip
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0x8B00FF, transparent: true, opacity: 0.8
    });
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(stageWidth + 0.1, 0.06, 0.06),
      edgeMat
    );
    edge.position.set(0, stageHeight, stageZ - stageDepth / 2);
    this.group.add(edge);

    // Side edge glows
    for (const side of [-1, 1]) {
      const sideEdge = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, stageDepth),
        edgeMat
      );
      sideEdge.position.set(side * stageWidth / 2, stageHeight, stageZ);
      this.group.add(sideEdge);
    }
  }

  createGargoyles() {
    // Simplified gargoyle shapes on column capitals
    const gargoyleMat = new THREE.MeshStandardMaterial({
      color: 0x6a6460, roughness: 0.75, metalness: 0.05,
      map: this.textures.wall ? this.textures.wall.map : undefined,
      normalMap: this.textures.wall ? this.textures.wall.normalMap : undefined,
      normalScale: new THREE.Vector2(0.5, 0.5),
    });
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0xFF2200, transparent: true, opacity: 0.6
    });

    const spacing = this.naveLength / (this.columnCount + 1);
    // Place gargoyles on every 3rd column
    for (let i = 2; i < this.columnCount; i += 3) {
      const z = -this.naveLength / 2 + spacing * (i + 1);
      for (const side of [-1, 1]) {
        const x = side * this.naveWidth / 2;
        const garg = new THREE.Group();

        // Head
        const head = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.35, 0.5),
          gargoyleMat
        );
        head.position.set(side * 0.4, 0, 0);
        garg.add(head);

        // Snout
        const snout = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.15, 0.3),
          gargoyleMat
        );
        snout.position.set(side * 0.7, -0.05, 0);
        garg.add(snout);

        // Glowing eyes
        const eye1 = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 6, 6),
          eyeMat
        );
        eye1.position.set(side * 0.55, 0.05, 0.12);
        garg.add(eye1);
        const eye2 = eye1.clone();
        eye2.position.z = -0.12;
        garg.add(eye2);

        garg.position.set(x, this.naveHeight - 2, z);
        this.group.add(garg);
      }
    }
  }

  createWallSconces() {
    // Iron torch brackets on walls
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, roughness: 0.6, metalness: 0.4
    });

    const spacing = this.naveLength / 8;
    for (let i = 0; i < 7; i++) {
      const z = -this.naveLength / 2 + spacing * (i + 1);
      for (const side of [-1, 1]) {
        const x = side * (this.naveWidth / 2 - 0.3);
        const sconce = new THREE.Group();

        // Bracket arm
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.06, 0.06),
          ironMat
        );
        arm.position.set(side * 0.4, 0, 0);
        sconce.add(arm);

        // Vertical support
        const vert = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.5, 0.06),
          ironMat
        );
        vert.position.set(0, 0.25, 0);
        sconce.add(vert);

        // Cup
        const cup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.05, 0.12, 8),
          ironMat
        );
        cup.position.set(side * 0.8, 0.06, 0);
        sconce.add(cup);

        sconce.position.set(x, 3, z);
        this.group.add(sconce);
      }
    }
  }

  createBasicLighting() {
    // Ambient — warm fill so architecture and furniture are visible
    const ambient = new THREE.AmbientLight(0x887766, this.Q.ambientIntensity || 0.25);
    this.group.add(ambient);

    // Hemisphere light — natural fill, warm below / cool above
    const hemi = new THREE.HemisphereLight(0x8899aa, 0x443322, this.Q.hemisphereIntensity || 0.2);
    this.group.add(hemi);

    // Main directional (moonlight through windows) — reduced
    const dirLight = new THREE.DirectionalLight(0x99aabb, 0.3);
    dirLight.position.set(-10, 25, 0);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 35;
    dirLight.shadow.camera.bottom = -5;
    this.group.add(dirLight);

    // Second directional from opposite side — reduced
    const dirLight2 = new THREE.DirectionalLight(0x887799, 0.12);
    dirLight2.position.set(10, 20, 5);
    this.group.add(dirLight2);

    // Third directional from front — reduced
    const dirLight3 = new THREE.DirectionalLight(0x8899aa, 0.1);
    dirLight3.position.set(0, 15, -25);
    this.group.add(dirLight3);

    // Nave fill lights — drastically reduced, keep only key positions
    const naveFillColor = 0x998877;
    const naveFillPositions = [
      [0, 28, -20], [0, 28, 0], [0, 28, 15],
      [-7, 12, -10], [7, 12, -10],
    ];
    const naveLightCount = this.Q.naveFillLights ?? 5;
    naveFillPositions.slice(0, naveLightCount).forEach(([fx, fy, fz]) => {
      const fill = new THREE.PointLight(naveFillColor, 0.15, 35, 1.5);
      fill.position.set(fx, fy, fz);
      this.group.add(fill);
    });

    // Altar spotlight — further reduced
    const altarSpot = new THREE.SpotLight(0xFFD700, 0.3, 35, Math.PI / 5, 0.5, 1);
    altarSpot.position.set(0, 28, this.naveLength / 2 - 5);
    altarSpot.target.position.set(0, 1.5, this.naveLength / 2 - 6);
    this.group.add(altarSpot);
    this.group.add(altarSpot.target);

    // Purple organ wall accent — further reduced
    const organLight = new THREE.SpotLight(0x8B00FF, 0.2, 35, Math.PI / 4, 0.3, 1);
    organLight.position.set(0, 2, this.naveLength / 2 - 15);
    organLight.target.position.set(0, 15, this.naveLength / 2 - 1);
    this.group.add(organLight);
    this.group.add(organLight.target);
  }

  addFog(scene) {
    scene.fog = new THREE.FogExp2(0x1a1a2e, 0.002);
  }

  /**
   * Update animated elements
   */
  update(time) {
    // Subtle stained glass color cycling
    for (const win of this.windows) {
      const shift = Math.sin(time * 0.3 + win.z * 0.1) * 0.1;
      const intensity = 0.6 + shift;
      for (const panel of win.panels) {
        panel.material.opacity = intensity;
      }
      if (win.light) win.light.intensity = 0.09 + shift * 0.02;
    }

    // Rose window slow rotation
    if (this.roseWindow) {
      this.roseWindow.rotation.z = Math.sin(time * 0.1) * 0.02;
    }
  }
}
