/**
 * Static Chapel VR - Main Entry Point
 * All Phases: Cathedral, Stage, Organ, DJ, Lighting, VFX, UI
 */
import * as THREE from 'three';
import { Cathedral } from './cathedral.js';
import { PipeOrgan } from './organ.js';
import { ConcertStage } from './stage.js';
import { DJBooth } from './dj.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { PlaylistManager } from './audio/PlaylistManager.js';
import { LightingDirector } from './lighting/LightingDirector.js';
import { Controls } from './utils/Controls.js';
import { XRManager } from './utils/XRManager.js';
import { DustMotes } from './vfx/ParticleSystem.js';
import { CandleSystem } from './vfx/CandleSystem.js';
import { FogSystem } from './vfx/FogSystem.js';
import { GodRays } from './vfx/GodRays.js';
import { PostProcessing } from './vfx/PostProcessing.js';
import { PlayerUI } from './ui/PlayerUI.js';
import { SettingsPanel } from './ui/SettingsPanel.js';
import { TextureGenerator } from './utils/TextureGenerator.js';

// --- Globals ---
let renderer, scene, camera, clock;
let cathedral, organ, stage, djBooth;
let audioEngine, playlist, lightingDirector;
let controls, xrManager;
let dustMotes, candles, fogSystem, godRays, postProcessing;
let playerUI, settingsPanel;
let isInitialized = false;
let elapsedTime = 0;

// Settings state
let settings = {
  fogDensity: 0.4,
  lightIntensity: 0.7,
  particleCount: 0.6,
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

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
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

  // Generate procedural textures
  const textureGen = new TextureGenerator(512);
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
  cathedral = new Cathedral(scene, cathedralTextures);
  cathedral.build();
  cathedral.addFog(scene);

  updateLoading(30, 'Building pipe organ...');

  // Phase 3: Pipe Organ
  organ = new PipeOrgan(scene, { wood: woodTexture, metal: metalTexture });

  updateLoading(40, 'Setting up concert stage...');

  // Phase 3: Concert Stage
  stage = new ConcertStage(scene, { metal: metalTexture });

  updateLoading(50, 'Creating DJ booth...');

  // Phase 3: DJ Booth
  djBooth = new DJBooth(scene, { stone: cathedralTextures.wall, fabric: fabricTexture });

  updateLoading(55, 'Programming lights...');

  // Phase 4: Lighting Engine
  lightingDirector = new LightingDirector(scene);

  // Connect stage fixtures to lighting engine for visual sync
  stage.setLightingDirector(lightingDirector);

  updateLoading(60, 'Spawning dust motes...');

  // Phase 5: VFX
  dustMotes = new DustMotes(scene, 3000);

  updateLoading(65, 'Lighting candles...');
  candles = new CandleSystem(scene);

  updateLoading(70, 'Generating fog...');
  fogSystem = new FogSystem(scene);

  updateLoading(75, 'Casting god rays...');
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
  };

  updateLoading(90, 'Checking VR support...');

  // WebXR
  xrManager = new XRManager(renderer);

  // Handle resize
  window.addEventListener('resize', onResize);

  updateLoading(100, 'Ready.');

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

  // Update controls
  controls.update(delta);

  // Update audio analysis
  audioEngine.update();

  const bandValues = audioEngine.bandValues;
  const energy = audioEngine.energy;
  const isBeat = audioEngine.isBeat;
  const mood = audioEngine.getMood();

  // Update cathedral animations (stained glass)
  cathedral.update(elapsedTime);

  // Update pipe organ (audio-reactive glow)
  organ.update(bandValues);

  // Update concert stage (LED panels, truss lights)
  stage.update(elapsedTime, bandValues, energy);

  // Update DJ booth (head bobbing, animations)
  djBooth.update(elapsedTime, isBeat, energy);

  // Update lighting director (selects program, animates fixtures)
  lightingDirector.update(elapsedTime, delta, mood, bandValues, energy, isBeat);

  // Update VFX
  dustMotes.update(delta, energy);

  if (settings.candles) {
    candles.update(elapsedTime);
  }

  if (settings.stageFog) {
    fogSystem.update(elapsedTime, delta, energy);
  }

  if (settings.godRays) {
    const midEnergy = (bandValues.mid || 0) + (bandValues.lowMid || 0);
    godRays.update(elapsedTime, midEnergy);
  }

  // Update player UI
  playerUI.update();
  playerUI.updateMood(mood);

  // Check for track end
  if (audioEngine.ended) {
    playlist.next();
  }

  // Render main scene first
  renderer.render(scene, camera);

  // Post-processing (vignette overlay) renders on top of the main scene
  postProcessing.update(elapsedTime, energy, isBeat);
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
