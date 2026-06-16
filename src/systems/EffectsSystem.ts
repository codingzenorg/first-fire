import * as THREE from "three";
import type { Team } from "../types";

interface Effect {
  object: THREE.Object3D;
  velocity: THREE.Vector3;
  age: number;
  duration: number;
  startScale: number;
}

export class EffectsSystem {
  private readonly effects: Effect[] = [];
  private readonly sparkGeometry = new THREE.OctahedronGeometry(0.11, 0);
  private readonly dustGeometry = new THREE.DodecahedronGeometry(0.16, 0);

  constructor(private readonly scene: THREE.Scene) {}

  hit(position: THREE.Vector3, team: Team): void {
    const color = team === "player" ? 0x75b9ed : 0xef7465;
    for (let index = 0; index < 7; index += 1) {
      const spark = new THREE.Mesh(
        this.sparkGeometry,
        new THREE.MeshBasicMaterial({ color: index < 2 ? 0xffdc7a : color }),
      );
      spark.position.copy(position).add(new THREE.Vector3(0, 0.8 + Math.random(), 0));
      this.scene.add(spark);
      this.effects.push({
        object: spark,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          2.5 + Math.random() * 3,
          (Math.random() - 0.5) * 5,
        ),
        age: 0,
        duration: 0.35 + Math.random() * 0.25,
        startScale: 1,
      });
    }
  }

  dust(position: THREE.Vector3): void {
    for (let index = 0; index < 4; index += 1) {
      const dust = new THREE.Mesh(
        this.dustGeometry,
        new THREE.MeshBasicMaterial({
          color: 0xbba071,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        }),
      );
      dust.position.copy(position).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        0.15,
        (Math.random() - 0.5) * 0.8,
      ));
      this.scene.add(dust);
      this.effects.push({
        object: dust,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.7, 0.8, (Math.random() - 0.5) * 0.7),
        age: 0,
        duration: 0.55,
        startScale: 1,
      });
    }
  }

  death(position: THREE.Vector3, team: Team): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.55, 20),
      new THREE.MeshBasicMaterial({
        color: team === "player" ? 0x6ca8d9 : 0xbb493e,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position).setY(0.12);
    this.scene.add(ring);
    this.effects.push({
      object: ring,
      velocity: new THREE.Vector3(),
      age: 0,
      duration: 0.7,
      startScale: 1,
    });
    this.dust(position);
  }

  update(delta: number): void {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index];
      effect.age += delta;
      const progress = effect.age / effect.duration;
      if (progress >= 1) {
        this.scene.remove(effect.object);
        this.disposeMaterial(effect.object);
        this.effects.splice(index, 1);
        continue;
      }
      effect.velocity.y -= delta * 5;
      effect.object.position.addScaledVector(effect.velocity, delta);
      effect.object.rotation.y += delta * 5;
      effect.object.scale.setScalar(effect.startScale * (1 + progress * 1.8));
      effect.object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshBasicMaterial;
          if (material.transparent) material.opacity = (1 - progress) * 0.6;
        }
      });
    }
  }

  private disposeMaterial(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      }
    });
  }
}
