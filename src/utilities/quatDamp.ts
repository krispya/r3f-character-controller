import * as THREE from 'three';
import { SmoothDamp } from '@gsimone/smoothdamp';

export function quatDamp(current: THREE.Quaternion, target: THREE.Quaternion, lambda: number, delta: number) {
  const angleTo = current.angleTo(target);

  if (angleTo > 0) {
    const t = THREE.MathUtils.damp(0, angleTo, lambda, delta);
    current = current.slerp(target, t);
  }
}

export function quatSmoothDamp(current: THREE.Quaternion, target: THREE.Quaternion, smoothTime: number, delta: number) {
  const angleTo = current.angleTo(target);
  const smoothDamp = new SmoothDamp(smoothTime / 10, 10);

  if (angleTo > 0) {
    const t = smoothDamp.get(0, angleTo, delta);
    current = current.slerp(target, t);
  }
}
