import * as THREE from "three";

export type Team = "player" | "enemy" | "neutral";
export type ResourceType = "wood" | "food" | "gold";
export type UnitKind = "villager" | "soldier";
export type BuildingKind = "townCenter" | "house" | "barracks";
export type DifficultyLevel = "easy" | "normal" | "hard";
export type EntityKind = "unit" | "building" | "resource";
export type GameState = "playing" | "won" | "lost";

export interface Stockpile {
  wood: number;
  food: number;
  gold: number;
}

export interface Entity {
  id: number;
  kind: EntityKind;
  team: Team;
  object: THREE.Group;
  radius: number;
  selectable: boolean;
  health: number;
  maxHealth: number;
  dead: boolean;
}

export type UnitOrder =
  | { type: "idle" }
  | { type: "move"; target: THREE.Vector3 }
  | { type: "gather"; targetId: number }
  | { type: "attack"; targetId: number }
  | { type: "repair"; targetId: number }
  | { type: "build"; targetId: number };

export interface Unit extends Entity {
  kind: "unit";
  unitKind: UnitKind;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  order: UnitOrder;
  carried: number;
  carriedType?: ResourceType;
  gatherTimer: number;
  animationTime: number;
  lastPosition: THREE.Vector3;
  selectionRing: THREE.Mesh;
  healthBar: THREE.Group;
}

export interface Building extends Entity {
  kind: "building";
  buildingKind: BuildingKind;
  built: boolean;
  buildProgress: number;
  buildTime: number;
  rallyPoint: THREE.Vector3;
  training?: {
    unitKind: UnitKind;
    remaining: number;
    duration: number;
  };
  selectionRing: THREE.Mesh;
  healthBar: THREE.Group;
}

export interface ResourceNode extends Entity {
  kind: "resource";
  resourceType: ResourceType;
  amount: number;
}

export type GameEntity = Unit | Building | ResourceNode;

export interface BuildDefinition {
  kind: BuildingKind;
  label: string;
  cost: Partial<Stockpile>;
  hotkey: string;
}

export interface TrainDefinition {
  kind: UnitKind;
  label: string;
  cost: Partial<Stockpile>;
  duration: number;
  hotkey: string;
}
