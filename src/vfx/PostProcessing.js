/**
 * PostProcessing - Tone mapping, exposure control, and vignette overlay
 * Phase 5: VFX / Polish
 *
 * No external post-processing libraries required. Works entirely with
 * the built-in Three.js renderer and a fullscreen vignette overlay mesh.
 *
 *  - Dynamic tone mapping exposure that reacts to audio energy and beats
 *  - Fullscreen vignette (radial gradient darkening at screen edges)
 */
import * as THREE from 'three';

export class PostProcessing {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene}         scene
   * @param {THREE.Camera}        camera
   */
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // --- Exposure state ---
    this.baseExposure = renderer.toneMappingExposure || 0.8;
    this.currentExposure = this.baseExposure;
    this.beatDecay = 0; // decaying spike from beats

    // --- Vignette overlay ---
    this.vignetteScene = new THREE.Scene();
    this.vignetteCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.vignetteMesh = null;

    this._buildVignette();
  }

  // ---------------------------------------------------------------
  // Build vignette fullscreen quad
  // ---------------------------------------------------------------
  _buildVignette() {
    const vignetteGeo = new THREE.PlaneGeometry(2, 2);

    const vignetteMat = new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: 0.45 },  // how dark the edges get
        uSmoothness: { value: 0.4 },  // transition width
        uColor: { value: new THREE.Color(0x000000) }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uIntensity;
        uniform float uSmoothness;
        uniform vec3  uColor;
        varying vec2  vUv;

        void main() {
          // Distance from center (0,0) mapped from UV (0-1) to (-1,+1)
          vec2 centered = vUv * 2.0 - 1.0;
          float dist = length(centered);

          // Radial gradient — 0 at center, 1 at corners
          float vignette = smoothstep(1.0 - uSmoothness, 1.0 + uSmoothness * 0.5, dist);
          vignette *= uIntensity;

          gl_FragColor = vec4(uColor, vignette);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    this.vignetteMesh = new THREE.Mesh(vignetteGeo, vignetteMat);
    this.vignetteScene.add(this.vignetteMesh);
  }

  // ---------------------------------------------------------------
  // Update (call every frame, after main scene render)
  // ---------------------------------------------------------------
  /**
   * @param {number}  time    - elapsed time in seconds
   * @param {number}  energy  - overall audio energy 0-1
   * @param {boolean} isBeat  - true on the frame a beat is detected
   */
  update(time, energy = 0, isBeat = false) {
    // --- Beat spike ---
    if (isBeat) {
      this.beatDecay = 0.06; // very subtle beat bump (was 0.35)
    }

    // Decay the beat spike
    this.beatDecay *= 0.9; // exponential decay ~60fps
    if (this.beatDecay < 0.001) this.beatDecay = 0;

    // --- Compute target exposure ---
    // Stay close to base exposure, only gentle variation with energy.
    // High exposure amplifies EVERY light in the scene equally, which
    // compounds the overlapping spotlight problem. Keep it very tight.
    const energyExposure = this.baseExposure + energy * 0.06; // 0.85 – 0.91
    const target = Math.min(0.95, energyExposure + this.beatDecay);

    // Smooth toward target
    this.currentExposure += (target - this.currentExposure) * 0.06;
    this.currentExposure = Math.max(0.7, Math.min(0.95, this.currentExposure));

    this.renderer.toneMappingExposure = this.currentExposure;

    // --- Vignette intensity responds to energy ---
    // Quiet = moderate vignette, loud = lighter vignette
    const vignetteIntensity = 0.35 - energy * 0.15; // 0.35 (quiet) -> 0.20 (loud)
    this.vignetteMesh.material.uniforms.uIntensity.value = vignetteIntensity;

    // --- Render vignette overlay ---
    // autoClear must be false so we composite on top of the main render
    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.renderer.render(this.vignetteScene, this.vignetteCamera);
    this.renderer.autoClear = prevAutoClear;
  }
}
