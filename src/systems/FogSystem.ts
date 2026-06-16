import * as THREE from "three";
import { MAP_SIZE } from "../config";
import type { GameEntity } from "../types";
import { EntitySystem } from "./EntitySystem";

const GRID_SIZE = 128;

export class FogSystem {
  private readonly canvas = document.createElement("canvas");
  private readonly context: CanvasRenderingContext2D;
  private readonly imageData: ImageData;
  private readonly explored = new Uint8Array(GRID_SIZE * GRID_SIZE);
  private readonly visible = new Uint8Array(GRID_SIZE * GRID_SIZE);
  private readonly texture: THREE.CanvasTexture;
  private updateTimer = 0;

  constructor(
    scene: THREE.Scene,
    private readonly entities: EntitySystem,
  ) {
    this.canvas.width = GRID_SIZE;
    this.canvas.height = GRID_SIZE;
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Fog canvas unavailable");
    this.context = context;
    this.imageData = context.createImageData(GRID_SIZE, GRID_SIZE);
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    const fog = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    fog.name = "fog";
    fog.rotation.x = -Math.PI / 2;
    fog.position.y = 0.12;
    fog.renderOrder = 12;
    scene.add(fog);
    this.refresh();
  }

  update(delta: number): void {
    this.updateTimer -= delta;
    if (this.updateTimer > 0) return;
    this.updateTimer = 0.18;
    this.refresh();
  }

  isVisible(entity: GameEntity): boolean {
    if (entity.team === "player") return true;
    return this.sample(this.visible, entity.object.position);
  }

  isExplored(entity: GameEntity): boolean {
    if (entity.team === "player") return true;
    return this.sample(this.explored, entity.object.position);
  }

  drawOnMinimap(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.save();
    context.globalAlpha = 0.78;
    context.drawImage(this.canvas, 0, 0, width, height);
    context.restore();
  }

  private refresh(): void {
    this.visible.fill(0);
    const sources = [
      ...this.entities.units("player").map((unit) => ({ position: unit.object.position, radius: 12 })),
      ...this.entities.buildings("player").map((building) => ({
        position: building.object.position,
        radius: building.buildingKind === "townCenter" ? 20 : 15,
      })),
    ];

    for (const source of sources) {
      const center = this.toGrid(source.position);
      const gridRadius = Math.ceil((source.radius / MAP_SIZE) * GRID_SIZE);
      for (let y = Math.max(0, center.y - gridRadius); y <= Math.min(GRID_SIZE - 1, center.y + gridRadius); y += 1) {
        for (let x = Math.max(0, center.x - gridRadius); x <= Math.min(GRID_SIZE - 1, center.x + gridRadius); x += 1) {
          const dx = x - center.x;
          const dy = y - center.y;
          if (dx * dx + dy * dy > gridRadius * gridRadius) continue;
          const index = y * GRID_SIZE + x;
          this.visible[index] = 1;
          this.explored[index] = 1;
        }
      }
    }

    const data = this.imageData.data;
    for (let index = 0; index < this.explored.length; index += 1) {
      const offset = index * 4;
      data[offset] = 7;
      data[offset + 1] = 12;
      data[offset + 2] = 11;
      data[offset + 3] = this.visible[index] ? 0 : this.explored[index] ? 120 : 238;
    }
    this.context.putImageData(this.imageData, 0, 0);
    this.texture.needsUpdate = true;

    for (const entity of this.entities.all()) {
      if (entity.team === "enemy") entity.object.visible = this.isVisible(entity);
      if (entity.team === "neutral") entity.object.visible = this.isExplored(entity);
    }
  }

  private sample(grid: Uint8Array, position: THREE.Vector3): boolean {
    const point = this.toGrid(position);
    return grid[point.y * GRID_SIZE + point.x] === 1;
  }

  private toGrid(position: THREE.Vector3): { x: number; y: number } {
    return {
      x: THREE.MathUtils.clamp(Math.floor(((position.x + MAP_SIZE / 2) / MAP_SIZE) * GRID_SIZE), 0, GRID_SIZE - 1),
      y: THREE.MathUtils.clamp(Math.floor(((position.z + MAP_SIZE / 2) / MAP_SIZE) * GRID_SIZE), 0, GRID_SIZE - 1),
    };
  }
}
