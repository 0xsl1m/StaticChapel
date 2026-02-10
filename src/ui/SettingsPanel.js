/**
 * SettingsPanel - Quality and effect settings
 */
export class SettingsPanel {
  constructor() {
    this.panel = document.getElementById('settings-panel');
    this.settingsBtn = document.getElementById('settings-btn');

    this.values = {
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

    this.onChange = null;
    this.setup();
  }

  setup() {
    // Toggle panel
    this.settingsBtn.addEventListener('click', () => {
      this.panel.classList.toggle('open');
    });

    // Sliders
    this._slider('fog-density', (v) => { this.values.fogDensity = v / 100; });
    this._slider('light-intensity', (v) => { this.values.lightIntensity = v / 100; });
    this._slider('particle-count', (v) => { this.values.particleCount = v / 100; });
    this._slider('camera-fov', (v) => { this.values.cameraFov = v; }, false);

    // Toggles
    this._toggle('toggle-godrays', (v) => { this.values.godRays = v; });
    this._toggle('toggle-candles', (v) => { this.values.candles = v; });
    this._toggle('toggle-stagefog', (v) => { this.values.stageFog = v; });
    this._toggle('toggle-fps', (v) => { this.values.showFps = v; });
    this._toggle('toggle-mood', (v) => { this.values.showMood = v; });
  }

  _slider(id, callback, isPercent = true) {
    const slider = document.getElementById(id);
    const valDisplay = document.getElementById(id + '-val');
    if (!slider) return;

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      if (valDisplay) {
        valDisplay.textContent = isPercent ? `${Math.round(v)}%` : `${Math.round(v)}`;
      }
      callback(v);
      if (this.onChange) this.onChange(this.values);
    });
  }

  _toggle(id, callback) {
    const toggle = document.getElementById(id);
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const isOn = toggle.classList.toggle('on');
      callback(isOn);
      if (this.onChange) this.onChange(this.values);
    });
  }
}
