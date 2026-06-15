import type { Building, BuildingKind, GameState, Stockpile, Unit } from "../types";

export interface UIActions {
  build: (kind: BuildingKind) => void;
  trainVillager: () => void;
  trainSoldier: () => void;
  restart: () => void;
}

export class UI {
  private readonly resources: HTMLElement;
  private readonly selection: HTMLElement;
  private readonly commands: HTMLElement;
  private readonly objective: HTMLElement;
  private readonly wave: HTMLElement;
  private readonly minimap: HTMLCanvasElement;
  private readonly minimapContext: CanvasRenderingContext2D;
  private readonly endScreen: HTMLElement;
  private readonly toast: HTMLElement;
  private toastTimer?: number;

  constructor(
    private readonly root: HTMLElement,
    private readonly actions: UIActions,
  ) {
    root.insertAdjacentHTML(
      "beforeend",
      `
        <header class="topbar">
          <div class="brand"><span>FIRST</span> FIRE</div>
          <div class="resources" data-ui="resources"></div>
          <div class="wave" data-ui="wave"></div>
        </header>
        <aside class="objective" data-ui="objective">
          <strong>CONQUEST</strong>
          <span>Destroy the enemy Town Center</span>
        </aside>
        <div class="hint">WASD / EDGE PAN · WHEEL ZOOM · Z/X ROTATE · RIGHT-CLICK COMMAND</div>
        <div class="selection-box" data-ui="selection-box"></div>
        <footer class="command-deck">
          <canvas class="minimap" width="210" height="150" data-ui="minimap"></canvas>
          <section class="selection-panel" data-ui="selection">
            <div class="selection-empty">Select a unit or building</div>
          </section>
          <section class="commands" data-ui="commands"></section>
        </footer>
        <div class="toast" data-ui="toast"></div>
        <div class="end-screen" data-ui="end-screen">
          <div class="end-card">
            <p>THE BATTLE IS OVER</p>
            <h1 data-ui="end-title"></h1>
            <button data-action="restart">Play Again</button>
          </div>
        </div>
      `,
    );
    this.resources = this.require("[data-ui='resources']");
    this.selection = this.require("[data-ui='selection']");
    this.commands = this.require("[data-ui='commands']");
    this.objective = this.require("[data-ui='objective']");
    this.wave = this.require("[data-ui='wave']");
    this.minimap = this.require<HTMLCanvasElement>("[data-ui='minimap']");
    const context = this.minimap.getContext("2d");
    if (!context) throw new Error("Canvas 2D unavailable");
    this.minimapContext = context;
    this.endScreen = this.require("[data-ui='end-screen']");
    this.toast = this.require("[data-ui='toast']");
    this.require("[data-action='restart']").addEventListener("click", actions.restart);
  }

  updateResources(stockpile: Stockpile): void {
    this.resources.innerHTML = `
      ${this.resource("wood", stockpile.wood)}
      ${this.resource("food", stockpile.food)}
      ${this.resource("gold", stockpile.gold)}
    `;
  }

  updateSelection(units: Unit[], building?: Building): void {
    if (building) {
      const name = this.buildingName(building.buildingKind);
      const status = building.built
        ? building.training
          ? `Training · ${Math.ceil(building.training.remaining)}s`
          : "Ready"
        : `Building · ${Math.round(building.buildProgress * 100)}%`;
      this.selection.innerHTML = `
        <div class="portrait building-portrait">⌂</div>
        <div><h2>${name}</h2><p>${status}</p>
        <div class="health"><i style="width:${(building.health / building.maxHealth) * 100}%"></i></div>
        <small>${Math.ceil(building.health)} / ${building.maxHealth}</small></div>
      `;
      this.renderBuildingCommands(building);
      return;
    }

    if (units.length > 0) {
      const villagers = units.filter((unit) => unit.unitKind === "villager").length;
      const soldiers = units.length - villagers;
      const title =
        units.length === 1
          ? units[0].unitKind === "villager"
            ? "Villager"
            : "Spearman"
          : `${units.length} units`;
      const details = units.length === 1 ? this.orderText(units[0]) : `${villagers} villagers · ${soldiers} spearmen`;
      this.selection.innerHTML = `
        <div class="portrait">${units[0].unitKind === "villager" ? "♟" : "⚔"}</div>
        <div><h2>${title}</h2><p>${details}</p>
        ${units.length === 1 ? `<div class="health"><i style="width:${(units[0].health / units[0].maxHealth) * 100}%"></i></div>` : ""}
        </div>
      `;
      if (villagers > 0) {
        this.commands.innerHTML = `
          ${this.button("R", "House", "70 wood", "build-house")}
          ${this.button("T", "Barracks", "120 wood · 30 gold", "build-barracks")}
        `;
        this.bind("build-house", () => this.actions.build("house"));
        this.bind("build-barracks", () => this.actions.build("barracks"));
      } else {
        this.commands.innerHTML = `<div class="command-help">Right-click enemies to attack.<br>Right-click terrain to move.</div>`;
      }
      return;
    }

    this.selection.innerHTML = `<div class="selection-empty">Select a unit or building</div>`;
    this.commands.innerHTML = `<div class="command-help">Drag across units to form a group.</div>`;
  }

