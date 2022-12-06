import { DebugMaterialOptions } from 'debug/debug';
import * as THREE from 'three';

export type RayInfo = {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  distance: number;
};

export class RayHelper extends THREE.Line {
  public rayInfo: RayInfo;
  private end: THREE.Vector3;

  constructor(rayInfo: RayInfo, options?: DebugMaterialOptions) {
    const end = new THREE.Vector3().copy(rayInfo.origin).addScaledVector(rayInfo.direction, rayInfo.distance);
    const geometry = new THREE.BufferGeometry().setFromPoints([rayInfo.origin, end]);
    const material = new THREE.LineBasicMaterial({
      color: options?.color ?? 0xff0000,
      toneMapped: false,
      depthTest: !options?.alwaysOnTop ?? true,
      opacity: options?.opacity ?? 1,
      transparent: options?.opacity && options?.opacity < 1 ? true : false,
      fog: options?.fog ?? true,
    });

    super(geometry, material);

    this.type = 'RayHelper';
    this.rayInfo = rayInfo;
    this.end = end;
  }

  set(rayInfo: RayInfo) {
    this.rayInfo = rayInfo;
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
    this.end.copy(this.rayInfo.origin).addScaledVector(this.rayInfo.direction, this.rayInfo.distance);
    this.geometry.setFromPoints([this.rayInfo.origin, this.end]);
  }

  dispose() {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
