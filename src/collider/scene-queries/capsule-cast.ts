import { Capsule } from 'collider/geometry/capsule';
import { useCollider } from 'collider/stores/collider-store';
import * as THREE from 'three';

export type HitInfo = {
  collider: THREE.Object3D;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
};

export type CapsuleCastParams = {
  radius: number;
  halfHeight: number;
  transform: THREE.Matrix4;
  direction: THREE.Vector3;
  maxDistance: number;
};

export type CapsuleCastFn = (
  radius: number,
  halfHeight: number,
  transform: THREE.Matrix4,
  direction: THREE.Vector3,
  maxDistance: number,
) => HitInfo | null;

const ITERATIONS = 20;

const store = {
  capsule: new Capsule(),
  triPoint: new THREE.Vector3(),
  capsulePoint: new THREE.Vector3(),
  line: new THREE.Line3(),
  aabb: new THREE.Box3(),
  normal: new THREE.Vector3(),
  origin: new THREE.Vector3(),
  originEnd: new THREE.Vector3(),
  collision: false,
};

export const capsuleCast: CapsuleCastFn = (radius, halfHeight, transform, direction, maxDistance) => {
  const { capsule, triPoint, capsulePoint, line, aabb, normal, origin, originEnd } = store;

  // Right now assumes a single collider. We exit if it doesn't have its BVH built yet.
  const collider = useCollider.getState().collider;
  if (!collider?.geometry?.boundsTree) return null;

  capsule.set(radius, halfHeight);
  // If the capsule isn't valid, bail out.
  if (!capsule.isValid) return null;
  capsule.toSegment(line);

  line.applyMatrix4(transform);

  aabb.setFromPoints([line.start, line.end]);
  aabb.min.addScalar(-radius);
  aabb.max.addScalar(radius);

  origin.set(0, 0, 0);
  origin.applyMatrix4(transform);

  // Iterate by the number of physics steps we want to use to avoid tunneling.
  // We'll need to do a loop and then break with the first hit. We don't want to keep iterating
  // as the later results will be useless to us.

  for (let i = 0; i < ITERATIONS; i++) {
    // Move it by the direction and max distance.
    const delta = maxDistance / ITERATIONS;
    line.start.addScaledVector(direction, delta);
    line.end.addScaledVector(direction, delta);
    aabb.min.addScaledVector(direction, delta);
    aabb.max.addScaledVector(direction, delta);

    store.collision = collider.geometry.boundsTree.shapecast({
      intersectsBounds: (bounds) => bounds.intersectsBox(aabb),
      intersectsTriangle: (tri) => {
        const distance = tri.closestPointToSegment(line, triPoint, capsulePoint);
        // If the distance  is less than the radius of the character, we have a collision.
        if (distance < radius) {
          const depth = radius - distance;
          const direction = capsulePoint.sub(triPoint).normalize();

          // Move the line segment so there is no longer an intersection.
          line.start.addScaledVector(direction, depth);
          line.end.addScaledVector(direction, depth);

          line.getCenter(originEnd);
          tri.getNormal(normal);
          return true;
        }
        return false;
      },
    });

    if (store.collision) break;
  }

  if (store.collision) {
    return {
      collider: collider,
      point: triPoint,
      normal: normal,
      distance: origin.distanceTo(originEnd),
    };
  }
  return null;
};
