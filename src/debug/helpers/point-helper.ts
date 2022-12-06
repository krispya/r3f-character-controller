import { DebugMaterialOptions } from 'debug/debug';
import * as THREE from 'three';

type PointDebugOptions = { radius?: number } & DebugMaterialOptions;

export class PointHelper extends THREE.Mesh {
  public point: THREE.Vector3;
  public _radius: number;

  constructor(point: THREE.Vector3, options?: PointDebugOptions) {
    const radius = options?.radius ?? 0.03;
    const geometry = new THREE.SphereGeometry(radius, 7, 7);
    const material = new THREE.MeshBasicMaterial({
      color: options?.color ?? 0xff0000,
      toneMapped: false,
      depthTest: !options?.alwaysOnTop ?? true,
      opacity: options?.opacity ?? 1,
      transparent: options?.opacity && options?.opacity < 1 ? true : false,
      fog: options?.fog ?? true,
    });
    super(geometry, material);

    this.type = 'PointHelper';
    this.point = point;
    this._radius = radius;

    this.position.copy(point);
  }

  get radius() {
    return this._radius;
  }

  set radius(value) {
    this._radius = value;
    this.geometry.copy(new THREE.SphereGeometry(value, 7, 7));
  }

  set(point: THREE.Vector3) {
    this.point = point;
  }

  setMaterial(options: PointDebugOptions) {
    const material = this.material as THREE.MeshBasicMaterial;
    if (options.color) material.color.set(options.color);
    if (options.alwaysOnTop) material.depthTest = !options.alwaysOnTop;
    if (options.opacity) {
      material.opacity = options.opacity;
      material.transparent = options.opacity && options.opacity < 1 ? true : false;
    }
    if (options.fog) material.fog = options.fog;
  }

  updateMatrixWorld() {
    this.position.copy(this.point);
    super.updateMatrixWorld();
  }

  dispose() {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
