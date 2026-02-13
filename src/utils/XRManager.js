/**
 * XRManager - WebXR session management + professional locomotion for Quest 3
 *
 * Handles:
 *  - VR session lifecycle (enter/exit)
 *  - Smooth locomotion with acceleration/deceleration curves (left stick)
 *  - Snap turn with cooldown (right stick)
 *  - Camera rig positioning so the user can walk around the cathedral
 *  - Comfort vignette during fast movement
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

    // --- Locomotion tuning (professional VR dynamics) ---
    this.maxSpeed = 3.5;          // meters per second at full stick deflection
    this.sprintSpeed = 5.5;       // meters per second when stick fully pushed + sprint
    this.acceleration = 8.0;      // how fast we ramp up to target speed (m/s²)
    this.deceleration = 12.0;     // how fast we slow down when stick released (m/s²)
    this.stickCurve = 2.0;        // power curve on stick deflection (2.0 = quadratic)
    this.currentSpeed = 0;        // current interpolated speed

    // Snap turn
    this.snapAngle = Math.PI / 6;   // 30 degree snap turns
    this.snapCooldown = 0;          // prevent rapid snap turning
    this.snapThreshold = 0.6;       // stick deflection threshold for snap

    // Thumbstick dead zone
    this.deadzone = 0.15;

    // Bounds (same as Controls.js — stay inside cathedral)
    this.bounds = {
      minX: -15, maxX: 15,
      minZ: -29, maxZ: 28,
    };

    // Current movement direction (smoothed)
    this._currentMoveDir = new THREE.Vector3();
    this._targetMoveDir = new THREE.Vector3();

    // Reusable vectors
    this._moveDir = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();

    // Comfort vignette for fast movement
    this._comfortVignette = null;
    this._vignetteIntensity = 0;

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
      this._savedCameraPos = this.camera.position.clone();
      this._savedCameraQuat = this.camera.quaternion.clone();
      this.camera.position.set(0, 0, 0);
      this.camera.quaternion.identity();

      // Position the rig at the starting location
      this.cameraRig.position.set(0, 0, -15);
      this.cameraRig.rotation.set(0, 0, 0);

      // Reset movement state
      this.currentSpeed = 0;
      this._currentMoveDir.set(0, 0, 0);

      this.session.addEventListener('end', () => {
        this.isPresenting = false;
        this.session = null;
        if (this.button) this.button.textContent = 'ENTER VR';

        // Restore desktop camera state
        if (this._savedCameraPos) {
          this.camera.position.copy(this._savedCameraPos);
          this.camera.quaternion.copy(this._savedCameraQuat);
        }

        // Reset speed
        this.currentSpeed = 0;
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
   * Reads XR controller thumbstick input and moves the camera rig
   * with professional acceleration/deceleration dynamics.
   * @param {number} delta - frame delta in seconds
   */
  update(delta) {
    if (!this.isPresenting) return;

    const session = this.renderer.xr.getSession();
    if (!session) return;

    // Decrease snap turn cooldown
    if (this.snapCooldown > 0) this.snapCooldown -= delta;

    let moveX = 0, moveY = 0;   // combined stick movement
    let snapX = 0;               // right stick horizontal for snap turn

    // Read input from XR controllers
    // Both sticks can move. Right stick horizontal also does snap turn.
    for (const source of session.inputSources) {
      if (!source.gamepad) continue;
      const gp = source.gamepad;

      // Standard XR gamepad: axes[2]=thumbstick X, axes[3]=thumbstick Y
      // Some controllers use axes[0] and axes[1]
      const axisX = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0];
      const axisY = gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1];

      if (source.handedness === 'left') {
        // Left stick = movement only
        if (Math.abs(axisX) > this.deadzone) moveX += axisX;
        if (Math.abs(axisY) > this.deadzone) moveY += axisY;
      } else if (source.handedness === 'right') {
        // Right stick = movement + snap turn on horizontal axis
        if (Math.abs(axisY) > this.deadzone) moveY += axisY;
        if (Math.abs(axisX) > this.deadzone) {
          snapX = axisX;
          moveX += axisX;
        }
      }
    }

    // Clamp combined input to -1..1
    moveX = Math.max(-1, Math.min(1, moveX));
    moveY = Math.max(-1, Math.min(1, moveY));

    // --- Snap turn (right stick horizontal) ---
    if (Math.abs(snapX) > this.snapThreshold && this.snapCooldown <= 0) {
      const snapDir = snapX > 0 ? -1 : 1;
      this.cameraRig.rotation.y += snapDir * this.snapAngle;
      this.snapCooldown = 0.3;
    }

    // --- Smooth locomotion (either stick) ---

    // Calculate raw stick magnitude (0-1) with deadzone remapping
    const rawMag = Math.sqrt(moveX * moveX + moveY * moveY);
    const stickMagnitude = rawMag > this.deadzone
      ? Math.min(1.0, (rawMag - this.deadzone) / (1.0 - this.deadzone))
      : 0;

    // Apply power curve for finer low-speed control
    const curvedMagnitude = Math.pow(stickMagnitude, this.stickCurve);

    // Target speed
    const targetSpeed = curvedMagnitude * this.maxSpeed;

    // Smoothly interpolate current speed toward target
    if (targetSpeed > this.currentSpeed) {
      this.currentSpeed = Math.min(targetSpeed, this.currentSpeed + this.acceleration * delta);
    } else {
      this.currentSpeed = Math.max(targetSpeed, this.currentSpeed - this.deceleration * delta);
    }

    // Kill tiny residual speed
    if (this.currentSpeed < 0.01) this.currentSpeed = 0;

    if (this.currentSpeed > 0 && stickMagnitude > 0) {
      // Camera forward in world XZ
      const xrCamera = this.renderer.xr.getCamera();
      xrCamera.getWorldDirection(this._forward);
      this._forward.y = 0;
      this._forward.normalize();

      // Right vector
      this._right.crossVectors(this._forward, THREE.Object3D.DEFAULT_UP).normalize();

      // Build movement direction from stick input
      // WebXR axes[3]: negative = push forward, positive = pull back
      // So negate moveY to make push-forward = move forward
      this._targetMoveDir.set(0, 0, 0);
      this._targetMoveDir.addScaledVector(this._right, moveX);
      this._targetMoveDir.addScaledVector(this._forward, -moveY);
      this._targetMoveDir.normalize();

      // Smooth direction blending
      const dirBlend = 1.0 - Math.pow(0.001, delta);
      this._currentMoveDir.lerp(this._targetMoveDir, dirBlend);
      this._currentMoveDir.normalize();

      // Apply displacement
      this._moveDir.copy(this._currentMoveDir).multiplyScalar(this.currentSpeed * delta);
      this.cameraRig.position.add(this._moveDir);

      // Clamp to bounds
      this.cameraRig.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.cameraRig.position.x));
      this.cameraRig.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.cameraRig.position.z));
    } else if (this.currentSpeed > 0) {
      // Decelerating coast
      this._moveDir.copy(this._currentMoveDir).multiplyScalar(this.currentSpeed * delta);
      this.cameraRig.position.add(this._moveDir);

      this.cameraRig.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.cameraRig.position.x));
      this.cameraRig.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.cameraRig.position.z));
    }
  }
}
