/**
 * Static Chapel VR - Main Entry Point
 * All Phases: Cathedral, Stage, Organ, DJ, Lighting, VFX, UI
 *
 * Performance: QualityManager auto-detects device tier (low/medium/high)
 * and passes config to all subsystems for adaptive quality.
 */
import * as THREE from 'three';
import { quality } from './utils/QualityManager.js';
import { Cathedral } from './cathedral.js';
import { PipeOrgan } from './organ.js';
import { ConcertStage } from './stage.js';
import { SoundSystem } from './sound-system.js';
import { DJBooth } from './dj.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { PlaylistManager } from './audio/PlaylistManager.js';
import { LightingDirector } from './lighting/LightingDirector.js';
import { Controls } from './utils/Controls.js';
import { XRManager } from './utils/XRManager.js';
import { CandleSystem } from './vfx/CandleSystem.js';
import { FogSystem } from './vfx/FogSystem.js';
import { GodRays } from './vfx/GodRays.js';
import { PostProcessing } from './vfx/PostProcessing.js';
import { PlayerUI } from './ui/PlayerUI.js';
import { SettingsPanel } from './ui/SettingsPanel.js';
import { TextureGenerator } from './utils/TextureGenerator.js';
import { ClubDecor } from './club-decor.js';

const Q = quality.config; // shorthand for quality config

// --- Globals ---
let renderer, scene, camera, clock;
let cathedral, organ, stage, soundSystem, djBooth, clubDecor;
let audioEngine, playlist, lightingDirector;
let controls, xrManager;
let candles, fogSystem, godRays, postProcessing;
let playerUI, settingsPanel;
let isInitialized = false;
let elapsedTime = 0;
let frameCount = 0; // for throttled updates

// Settings state
let settings = {
  fogDensity: 0.4,
  lightIntensity: 0.7,
  cameraFov: 70,
  godRays: true,
  candles: true,
  stageFog: true,
  showFps: false,
  showMood: true,
};

// --- Loading ---
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const enterBtn = document.getElementById('enter-btn');
const loadingScreen = document.getElementById('loading-screen');

function updateLoading(progress, text) {
  if (loadingBar) loadingBar.style.width = `${progress}%`;
  if (loadingText) loadingText.textContent = text;
}

// --- Init ---
async function init() {
  updateLoading(5, 'Creating renderer...');

  // Renderer — adapt to quality tier
  renderer = new THREE.WebGLRenderer({
    antialias: Q.antialias,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, Q.pixelRatio));
  renderer.shadowMap.enabled = Q.shadowMap;
  if (Q.shadowMap) {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = Q.toneMappingExposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  document.getElementById('app').appendChild(renderer.domElement);

  updateLoading(10, 'Building scene...');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a12);

  // Camera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.7, -15);
  camera.lookAt(0, 1.7, 10); // level forward toward stage, no upward tilt

  // Clock
  clock = new THREE.Clock();

  updateLoading(12, 'Generating textures...');

  // Generate procedural textures — resolution from quality tier
  const textureGen = new TextureGenerator(Q.textureResolution);
  const cathedralTextures = {
    wall: textureGen.generateStoneWall(),
    floor: textureGen.generateStoneFloor(),
    column: textureGen.generateColumnStone(),
    vault: textureGen.generateVaultStone(),
  };

  updateLoading(16, 'Generating material textures...');

  const woodTexture = textureGen.generateWoodGrain();
  const metalTexture = textureGen.generateBrushedMetal();
  const fabricTexture = textureGen.generateFabric();

  updateLoading(20, 'Constructing cathedral...');

  // Phase 2: Enhanced Cathedral with procedural textures
  cathedral = new Cathedral(scene, cathedralTextures, Q);
  cathedral.build();
  cathedral.addFog(scene);

  updateLoading(30, 'Building pipe organ...');

  // Phase 3: Pipe Organ
  organ = new PipeOrgan(scene, { wood: woodTexture, metal: metalTexture }, Q);

  updateLoading(40, 'Setting up concert stage...');

  // Phase 3: Concert Stage
  stage = new ConcertStage(scene, { metal: metalTexture }, Q);

  updateLoading(44, 'Installing sound system...');

  // Sound System (Void Reality PA rig)
  soundSystem = new SoundSystem(scene, { metal: metalTexture }, Q);

  updateLoading(47, 'Setting up club decor...');

  // Club decor (chandeliers, furniture, bar, static VFX)
  clubDecor = new ClubDecor(scene, { metal: metalTexture }, Q);

  updateLoading(50, 'Creating DJ booth...');

  // Phase 3: DJ Booth
  djBooth = new DJBooth(scene, { stone: cathedralTextures.wall, fabric: fabricTexture }, Q);

  updateLoading(55, 'Programming lights...');

  // Phase 4: Lighting Engine — pass quality config for fixture count reduction
  lightingDirector = new LightingDirector(scene, Q);

  // Connect stage fixtures to lighting engine for visual sync
  stage.setLightingDirector(lightingDirector);

  updateLoading(65, 'Lighting candles...');
  candles = new CandleSystem(scene, Q);

  updateLoading(70, 'Generating fog...');
  fogSystem = new FogSystem(scene, { count: Q.fogParticles });

  updateLoading(75, 'Creating god rays...');
  godRays = new GodRays(scene);

  updateLoading(78, 'Initializing audio engine...');

  // Audio
  audioEngine = new AudioEngine();
  playlist = new PlaylistManager(audioEngine);

  updateLoading(82, 'Setting up post-processing...');

  // Post-processing
  postProcessing = new PostProcessing(renderer, scene, camera);

  updateLoading(85, 'Setting up controls...');

  // Controls
  controls = new Controls(camera, renderer.domElement);

  // UI
  playerUI = new PlayerUI(playlist);
  settingsPanel = new SettingsPanel();

  // Settings change handler
  settingsPanel.onChange = (newSettings) => {
    settings = newSettings;
    applySettings();
    // Wire mood override to audio engine
    if (audioEngine) {
      audioEngine.setForcedMood(settings.forcedMood);
    }
  };

  updateLoading(90, 'Checking VR support...');

  // WebXR — pass camera so XRManager can create a camera rig
  xrManager = new XRManager(renderer, camera);
  // Add the camera rig to the scene (camera is now a child of the rig)
  scene.add(xrManager.cameraRig);

  // Handle resize
  window.addEventListener('resize', onResize);

  updateLoading(92, 'Compiling shaders...');

  // --- GPU warm-up pass ---
  // Three.js compiles shaders & uploads geometry on first render.
  // Do it NOW so the user doesn't freeze when they press Enter.
  // We render one frame to an off-screen state, then clear it.
  await new Promise(resolve => {
    // Give the browser a frame to paint the "Compiling shaders" text
    requestAnimationFrame(() => {
      // Force-compile every material in the scene
      renderer.compile(scene, camera);

      // Render one full frame (forces remaining GPU uploads)
      renderer.render(scene, camera);

      // Also compile the vignette overlay scene
      renderer.compile(postProcessing.vignetteScene, postProcessing.vignetteCamera);

      updateLoading(100, 'Ready.');
      resolve();
    });
  });

  // Show enter button
  if (enterBtn) enterBtn.style.display = 'block';

  isInitialized = true;
}

