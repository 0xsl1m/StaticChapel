/**
 * Controls - Multi-platform input controls (desktop, mobile, VR)
 * Provides WASD + mouse look, touch controls for mobile, and VR teleport.
 *
 * Uses direct yaw/pitch tracking to avoid quaternion extraction drift.
 */
import * as THREE from 'three';

export class Controls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.enabled = true;
    this.isLocked = false;

    // Movement
    this.moveSpeed = 5;
    this.sprintMultiplier = 2;
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isSprinting = false;

    // Mouse look
    this.sensitivity = 0.002;
    this.yaw = 0;
    this.pitch = 0;
    this.maxPitch = Math.PI / 2.5; // ±72 degrees

    // Movement vectors (reused, no allocations per frame)
    this._direction = new THREE.Vector3();
    this._velocity = new THREE.Vector3();
    this._right = new THREE.Vector3();

    // Bounds (stay inside cathedral)
    this.bounds = {
      minX: -15, maxX: 15,
      minZ: -29, maxZ: 28,
      y: 1.7
    };

    // Touch input state
    this._touchLookId = null;
    this._touchMoveId = null;
    this._touchLookStart = { x: 0, y: 0 };
    this._touchMoveStart = { x: 0, y: 0 };
    this._touchMoveVec = { x: 0, y: 0 };
    this._isMobile = 'ontouchstart' in window;

    // Initialize yaw from camera's forward direction (ignore lookAt pitch)
    // Camera default looks down -Z, so forward = (-sin(yaw), 0, -cos(yaw))
    // Solving for yaw: yaw = atan2(-dir.x, -dir.z)
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    this.yaw = Math.atan2(-dir.x, -dir.z);
    this.pitch = 0; // start level — no upward gaze
    this._applyRotation();

    if (this._isMobile) {
      this._setupTouch();
    } else {
      this._setupPointerLock();
      this._setupKeyboard();
    }
  }

  _applyRotation() {
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  // ===== DESKTOP: Pointer Lock + Keyboard =====

  _setupPointerLock() {
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked || !this.enabled) return;

      // Raw movement with reasonable sensitivity
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
      this._applyRotation();
    });
  }

  _setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    this.moveForward = true; break;
        case 'KeyS': case 'ArrowDown':  this.moveBackward = true; break;
        case 'KeyA': case 'ArrowLeft':  this.moveLeft = true; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = true; break;
        case 'ShiftLeft': case 'ShiftRight': this.isSprinting = true; break;
      }
    });

    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    this.moveForward = false; break;
        case 'KeyS': case 'ArrowDown':  this.moveBackward = false; break;
        case 'KeyA': case 'ArrowLeft':  this.moveLeft = false; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.isSprinting = false; break;
      }
    });
  }

  // ===== MOBILE: Touch Controls =====

  _setupTouch() {
    const el = this.domElement;

    el.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      for (const touch of e.changedTouches) {
        const x = touch.clientX;
        const halfW = window.innerWidth / 2;

        if (x < halfW && this._touchMoveId === null) {
          // Left half = movement joystick
          this._touchMoveId = touch.identifier;
          this._touchMoveStart.x = touch.clientX;
          this._touchMoveStart.y = touch.clientY;
          this._touchMoveVec.x = 0;
          this._touchMoveVec.y = 0;
        } else if (x >= halfW && this._touchLookId === null) {
          // Right half = look
          this._touchLookId = touch.identifier;
          this._touchLookStart.x = touch.clientX;
          this._touchLookStart.y = touch.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
      if (!this.enabled) return;
      for (const touch of e.changedTouches) {
        if (touch.identifier === this._touchLookId) {
          const dx = touch.clientX - this._touchLookStart.x;
          const dy = touch.clientY - this._touchLookStart.y;
          this._touchLookStart.x = touch.clientX;
          this._touchLookStart.y = touch.clientY;

          this.yaw -= dx * 0.004;
          this.pitch -= dy * 0.004;
          this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
          this._applyRotation();
        }
        if (touch.identifier === this._touchMoveId) {
          const dx = touch.clientX - this._touchMoveStart.x;
          const dy = touch.clientY - this._touchMoveStart.y;
          // Normalize to -1..1 with 60px dead zone radius
          const maxDist = 80;
          this._touchMoveVec.x = Math.max(-1, Math.min(1, dx / maxDist));
          this._touchMoveVec.y = Math.max(-1, Math.min(1, dy / maxDist));
        }
      }
      e.preventDefault();
    }, { passive: false });

    const endTouch = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this._touchLookId) {
          this._touchLookId = null;
        }
        if (touch.identifier === this._touchMoveId) {
          this._touchMoveId = null;
          this._touchMoveVec.x = 0;
          this._touchMoveVec.y = 0;
        }
      }
    };
    el.addEventListener('touchend', endTouch);
    el.addEventListener('touchcancel', endTouch);
  }

  // ===== Frame Update =====

  update(delta) {
    if (!this.enabled) return;

    const speed = this.moveSpeed * (this.isSprinting ? this.sprintMultiplier : 1) * delta;

    // Forward/right vectors flattened to XZ
    this.camera.getWorldDirection(this._direction);
    this._direction.y = 0;
    this._direction.normalize();
    this._right.crossVectors(this._direction, this.camera.up).normalize();

    this._velocity.set(0, 0, 0);

    // Desktop keyboard
    if (this.moveForward)  this._velocity.addScaledVector(this._direction, speed);
    if (this.moveBackward) this._velocity.addScaledVector(this._direction, -speed);
    if (this.moveLeft)     this._velocity.addScaledVector(this._right, -speed);
    if (this.moveRight)    this._velocity.addScaledVector(this._right, speed);

    // Mobile touch joystick
    if (this._touchMoveId !== null) {
      const tx = this._touchMoveVec.x;
      const ty = this._touchMoveVec.y;
      // Dead zone
      if (Math.abs(tx) > 0.15 || Math.abs(ty) > 0.15) {
        this._velocity.addScaledVector(this._direction, -ty * speed);
        this._velocity.addScaledVector(this._right, tx * speed);
      }
    }

    this.camera.position.add(this._velocity);

    // Clamp to bounds
    this.camera.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.camera.position.x));
    this.camera.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.camera.position.z));
    this.camera.position.y = this.bounds.y;
  }
}
