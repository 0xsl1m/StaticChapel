/**
 * XRManager - WebXR session management + thumbstick locomotion for Quest 3
 *
 * Handles:
 *  - VR session lifecycle (enter/exit)
 *  - Thumbstick-based smooth locomotion (left stick = move, right stick = snap turn)
 *  - Camera rig positioning so the user can walk around the cathedral
 *  - Bounds clamping to keep the user inside the nave
 */
import * as THREE from 'three';

export class XRManager {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;
    this.session = null;
    this.isPresenting = false;
    this.supported = false;
    this.button = document.getElementById('vr-button');

    // Camera rig — moves the whole XR camera group through the scene
    this.cameraRig = new THREE.Group();
    this.cameraRig.name = 'xrCameraRig';
    this.cameraRig.add(camera);

    // Locomotion settings
    this.moveSpeed = 4.0;      // meters per second
    this.snapAngle = Math.PI / 6; // 30 degree snap turns
    this.snapCooldown = 0;     // prevent rapid snap turning
    this.deadzone = 0.15;      // thumbstick dead zone

    // Bounds (same as Controls.js — stay inside cathedral)
    this.bounds = {
      minX: -15, maxX: 15,
      minZ: -29, maxZ: 28,
    };

    // Reusable vectors
    this._moveDir = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();

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
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking']
      });

      // Set the reference space type — local-floor gives us y=0 at floor level
      this.renderer.xr.setReferenceSpaceType('local-floor');
      await this.renderer.xr.setSession(this.session);

      this.isPresenting = true;
      if (this.button) this.button.textContent = 'EXIT VR';

      // Save desktop camera state, then reset for VR
      // In VR, the XR system controls head position via local-floor reference space.
      // The camera rig position determines where "you" are in the cathedral.
      this._savedCameraPos = this.camera.position.clone();
      this._savedCameraQuat = this.camera.quaternion.clone();
      this.camera.position.set(0, 0, 0);
      this.camera.quaternion.identity();

      // Position the rig at the starting location
      this.cameraRig.position.set(0, 0, -15);
      this.cameraRig.rotation.set(0, 0, 0);

      this.session.addEventListener('end', () => {
        this.isPresenting = false;
        this.session = null;
        if (this.button) this.button.textContent = 'ENTER VR';

        // Restore desktop camera state
        if (this._savedCameraPos) {
          this.camera.position.copy(this._savedCameraPos);
          this.camera.quaternion.copy(this._savedCameraQuat);
        }
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

  /**
   * Called every frame from the main animate loop.
   * Reads XR controller thumbstick input and moves the camera rig.
   * @param {number} delta - frame delta in seconds
   */
  update(delta) {
    if (!this.isPresenting) return;

    const session = this.renderer.xr.getSession();
    if (!session) return;

    // Decrease snap turn cooldown
    if (this.snapCooldown > 0) this.snapCooldown -= delta;

    let moveX = 0, moveY = 0;   // left stick
    let lookX = 0;               // right stick horizontal (snap turn)

    // Read input from XR controllers
    for (const source of session.inputSources) {
      if (!source.gamepad) continue;
      const gp = source.gamepad;

      // Standard XR gamepad: axes[2]=thumbstick X, axes[3]=thumbstick Y
      // Some controllers use axes[0] and axes[1] for the primary thumbstick
      const axisX = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0];
      const axisY = gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1];

      if (source.handedness === 'left') {
        // Left stick = movement
        if (Math.abs(axisX) > this.deadzone) moveX = axisX;
        if (Math.abs(axisY) > this.deadzone) moveY = axisY;
      } else if (source.handedness === 'right') {
        // Right stick = snap turn
        if (Math.abs(axisX) > this.deadzone) lookX = axisX;
      }
    }

    // --- Snap turn (right stick) ---
    if (Math.abs(lookX) > 0.6 && this.snapCooldown <= 0) {
      const snapDir = lookX > 0 ? -1 : 1;
      this.cameraRig.rotation.y += snapDir * this.snapAngle;
      this.snapCooldown = 0.3; // 300ms cooldown between snaps
    }

    // --- Smooth locomotion (left stick) ---
    if (Math.abs(moveX) > 0 || Math.abs(moveY) > 0) {
      // Get camera's forward direction in world space (flattened to XZ)
      const xrCamera = this.renderer.xr.getCamera();
      xrCamera.getWorldDirection(this._forward);
      this._forward.y = 0;
      this._forward.normalize();

      // Right vector
      this._right.crossVectors(this._forward, THREE.Object3D.DEFAULT_UP).normalize();

      // Build movement vector
      this._moveDir.set(0, 0, 0);
      this._moveDir.addScaledVector(this._right, moveX);
      this._moveDir.addScaledVector(this._forward, -moveY); // -Y = forward on thumbstick

      // Apply speed and delta
      this._moveDir.multiplyScalar(this.moveSpeed * delta);

      // Move the rig
      this.cameraRig.position.add(this._moveDir);

      // Clamp to bounds
      this.cameraRig.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.cameraRig.position.x));
      this.cameraRig.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.cameraRig.position.z));
    }
  }
}
