import * as THREE from "three";
import { MAP_SIZE } from "../config";
import { materials, setShadows } from "../rendering/materials";

function seeded(index: number): number {
  const value = Math.sin(index * 9182.127 + 71.31) * 43758.5453;
  return value - Math.floor(value);
}

export class World {
  readonly ground: THREE.Mesh;
  readonly decoration = new THREE.Group();

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, 40, 40);
    const position = geometry.attributes.position;
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const height =
        Math.sin(x * 0.11) * 0.18 +
        Math.cos(y * 0.09) * 0.15 +
        (seeded(index) - 0.5) * 0.15;
      position.setZ(index, height);
    }
    geometry.computeVertexNormals();

    this.ground = new THREE.Mesh(geometry, materials.grass);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.name = "ground";
    scene.add(this.ground);

    for (let index = 0; index < 34; index += 1) {
      const patch = new THREE.Mesh(
        new THREE.CircleGeometry(1.5 + seeded(index + 50) * 3, 12),
        index % 3 === 0 ? materials.dirt : materials.grassLight,
      );
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(
        (seeded(index + 100) - 0.5) * (MAP_SIZE - 10),
        0.025,
        (seeded(index + 200) - 0.5) * (MAP_SIZE - 10),
      );
      patch.scale.y = 0.45 + seeded(index + 400);
      patch.rotation.z = seeded(index + 300) * Math.PI;
      patch.receiveShadow = true;
      this.decoration.add(patch);
    }

    const borderMaterial = new THREE.MeshStandardMaterial({ color: 0x4b5438, roughness: 1 });
    for (let index = 0; index < 48; index += 1) {
      const angle = (index / 48) * Math.PI * 2;
      const distance = MAP_SIZE * 0.66 + seeded(index + 800) * 7;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 + seeded(index) * 2, 0), borderMaterial);
      rock.position.set(Math.cos(angle) * distance, -0.2, Math.sin(angle) * distance);
      rock.scale.y = 0.6 + seeded(index + 500);
      rock.rotation.set(seeded(index) * 2, seeded(index + 20) * 3, 0);
      this.decoration.add(rock);
    }
    setShadows(this.decoration);
    scene.add(this.decoration);
  }
}
