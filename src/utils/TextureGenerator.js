/**
 * TextureGenerator - Professional-quality procedural textures via Canvas2D
 * Generates PBR-ready diffuse, normal, and roughness maps at runtime.
 */
import * as THREE from 'three';

export class TextureGenerator {
  constructor(resolution = 512) {
    this.res = resolution;
    this._noiseGrid = this._buildNoiseGrid(128);
  }

  // ==================================================================
  //  PUBLIC API
  // ==================================================================

  /** Polished marble floor with veining and color depth */
  generateStoneFloor() {
    const res = this.res;
    const diffuse = this._createCanvas(res);
    const height = this._createCanvas(res);

    const dCtx = diffuse.getContext('2d');
    const hCtx = height.getContext('2d');

    // Light marble base — elegant cream-white like Carrara marble
    dCtx.fillStyle = '#c8bfb4';
    dCtx.fillRect(0, 0, res, res);
    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, res, res);

    // Large marble tiles (2x2 grid)
    const tileSize = res / 2;
    for (let ty = 0; ty < 2; ty++) {
      for (let tx = 0; tx < 2; tx++) {
        const ox = tx * tileSize;
        const oy = ty * tileSize;

        // Per-tile base color variation (light warm marble)
        const v = this._hash(tx * 31 + ty * 47) * 14 - 7;
        const r = 190 + v;
        const g = 182 + v - 3;
        const b = 172 + v - 5;
        dCtx.fillStyle = `rgb(${r},${g},${b})`;
        dCtx.fillRect(ox + 2, oy + 2, tileSize - 4, tileSize - 4);

        // Primary dark veins — dramatic contrast
        this._drawMarbleVeins(dCtx, ox, oy, tileSize, tileSize, tx + ty * 2,
          'rgba(80,70,60,0.6)', 'rgba(55,48,40,0.5)', 7);
        // Secondary grey veins
        this._drawMarbleVeins(dCtx, ox, oy, tileSize, tileSize, tx + ty * 2 + 10,
          'rgba(140,130,120,0.3)', 'rgba(110,100,90,0.2)', 10);
        // Fine highlight veins — warmth
        this._drawMarbleVeins(dCtx, ox, oy, tileSize, tileSize, tx + ty * 2 + 20,
          'rgba(210,200,185,0.15)', 'rgba(170,160,148,0.1)', 5);

        // Subtle color depth via FBM noise
        this._addNoiseToRegion(dCtx, ox + 2, oy + 2, tileSize - 4, tileSize - 4, 8, tx + ty * 4);
      }
    }

    // Grout lines — thin dark recesses
    dCtx.fillStyle = 'rgba(40,35,30,0.9)';
    hCtx.fillStyle = '#303030';
    for (let i = 0; i <= 2; i++) {
      const pos = i * tileSize;
      dCtx.fillRect(pos - 1, 0, 3, res);
      dCtx.fillRect(0, pos - 1, res, 3);
      hCtx.fillRect(pos - 1, 0, 3, res);
      hCtx.fillRect(0, pos - 1, res, 3);
    }

    const normalCanvas = this._normalFromHeight(height, 0.6);

    // Roughness: polished marble = very low roughness
    const roughness = this._createCanvas(res);
    const rCtx = roughness.getContext('2d');
    rCtx.fillStyle = '#2a2a2a'; // roughness ~0.16 (highly polished)
    rCtx.fillRect(0, 0, res, res);
    // Grout lines rougher
    rCtx.fillStyle = '#cccccc';
    for (let i = 0; i <= 2; i++) {
      const pos = i * tileSize;
      rCtx.fillRect(pos - 1, 0, 3, res);
      rCtx.fillRect(0, pos - 1, res, 3);
    }

