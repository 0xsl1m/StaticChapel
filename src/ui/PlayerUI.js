/**
 * PlayerUI - Music player HUD controls with volume and crosshair
 */
export class PlayerUI {
  constructor(playlist) {
    this.playlist = playlist;
    this.audio = playlist.audio;
    this.container = document.getElementById('player-ui');
    this.trackNumber = document.getElementById('track-number');
    this.trackTitle = document.getElementById('track-title');
    this.trackTime = document.getElementById('track-time');
    this.progressBar = document.getElementById('progress-bar');
    this.progressContainer = document.getElementById('progress-container');
    this.playBtn = document.getElementById('play-btn');
    this.prevBtn = document.getElementById('prev-btn');
    this.nextBtn = document.getElementById('next-btn');
    this.shuffleBtn = document.getElementById('shuffle-btn');
    this.listBtn = document.getElementById('list-btn');
    this.tracklistPanel = document.getElementById('tracklist-panel');
    this.tracklist = document.getElementById('tracklist');
    this.volumeSlider = document.getElementById('volume-slider');
    this.crosshair = document.getElementById('crosshair');
    this.controlsHint = document.getElementById('controls-hint');
    this.moodIndicator = document.getElementById('mood-indicator');
    this.fpsCounter = document.getElementById('fps-counter');
    this.hudInfo = document.getElementById('hud-info');

    // FPS tracking
    this.frames = 0;
    this.lastFpsTime = performance.now();
    this.currentFps = 0;

    this.setupControls();
    this.buildTracklist();

    // Track change callback
    this.playlist.onTrackChange = (track, displayIdx) => this.onTrackChange(track, displayIdx);

    // Pointer lock state
    document.addEventListener('pointerlockchange', () => {
      const locked = !!document.pointerLockElement;
      this.crosshair.style.display = locked ? 'block' : 'none';
      this.controlsHint.style.display = locked ? 'none' : 'block';
    });
  }

  show() {
    this.container.style.display = 'block';
    this.controlsHint.style.display = 'block';
    this.hudInfo.style.display = 'block';
  }

  setupControls() {
    this.playBtn.addEventListener('click', () => {
      this.audio.togglePlay();
      this.updatePlayButton();
    });

    this.prevBtn.addEventListener('click', () => this.playlist.prev());
    this.nextBtn.addEventListener('click', () => this.playlist.next());

    this.shuffleBtn.addEventListener('click', () => {
      const isShuffled = this.playlist.toggleShuffle();
      this.shuffleBtn.classList.toggle('active', isShuffled);
    });

    this.listBtn.addEventListener('click', () => {
      this.tracklistPanel.classList.toggle('open');
    });

    // Volume slider
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', () => {
        this.audio.setVolume(this.volumeSlider.value / 100);
      });
    }

    // Progress bar click to seek
    this.progressContainer.addEventListener('click', (e) => {
      const rect = this.progressContainer.getBoundingClientRect();
      const fraction = (e.clientX - rect.left) / rect.width;
      this.audio.seek(fraction);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && document.pointerLockElement) {
        e.preventDefault();
        this.audio.togglePlay();
        this.updatePlayButton();
      }
      // N for next, B for previous while in pointer lock
      if (document.pointerLockElement) {
        if (e.code === 'KeyN') this.playlist.next();
        if (e.code === 'KeyB') this.playlist.prev();
      }
    });
  }

  buildTracklist() {
    this.tracklist.innerHTML = '';
    this.playlist.tracks.forEach((track, idx) => {
      const item = document.createElement('div');
      item.className = 'track-item';
      item.innerHTML = `
        <span class="num">${String(idx + 1).padStart(2, '0')}</span>
        <span>${track.title}</span>
      `;
      item.addEventListener('click', () => {
        this.playlist.play(idx);
        this.updatePlayButton();
      });
      this.tracklist.appendChild(item);
    });
  }

  onTrackChange(track, displayIdx) {
    this.trackNumber.textContent = String(displayIdx + 1).padStart(2, '0');
    this.trackTitle.textContent = track.title;
    this.updatePlayButton();
    this.highlightTrack(displayIdx);
  }

  highlightTrack(index) {
    const items = this.tracklist.querySelectorAll('.track-item');
    items.forEach((item, i) => {
      item.classList.toggle('active', i === index);
    });
  }

  updatePlayButton() {
    this.playBtn.innerHTML = this.audio.isPlaying ? '&#10074;&#10074;' : '&#9654;';
  }

  updateMood(mood) {
    if (this.moodIndicator) {
      this.moodIndicator.textContent = mood ? mood.replace(/_/g, ' ') : '';
    }
  }

  update() {
    if (!this.audio.duration) return;

    // Update progress bar
    this.progressBar.style.width = `${this.audio.progress * 100}%`;

    // Update time display
    const current = this.formatTime(this.audio.currentTime);
    const total = this.formatTime(this.audio.duration);
    this.trackTime.textContent = `${current} / ${total}`;

    // FPS counter
    this.frames++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = this.frames;
      this.frames = 0;
      this.lastFpsTime = now;
      if (this.fpsCounter && this.fpsCounter.parentElement.style.display !== 'none') {
        this.fpsCounter.textContent = `${this.currentFps} FPS`;
      }
    }
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
