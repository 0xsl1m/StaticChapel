/**
 * PlaylistManager - Manages the 23-track Static Chapel album
 */
export class PlaylistManager {
  constructor(audioEngine) {
    this.audio = audioEngine;
    this.currentIndex = 0;
    this.shuffle = false;
    this.shuffleOrder = [];
    this.onTrackChange = null;

    this.tracks = [
      { id: 1,  title: 'Static Chapel',           file: 'StaticChapel-mastered.wav' },
      { id: 2,  title: 'Circuit Breaker',          file: 'CircuitBreaker-mastered.wav' },
      { id: 3,  title: 'Tunnel Bass Riddim',       file: 'TunnelBassRiddim-mastered.wav' },
      { id: 4,  title: 'Gelato',                   file: 'Gelato-mastered.wav' },
      { id: 5,  title: 'Adventure Time',           file: 'AdventureTime-mastered.wav' },
      { id: 6,  title: 'Cut It',                   file: 'CutIt-mastered.wav' },
      { id: 7,  title: 'Sermon',                   file: 'Sermon-mastered.wav' },
      { id: 8,  title: 'Cloud 7 Bounce',           file: 'Cloud7Bounce-mastered.wav' },
      { id: 9,  title: 'Pixelated Halo',           file: 'PixelatedHalo-mastered.wav' },
      { id: 10, title: 'First Bass Man',            file: 'FirstBassMan-mastered.wav' },
      { id: 11, title: 'Heart Monitor',             file: 'HeartMonitor-mastered.wav' },
      { id: 12, title: 'Organ Failure',             file: 'OrganFailure-mastered.wav' },
      { id: 13, title: 'Thunder in the Basement',   file: 'ThunderintheBasement-mastered.wav' },
      { id: 14, title: 'Safe Room',                 file: 'SafeRoom-mastered.wav' },
      { id: 15, title: 'Storm Cellar',              file: 'StormCellar-mastered.wav' },
      { id: 16, title: 'Howard St.',                file: 'HowardSt-mastered.wav' },
      { id: 17, title: 'Civil Alert',               file: 'CivilAlert-mastered.wav' },
      { id: 18, title: 'Righteous',                 file: 'Righteous-mastered.wav' },
      { id: 19, title: 'Waiting Room',              file: 'WaitingRoom-mastered.wav' },
      { id: 20, title: 'Wook Fishing',              file: 'WookFishing-mastered.wav' },
      { id: 21, title: 'To the Top',                file: 'TotheTop-mastered.wav' },
      { id: 22, title: 'Along the Road',            file: 'AlongtheRoad-mastered.wav' },
      { id: 23, title: 'Skrillexed',                file: 'Skrillexed-mastered.wav' }
    ];
  }

  get currentTrack() {
    const idx = this.shuffle ? this.shuffleOrder[this.currentIndex] : this.currentIndex;
    return this.tracks[idx];
  }

  get trackCount() {
    return this.tracks.length;
  }

  generateShuffleOrder() {
    this.shuffleOrder = Array.from({ length: this.tracks.length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
    }
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    if (this.shuffle) this.generateShuffleOrder();
    return this.shuffle;
  }

  async loadTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;
    this.currentIndex = index;
    const track = this.currentTrack;
    const url = `/assets/audio/${track.file}`;
    await this.audio.loadTrack(url);

    // Set up auto-advance
    this.audio.onEnded(() => this.next());

    if (this.onTrackChange) {
      this.onTrackChange(track, this.getDisplayIndex());
    }
  }

  getDisplayIndex() {
    const idx = this.shuffle ? this.shuffleOrder[this.currentIndex] : this.currentIndex;
    return idx;
  }

  async play(index) {
    if (index !== undefined) {
      await this.loadTrack(index);
    }
    this.audio.play();
  }

  async next() {
    const nextIdx = (this.currentIndex + 1) % this.tracks.length;
    await this.loadTrack(nextIdx);
    this.audio.play();
  }

  async prev() {
    // If more than 3 seconds in, restart current track
    if (this.audio.currentTime > 3) {
      this.audio.seek(0);
      return;
    }
    const prevIdx = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length;
    await this.loadTrack(prevIdx);
    this.audio.play();
  }
}
