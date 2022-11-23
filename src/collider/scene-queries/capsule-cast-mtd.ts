import { Capsule } from 'collider/geometry/capsule';
import { useCollider } from 'collider/stores/collider-store';
import * as THREE from 'three';
import { HitInfo } from './objects/hit-info';
import { MTD } from './objects/mtd';

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
) => [HitInfo, MTD] | [null, null];

const MIN_STEPS = 5;
const MAX_STEPS = 20;
const OVERLAP_RATIO = 0.2;

const store = {
  capsule: new Capsule(),
  point: new THREE.Vector3(),
  triPoint: new THREE.Vector3(),
  capsulePoint: new THREE.Vector3(),
  segment: new THREE.Line3(),
  aabb: new THREE.Box3(),
  normal: new THREE.Vector3(),
  castStart: new THREE.Vector3(),
  castEnd: new THREE.Vector3(),
  collision: false,
  depth: 0,
  deltaDirection: new THREE.Vector3(),
};

export const capsuleCastMTD: CapsuleCastFn = (radius, halfHeight, transform, direction, maxDistance) => {
  let {
    capsule,
    point,
    triPoint,
    capsulePoint,
    segment,
    aabb,
    normal,
    castStart,
    castEnd,
    collision,
    depth,
    deltaDirection,
  } = store;

  collision = false;
  const diameter = radius * 2;

  // Right now assumes a single collider. We exit if it doesn't have its BVH built yet.
  const collider = useCollider.getState().collider;
  if (!collider?.geometry?.boundsTree) return [null, null];

  capsule.set(radius, halfHeight);
  if (!capsule.isValid) return [null, null];

  capsule.toSegment(segment);
  segment.applyMatrix4(transform);

  aabb.setFromPoints([segment.start, segment.end]);
  aabb.min.addScalar(-radius);
  aabb.max.addScalar(radius);

  castStart.set(0, 0, 0);
  castStart.applyMatrix4(transform);

  // In order to fend off tunneling, super-sampling is used.
  // Full coverage of the cast distance is attempted with a max applied to stop excess calculations.
  // Likewise, a minimum is applied which should be at least 3. This helps accuracy when moving between two triangles.
  const steps = Math.max(Math.min(maxDistance / (diameter - diameter * OVERLAP_RATIO), MAX_STEPS), MIN_STEPS);
  const delta = maxDistance / steps;

  for (let i = 0; i < steps; i++) {
    // Move it by the direction and max distance.
    segment.start.addScaledVector(direction, delta);
    segment.end.addScaledVector(direction, delta);
    aabb.min.addScaledVector(direction, delta);
    aabb.max.addScaledVector(direction, delta);

    collider.geometry.boundsTree.shapecast({
      intersectsBounds: (bounds) => bounds.intersectsBox(aabb),
      intersectsTriangle: (tri) => {
        const distance = tri.closestPointToSegment(segment, triPoint, capsulePoint);

        // If the distance is less than the radius of the capsule, we have a collision.
        if (distance < radius) {
          depth = radius - distance;
          deltaDirection = capsulePoint.sub(triPoint).normalize();

          segment.start.addScaledVector(deltaDirection, depth);
          segment.end.addScaledVector(deltaDirection, depth);

          point.copy(triPoint);
          segment.getCenter(castEnd);
          tri.getNormal(normal);

          collision = true;
        }
      },
    });
  }

  if (collision) {
    return [
      new HitInfo(collider, point, castEnd, normal, castStart.distanceTo(castEnd)),
      new MTD(depth, deltaDirection),
    ];
  }
  return [null, null];
};
