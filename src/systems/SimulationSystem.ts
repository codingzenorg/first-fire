import * as THREE from "three";
import type { Building, GameEntity, ResourceNode, Team, Unit } from "../types";
import { EntitySystem } from "./EntitySystem";
import { ResourceSystem } from "./ResourceSystem";
import { AudioSystem } from "./AudioSystem";
import { EffectsSystem } from "./EffectsSystem";

const tempDirection = new THREE.Vector3();

export class SimulationSystem {
  private canTarget: (entity: GameEntity) => boolean = () => true;

  constructor(
    private readonly entities: EntitySystem,
    private readonly resources: ResourceSystem,
    private readonly audio: AudioSystem,
    private readonly effects: EffectsSystem,
  ) {}

  setTargetVisibility(predicate: (entity: GameEntity) => boolean): void {
    this.canTarget = predicate;
  }

  update(delta: number): void {
    for (const unit of this.entities.units()) {
      unit.attackTimer = Math.max(0, unit.attackTimer - delta);
      this.updateUnit(unit, delta);
    }
    for (const building of this.entities.buildings()) {
      this.updateBuilding(building, delta);
    }
  }

  private updateUnit(unit: Unit, delta: number): void {
    switch (unit.order.type) {
      case "move":
        if (this.moveToward(unit, unit.order.target, delta, 0.3)) unit.order = { type: "idle" };
        break;
      case "gather":
        this.gather(unit, unit.order.targetId, delta);
        break;
      case "attack":
        this.attack(unit, unit.order.targetId, delta);
        break;
      case "build":
        this.build(unit, unit.order.targetId, delta);
        break;
      case "idle":
        if (unit.team === "enemy" || unit.unitKind === "soldier") this.acquireTarget(unit);
        break;
    }
  }

  private moveToward(unit: Unit, target: THREE.Vector3, delta: number, stopDistance: number): boolean {
    tempDirection.subVectors(target, unit.object.position);
    tempDirection.y = 0;
    const distance = tempDirection.length();
    if (distance <= stopDistance) return true;
    tempDirection.normalize();
    unit.object.position.addScaledVector(tempDirection, Math.min(unit.speed * delta, distance));
    unit.object.rotation.y = Math.atan2(tempDirection.x, tempDirection.z);
    return false;
  }

  private gather(unit: Unit, targetId: number, delta: number): void {
    if (unit.unitKind !== "villager") {
      unit.order = { type: "idle" };
      return;
    }
    const target = this.entities.get(targetId);
    if (!target || target.dead || target.kind !== "resource") {
      unit.order = { type: "idle" };
      return;
    }
    if (unit.carried >= 10) {
      this.deposit(unit, target);
      return;
    }
    if (!this.moveToward(unit, target.object.position, delta, target.radius + unit.radius + 0.15)) {
      return;
    }
    unit.gatherTimer += delta;
    unit.object.rotation.y += Math.sin(performance.now() * 0.012) * 0.018;
    if (unit.gatherTimer >= 1) {
      unit.gatherTimer = 0;
      const gathered = Math.min(target.amount, target.resourceType === "gold" ? 3 : 4);
      target.amount -= gathered;
      unit.carried += gathered;
      unit.carriedType = target.resourceType;
      if (unit.team === "player") this.audio.play("gather");
      if (target.amount <= 0) this.entities.removeResource(target);
    }
  }

  private deposit(unit: Unit, originalTarget: ResourceNode): void {
    const dropoff = this.closestBuilding(unit, "player");
    if (!dropoff) return;
    const distance = unit.object.position.distanceTo(dropoff.object.position);
    if (distance > dropoff.radius + unit.radius + 0.5) {
      this.moveToward(unit, dropoff.object.position, 0.016, dropoff.radius + unit.radius + 0.4);
      return;
    }
    if (unit.carriedType) this.resources.add(unit.carriedType, unit.carried);
    unit.carried = 0;
    unit.carriedType = undefined;
    if (!originalTarget.dead) unit.order = { type: "gather", targetId: originalTarget.id };
    else unit.order = { type: "idle" };
  }

  private build(unit: Unit, targetId: number, delta: number): void {
    const target = this.entities.get(targetId);
    if (!target || target.dead || target.kind !== "building" || target.built) {
      unit.order = { type: "idle" };
      return;
    }
    if (!this.moveToward(unit, target.object.position, delta, target.radius + unit.radius + 0.4)) return;
    target.buildProgress = Math.min(1, target.buildProgress + delta / target.buildTime);
    target.health = Math.max(target.health, target.maxHealth * target.buildProgress);
    target.object.scale.y = 0.12 + target.buildProgress * 0.88;
    this.entities.updateHealthBar(target);
    if (target.buildProgress >= 1) {
      target.built = true;
      target.health = target.maxHealth;
      target.object.scale.y = 1;
      target.object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.Material;
          material.opacity = 1;
          material.transparent = false;
        }
      });
      this.effects.dust(target.object.position);
      if (target.team === "player") this.audio.play("build");
      unit.order = { type: "idle" };
    }
  }

  private attack(unit: Unit, targetId: number, delta: number): void {
    const target = this.entities.get(targetId);
    if (!target || target.dead || target.team === unit.team || target.kind === "resource") {
      unit.order = { type: "idle" };
      return;
    }
    const range = unit.attackRange + target.radius;
    if (!this.moveToward(unit, target.object.position, delta, range)) return;
    unit.object.lookAt(target.object.position.x, unit.object.position.y, target.object.position.z);
    if (unit.attackTimer <= 0) {
      const impactPosition = target.object.position.clone();
      const died = this.entities.damage(target, unit.damage);
      this.effects.hit(impactPosition, target.team);
      this.audio.play(died ? "death" : "hit");
      if (died) this.effects.death(impactPosition, target.team);
      unit.attackTimer = unit.attackCooldown;
    }
  }

  private updateBuilding(building: Building, delta: number): void {
    if (!building.built || !building.training) return;
    building.training.remaining -= delta;
    if (building.training.remaining <= 0) {
      const spawn = building.rallyPoint.clone();
      const unit = this.entities.createUnit(building.training.unitKind, building.team, spawn);
      if (building.team === "player") this.audio.play("trained");
      if (building.team === "enemy") {
        const playerBase = this.entities.buildings("player").find((item) => item.buildingKind === "townCenter");
        if (playerBase) unit.order = { type: "attack", targetId: playerBase.id };
      }
      building.training = undefined;
    }
  }

  private acquireTarget(unit: Unit): void {
    const opposingTeam = unit.team === "enemy" ? "player" : "enemy";
    const candidates: GameEntity[] = [
      ...this.entities.units(opposingTeam),
      ...this.entities.buildings(opposingTeam),
    ].filter((entity) => this.canTarget(entity));
    const nearest = candidates
      .map((entity) => ({ entity, distance: entity.object.position.distanceTo(unit.object.position) }))
      .filter(({ distance }) => distance < (unit.team === "player" ? 14 : 16))
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearest) unit.order = { type: "attack", targetId: nearest.entity.id };
  }

  private closestBuilding(unit: Unit, team: Team): Building | undefined {
    return this.entities
      .buildings(team)
      .filter((building) => building.built)
      .sort(
        (a, b) =>
          a.object.position.distanceToSquared(unit.object.position) -
          b.object.position.distanceToSquared(unit.object.position),
      )[0];
  }

}
