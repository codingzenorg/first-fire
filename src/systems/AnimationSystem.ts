import * as THREE from "three";
import { EntitySystem } from "./EntitySystem";

export class AnimationSystem {
  constructor(
    private readonly entities: EntitySystem,
    private readonly camera: THREE.Camera,
  ) {}

  update(delta: number): void {
    for (const unit of this.entities.units()) {
      unit.animationTime += delta;
      const model = unit.object.getObjectByName("model");
      const legLeft = unit.object.getObjectByName("legLeft");
      const legRight = unit.object.getObjectByName("legRight");
      const torso = unit.object.getObjectByName("torso");
      const tool = unit.object.getObjectByName("tool");
      if (!model || !legLeft || !legRight || !torso || !tool) continue;

      const moved = unit.object.position.distanceToSquared(unit.lastPosition) > 0.0001;
      unit.lastPosition.copy(unit.object.position);
      const stride = moved ? Math.sin(unit.animationTime * 11) * 0.42 : 0;
      legLeft.rotation.x = THREE.MathUtils.lerp(legLeft.rotation.x, stride, 0.32);
      legRight.rotation.x = THREE.MathUtils.lerp(legRight.rotation.x, -stride, 0.32);
      model.position.y = moved ? Math.abs(Math.sin(unit.animationTime * 11)) * 0.055 : 0;

      let toolSwing = 0;
      if (unit.order.type === "gather" || unit.order.type === "build") {
        toolSwing = Math.max(0, Math.sin(unit.animationTime * 7)) * -1.05;
      } else if (unit.order.type === "attack" && unit.attackTimer > unit.attackCooldown - 0.28) {
        const phase = 1 - (unit.attackCooldown - unit.attackTimer) / 0.28;
        toolSwing = -1.3 * Math.sin(phase * Math.PI);
      }
      tool.rotation.x = THREE.MathUtils.lerp(tool.rotation.x, toolSwing, 0.38);
      torso.rotation.z = THREE.MathUtils.lerp(torso.rotation.z, moved ? -stride * 0.08 : 0, 0.2);
      unit.healthBar.quaternion.copy(this.camera.quaternion);
    }

    for (const building of this.entities.buildings()) {
      building.healthBar.quaternion.copy(this.camera.quaternion);
    }
  }
}
