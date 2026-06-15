import * as THREE from "three";

export class SceneRenderer {
  readonly scene = new THREE.Scene();
  readonly renderer: THREE.WebGLRenderer;
  readonly raycaster = new THREE.Raycaster();

  constructor(container: HTMLElement) {
    this.scene.background = new THREE.Color(0xa9bdc1);
    this.scene.fog = new THREE.FogExp2(0xa9bdc1, 0.009);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.prepend(this.renderer.domElement);

    const hemisphere = new THREE.HemisphereLight(0xdbe8e6, 0x3f422d, 1.9);
    const sun = new THREE.DirectionalLight(0xffe0b0, 3.2);
    sun.position.set(-34, 52, 24);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -62;
    sun.shadow.camera.right = 62;
    sun.shadow.camera.top = 62;
    sun.shadow.camera.bottom = -62;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 130;
    sun.shadow.bias = -0.0003;
    this.scene.add(hemisphere, sun);

    window.addEventListener("resize", () => {
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    });
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }
}
