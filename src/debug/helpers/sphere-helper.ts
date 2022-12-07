import * as THREE from 'three';
import { DebugMaterialOptions } from 'debug/debug';

export interface SphereInterface {
  center: THREE.Vector3;
  radius: number;
}

export class SphereHelper extends THREE.LineSegments {
  public sphere: SphereInterface;

  constructor(sphere: SphereInterface, options?: DebugMaterialOptions) {
    const geometry = new THREE.SphereGeometry(sphere.radius, 8, 8);
    const wireframe = new THREE.WireframeGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: options?.color ?? 0x0000ff,
      toneMapped: false,
      depthTest: !options?.alwaysOnTop ?? true,
      opacity: options?.opacity ?? 1,
      transparent: options?.opacity && options?.opacity < 1 ? true : false,
      fog: options?.fog ?? true,
    });

    super(wireframe, material);

    this.sphere = sphere;
    this.position.copy(sphere.center);
  }

  set(sphere: SphereInterface) {
    this.sphere = sphere;
    const geometry = new THREE.SphereGeometry(sphere.radius, 8, 8);
    const wireframe = new THREE.WireframeGeometry(geometry);
    this.geometry.copy(wireframe);
  }

  setMaterial(options: DebugMaterialOptions) {
    const material = this.material as THREE.LineBasicMaterial;
    if (options.color) material.color.set(options.color);
    if (options.alwaysOnTop) material.depthTest = !options.alwaysOnTop;
    if (options.opacity) {
      material.opacity = options.opacity;
      material.transparent = options.opacity && options.opacity < 1 ? true : false;
    }
    if (options.fog) material.fog = options.fog;
  }

  updateMatrixWorld() {
    this.position.copy(this.sphere.center);
    super.updateMatrixWorld();
  }

  dispose() {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
