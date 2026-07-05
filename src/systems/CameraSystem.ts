import * as THREE from "three";
import { MAP_SIZE } from "../config";

export class CameraSystem {
  readonly camera: THREE.PerspectiveCamera;
  private readonly target = new THREE.Vector3(-28, 0, 26);
  private readonly desiredTarget = this.target.clone();
  private yaw = -0.7;
  private desiredYaw = this.yaw;
  private distance = 34;
  private desiredDistance = this.distance;
  private readonly keys = new Set<string>();
  private edgeX = 0;
  private edgeY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 260);
    this.updateCamera();

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
    window.addEventListener("keydown", (event) => this.keys.add(event.code));
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    window.addEventListener("blur", () => this.keys.clear());
    canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        this.desiredDistance = THREE.MathUtils.clamp(this.desiredDistance + event.deltaY * 0.018, 15, 52);
      },
      { passive: false },
    );
    canvas.addEventListener("mousemove", (event) => {
      const margin = 12;
      this.edgeX = event.clientX < margin ? -1 : event.clientX > window.innerWidth - margin ? 1 : 0;
      this.edgeY = event.clientY < margin ? 1 : event.clientY > window.innerHeight - margin ? -1 : 0;
    });
  }

  update(delta: number): void {
    let horizontal = this.edgeX;
    let vertical = this.edgeY;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) horizontal -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) horizontal += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) vertical += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) vertical -= 1;
    if (this.keys.has("KeyZ")) this.desiredYaw += delta * 1.15;
    if (this.keys.has("KeyX")) this.desiredYaw -= delta * 1.15;

    const speed = 20 * delta * (this.desiredDistance / 34);
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    this.desiredTarget.addScaledVector(forward, vertical * speed);
    // Horizontal screen movement is intentionally mapped so rightward input
    // pans the view right instead of mirroring the terrain movement.
    this.desiredTarget.addScaledVector(right, -horizontal * speed);
    const bound = MAP_SIZE * 0.44;
    this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, -bound, bound);
    this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, -bound, bound);

    this.target.lerp(this.desiredTarget, 1 - Math.exp(-delta * 9));
    this.yaw = THREE.MathUtils.lerp(this.yaw, this.desiredYaw, 1 - Math.exp(-delta * 8));
    this.distance = THREE.MathUtils.lerp(this.distance, this.desiredDistance, 1 - Math.exp(-delta * 9));
    this.updateCamera();
  }

  focus(position: THREE.Vector3): void {
    this.desiredTarget.copy(position);
  }

  private updateCamera(): void {
    const horizontalDistance = this.distance * 0.72;
    this.camera.position.set(
      this.target.x - Math.sin(this.yaw) * horizontalDistance,
      this.distance * 0.72,
      this.target.z - Math.cos(this.yaw) * horizontalDistance,
    );
    this.camera.lookAt(this.target.x, 0, this.target.z);
  }
}