    return {
      map: this._toTexture(diffuse),
      normalMap: this._toTexture(normalCanvas),
      roughnessMap: this._toTexture(roughness),
    };
  }

  /** Ashlar sandstone wall with running bond, mortar, aging */
  generateStoneWall() {
    const res = this.res;
    const diffuse = this._createCanvas(res);
    const height = this._createCanvas(res);

    const dCtx = diffuse.getContext('2d');
    const hCtx = height.getContext('2d');

    const blockW = Math.floor(res / 6);
    const blockH = Math.floor(res / 12);

    // Warm sandstone base
    dCtx.fillStyle = '#8a8070';
    dCtx.fillRect(0, 0, res, res);
    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, res, res);

    // Draw running bond stone blocks
    for (let row = 0; row < Math.ceil(res / blockH) + 1; row++) {
      const offset = (row % 2) * (blockW / 2);
      for (let col = -1; col < Math.ceil(res / blockW) + 1; col++) {
        const bx = col * blockW + offset;
        const by = row * blockH;

        // Per-block warm color variation
        const v = this._hash(col * 13 + row * 37) * 30 - 15;
        const ws = this._hash(col * 7 + row * 23) * 10 - 5;
        const r = Math.max(0, Math.min(255, 138 + v + ws));
        const g = Math.max(0, Math.min(255, 128 + v));
        const b = Math.max(0, Math.min(255, 112 + v - ws));

        dCtx.fillStyle = `rgb(${r},${g},${b})`;
        dCtx.fillRect(bx + 1, by + 1, blockW - 2, blockH - 2);

        // Height: blocks raised, mortar recessed
        const hv = 128 + (this._hash(col * 19 + row * 43) * 10 - 5);
        hCtx.fillStyle = `rgb(${hv},${hv},${hv})`;
        hCtx.fillRect(bx + 2, by + 2, blockW - 4, blockH - 4);

        // Surface noise within each block
        this._addNoiseToRegion(dCtx, bx + 1, by + 1, blockW - 2, blockH - 2, 8, col + row * 100);
      }
    }

    // Mortar lines
    for (let row = 0; row < Math.ceil(res / blockH) + 1; row++) {
      dCtx.fillStyle = 'rgba(60,54,48,0.7)';
      dCtx.fillRect(0, row * blockH, res, 2);
      hCtx.fillStyle = '#404040';
      hCtx.fillRect(0, row * blockH, res, 2);

      const offset = (row % 2) * (blockW / 2);
      for (let col = 0; col < Math.ceil(res / blockW) + 2; col++) {
        const mx = col * blockW + offset;
        dCtx.fillStyle = 'rgba(60,54,48,0.7)';
        dCtx.fillRect(mx - 1, row * blockH, 2, blockH);
        hCtx.fillStyle = '#404040';
        hCtx.fillRect(mx - 1, row * blockH, 2, blockH);
      }
    }

    // Aging streaks
    for (let i = 0; i < 20; i++) {
      const sx = this._hash(i * 97) * res;
      const sy = this._hash(i * 53) * res * 0.3;
      const sl = 20 + this._hash(i * 71) * 80;
      dCtx.fillStyle = 'rgba(50,45,40,0.06)';
      dCtx.fillRect(sx, sy, 2, sl);
    }

    const normalCanvas = this._normalFromHeight(height, 1.5);

    const roughness = this._createCanvas(res);
    const rCtx = roughness.getContext('2d');
    rCtx.drawImage(height, 0, 0);
    const rData = rCtx.getImageData(0, 0, res, res);
    for (let i = 0; i < rData.data.length; i += 4) {
      const h = rData.data[i] / 255;
      rData.data[i] = rData.data[i+1] = rData.data[i+2] = h > 0.45 ? 180 : 220;
    }
    rCtx.putImageData(rData, 0, 0);

    return {
      map: this._toTexture(diffuse),
      normalMap: this._toTexture(normalCanvas),
      roughnessMap: this._toTexture(roughness),
    };
  }

  /** Fluted column stone with horizontal joints and weathering */
  generateColumnStone() {
    const res = this.res;
    const diffuse = this._createCanvas(res);
    const height = this._createCanvas(res);

    const dCtx = diffuse.getContext('2d');
    const hCtx = height.getContext('2d');

    dCtx.fillStyle = '#928a7e';
    dCtx.fillRect(0, 0, res, res);
    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, res, res);

    // Vertical fluting channels
    const fluteCount = 8;
    const fluteWidth = res / fluteCount;
    for (let f = 0; f < fluteCount; f++) {
      const fx = f * fluteWidth;
      const gradient = dCtx.createLinearGradient(fx, 0, fx + fluteWidth, 0);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.3, 'rgba(0,0,0,0.06)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.1)');
      gradient.addColorStop(0.7, 'rgba(0,0,0,0.06)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      dCtx.fillStyle = gradient;
      dCtx.fillRect(fx, 0, fluteWidth, res);

      const hGrad = hCtx.createLinearGradient(fx, 0, fx + fluteWidth, 0);
      hGrad.addColorStop(0, 'rgb(128,128,128)');
      hGrad.addColorStop(0.5, 'rgb(110,110,110)');
      hGrad.addColorStop(1, 'rgb(128,128,128)');
      hCtx.fillStyle = hGrad;
      hCtx.fillRect(fx, 0, fluteWidth, res);
    }

    // Horizontal joint lines
    const jointSpacing = res / 4;
    for (let j = 1; j < 4; j++) {
      const jy = j * jointSpacing;
      dCtx.fillStyle = 'rgba(60,54,48,0.5)';
      dCtx.fillRect(0, jy - 1, res, 2);
      hCtx.fillStyle = '#505050';
      hCtx.fillRect(0, jy - 1, res, 3);
    }

    // Weathering gradient
    const wGrad = dCtx.createLinearGradient(0, 0, 0, res);
    wGrad.addColorStop(0, 'rgba(0,0,0,0)');
    wGrad.addColorStop(0.8, 'rgba(0,0,0,0)');
    wGrad.addColorStop(1, 'rgba(30,25,20,0.15)');
    dCtx.fillStyle = wGrad;
    dCtx.fillRect(0, 0, res, res);

    this._addNoiseToRegion(dCtx, 0, 0, res, res, 6, 42);

    return {
      map: this._toTexture(diffuse),
      normalMap: this._toTexture(this._normalFromHeight(height, 1.2)),
    };
  }

  /** Vault ceiling stone blocks */
  generateVaultStone() {
    const res = this.res;
    const diffuse = this._createCanvas(res);
    const height = this._createCanvas(res);

    const dCtx = diffuse.getContext('2d');
    const hCtx = height.getContext('2d');

    const blockW = Math.floor(res / 4);
    const blockH = Math.floor(res / 8);

    dCtx.fillStyle = '#7d776e';
    dCtx.fillRect(0, 0, res, res);
    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, res, res);

    for (let row = 0; row < Math.ceil(res / blockH) + 1; row++) {
      const offset = (row % 2) * (blockW / 2);
      for (let col = -1; col < Math.ceil(res / blockW) + 1; col++) {
        const bx = col * blockW + offset;
        const by = row * blockH;

        const v = this._hash(col * 17 + row * 41) * 20 - 10;
        const r = Math.max(0, Math.min(255, 125 + v));
        const g = Math.max(0, Math.min(255, 119 + v));
        const b = Math.max(0, Math.min(255, 110 + v));
        dCtx.fillStyle = `rgb(${r},${g},${b})`;
        dCtx.fillRect(bx + 1, by + 1, blockW - 2, blockH - 2);

        this._addNoiseToRegion(dCtx, bx + 1, by + 1, blockW - 2, blockH - 2, 5, col * 3 + row * 7);
      }
    }

    // Mortar
    for (let row = 0; row <= Math.ceil(res / blockH); row++) {
      dCtx.fillStyle = 'rgba(55,50,45,0.6)';
      dCtx.fillRect(0, row * blockH - 1, res, 2);
      hCtx.fillStyle = '#505050';
      hCtx.fillRect(0, row * blockH - 1, res, 2);

      const offset = (row % 2) * (blockW / 2);
      for (let col = 0; col < Math.ceil(res / blockW) + 2; col++) {
        dCtx.fillRect(col * blockW + offset - 1, row * blockH, 2, blockH);
        hCtx.fillRect(col * blockW + offset - 1, row * blockH, 2, blockH);
      }
    }

    return {
      map: this._toTexture(diffuse),
      normalMap: this._toTexture(this._normalFromHeight(height, 1.0)),
    };
  }

  /** Dark oak wood grain with knots and annual rings */
  generateWoodGrain() {
    const res = this.res;
    const diffuse = this._createCanvas(res);
    const height = this._createCanvas(res);

    const dCtx = diffuse.getContext('2d');
    const hCtx = height.getContext('2d');

    dCtx.fillStyle = '#2a1c10';
    dCtx.fillRect(0, 0, res, res);
    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, res, res);

    // Horizontal grain lines via overlaid sine waves
    for (let y = 0; y < res; y++) {
      const grain = Math.sin(y * 0.3) * 0.3 +
                    Math.sin(y * 0.7 + 1.5) * 0.2 +
                    Math.sin(y * 1.5 + 3.0) * 0.1;
      const v = grain * 0.5 + 0.5;

      dCtx.fillStyle = `rgb(${Math.max(0, 42 + v * 18 - 6)},${Math.max(0, 28 + v * 14 - 4)},${Math.max(0, 16 + v * 8 - 2)})`;
      dCtx.fillRect(0, y, res, 1);

      const hVal = 128 + grain * 8;
      hCtx.fillStyle = `rgb(${hVal},${hVal},${hVal})`;
      hCtx.fillRect(0, y, res, 1);
    }

    // Knot spots
    for (let k = 0; k < 3; k++) {
      const kx = this._hash(k * 67) * res;
      const ky = this._hash(k * 89) * res;
      const kr = 8 + this._hash(k * 23) * 15;
      dCtx.fillStyle = 'rgba(20,12,6,0.4)';
      dCtx.beginPath();
      dCtx.ellipse(kx, ky, kr * 1.5, kr, 0, 0, Math.PI * 2);
      dCtx.fill();
    }

    this._addNoiseToRegion(dCtx, 0, 0, res, res, 4, 99);

    return {
      map: this._toTexture(diffuse),
      normalMap: this._toTexture(this._normalFromHeight(height, 0.4)),
    };
  }

  /** Brushed silver metal for organ pipes */
  generateBrushedMetal() {
    const res = this.res;
    const diffuse = this._createCanvas(res);
    const height = this._createCanvas(res);

    const dCtx = diffuse.getContext('2d');
    const hCtx = height.getContext('2d');

    dCtx.fillStyle = '#8c8c96';
    dCtx.fillRect(0, 0, res, res);
    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, res, res);

    // Directional brush strokes
    for (let i = 0; i < 400; i++) {
      const x = this._hash(i * 13) * res;
      const y = this._hash(i * 29) * res;
      const len = 10 + this._hash(i * 47) * 50;
      const alpha = 0.03 + this._hash(i * 7) * 0.06;
      const bright = this._hash(i * 61) > 0.5;

      dCtx.strokeStyle = bright ? `rgba(180,180,190,${alpha})` : `rgba(70,70,80,${alpha})`;
      dCtx.lineWidth = 1;
      dCtx.beginPath();
      dCtx.moveTo(x, y);
      dCtx.lineTo(x + (this._hash(i * 17) - 0.5) * 4, y + len);
      dCtx.stroke();

      const hBright = bright ? 135 : 120;
      hCtx.strokeStyle = `rgb(${hBright},${hBright},${hBright})`;
      hCtx.lineWidth = 1;
      hCtx.beginPath();
      hCtx.moveTo(x, y);
      hCtx.lineTo(x + (this._hash(i * 17) - 0.5) * 4, y + len);
      hCtx.stroke();
    }

    // Patina spots
    for (let p = 0; p < 5; p++) {
      const px = this._hash(p * 101) * res;
      const py = this._hash(p * 83) * res;
      const pr = 5 + this._hash(p * 59) * 10;
      dCtx.fillStyle = 'rgba(100,110,90,0.08)';
      dCtx.beginPath();
      dCtx.arc(px, py, pr, 0, Math.PI * 2);
      dCtx.fill();
    }

    const roughness = this._createCanvas(res);
    const rCtx = roughness.getContext('2d');
    rCtx.fillStyle = '#4d4d4d';
    rCtx.fillRect(0, 0, res, res);
    rCtx.globalAlpha = 0.15;
    rCtx.drawImage(height, 0, 0);
    rCtx.globalAlpha = 1.0;

    return {
      map: this._toTexture(diffuse),
      normalMap: this._toTexture(this._normalFromHeight(height, 0.6)),
      roughnessMap: this._toTexture(roughness),
    };
  }

  /** Stained glass lead came overlay */
  generateStainedGlassOverlay() {
    const res = 256;
    const diffuse = this._createCanvas(res);
    const dCtx = diffuse.getContext('2d');
    dCtx.clearRect(0, 0, res, res);

    dCtx.strokeStyle = 'rgba(15,15,20,0.7)';
    dCtx.lineWidth = 2;

    const spacing = res / 6;
    for (let i = -res; i < res * 2; i += spacing) {
      dCtx.beginPath(); dCtx.moveTo(i, 0); dCtx.lineTo(i + res, res); dCtx.stroke();
      dCtx.beginPath(); dCtx.moveTo(i + res, 0); dCtx.lineTo(i, res); dCtx.stroke();
    }
    for (let y = spacing; y < res; y += spacing) {
      dCtx.beginPath(); dCtx.moveTo(0, y); dCtx.lineTo(res, y); dCtx.stroke();
    }

    dCtx.fillStyle = 'rgba(15,15,20,0.6)';
    for (let y = 0; y <= res; y += spacing) {
      for (let x = 0; x <= res; x += spacing) {
        dCtx.beginPath(); dCtx.arc(x, y, 3, 0, Math.PI * 2); dCtx.fill();
      }
    }

    return { map: this._toTexture(diffuse, true) };
  }

  /** Dark fabric weave for robes */
  generateFabric() {
    const res = 256;
    const diffuse = this._createCanvas(res);
    const height = this._createCanvas(res);

    const dCtx = diffuse.getContext('2d');
    const hCtx = height.getContext('2d');

    dCtx.fillStyle = '#0c0c16';
    dCtx.fillRect(0, 0, res, res);
    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, res, res);

    const weaveSize = 3;
    for (let y = 0; y < res; y += weaveSize * 2) {
      for (let x = 0; x < res; x += weaveSize * 2) {
        dCtx.fillStyle = 'rgba(16,16,26,0.6)';
        dCtx.fillRect(x, y, weaveSize, weaveSize);
        dCtx.fillStyle = 'rgba(10,10,18,0.6)';
        dCtx.fillRect(x + weaveSize, y + weaveSize, weaveSize, weaveSize);
      }
    }

    for (let f = 0; f < 3; f++) {
      const fx = this._hash(f * 73) * res;
      const fw = 30 + this._hash(f * 41) * 40;
      const fGrad = dCtx.createLinearGradient(fx - fw/2, 0, fx + fw/2, 0);
      fGrad.addColorStop(0, 'rgba(30,30,45,0)');
      fGrad.addColorStop(0.5, 'rgba(30,30,45,0.12)');
      fGrad.addColorStop(1, 'rgba(30,30,45,0)');
      dCtx.fillStyle = fGrad;
      dCtx.fillRect(fx - fw/2, 0, fw, res);
    }

    return {
      map: this._toTexture(diffuse),
      normalMap: this._toTexture(this._normalFromHeight(height, 0.3)),
    };
  }

  // ==================================================================
  //  INTERNAL HELPERS
  // ==================================================================

  _createCanvas(size) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    return c;
  }

  _toTexture(canvas, transparent = false) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    if (transparent) tex.premultiplyAlpha = false;
    return tex;
  }

  _hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  _buildNoiseGrid(size) {
    const grid = new Float32Array(size * size);
    for (let i = 0; i < grid.length; i++) grid[i] = Math.random();
    return grid;
  }

  _sampleNoise(x, y) {
    const size = 128;
    const grid = this._noiseGrid;
    const xi = ((Math.floor(x) % size) + size) % size;
    const yi = ((Math.floor(y) % size) + size) % size;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const xi1 = (xi + 1) % size;
    const yi1 = (yi + 1) % size;

    const tl = grid[yi * size + xi];
    const tr = grid[yi * size + xi1];
    const bl = grid[yi1 * size + xi];
    const br = grid[yi1 * size + xi1];

    return (tl + (tr - tl) * xf) + ((bl + (br - bl) * xf) - (tl + (tr - tl) * xf)) * yf;
  }

  _fbm(x, y, octaves = 4) {
    let val = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
      val += amp * this._sampleNoise(x * freq, y * freq);
      freq *= 2;
      amp *= 0.5;
    }
    return val;
  }

  _addNoiseToRegion(ctx, x, y, w, h, intensity, seed) {
    if (w <= 0 || h <= 0) return;
    const imageData = ctx.getImageData(x, y, w, h);
    const data = imageData.data;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const n = this._fbm((px + seed * 100) * 0.05, (py + seed * 50) * 0.05, 3);
        const offset = (n - 0.5) * intensity * 2;
        const idx = (py * w + px) * 4;
        data[idx]   = Math.max(0, Math.min(255, data[idx] + offset));
        data[idx+1] = Math.max(0, Math.min(255, data[idx+1] + offset));
        data[idx+2] = Math.max(0, Math.min(255, data[idx+2] + offset));
      }
    }
    ctx.putImageData(imageData, x, y);
  }

  _drawMarbleVeins(ctx, ox, oy, w, h, seed, color1, color2, count) {
    ctx.save();
    ctx.globalAlpha = 0.4;

    for (let v = 0; v < count; v++) {
      const startY = this._hash(seed * 13 + v * 37) * h;
      ctx.strokeStyle = v % 2 === 0 ? (color1 || 'rgba(90,82,74,0.5)') : (color2 || 'rgba(40,35,30,0.3)');
      ctx.lineWidth = 0.5 + this._hash(seed * 7 + v * 19) * 2;

      ctx.beginPath();
      ctx.moveTo(ox, oy + startY);

      const segments = 10;
      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        const vx = ox + t * w;
        const vy = oy + startY +
          Math.sin(t * Math.PI * 2 + seed + v) * h * 0.15 +
          (this._hash(seed * 29 + v * 11 + s * 43) - 0.5) * h * 0.1;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  _normalFromHeight(heightCanvas, strength = 1.5) {
    const w = heightCanvas.width;
    const h = heightCanvas.height;
    const hCtx = heightCanvas.getContext('2d');
    const hData = hCtx.getImageData(0, 0, w, h).data;

    const normalCanvas = this._createCanvas(w);
    const nCtx = normalCanvas.getContext('2d');
    const nImageData = nCtx.createImageData(w, h);
    const nData = nImageData.data;

    const getH = (px, py) => {
      px = ((px % w) + w) % w;
      py = ((py % h) + h) % h;
      return hData[(py * w + px) * 4] / 255;
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let nx = (getH(x - 1, y) - getH(x + 1, y)) * strength;
        let ny = (getH(x, y - 1) - getH(x, y + 1)) * strength;
        let nz = 1.0;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= len; ny /= len; nz /= len;

        const idx = (y * w + x) * 4;
        nData[idx]     = Math.floor(nx * 127.5 + 127.5);
        nData[idx + 1] = Math.floor(ny * 127.5 + 127.5);
        nData[idx + 2] = Math.floor(nz * 127.5 + 127.5);
        nData[idx + 3] = 255;
      }
    }
    nCtx.putImageData(nImageData, 0, 0);
    return normalCanvas;
  }
}
