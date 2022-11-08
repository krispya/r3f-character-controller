import { Capsule } from 'collider/geometry/capsule';
import { useCollider } from 'collider/stores/collider-store';
import * as THREE from 'three';

export type OverlapCapsuleFn = (radius: number, halfHeight: number, transform: THREE.Matrix4) => THREE.Mesh[];

const store = {
  capsule: new Capsule(),
  colliders: [] as THREE.Mesh[],
  segment: new THREE.Line3(),
  aabb: new THREE.Box3(),
  triPoint: new THREE.Vector3(),
  capsulePoint: new THREE.Vector3(),
};

export const overlapCapsule: OverlapCapsuleFn = (radius, halfHeight, transform) => {
  const { capsule, colliders, segment, aabb, triPoint, capsulePoint } = store;

  colliders.length = 0;

  // TODO: Make this actually support multiple colliders. Big stub.
  const collider = useCollider.getState().collider;
  if (!collider?.geometry?.boundsTree) return [];

  capsule.set(radius, halfHeight);
  if (!capsule.isValid) return [];

  capsule.toSegment(segment);
  segment.applyMatrix4(transform);

  aabb.setFromPoints([segment.start, segment.end]);
  aabb.min.addScalar(-radius);
  aabb.max.addScalar(radius);

  // TODO: This can be done more efficiently since we are only interested in if an intersection occurred.
  // Look at pg 185 in Real-Time Collision Detection.
  collider.geometry.boundsTree.shapecast({
    intersectsBounds: (bounds) => bounds.intersectsBox(aabb),
    intersectsTriangle: (tri) => {
      const distance = tri.closestPointToSegment(segment, triPoint, capsulePoint);

      if (distance < radius) {
        colliders.push(collider);
        return true;
      }
    },
  });

  return colliders;
};
