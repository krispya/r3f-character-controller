import { DebugMaterialOptions } from 'debug/debug';
import * as THREE from 'three';

export class ExtendedBox3Helper extends THREE.Box3Helper {
  constructor(box: THREE.Box3, options?: DebugMaterialOptions) {
    super(box);

    const material = this.material as THREE.LineBasicMaterial;
    material.color.set(options?.color ?? 0xffff00);
    material.toneMapped = false;
    material.depthWrite = !options?.alwaysOnTop ?? true;
    material.opacity = options?.opacity ?? 1;
    material.transparent = options?.opacity && options?.opacity < 1 ? true : false;
    material.fog = options?.fog ?? true;
  }

  set(box: THREE.Box3) {
    super.box = box;
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
}
