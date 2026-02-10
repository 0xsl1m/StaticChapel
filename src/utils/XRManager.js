/**
 * XRManager - WebXR session management for VR
 */
export class XRManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.session = null;
    this.isPresenting = false;
    this.supported = false;
    this.button = document.getElementById('vr-button');

    this.checkSupport();
  }

  async checkSupport() {
    if ('xr' in navigator) {
      try {
        this.supported = await navigator.xr.isSessionSupported('immersive-vr');
      } catch (e) {
        this.supported = false;
      }
    }

    if (this.supported && this.button) {
      this.button.style.display = 'block';
      this.button.textContent = 'ENTER VR';
      this.button.addEventListener('click', () => this.toggleVR());
    }
  }

  async toggleVR() {
    if (this.isPresenting) {
      await this.exitVR();
    } else {
      await this.enterVR();
    }
  }

  async enterVR() {
    if (!this.supported) return;
    try {
      this.session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
      });
      this.renderer.xr.setSession(this.session);
      this.isPresenting = true;
      if (this.button) this.button.textContent = 'EXIT VR';

      this.session.addEventListener('end', () => {
        this.isPresenting = false;
        this.session = null;
        if (this.button) this.button.textContent = 'ENTER VR';
      });
    } catch (e) {
      console.error('Failed to enter VR:', e);
    }
  }

  async exitVR() {
    if (this.session) {
      await this.session.end();
    }
  }
}
