import * as THREE from "three";
import { DIFFICULTY_LABELS, DIFFICULTY_SETTINGS } from "../config";
import { EntitySystem } from "./EntitySystem";
import type { DifficultyLevel } from "../types";

export class AISystem {
  private waveTimer: number;
  private wave = 0;

  constructor(
    private readonly entities: EntitySystem,
    private difficulty: DifficultyLevel,
  ) {
    this.waveTimer = DIFFICULTY_SETTINGS[this.difficulty].initialRaidDelay;
  }

  setDifficulty(difficulty: DifficultyLevel): void {
    this.difficulty = difficulty;
    this.waveTimer = DIFFICULTY_SETTINGS[difficulty].initialRaidDelay;
  }

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
    const settings = DIFFICULTY_SETTINGS[this.difficulty];
    const count = Math.min(settings.waveBase + this.wave * settings.waveGrowth, settings.waveCap);
    for (let index = 0; index < count; index += 1) {
      const offset = new THREE.Vector3((index - count / 2) * 1.4, 0, -5 - (index % 2));
      const soldier = this.entities.createUnit(
        "soldier",
        "enemy",
        enemyTownCenter.object.position.clone().add(offset),
      );
      soldier.order = { type: "attack", targetId: playerTownCenter.id };
    }
    this.waveTimer = Math.max(
      settings.minimumRaidDelay,
      settings.initialRaidDelay - this.wave * settings.raidDelayDecay,
    );
  }

  getStatus(): string {
    return `Enemy pace: ${DIFFICULTY_LABELS[this.difficulty]} · Next raid in ${Math.max(0, Math.ceil(this.waveTimer))}s`;
  }
}
