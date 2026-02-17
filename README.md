# 🏛️ Static Chapel

**A WebXR Cathedral Concert Experience**

An immersive virtual reality music experience featuring the complete **"Static Chapel"** album by **N3XUSBVSS**. Walk through a grand gothic cathedral transformed into an audio-reactive nightclub, complete with towering pipe organs, a concert stage with DJ booth, massive sound system, and dynamic lighting that responds to every beat.

![Static Chapel](https://img.shields.io/badge/Built%20with-Three.js-000000?style=flat-square&logo=three.js)
![WebXR](https://img.shields.io/badge/WebXR-Enabled-blueviolet?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-7.3.1-646CFF?style=flat-square&logo=vite)

---

## ✨ Features

### 🎵 **Complete Album Experience**
- **23 mastered tracks** from the "Static Chapel" album
- Full playlist navigation with shuffle mode
- Audio-reactive visualizations synchronized to music analysis
- Real-time beat detection, frequency band analysis, and mood detection

### 🏰 **Immersive Environment**
- **Gothic Cathedral Architecture** with procedurally generated stone textures
- **Stained Glass Windows** that glow and pulse with the music
- **Towering Pipe Organ** with audio-reactive illumination
- **Professional Concert Stage** featuring:
  - LED video panels with dynamic visualizations
  - Moving truss lighting systems
  - DJ booth with animated DJ character
  - Void Reality PA sound system (line arrays + subwoofers)

### 🎨 **Audio-Reactive Visuals**
- **Dynamic Lighting Director** with multiple mood-based programs:
  - Aggressive • Bass Heavy • Chaos • Euphoric • Building
  - Ritualistic • Glitch • Warm Ambient • Cold Ambient
- **Volumetric Fog System** with particle-based stage fog
- **God Rays** with directional light shafts
- **Chandeliers & Club Decor** with reactive elements
- **Post-Processing Effects** including vignette and bloom

### 🥽 **WebXR Support**
- Full VR headset support (Meta Quest, HTC Vive, etc.)
- Desktop navigation with WASD + mouse controls
- Adaptive quality system (auto-detects device tier)
- Smooth locomotion and teleportation

### ⚙️ **Advanced Features**
- **Quality Manager**: Automatic performance optimization for low/medium/high-end devices
- **Procedural Texture Generation**: Real-time stone, wood, metal, and fabric textures
- **Smart Shadow System**: Adaptive shadow maps based on device capability
- **FPS Monitoring**: Optional performance overlay

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (recommended: 18 or higher)
- npm or yarn
- Modern browser with WebGL 2.0 support

### Installation

```bash
# Clone the repository
git clone https://github.com/0xsl1m/StaticChapel.git
cd StaticChapel

# Install dependencies
npm install

# Start development server
npm run dev
```

The experience will open automatically at `http://localhost:3000`

### First Run
1. Wait for assets to load (textures, shaders, audio)
2. Click **"ENTER THE CHAPEL"** to begin
3. Audio context will initialize (browser autoplay policy)
4. Use mouse to look around, WASD to move, SHIFT to sprint

---

## 📦 Project Structure

```
StaticChapel/
├── public/
│   └── assets/
│       └── audio/              # 23-track album (mastered MP3s)
├── src/
│   ├── audio/
│   │   ├── AudioEngine.js      # Web Audio API analyzer + beat detection
│   │   └── PlaylistManager.js  # Track loading & playlist control
│   ├── lighting/
│   │   └── LightingDirector.js # Mood-based lighting programs
│   ├── ui/
│   │   ├── PlayerUI.js         # Music player interface
│   │   └── SettingsPanel.js    # Visual settings controls
│   ├── utils/
│   │   ├── Controls.js         # First-person camera controls
│   │   ├── QualityManager.js   # Device tier detection
│   │   ├── TextureGenerator.js # Procedural texture generation
│   │   └── XRManager.js        # WebXR session handling
│   ├── vfx/
│   │   ├── CandleSystem.js     # Particle-based candles
│   │   ├── FogSystem.js        # Volumetric fog particles
│   │   ├── GodRays.js          # Directional light shafts
│   │   ├── ParticleSystem.js   # Generic particle emitter
│   │   └── PostProcessing.js   # Vignette & effects overlay
│   ├── cathedral.js            # Main cathedral geometry
│   ├── club-decor.js           # Chandeliers, furniture, bar
│   ├── dj.js                   # DJ booth + animated character
│   ├── organ.js                # Pipe organ model
│   ├── sound-system.js         # PA speakers (subs + line arrays)
│   ├── stage.js                # Concert stage + LED panels
│   └── main.js                 # Application entry point
├── index.html                  # HTML shell + UI markup
├── vite.config.js              # Vite configuration
└── package.json                # Dependencies
```

---

## 🎮 Controls

### Desktop
- **Mouse**: Look around
- **WASD**: Move (forward/left/backward/right)
- **Shift**: Sprint
- **Space**: Play/Pause
- **ESC**: Release mouse lock

### UI Controls
- **⚙️ Settings**: Adjust fog, lighting, god rays, camera FOV
- **🎵 Tracklist**: View and select tracks
- **⏮️ ⏭️**: Previous/Next track
- **🔀**: Shuffle mode
- **🔊**: Volume control

### VR Mode
- Click **"ENTER VR"** button (bottom right)
- Use controller thumbsticks to move
- Point and click to interact with UI elements

---

## 🔧 Configuration

### Quality Settings
The `QualityManager` automatically detects device tier:

| Tier | GPU Benchmark | Settings |
|------|--------------|----------|
| **Low** | < 30 FPS | Reduced particles, no shadows, 512px textures |
| **Medium** | 30-55 FPS | Moderate effects, soft shadows, 1024px textures |
| **High** | > 55 FPS | All effects, high shadows, 2048px textures |

Override in `src/utils/QualityManager.js` by setting `DEBUG_FORCE_TIER`.

### Visual Settings (In-App)
Adjust in the Settings Panel (⚙️ button):
- **Fog Density**: 0-100%
- **Lighting Intensity**: 0-100%
- **Camera FOV**: 50-110°
- **God Rays**: On/Off
- **Stage Fog**: On/Off
- **Mood Override**: Force specific lighting program

---

## 🏗️ Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

Output will be in `dist/` directory.

### Deployment

The app is a static site and can be deployed to:
- **Vercel**: `vercel deploy`
- **Netlify**: Drag `dist/` folder to Netlify
- **GitHub Pages**: Push `dist/` to `gh-pages` branch
- **Any static host**: Upload `dist/` contents

**Important**: Ensure your host serves files with correct MIME types for:
- `.mp3` files (audio assets)
- `.wasm` files (if using compressed textures)

---

## 🎨 Tech Stack

- **[Three.js](https://threejs.org/)** v0.182.0 - 3D graphics engine
- **[Vite](https://vitejs.dev/)** v7.3.1 - Build tool & dev server
- **WebXR Device API** - VR headset support
- **Web Audio API** - Real-time audio analysis
- **ES6 Modules** - Modern JavaScript architecture

---

## 🎵 Album Tracklist

The complete **"Static Chapel"** album by **N3XUSBVSS**:

1. Static Chapel
2. Circuit Breaker
3. Tunnel Bass Riddim
4. Gelato
5. Adventure Time
6. Cut It
7. Sermon
8. Cloud 7 Bounce
9. Pixelated Halo
10. First Bass Man
11. Heart Monitor
12. Organ Failure
13. Thunder in the Basement
14. Safe Room
15. Storm Cellar
16. Howard St.
17. Civil Alert
18. Righteous
19. Waiting Room
20. Wook Fishing
21. To the Top
22. Along the Road
23. Skrillexed

---

## 🐛 Troubleshooting

### Audio Not Playing
- Ensure browser allows autoplay (click "ENTER THE CHAPEL")
- Check browser console for CORS errors
- Verify audio files exist in `public/assets/audio/`

### Poor Performance
- Open Settings Panel and disable God Rays / Stage Fog
- Reduce camera FOV
- Close other GPU-intensive applications
- Try a different browser (Chrome recommended)

### VR Mode Issues
- Ensure WebXR is supported in your browser
- Update VR headset firmware
- Grant camera/motion permissions if prompted

### Black Screen
- Check browser console for errors
- Ensure WebGL 2.0 is supported: Visit https://get.webgl.org/
- Try disabling browser extensions

---

## 📄 License

**ISC License**

Copyright (c) N3XUSBVSS

---

## 🙏 Credits

**Created by**: [N3XUSBVSS](https://github.com/0xsl1m)  
**Music**: N3XUSBVSS - "Static Chapel" Album  
**Experience**: Static Chapel VR Cathedral  

Built with ❤️ using Three.js and WebXR

---

## 🔗 Links

- **Repository**: [github.com/0xsl1m/StaticChapel](https://github.com/0xsl1m/StaticChapel)
- **Artist**: N3XUSBVSS
- **Three.js Docs**: [threejs.org/docs](https://threejs.org/docs)
- **WebXR Spec**: [immersiveweb.dev](https://immersiveweb.dev)

---

*Experience the divine intersection of gothic architecture and modern bass music. Enter the Static Chapel.*
