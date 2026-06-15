import * as THREE from "three";

export const materials = {
  grass: new THREE.MeshStandardMaterial({ color: 0x5e7044, roughness: 1 }),
  grassLight: new THREE.MeshStandardMaterial({ color: 0x718052, roughness: 1 }),
  dirt: new THREE.MeshStandardMaterial({ color: 0x755c3d, roughness: 1 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x654630, roughness: 0.95 }),
  woodLight: new THREE.MeshStandardMaterial({ color: 0x936743, roughness: 0.95 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x8b897b, roughness: 1 }),
  stoneDark: new THREE.MeshStandardMaterial({ color: 0x55584f, roughness: 1 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x493c32, roughness: 0.9 }),
  thatch: new THREE.MeshStandardMaterial({ color: 0xaa8b52, roughness: 1 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd49c2f, roughness: 0.6, metalness: 0.25 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc98e67, roughness: 0.9 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0x615b4b, roughness: 1 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x656a6c, roughness: 0.55, metalness: 0.35 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x543a26, roughness: 1 }),
  leaves: new THREE.MeshStandardMaterial({ color: 0x2f542d, roughness: 1 }),
  leavesLight: new THREE.MeshStandardMaterial({ color: 0x496b35, roughness: 1 }),
};

export function teamMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
}

export function setShadows(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
}
