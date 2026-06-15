import * as THREE from "three";
import { STARTING_RESOURCES, TRAINING } from "../config";
import { SceneRenderer } from "../rendering/Scene";
import { AISystem } from "../systems/AISystem";
import { CameraSystem } from "../systems/CameraSystem";
import { EntitySystem } from "../systems/EntitySystem";
import { InputSystem } from "../systems/InputSystem";
import { ResourceSystem } from "../systems/ResourceSystem";
import { SimulationSystem } from "../systems/SimulationSystem";
import type { Building, GameState } from "../types";
import { UI } from "../ui/UI";
import { World } from "../world/World";

export class Game {
  private readonly rendering: SceneRenderer;
  private readonly camera: CameraSystem;
  private readonly entities: EntitySystem;
  private readonly resources = new ResourceSystem(STARTING_RESOURCES);
  private readonly simulation: SimulationSystem;
  private readonly ai: AISystem;
  private readonly ui: UI;
  private readonly input: InputSystem;
  private readonly clock = new THREE.Clock();
  private state: GameState = "playing";
  private frame = 0;

  constructor(root: HTMLElement) {
    this.rendering = new SceneRenderer(root);
    this.camera = new CameraSystem(this.rendering.renderer.domElement);
    this.entities = new EntitySystem(this.rendering.scene);
    this.simulation = new SimulationSystem(this.entities, this.resources);
    this.ai = new AISystem(this.entities);
    new World(this.rendering.scene);

    this.ui = new UI(root, {
      build: (kind) => this.input.startPlacement(kind),
      trainVillager: () => this.train("villager"),
      trainSoldier: () => this.train("soldier"),
      restart: () => window.location.reload(),
    });
    this.input = new InputSystem(
      this.rendering.renderer.domElement,
      this.camera.camera,
      this.rendering.scene,
      this.rendering.raycaster,
      this.entities,
      this.resources,
      this.ui.getSelectionBox(),
      {
        selectionChanged: () => this.refreshSelection(),
        notify: (message) => this.ui.notify(message),
      },
    );
    this.createScenario();
    this.refreshSelection();
    this.ui.notify("Select your villagers and gather nearby resources.");
  }

  start(): void {
    this.clock.start();
    this.loop();
  }

  private readonly loop = (): void => {
    requestAnimationFrame(this.loop);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    if (this.state === "playing") {
      this.camera.update(delta);
      this.simulation.update(delta);
      this.ai.update(delta);
      this.checkEndState();
    }
    this.rendering.render(this.camera.camera);
    this.frame += 1;
    if (this.frame % 8 === 0) this.refreshUI();
  };

  private createScenario(): void {
    const playerBase = this.entities.createBuilding(
      "townCenter",
      "player",
      new THREE.Vector3(-31, 0, 27),
    );
    playerBase.rallyPoint.set(-25, 0, 27);
    for (let index = 0; index < 4; index += 1) {
      this.entities.createUnit(
        "villager",
        "player",
        new THREE.Vector3(-25 + (index % 2) * 1.8, 0, 25 + Math.floor(index / 2) * 1.8),
      );
    }

    this.entities.createBuilding("townCenter", "enemy", new THREE.Vector3(32, 0, -27));
    this.entities.createBuilding("barracks", "enemy", new THREE.Vector3(24, 0, -31));
    this.entities.createBuilding("house", "enemy", new THREE.Vector3(37, 0, -19));
    for (let index = 0; index < 3; index += 1) {
      this.entities.createUnit("soldier", "enemy", new THREE.Vector3(26 + index * 1.6, 0, -23));
    }

    this.spawnResourceCluster("wood", -17, 23, 13, 4.2);
    this.spawnResourceCluster("food", -29, 15, 7, 2.4);
    this.spawnResourceCluster("gold", -15, 34, 6, 2.5);
    this.spawnResourceCluster("wood", 11, -4, 18, 4.1);
    this.spawnResourceCluster("food", 4, 15, 8, 2.5);
    this.spawnResourceCluster("gold", 8, -19, 7, 2.5);
    this.spawnResourceCluster("wood", 42, -34, 10, 3.8);
  }

  private spawnResourceCluster(
    type: "wood" | "food" | "gold",
    x: number,
    z: number,
    count: number,
    spread: number,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const angle = index * 2.399;
      const distance = Math.sqrt(index) * spread * 0.55;
      this.entities.createResource(
        type,
        new THREE.Vector3(x + Math.cos(angle) * distance, 0, z + Math.sin(angle) * distance),
        index,
      );
    }
  }

  private train(kind: "villager" | "soldier"): void {
    const building = this.input.selectedBuilding();
    if (!building || !building.built) return;
    const valid =
      (kind === "villager" && building.buildingKind === "townCenter") ||
      (kind === "soldier" && building.buildingKind === "barracks");
    if (!valid) return;
    if (building.training) {
      this.ui.notify("This building is already training a unit.");
      return;
    }
    const definition = TRAINING[kind];
    if (!this.resources.spend(definition.cost)) {
      this.ui.notify("Not enough resources.");
      return;
    }
    building.training = {
      unitKind: kind,
      duration: definition.duration,
      remaining: definition.duration,
    };
    this.ui.notify(`${definition.label.replace("Train ", "")} queued.`);
  }

  private refreshSelection(): void {
    this.ui.updateSelection(this.input.selectedUnits(), this.input.selectedBuilding());
  }

  private refreshUI(): void {
    for (const id of [...this.input.selected]) {
      const entity = this.entities.get(id);
      if (!entity || entity.dead) this.input.selected.delete(id);
    }
    this.ui.updateResources(this.resources.stockpile);
    this.ui.updateWave(this.ai.getStatus());
    this.refreshSelection();
    const enemyBase = this.getTownCenter("enemy");
    this.ui.setObjective(enemyBase?.health ?? 0);
    this.ui.updateMinimap(
      this.entities.all().map((entity) => ({
        x: entity.object.position.x,
        z: entity.object.position.z,
        team: entity.team,
        kind: entity.kind,
      })),
      this.camera.camera.position,
    );
  }

  private checkEndState(): void {
    if (!this.getTownCenter("enemy")) {
      this.state = "won";
      this.ui.showEnd("won");
    } else if (!this.getTownCenter("player")) {
      this.state = "lost";
      this.ui.showEnd("lost");
    }
  }

  private getTownCenter(team: "player" | "enemy"): Building | undefined {
    return this.entities
      .buildings(team)
      .find((building) => building.buildingKind === "townCenter");
  }
}
