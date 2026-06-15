import type { BuildDefinition, BuildingKind, Stockpile, TrainDefinition, UnitKind } from "./types";

export const MAP_SIZE = 112;
export const PLAYER_COLOR = 0x2f70b7;
export const ENEMY_COLOR = 0xb43d32;

export const BUILDINGS: Record<BuildingKind, BuildDefinition> = {
  townCenter: {
    kind: "townCenter",
    label: "Town Center",
    cost: { wood: 300, gold: 100 },
    hotkey: "",
  },
  house: {
    kind: "house",
    label: "House",
    cost: { wood: 70 },
    hotkey: "R",
  },
  barracks: {
    kind: "barracks",
    label: "Barracks",
    cost: { wood: 120, gold: 30 },
    hotkey: "T",
  },
};

export const TRAINING: Record<UnitKind, TrainDefinition> = {
  villager: {
    kind: "villager",
    label: "Train Villager",
    cost: { food: 50 },
    duration: 8,
    hotkey: "Q",
  },
  soldier: {
    kind: "soldier",
    label: "Train Spearman",
    cost: { food: 60, gold: 25 },
    duration: 10,
    hotkey: "Q",
  },
};

export const STARTING_RESOURCES: Stockpile = {
  wood: 180,
  food: 180,
  gold: 80,
};
