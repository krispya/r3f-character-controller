import { Capsule } from 'collider/geometry/capsule';
import * as THREE from 'three';

export type MTD = {
  distance: number;
  direction: THREE.Vector3;
};

export type ComputePenetrationFn = (
  colliderA: Capsule,
  transformA: THREE.Matrix4,
  colliderB: THREE.BufferGeometry,
  transformB: THREE.Matrix4,
) => MTD | null;

const store = {
  triPoint: new THREE.Vector3(),
  capsulePoint: new THREE.Vector3(),
  segment: new THREE.Line3(),
  aabb: new THREE.Box3(),
  collision: false,
  direction: new THREE.Vector3(),
  depth: 0,
};

export const computePenetration: ComputePenetrationFn = (colliderA, transformA, colliderB, transformB) => {
  const { triPoint, capsulePoint, segment, aabb, direction } = store;

  // TODO: Right now colliderA is assumed to be a capsule and colliderB mesh geometry.
  const capsule = colliderA;
  const collider = colliderB;

  if (!capsule.isValid) return null;
  if (!collider?.boundsTree) return null;

  capsule.toSegment(segment);
  segment.applyMatrix4(transformA);

  aabb.setFromPoints([segment.start, segment.end]);
  aabb.min.addScalar(-capsule.radius);
  aabb.max.addScalar(capsule.radius);

  collider.applyMatrix4(transformB);

  store.collision = collider.boundsTree.shapecast({
    intersectsBounds: (bounds) => bounds.intersectsBox(aabb),
    intersectsTriangle: (tri) => {
      const distance = tri.closestPointToSegment(segment, triPoint, capsulePoint);
      // If the distance is less than the radius of the capsule, we have a collision.

      if (distance < capsule.radius) {
        store.depth = capsule.radius - distance;
        direction.copy(capsulePoint).sub(triPoint).normalize();

        return true;
      }
      return false;
    },
  });

  if (store.collision) {
    return {
      distance: store.depth,
      direction,
    };
  }
  return null;
};
