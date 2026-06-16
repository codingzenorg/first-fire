import * as THREE from "three";
import { ENEMY_COLOR, PLAYER_COLOR } from "../config";
import type { BuildingKind, ResourceType, Team, UnitKind } from "../types";
import { materials, setShadows, teamMaterial } from "./materials";

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.position.set(...position);
  return result;
}

function teamColor(team: Team): number {
  return team === "enemy" ? ENEMY_COLOR : PLAYER_COLOR;
}

export function createSelectionRing(radius: number): THREE.Mesh {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius, radius + 0.12, 36),
    new THREE.MeshBasicMaterial({
      color: 0xf5e7a4,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  ring.visible = false;
  return ring;
}

export function createHealthBar(width: number): THREE.Group {
  const group = new THREE.Group();
  const background = mesh(
    new THREE.PlaneGeometry(width, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x241c18, depthTest: false }),
    [0, 0, 0],
  );
  const fill = mesh(
    new THREE.PlaneGeometry(width - 0.06, 0.11),
    new THREE.MeshBasicMaterial({ color: 0x62b45b, depthTest: false }),
    [0, 0, 0.01],
  );
  fill.name = "fill";
  group.add(background, fill);
  group.visible = false;
  group.renderOrder = 20;
  return group;
}

export function createUnitModel(kind: UnitKind, team: Team): THREE.Group {
  const group = new THREE.Group();
  const model = new THREE.Group();
  model.name = "model";
  const color = teamMaterial(teamColor(team));

  const legs = [
    mesh(new THREE.BoxGeometry(0.22, 0.55, 0.25), materials.cloth, [-0.2, 0.36, 0]),
    mesh(new THREE.BoxGeometry(0.22, 0.55, 0.25), materials.cloth, [0.2, 0.36, 0]),
  ];
  legs[0].name = "legLeft";
  legs[1].name = "legRight";
  const torso = mesh(
    new THREE.CylinderGeometry(0.34, 0.42, 0.72, 7),
    color,
    [0, 0.98, 0],
  );
  torso.name = "torso";
  const head = mesh(new THREE.SphereGeometry(0.26, 8, 6), materials.skin, [0, 1.55, 0]);

  model.add(...legs, torso, head);
  group.add(model);

  if (kind === "villager") {
    const hood = mesh(
      new THREE.ConeGeometry(0.35, 0.42, 8),
      materials.thatch,
      [0, 1.82, 0],
    );
    const axeHandle = mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 1.05, 6),
      materials.wood,
      [0.43, 1.05, 0],
    );
    axeHandle.rotation.z = -0.4;
    const axeHead = mesh(
      new THREE.BoxGeometry(0.32, 0.22, 0.08),
      materials.iron,
      [0.62, 1.48, 0],
    );
    const tool = new THREE.Group();
    tool.name = "tool";
    tool.add(axeHandle, axeHead);
    model.add(hood, tool);
  } else {
    const helmet = mesh(
      new THREE.SphereGeometry(0.29, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
      materials.iron,
      [0, 1.62, 0],
    );
    const spear = mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 2.25, 6),
      materials.woodLight,
      [0.5, 1.25, 0],
    );
    const spearHead = mesh(
      new THREE.ConeGeometry(0.1, 0.34, 6),
      materials.iron,
      [0.5, 2.53, 0],
    );
    const tool = new THREE.Group();
    tool.name = "tool";
    tool.add(spear, spearHead);
    model.add(helmet, tool);
  }

  setShadows(group);
  return group;
}

function addTimberFrame(group: THREE.Group, width: number, depth: number, height: number): void {
  const beam = 0.14;
  for (const x of [-width / 2, width / 2]) {
    for (const z of [-depth / 2, depth / 2]) {
      group.add(mesh(new THREE.BoxGeometry(beam, height, beam), materials.wood, [x, height / 2, z]));
    }
  }
  group.add(
    mesh(new THREE.BoxGeometry(width + beam, beam, beam), materials.wood, [0, height, depth / 2]),
    mesh(new THREE.BoxGeometry(width + beam, beam, beam), materials.wood, [0, height, -depth / 2]),
  );
}

