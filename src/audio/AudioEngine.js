/**
 * AudioEngine - Web Audio API setup, playback, and FFT analysis
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.gainNode = null;
    this.source = null;
    this.audioElement = null;
    this.fftSize = 2048;
    this.frequencyData = null;
    this.timeDomainData = null;
    this.isPlaying = false;
    this.volume = 0.8;

    // Frequency band ranges (bin indices depend on sample rate & fft size)
    this.bands = {
      subBass:  { min: 20,    max: 60 },
      bass:     { min: 60,    max: 250 },
      lowMid:   { min: 250,   max: 500 },
      mid:      { min: 500,   max: 2000 },
      highMid:  { min: 2000,  max: 6000 },
      presence: { min: 6000,  max: 12000 },
      treble:   { min: 12000, max: 20000 }
    };

    this.bandValues = {};
    this.energy = 0;
    this.prevEnergy = 0;
    this.energyHistory = new Float32Array(60);
    this.energyHistoryIndex = 0;
    this.isBeat = false;
    this.beatThreshold = 1.4;
    this.spectralFlux = 0;
    this.prevSpectrum = null;

    // Mood debouncing - prevent rapid mood switching
    this._currentMood = 'silence';
    this._moodHoldTimer = 0;       // time remaining before mood can change
    this._moodHoldDuration = 2.0;  // minimum seconds to hold a mood (was 4.0)
    this._candidateMood = null;
    this._candidateTimer = 0;      // how long the candidate mood has been consistent
    this._candidateThreshold = 0.6; // seconds a new mood must persist before switching (was 1.5)
    this._lastUpdateTime = 0;
    this.forcedMood = null;        // manual mood override (null = auto)
  }

  async init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.volume;
    this.gainNode.connect(this.ctx.destination);
    this.analyser.connect(this.gainNode);

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
    this.prevSpectrum = new Float32Array(this.analyser.frequencyBinCount);
  }

  /**
   * Reset mood debouncing state so the next track's mood is picked up quickly.
   */
  resetMood() {
    this._moodHoldTimer = 0;
    this._candidateMood = null;
    this._candidateTimer = 0;
    this.energyHistory.fill(0);
    this.energyHistoryIndex = 0;
    this.spectralFlux = 0;
  }

  async loadTrack(url) {
    // Reset mood state so the new track's character is detected quickly
    this.resetMood();

    // Stop current playback
    if (this.audioElement) {
      this.audioElement.pause();
      if (this.source) {
        this.source.disconnect();
      }
    }

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.src = url;

    // Resume context if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.source = this.ctx.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser);

    return new Promise((resolve, reject) => {
      this.audioElement.addEventListener('canplaythrough', () => resolve(), { once: true });
      this.audioElement.addEventListener('error', (e) => reject(e), { once: true });
      this.audioElement.load();
    });
  }

  play() {
    if (this.audioElement && this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.audioElement.play();
      this.isPlaying = true;
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.isPlaying = false;
    }
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  seek(fraction) {
    if (this.audioElement && this.audioElement.duration) {
      this.audioElement.currentTime = fraction * this.audioElement.duration;
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gainNode) this.gainNode.gain.value = this.volume;
  }

  get currentTime() {
    return this.audioElement ? this.audioElement.currentTime : 0;
  }

  get duration() {
    return this.audioElement ? this.audioElement.duration || 0 : 0;
  }

  get progress() {
    if (!this.audioElement || !this.audioElement.duration) return 0;
    return this.audioElement.currentTime / this.audioElement.duration;
  }

  get ended() {
    return this.audioElement ? this.audioElement.ended : false;
  }

  onEnded(callback) {
    if (this.audioElement) {
      this.audioElement.addEventListener('ended', callback);
    }
  }

  /**
   * Update audio analysis — call every frame
   */
  update() {
    if (!this.analyser) return;

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    const nyquist = this.ctx.sampleRate / 2;
    const binCount = this.analyser.frequencyBinCount;

    // Calculate frequency bands
    for (const [name, range] of Object.entries(this.bands)) {
      const startBin = Math.floor(range.min / nyquist * binCount);
      const endBin = Math.min(Math.floor(range.max / nyquist * binCount), binCount - 1);
      let sum = 0;
      let count = 0;
      for (let i = startBin; i <= endBin; i++) {
        sum += this.frequencyData[i];
        count++;
      }
      this.bandValues[name] = count > 0 ? (sum / count) / 255 : 0;
    }

    // Overall energy (RMS of time domain)
    this.prevEnergy = this.energy;
    let rms = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const v = (this.timeDomainData[i] - 128) / 128;
      rms += v * v;
    }
    this.energy = Math.sqrt(rms / this.timeDomainData.length);

    // Energy history for build detection
    this.energyHistory[this.energyHistoryIndex] = this.energy;
    this.energyHistoryIndex = (this.energyHistoryIndex + 1) % this.energyHistory.length;

    // Simple beat detection
    let avgEnergy = 0;
    for (let i = 0; i < this.energyHistory.length; i++) avgEnergy += this.energyHistory[i];
    avgEnergy /= this.energyHistory.length;
    this.isBeat = this.energy > avgEnergy * this.beatThreshold && this.energy > 0.05;

    // Spectral flux
    let flux = 0;
    for (let i = 0; i < binCount; i++) {
      const diff = this.frequencyData[i] / 255 - this.prevSpectrum[i];
      if (diff > 0) flux += diff;
      this.prevSpectrum[i] = this.frequencyData[i] / 255;
    }
    this.spectralFlux = flux / binCount;
  }

  /**
   * Raw instantaneous mood classification (internal use)
   */
  _classifyMoodRaw() {
    const e = this.energy;
    const bass = (this.bandValues.subBass || 0) + (this.bandValues.bass || 0);
    const mid = (this.bandValues.mid || 0) + (this.bandValues.lowMid || 0);
    const high = (this.bandValues.highMid || 0) + (this.bandValues.presence || 0) + (this.bandValues.treble || 0);

    // Detect builds (rising energy over recent history)
    let rising = 0;
    for (let i = 1; i < this.energyHistory.length; i++) {
      if (this.energyHistory[i] > this.energyHistory[i - 1]) rising++;
    }
    const isBuilding = rising > this.energyHistory.length * 0.7;

    // Detect silence / transition
    if (e < 0.01) return 'silence';
    if (isBuilding && e > 0.15) return 'building';

    // Glitch detection - raised threshold to avoid constant triggering
    if (this.spectralFlux > 0.12) return 'glitch';

    // Energy-based classification (lowered thresholds for more responsive mood changes)
    if (e < 0.04) {
      if (bass > mid) return 'cold_ambient';
      if (high > mid) return 'cold_ambient';
      return 'warm_ambient';
    }
    if (e < 0.12) {
      if (bass > mid * 1.5) return 'bass_heavy';
      if (high > bass) return 'ritualistic';
      return 'balanced_medium';
    }
    // High energy
    if (bass > mid * 1.5 && e > 0.2) return 'aggressive';
    if (e > 0.3) return 'chaos';
    return 'euphoric';
  }

  /**
   * Get the current "mood" classification for lighting program selection.
   * Uses debouncing: a new mood must persist for ~1.5s before switching,
   * and once switched, the mood is held for at least 4s.
   */
  /**
   * Set a forced mood override. Pass null to return to auto-detection.
   */
  setForcedMood(mood) {
    this.forcedMood = mood || null;
  }

  getMood() {
    // Manual override bypasses all classification
    if (this.forcedMood) return this.forcedMood;

    const now = performance.now() / 1000;
    const dt = this._lastUpdateTime > 0 ? now - this._lastUpdateTime : 0.016;
    this._lastUpdateTime = now;

    const rawMood = this._classifyMoodRaw();

    // Count down hold timer
    if (this._moodHoldTimer > 0) {
      this._moodHoldTimer -= dt;
    }

    // If raw mood matches current mood, reset candidate
    if (rawMood === this._currentMood) {
      this._candidateMood = null;
      this._candidateTimer = 0;
      return this._currentMood;
    }

    // Silence is allowed to transition immediately (track ended)
    if (rawMood === 'silence' && this.energy < 0.005) {
      this._currentMood = 'silence';
      this._moodHoldTimer = 1.0; // shorter hold for silence
      this._candidateMood = null;
      this._candidateTimer = 0;
      return this._currentMood;
    }

    // Still in hold period - don't switch
    if (this._moodHoldTimer > 0) {
      return this._currentMood;
    }

    // Track candidate mood consistency
    if (rawMood === this._candidateMood) {
      this._candidateTimer += dt;
    } else {
      this._candidateMood = rawMood;
      this._candidateTimer = 0;
    }

    // Switch only if candidate has been consistent long enough
    if (this._candidateTimer >= this._candidateThreshold) {
      this._currentMood = rawMood;
      this._moodHoldTimer = this._moodHoldDuration;
      this._candidateMood = null;
      this._candidateTimer = 0;
    }

    return this._currentMood;
  }
}
