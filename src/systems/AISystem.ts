import * as THREE from "three";
import { EntitySystem } from "./EntitySystem";

export class AISystem {
  private waveTimer = 24;
  private wave = 0;

  constructor(private readonly entities: EntitySystem) {}

  update(delta: number): void {
    this.waveTimer -= delta;
    if (this.waveTimer > 0) return;

    const enemyTownCenter = this.entities
      .buildings("enemy")
      .find((building) => building.buildingKind === "townCenter");
    const playerTownCenter = this.entities
      .buildings("player")
      .find((building) => building.buildingKind === "townCenter");
    if (!enemyTownCenter || !playerTownCenter) return;

    this.wave += 1;
    const count = Math.min(2 + this.wave, 6);
    for (let index = 0; index < count; index += 1) {
      const offset = new THREE.Vector3((index - count / 2) * 1.4, 0, -5 - (index % 2));
      const soldier = this.entities.createUnit(
        "soldier",
        "enemy",
        enemyTownCenter.object.position.clone().add(offset),
      );
      soldier.order = { type: "attack", targetId: playerTownCenter.id };
    }
    this.waveTimer = Math.max(22, 36 - this.wave * 2);
  }

  getStatus(): string {
    return `Next raid: ${Math.max(0, Math.ceil(this.waveTimer))}s`;
  }
}