export function createBuildingModel(kind: BuildingKind, team: Team, ghost = false): THREE.Group {
  const group = new THREE.Group();
  const color = teamMaterial(teamColor(team));

  if (kind === "townCenter") {
    const base = mesh(new THREE.BoxGeometry(5.8, 2.3, 5.2), materials.stone, [0, 1.15, 0]);
    const upper = mesh(new THREE.BoxGeometry(4.4, 1.8, 4.2), materials.woodLight, [0, 3.15, 0]);
    const roof = mesh(new THREE.ConeGeometry(4.15, 2.3, 4), materials.roof, [0, 5.15, 0]);
    roof.rotation.y = Math.PI / 4;
    const banner = mesh(new THREE.BoxGeometry(0.65, 1.4, 0.06), color, [0, 4.75, 2.65]);
    group.add(base, upper, roof, banner);
    addTimberFrame(group, 4.2, 4, 4);
  } else if (kind === "house") {
    const base = mesh(new THREE.BoxGeometry(3.5, 2.2, 3), materials.stone, [0, 1.1, 0]);
    const roof = mesh(new THREE.ConeGeometry(3, 2.2, 4), materials.thatch, [0, 3.15, 0]);
    roof.rotation.y = Math.PI / 4;
    const door = mesh(new THREE.BoxGeometry(0.75, 1.5, 0.12), materials.wood, [0, 0.78, 1.55]);
    group.add(base, roof, door);
    addTimberFrame(group, 3.3, 2.8, 2.15);
  } else {
    const base = mesh(new THREE.BoxGeometry(5, 2.2, 3.8), materials.stone, [0, 1.1, 0]);
    const roof = mesh(new THREE.BoxGeometry(5.4, 0.45, 4.2), materials.roof, [0, 2.55, 0]);
    roof.rotation.z = -0.08;
    const awning = mesh(new THREE.BoxGeometry(2.6, 0.25, 1.8), color, [0, 1.8, 2.25]);
    awning.rotation.x = 0.18;
    const gate = mesh(new THREE.BoxGeometry(1.5, 1.75, 0.15), materials.wood, [0, 0.9, 1.98]);
    group.add(base, roof, awning, gate);
    addTimberFrame(group, 4.8, 3.6, 2.35);
  }

  if (ghost) {
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const source = object.material as THREE.MeshStandardMaterial;
        object.material = source.clone();
        object.material.transparent = true;
        object.material.opacity = 0.55;
      }
    });
  }

  setShadows(group);
  return group;
}

export function createResourceModel(type: ResourceType, variation = 0): THREE.Group {
  const group = new THREE.Group();
  if (type === "wood") {
    const trunk = mesh(new THREE.CylinderGeometry(0.28, 0.42, 2.5, 7), materials.trunk, [0, 1.25, 0]);
    const crownA = mesh(new THREE.ConeGeometry(1.25, 2.4, 8), materials.leaves, [0, 2.65, 0]);
    const crownB = mesh(
      new THREE.ConeGeometry(0.9, 1.8, 8),
      variation % 2 ? materials.leavesLight : materials.leaves,
      [0.1, 3.65, 0],
    );
    group.add(trunk, crownA, crownB);
  } else if (type === "food") {
    const leaves = mesh(new THREE.SphereGeometry(0.9, 7, 5), materials.leavesLight, [0, 0.65, 0]);
    leaves.scale.y = 0.65;
    group.add(leaves);
    for (let index = 0; index < 5; index += 1) {
      const berry = mesh(
        new THREE.SphereGeometry(0.13, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0x852d34, roughness: 0.8 }),
        [Math.cos(index * 1.7) * 0.65, 0.68 + (index % 2) * 0.25, Math.sin(index * 1.7) * 0.55],
      );
      group.add(berry);
    }
  } else {
    const rock = mesh(new THREE.DodecahedronGeometry(0.9, 0), materials.stoneDark, [0, 0.6, 0]);
    rock.scale.set(1.3, 0.85, 1);
    const vein = mesh(new THREE.OctahedronGeometry(0.34, 0), materials.gold, [0.35, 0.72, 0.55]);
    group.add(rock, vein);
  }
  setShadows(group);
  return group;
}