  updateWave(status: string): void {
    this.wave.textContent = status;
  }

  updateMinimap(
    entities: { x: number; z: number; team: string; kind: string }[],
    cameraPosition: { x: number; z: number },
  ): void {
    const context = this.minimapContext;
    const { width, height } = this.minimap;
    context.fillStyle = "#35472f";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(227, 218, 180, .18)";
    context.lineWidth = 1;
    for (let index = 1; index < 4; index += 1) {
      context.beginPath();
      context.moveTo((width / 4) * index, 0);
      context.lineTo((width / 4) * index, height);
      context.stroke();
      context.beginPath();
      context.moveTo(0, (height / 4) * index);
      context.lineTo(width, (height / 4) * index);
      context.stroke();
    }
    for (const entity of entities) {
      const x = ((entity.x + 56) / 112) * width;
      const y = ((entity.z + 56) / 112) * height;
      context.fillStyle =
        entity.team === "player" ? "#5da9e9" : entity.team === "enemy" ? "#ef6556" : "#d3b463";
      const size = entity.kind === "building" ? 5 : entity.kind === "resource" ? 2 : 3;
      context.fillRect(x - size / 2, y - size / 2, size, size);
    }
    const cameraX = ((cameraPosition.x + 56) / 112) * width;
    const cameraY = ((cameraPosition.z + 56) / 112) * height;
    context.strokeStyle = "#f5e7b2";
    context.lineWidth = 1.5;
    context.strokeRect(cameraX - 16, cameraY - 11, 32, 22);
  }

  setObjective(enemyHealth: number): void {
    this.objective.innerHTML = `
      <strong>CONQUEST</strong>
      <span>Enemy stronghold · ${Math.max(0, Math.ceil(enemyHealth))} HP</span>
    `;
  }

  showEnd(state: Exclude<GameState, "playing">): void {
    this.require("[data-ui='end-title']").textContent = state === "won" ? "VICTORY" : "DEFEAT";
    this.endScreen.classList.add("visible");
  }

  notify(message: string): void {
    this.toast.textContent = message;
    this.toast.classList.add("visible");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove("visible"), 2200);
  }

  getSelectionBox(): HTMLElement {
    return this.require("[data-ui='selection-box']");
  }

  private renderBuildingCommands(building: Building): void {
    if (!building.built) {
      this.commands.innerHTML = `<div class="command-help">Villagers must finish construction.</div>`;
    } else if (building.buildingKind === "townCenter") {
      this.commands.innerHTML = this.button("Q", "Villager", "50 food · 8s", "train-villager");
      this.bind("train-villager", this.actions.trainVillager);
    } else if (building.buildingKind === "barracks") {
      this.commands.innerHTML = this.button("Q", "Spearman", "60 food · 25 gold · 10s", "train-soldier");
      this.bind("train-soldier", this.actions.trainSoldier);
    } else {
      this.commands.innerHTML = `<div class="command-help">Houses anchor your growing settlement.</div>`;
    }
  }

  private resource(type: string, amount: number): string {
    const icon = type === "wood" ? "▥" : type === "food" ? "●" : "◆";
    return `<div class="resource ${type}"><span>${icon}</span><b>${Math.floor(amount)}</b><small>${type}</small></div>`;
  }

  private button(key: string, label: string, detail: string, action: string): string {
    return `<button class="command" data-action="${action}"><kbd>${key}</kbd><b>${label}</b><small>${detail}</small></button>`;
  }

  private bind(action: string, listener: () => void): void {
    this.require(`[data-action='${action}']`).addEventListener("click", listener);
  }

  private orderText(unit: Unit): string {
    if (unit.order.type === "gather") return `Gathering ${unit.carriedType ?? "resources"} · carrying ${unit.carried}`;
    if (unit.order.type === "build") return "Constructing";
    if (unit.order.type === "attack") return "Engaging enemy";
    if (unit.order.type === "move") return "Moving";
    return "Idle";
  }

  private buildingName(kind: BuildingKind): string {
    if (kind === "townCenter") return "Town Center";
    return kind === "barracks" ? "Barracks" : "House";
  }

  private require<T extends Element = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing UI element: ${selector}`);
    return element;
  }
}
