/**
 * Cathedral - Gothic cathedral interior geometry builder
 * Phase 2: Enhanced architecture with detailed columns, ribbed vault,
 *          stained glass with tracery, floor detail, pointed arches
 */
import * as THREE from 'three';

export class Cathedral {
  constructor(scene, textures = {}) {
    this.scene = scene;
    this.textures = textures;
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
    this.createGargoyles();
    this.createWallSconces();
  }

  createFloor() {
    // Main floor - dark marble with subtle reflections
    const floorGeo = new THREE.PlaneGeometry(this.totalWidth, this.naveLength, 32, 64);
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

    // Gold inlay — sacred geometry pattern
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xFFD700, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, depthWrite: false
    });

    // Center line
    this.group.add(this._floorPlane(0.05, this.naveLength, lineMat, 0, 0));

    // Cross lines at column spacing
    const spacing = this.naveLength / (this.columnCount + 1);
    for (let i = 1; i <= this.columnCount; i++) {
      const z = -this.naveLength / 2 + spacing * i;
      this.group.add(this._floorPlane(this.naveWidth, 0.03, lineMat, 0, z));
    }

    // Concentric circles at center
    for (let r = 1.5; r <= 8; r += 1.5) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.02, r + 0.02, 64),
        lineMat
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      this.group.add(ring);
    }

    // Pentagram at center
    this.createPentagram(0, 0, 5, lineMat);

    // Diagonal sacred geometry lines
    const diagMat = new THREE.MeshBasicMaterial({
      color: 0xFFD700, transparent: true, opacity: 0.15,
      side: THREE.DoubleSide, depthWrite: false
    });
    for (let angle = 0; angle < Math.PI; angle += Math.PI / 6) {
      const len = 14;
      const geo = new THREE.PlaneGeometry(0.02, len);
      const line = new THREE.Mesh(geo, diagMat);
      line.rotation.x = -Math.PI / 2;
      line.rotation.z = angle;
      line.position.y = 0.01;
      this.group.add(line);
    }

    // Tile grid pattern (subtle)
    const tileMat = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e, transparent: true, opacity: 0.3,
      side: THREE.DoubleSide, depthWrite: false
    });
    for (let x = -this.totalWidth / 2; x < this.totalWidth / 2; x += 2) {
      this.group.add(this._floorPlane(0.01, this.naveLength, tileMat, x, 0));
    }
    for (let z = -this.naveLength / 2; z < this.naveLength / 2; z += 2) {
      this.group.add(this._floorPlane(this.totalWidth, 0.01, tileMat, 0, z));
    }
  }

  _floorPlane(w, h, mat, x, z) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.01, z);
    return mesh;
  }

  createPentagram(cx, cz, radius, material) {
    const points = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      points.push(new THREE.Vector3(
        cx + Math.cos(angle) * radius,
        0.015,
        cz + Math.sin(angle) * radius
      ));
    }
    // Draw star lines
    const starOrder = [0, 2, 4, 1, 3, 0];
    for (let i = 0; i < starOrder.length - 1; i++) {
      const a = points[starOrder[i]];
      const b = points[starOrder[i + 1]];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);
      const geo = new THREE.PlaneGeometry(0.03, len);
      const line = new THREE.Mesh(geo, material);
      line.rotation.x = -Math.PI / 2;
      line.rotation.z = -angle;
      line.position.set((a.x + b.x) / 2, 0.015, (a.z + b.z) / 2);
      this.group.add(line);
    }
  }

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
        const light = new THREE.PointLight(color, 1.5, 25);
        light.position.set(side * (this.totalWidth / 2 - 1.5), windowY, z);
        this.group.add(light);

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
    const color = 0x8B00FF;

    // Outer ring
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.2, radius, 32),
      new THREE.MeshStandardMaterial({ color: 0x0a0a14, roughness: 0.9, side: THREE.DoubleSide })
    );
    roseGroup.add(outerRing);

    // Main glass
    const glassMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.5, side: THREE.DoubleSide
    });
    const mainGlass = new THREE.Mesh(
      new THREE.CircleGeometry(radius - 0.2, 32),
      glassMat
    );
    mainGlass.position.z = 0.01;
    roseGroup.add(mainGlass);

    // Radial tracery spokes
    const spokeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a14, roughness: 0.9 });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, radius * 1.8, 0.08),
        spokeMat
      );
      spoke.rotation.z = angle;
      spoke.position.z = 0.02;
      roseGroup.add(spoke);
    }

    // Concentric tracery rings
    for (let r = 1.2; r < radius; r += 1.2) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.03, r + 0.03, 32),
        spokeMat
      );
      ring.position.z = 0.02;
      roseGroup.add(ring);
    }

    // Inner petal shapes (colored segments between spokes)
    const petalColors = [0xFF00FF, 0x6600CC, 0x4169E1, 0x00FFFF, 0x8B00FF, 0xFFD700];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const petalMat = new THREE.MeshBasicMaterial({
        color: petalColors[i % petalColors.length],
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
      });
      const petal = new THREE.Mesh(
        new THREE.CircleGeometry(0.8, 6, angle, Math.PI / 6),
        petalMat
      );
      petal.position.z = 0.005;
      roseGroup.add(petal);
    }

    roseGroup.position.set(0, 22, -this.naveLength / 2 + 0.2);
    this.group.add(roseGroup);
    this.roseWindow = roseGroup;

    // Rose window light
    const roseLight = new THREE.PointLight(0x8B00FF, 1.5, 30);
    roseLight.position.set(0, 22, -this.naveLength / 2 + 3);
    this.group.add(roseLight);
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

    // 8 cluster shafts (engaged columns)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
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
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.12, 6, false);
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
        const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.08, 5, false);
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
      const aisleGeo = new THREE.PlaneGeometry(this.aisleWidth, this.naveLength);
      const aisleCeil = new THREE.Mesh(aisleGeo, aisleCeilMat);
      aisleCeil.rotation.x = Math.PI / 2;
      aisleCeil.position.set(centerX, aisleHeight, 0);
      this.group.add(aisleCeil);

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

    // Stage steps (3 steps)
    const stepMat = new THREE.MeshStandardMaterial({
      color: 0x0c0c18, roughness: 0.4, metalness: 0.2
    });
    for (let i = 0; i < 3; i++) {
      const stepW = stageWidth + 1 + i * 0.5;
      const stepH = stageHeight / 3;
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(stepW, stepH, 0.5),
        stepMat
      );
      step.position.set(0, stepH * (i + 0.5), stageZ - stageDepth / 2 - 0.25 - i * 0.5);
      this.group.add(step);
    }

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
    // Ambient — enough to see architecture detail, not so much it washes out textures
    const ambient = new THREE.AmbientLight(0x887766, 0.9);
    this.group.add(ambient);

    // Hemisphere light — warm sky, cool ground for natural fill
    const hemi = new THREE.HemisphereLight(0x8899aa, 0x443322, 0.8);
    this.group.add(hemi);

    // Main directional (moonlight through windows)
    const dirLight = new THREE.DirectionalLight(0x99aabb, 0.8);
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

    // Second directional from opposite side
    const dirLight2 = new THREE.DirectionalLight(0x887799, 0.45);
    dirLight2.position.set(10, 20, 5);
    this.group.add(dirLight2);

    // Third directional from front
    const dirLight3 = new THREE.DirectionalLight(0x8899aa, 0.35);
    dirLight3.position.set(0, 15, -25);
    this.group.add(dirLight3);

    // Nave fill lights — warm to complement sandstone textures
    const naveFillColor = 0x998877;
    const naveFillPositions = [
      [0, 28, -25], [0, 28, -15], [0, 28, -5], [0, 28, 5], [0, 28, 15],
      [-7, 12, -20], [7, 12, -20], [-7, 12, -5], [7, 12, -5],
      [-7, 12, 10], [7, 12, 10],
      [0, 15, -20], [0, 15, 0], [0, 15, 15],
    ];
    naveFillPositions.forEach(([fx, fy, fz]) => {
      const fill = new THREE.PointLight(naveFillColor, 0.5, 45, 1);
      fill.position.set(fx, fy, fz);
      this.group.add(fill);
    });

    // Altar spotlight
    const altarSpot = new THREE.SpotLight(0xFFD700, 1.2, 40, Math.PI / 5, 0.5, 1);
    altarSpot.position.set(0, 28, this.naveLength / 2 - 5);
    altarSpot.target.position.set(0, 1.5, this.naveLength / 2 - 6);
    this.group.add(altarSpot);
    this.group.add(altarSpot.target);

    // Purple organ wall accent
    const organLight = new THREE.SpotLight(0x8B00FF, 0.8, 40, Math.PI / 4, 0.3, 1);
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
      win.light.intensity = 1.2 + shift * 0.5;
    }

    // Rose window slow rotation
    if (this.roseWindow) {
      this.roseWindow.rotation.z = Math.sin(time * 0.1) * 0.02;
    }
  }
}
