import * as THREE from "three";
import { createBuildingModel, createHealthBar, createResourceModel, createSelectionRing, createUnitModel } from "../rendering/models";
import type {
  Building,
  BuildingKind,
  GameEntity,
  ResourceNode,
  ResourceType,
  Team,
  Unit,
  UnitKind,
} from "../types";

export class EntitySystem {
  readonly entities = new Map<number, GameEntity>();
  private nextId = 1;

  constructor(private readonly scene: THREE.Scene) {}

  createUnit(kind: UnitKind, team: Team, position: THREE.Vector3): Unit {
    const object = createUnitModel(kind, team);
    object.position.copy(position);
    const selectionRing = createSelectionRing(0.7);
    const healthBar = createHealthBar(1.4);
    healthBar.position.y = 2.25;
    object.add(selectionRing, healthBar);

    const unit: Unit = {
      id: this.nextId++,
      kind: "unit",
      unitKind: kind,
      team,
      object,
      radius: 0.68,
      selectable: team === "player",
      health: kind === "soldier" ? 120 : 70,
      maxHealth: kind === "soldier" ? 120 : 70,
      dead: false,
      speed: kind === "soldier" ? 5.2 : 4.5,
      damage: kind === "soldier" ? 16 : 4,
      attackRange: kind === "soldier" ? 1.9 : 1.2,
      attackCooldown: kind === "soldier" ? 1.05 : 1.5,
      attackTimer: 0,
      order: { type: "idle" },
      carried: 0,
      gatherTimer: 0,
      animationTime: Math.random() * Math.PI * 2,
      lastPosition: position.clone(),
      selectionRing,
      healthBar,
    };
    object.userData.entityId = unit.id;
    this.entities.set(unit.id, unit);
    this.scene.add(object);
    return unit;
  }

  createBuilding(
    kind: BuildingKind,
    team: Team,
    position: THREE.Vector3,
    built = true,
  ): Building {
    const object = createBuildingModel(kind, team);
    object.position.copy(position);
    const radius = kind === "townCenter" ? 3.5 : kind === "barracks" ? 2.9 : 2.2;
    const selectionRing = createSelectionRing(radius);
    const healthBar = createHealthBar(radius * 1.4);
    healthBar.position.y = kind === "townCenter" ? 6.7 : kind === "house" ? 4.7 : 3.6;
    object.add(selectionRing, healthBar);
    if (!built) {
      object.scale.y = 0.12;
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = (child.material as THREE.Material).clone();
          child.material.transparent = true;
          child.material.opacity = 0.65;
        }
      });
    }

    const maxHealth = kind === "townCenter" ? 1300 : kind === "barracks" ? 650 : 420;
    const building: Building = {
      id: this.nextId++,
      kind: "building",
      buildingKind: kind,
      team,
      object,
      radius,
      selectable: team === "player",
      health: built ? maxHealth : Math.floor(maxHealth * 0.12),
      maxHealth,
      dead: false,
      built,
      buildProgress: built ? 1 : 0,
      buildTime: kind === "barracks" ? 14 : 10,
      rallyPoint: position.clone().add(new THREE.Vector3(0, 0, radius + 2)),
      selectionRing,
      healthBar,
    };
    object.userData.entityId = building.id;
    this.entities.set(building.id, building);
    this.scene.add(object);
    return building;
  }

  createResource(type: ResourceType, position: THREE.Vector3, variation = 0): ResourceNode {
    const object = createResourceModel(type, variation);
    object.position.copy(position);
    const resource: ResourceNode = {
      id: this.nextId++,
      kind: "resource",
      resourceType: type,
      team: "neutral",
      object,
      radius: type === "wood" ? 1.05 : 0.85,
      selectable: false,
      health: 1,
      maxHealth: 1,
      dead: false,
      amount: type === "wood" ? 240 : type === "gold" ? 500 : 180,
    };
    object.userData.entityId = resource.id;
    this.entities.set(resource.id, resource);
    this.scene.add(object);
    return resource;
  }

  get(id: number): GameEntity | undefined {
    return this.entities.get(id);
  }

  all(): GameEntity[] {
    return [...this.entities.values()].filter((entity) => !entity.dead);
  }

  units(team?: Team): Unit[] {
    return this.all().filter(
      (entity): entity is Unit => entity.kind === "unit" && (!team || entity.team === team),
    );
  }

  buildings(team?: Team): Building[] {
    return this.all().filter(
      (entity): entity is Building => entity.kind === "building" && (!team || entity.team === team),
    );
  }

  damage(entity: GameEntity, amount: number): boolean {
    if (entity.dead || entity.kind === "resource") return false;
    entity.health = Math.max(0, entity.health - amount);
    this.updateHealthBar(entity);
    if (entity.health <= 0) {
      entity.dead = true;
      this.scene.remove(entity.object);
      return true;
    }
    return false;
  }

  updateHealthBar(entity: Unit | Building): void {
    const ratio = entity.health / entity.maxHealth;
    const fill = entity.healthBar.getObjectByName("fill");
    if (fill) {
      fill.scale.x = Math.max(0.001, ratio);
      fill.position.x = -(1 - ratio) * 0.5;
      const material = (fill as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.color.setHex(ratio > 0.5 ? 0x62b45b : ratio > 0.25 ? 0xd3a13d : 0xb84438);
    }
    entity.healthBar.visible = ratio < 0.999 || entity.selectionRing.visible;
  }

  removeResource(resource: ResourceNode): void {
    resource.dead = true;
    this.scene.remove(resource.object);
  }
}
