import * as THREE from 'three';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3 = new THREE.Vector3();
  public distance: number = 5.5;
  public minDistance: number = 2.5;
  public maxDistance: number = 10.0;
  public pitch: number = 0.25; // radians up/down
  public yaw: number = 0; // radians around player
  public shakeIntensity: number = 0;
  public shakeTimer: number = 0;
  public isLockedOn: boolean = false;
  public lockedTarget: THREE.Vector3 | null = null;
  public burstZoom: number = 0; // for cinematic burst closeups

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public handleMouseMove(dx: number, dy: number, sensitivity: number = 0.003) {
    if (this.isLockedOn && this.lockedTarget) {
      // Let lock-on control orientation
      return;
    }
    this.yaw -= dx * sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * sensitivity, -0.4, 1.1);
  }

  public handleZoom(delta: number) {
    this.distance = THREE.MathUtils.clamp(this.distance + delta * 0.005, this.minDistance, this.maxDistance);
  }

  public triggerShake(intensity: number = 0.4, duration: number = 0.25) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  public triggerBurstCinematic(zoomFactor: number = 2.0) {
    this.burstZoom = zoomFactor;
  }

  public update(dt: number, playerPosition: THREE.Vector3, getTerrainHeight: (x: number, z: number) => number) {
    // Decay shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) this.shakeIntensity = 0;
    }

    // Decay burst zoom
    if (this.burstZoom > 0) {
      this.burstZoom = Math.max(0, this.burstZoom - dt * 2.5);
    }

    // Follow target lerp
    const lookOffset = new THREE.Vector3(0, 1.45, 0);
    this.target.lerp(playerPosition.clone().add(lookOffset), 1 - Math.exp(-12 * dt));

    if (this.isLockedOn && this.lockedTarget) {
      // Direct camera towards locked enemy
      const toEnemy = this.lockedTarget.clone().sub(this.target);
      this.yaw = Math.atan2(toEnemy.x, toEnemy.z);
      this.pitch = 0.2;
    }

    // Compute desired camera position in spherical coordinates
    const curDist = Math.max(1.8, this.distance - this.burstZoom);
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);

    const offsetX = Math.sin(this.yaw) * cosPitch * curDist;
    const offsetZ = Math.cos(this.yaw) * cosPitch * curDist;
    const offsetY = sinPitch * curDist;

    const desiredPos = this.target.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));

    // Collision avoidance with terrain
    const groundY = getTerrainHeight(desiredPos.x, desiredPos.z) + 0.5;
    if (desiredPos.y < groundY) {
      desiredPos.y = groundY;
    }

    // Apply screen shake
    if (this.shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      const sz = (Math.random() - 0.5) * this.shakeIntensity;
      desiredPos.add(new THREE.Vector3(sx, sy, sz));
    }

    this.camera.position.lerp(desiredPos, 1 - Math.exp(-20 * dt));
    this.camera.lookAt(this.target);
  }
}
