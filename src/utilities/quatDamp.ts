import * as THREE from 'three';
import { SmoothDamp } from '@gsimone/smoothdamp';

export function quatDamp(current: THREE.Quaternion, target: THREE.Quaternion, smoothTime: number, delta: number) {
  const angleTo = current.angleTo(target);
  const smoothDamp = new SmoothDamp(smoothTime / 10, 10);

  if (angleTo > 0) {
    const t = smoothDamp.get(0, angleTo, delta);
    current = current.slerp(target, t);
  }
}