function applySettings() {
  // Fog density
  if (scene.fog) {
    scene.fog.density = 0.001 + settings.fogDensity * 0.004;
  }

  // Camera FOV
  camera.fov = settings.cameraFov;
  camera.updateProjectionMatrix();

  // FPS counter visibility
  const fpsEl = document.getElementById('fps-counter');
  if (fpsEl) fpsEl.style.display = settings.showFps ? 'block' : 'none';

  // Mood indicator visibility
  const moodEl = document.getElementById('mood-indicator');
  if (moodEl) moodEl.style.display = settings.showMood ? 'block' : 'none';
}

// --- Enter Experience ---
window.enterExperience = async function () {
  if (!isInitialized) return;

  // Initialize audio context (requires user gesture)
  await audioEngine.init();

  // Load first track
  try {
    await playlist.loadTrack(0);
  } catch (e) {
    console.warn('Could not load first track:', e);
  }

  // Hide loading screen
  loadingScreen.classList.add('hidden');
  setTimeout(() => { loadingScreen.style.display = 'none'; }, 1000);

  // Show UI
  playerUI.show();

  // Apply initial settings
  applySettings();

  // Start first track
  audioEngine.play();
  playerUI.updatePlayButton();

  // Start render loop
  renderer.setAnimationLoop(animate);
};

// --- Animate ---
function animate() {
  const delta = clock.getDelta();
  elapsedTime += delta;
  frameCount++;

  // Update controls — skip desktop controls when in VR
  const inVR = xrManager && xrManager.isPresenting;
  if (inVR) {
    xrManager.update(delta);
  } else {
    controls.update(delta);
  }

  // Update audio analysis
  audioEngine.update();

  const bandValues = audioEngine.bandValues;
  const energy = audioEngine.energy;
  const isBeat = audioEngine.isBeat;
  const mood = audioEngine.getMood();

  // Update cathedral animations (stained glass)
  cathedral.update(elapsedTime, energy);

  // Update pipe organ (audio-reactive glow) — throttled on low/medium
  if (frameCount % Q.organUpdateEvery === 0) {
    organ.update(bandValues);
  }

  // Update concert stage (LED panels, truss lights)
  stage.update(elapsedTime, bandValues, energy);

  // Update sound system (subs + line arrays) — throttled
  if (frameCount % Q.soundSystemUpdateEvery === 0) {
    soundSystem.update(elapsedTime, bandValues, energy);
  }

  // Update club decor (chandeliers, furniture, static arcs) — throttled
  if (frameCount % Q.clubDecorUpdateEvery === 0) {
    clubDecor.update(elapsedTime, bandValues, energy, isBeat);
  }

  // Update DJ booth (head bobbing, animations)
  djBooth.update(elapsedTime, isBeat, energy);

  // Update lighting director (selects program, animates fixtures) — throttled on low tier
  if (frameCount % (Q.lightingUpdateEvery || 1) === 0) {
    lightingDirector.update(elapsedTime, delta, mood, bandValues, energy, isBeat);
  }

  // Update VFX
  if (settings.candles && (frameCount % Q.candleUpdateEvery === 0)) {
    candles.update(elapsedTime);
  }

  if (settings.stageFog) {
    fogSystem.update(elapsedTime, delta, energy);
  }

  if (settings.godRays) {
    godRays.update(elapsedTime, energy);
  }

  // Update player UI
  playerUI.update();
  playerUI.updateMood(mood);

  // Check for track end
  if (audioEngine.ended) {
    playlist.next();
  }

  // Render main scene
  renderer.render(scene, camera);

  // Post-processing (vignette overlay) — skip in VR (separate render pass breaks XR)
  if (!inVR) {
    postProcessing.update(elapsedTime, energy, isBeat);
  }
}

// --- Resize ---
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Start ---
init().catch(err => {
  console.error('Failed to initialize Static Chapel:', err);
  if (loadingText) loadingText.textContent = 'Error: ' + err.message;
});
