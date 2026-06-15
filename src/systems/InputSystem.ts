import * as THREE from "three";
import type { BuildingKind, GameEntity, Unit } from "../types";
import { createBuildingModel } from "../rendering/models";
import { EntitySystem } from "./EntitySystem";
import { ResourceSystem } from "./ResourceSystem";
import { BUILDINGS } from "../config";

interface InputCallbacks {
  selectionChanged: () => void;
  notify: (message: string) => void;
}

export class InputSystem {
  readonly selected = new Set<number>();
  private pointerDown = new THREE.Vector2();
  private dragging = false;
  private placing?: BuildingKind;
  private ghost?: THREE.Group;
  private groundPoint = new THREE.Vector3();
  private readonly selectionBox: HTMLElement;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly camera: THREE.Camera,
    private readonly scene: THREE.Scene,
    private readonly raycaster: THREE.Raycaster,
    private readonly entities: EntitySystem,
    private readonly resources: ResourceSystem,
    selectionBox: HTMLElement,
    private readonly callbacks: InputCallbacks,
  ) {
    this.selectionBox = selectionBox;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("keydown", this.onKeyDown);
  }

  startPlacement(kind: BuildingKind): void {
    const villagers = this.selectedUnits().filter((unit) => unit.unitKind === "villager");
    if (villagers.length === 0) {
      this.callbacks.notify("Select a villager to construct buildings.");
      return;
    }
    if (!this.resources.canAfford(BUILDINGS[kind].cost)) {
      this.callbacks.notify("Not enough resources.");
      return;
    }
    this.cancelPlacement();
    this.placing = kind;
    this.ghost = createBuildingModel(kind, "player", true);
    this.ghost.position.copy(this.groundPoint);
    this.scene.add(this.ghost);
    this.callbacks.notify("Place building with left-click. Esc to cancel.");
  }

  selectedUnits(): Unit[] {
    return [...this.selected]
      .map((id) => this.entities.get(id))
      .filter((entity): entity is Unit => entity?.kind === "unit" && !entity.dead);
  }

  selectedBuilding() {
    if (this.selected.size !== 1) return undefined;
    const entity = this.entities.get([...this.selected][0]);
    return entity?.kind === "building" ? entity : undefined;
  }

  clearSelection(): void {
    for (const id of this.selected) {
      const entity = this.entities.get(id);
      if (entity?.kind === "unit" || entity?.kind === "building") {
        entity.selectionRing.visible = false;
        this.entities.updateHealthBar(entity);
      }
    }
    this.selected.clear();
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.pointerDown.set(event.clientX, event.clientY);
    this.dragging = false;
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.updateGroundPoint(event);
    if (this.ghost) this.ghost.position.copy(this.groundPoint);
    if ((event.buttons & 1) === 0 || this.placing) return;
    const distance = this.pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY));
    if (distance < 5) return;
    this.dragging = true;
    const left = Math.min(this.pointerDown.x, event.clientX);
    const top = Math.min(this.pointerDown.y, event.clientY);
    this.selectionBox.style.display = "block";
    this.selectionBox.style.left = `${left}px`;
    this.selectionBox.style.top = `${top}px`;
    this.selectionBox.style.width = `${Math.abs(event.clientX - this.pointerDown.x)}px`;
    this.selectionBox.style.height = `${Math.abs(event.clientY - this.pointerDown.y)}px`;
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.selectionBox.style.display = "none";

    if (this.placing) {
      this.placeBuilding();
      return;
    }
    if (this.dragging) this.boxSelect(event);
    else this.clickSelect(event);
    this.callbacks.selectionChanged();
  };

  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    if (this.placing) {
      this.cancelPlacement();
      return;
    }
    const units = this.selectedUnits();
    if (units.length === 0) return;
    const target = this.pickEntity(event);
    if (target?.team === "enemy") {
      for (const unit of units) unit.order = { type: "attack", targetId: target.id };
      this.callbacks.notify("Attack order issued.");
      return;
    }
    if (target?.kind === "resource") {
      const villagers = units.filter((unit) => unit.unitKind === "villager");
      for (const unit of villagers) unit.order = { type: "gather", targetId: target.id };
      this.callbacks.notify(villagers.length ? `Gather ${target.resourceType}.` : "Only villagers gather resources.");
      return;
    }
    this.updateGroundPoint(event);
    const columns = Math.ceil(Math.sqrt(units.length));
    units.forEach((unit, index) => {
      const offsetX = (index % columns - (columns - 1) / 2) * 1.45;
      const offsetZ = (Math.floor(index / columns) - (columns - 1) / 2) * 1.45;
      unit.order = {
        type: "move",
        target: this.groundPoint.clone().add(new THREE.Vector3(offsetX, 0, offsetZ)),
      };
    });
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === "Escape") this.cancelPlacement();
    if (event.code === "KeyR" && this.selectedUnits().some((unit) => unit.unitKind === "villager")) {
      this.startPlacement("house");
    }
    if (event.code === "KeyT" && this.selectedUnits().some((unit) => unit.unitKind === "villager")) {
      this.startPlacement("barracks");
    }
  };

  private clickSelect(event: PointerEvent): void {
    const target = this.pickEntity(event);
    this.clearSelection();
    if (target?.selectable && target.team === "player") this.select(target);
  }

  private boxSelect(event: PointerEvent): void {
    this.clearSelection();
    const left = Math.min(this.pointerDown.x, event.clientX);
    const right = Math.max(this.pointerDown.x, event.clientX);
    const top = Math.min(this.pointerDown.y, event.clientY);
    const bottom = Math.max(this.pointerDown.y, event.clientY);
    for (const unit of this.entities.units("player")) {
      const screen = unit.object.position.clone().project(this.camera);
      const x = ((screen.x + 1) / 2) * window.innerWidth;
      const y = ((-screen.y + 1) / 2) * window.innerHeight;
      if (x >= left && x <= right && y >= top && y <= bottom) this.select(unit);
    }
  }

  private select(entity: GameEntity): void {
    if (entity.kind !== "unit" && entity.kind !== "building") return;
    this.selected.add(entity.id);
    entity.selectionRing.visible = true;
    this.entities.updateHealthBar(entity);
  }

  private pickEntity(event: MouseEvent): GameEntity | undefined {
    const pointer = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(
      this.entities.all().map((entity) => entity.object),
      true,
    );
    for (const intersection of intersections) {
      let object: THREE.Object3D | null = intersection.object;
      while (object && object.userData.entityId === undefined) object = object.parent;
      const entity = object ? this.entities.get(object.userData.entityId as number) : undefined;
      if (entity) return entity;
    }
    return undefined;
  }

  private updateGroundPoint(event: MouseEvent): void {
    const pointer = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const ground = this.scene.getObjectByName("ground");
    if (!ground) return;
    const hit = this.raycaster.intersectObject(ground)[0];
    if (hit) this.groundPoint.copy(hit.point).setY(0);
  }

  private placeBuilding(): void {
    const kind = this.placing;
    if (!kind) return;
    const nearEntity = this.entities
      .all()
      .some((entity) => entity.object.position.distanceTo(this.groundPoint) < entity.radius + 2.4);
    if (nearEntity) {
      this.callbacks.notify("That site is obstructed.");
      return;
    }
    if (!this.resources.spend(BUILDINGS[kind].cost)) {
      this.callbacks.notify("Not enough resources.");
      this.cancelPlacement();
      return;
    }
    const building = this.entities.createBuilding(kind, "player", this.groundPoint.clone(), false);
    for (const unit of this.selectedUnits().filter((item) => item.unitKind === "villager")) {
      unit.order = { type: "build", targetId: building.id };
    }
    this.cancelPlacement();
    this.callbacks.notify(`${BUILDINGS[kind].label} foundation placed.`);
  }

  private cancelPlacement(): void {
    if (this.ghost) this.scene.remove(this.ghost);
    this.ghost = undefined;
    this.placing = undefined;
  }
}
