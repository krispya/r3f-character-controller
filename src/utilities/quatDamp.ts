import * as THREE from 'three';

export function quatDamp(current: THREE.Quaternion, target: THREE.Quaternion, lambda: number, delta: number) {
  const angleTo = current.angleTo(target);

  if (angleTo > 0) {
    const t = THREE.MathUtils.damp(0, angleTo, lambda, delta);
    current = current.slerp(target, t);
  }
}
