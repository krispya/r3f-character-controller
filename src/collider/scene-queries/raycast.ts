import { useCollider } from 'collider/stores/collider-store';
import * as THREE from 'three';

export type HitInfo = {
  collider: THREE.Object3D;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  location: THREE.Vector3;
};

export type RaycastFn = (origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number) => HitInfo | null;

const store = {
  raycaster: new THREE.Raycaster(),
};

export const raycast: RaycastFn = (origin, direction, maxDistance) => {
  const { raycaster } = store;

  // TODO: Support multiple colliders.
  const collider = useCollider.getState().collider;
  if (!collider) return null;

  raycaster.set(origin, direction);
  raycaster.far = maxDistance;
  raycaster.firstHitOnly = true;
  const hit = raycaster.intersectObject(collider, false);

  if (hit.length > 0 && hit[0].face) {
    return {
      collider: collider,
      point: hit[0].point,
      location: hit[0].point,
      normal: hit[0].face.normal,
      distance: hit[0].distance,
    };
  }
  return null;
};
