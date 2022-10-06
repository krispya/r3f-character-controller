export {};

// import { CapsuleCastHandler } from 'character/character-controller';

// export const capsuleCast: CapsuleCastHandler = (radius, height, transform, direction, maxDistance) => {
//   if (!collider?.geometry?.boundsTree) return null;
//   const { triPoint, capsulePoint, line, box, normal, origin, originEnd } = store;

//   // Debug
//   store.capsule.radius = radius;
//   store.capsule.height = height;

//   // Build the capsule line segment (and two points).
//   buildCapsule(radius, height, transform, line, box);
//   origin.set(0, 0, 0);
//   origin.applyMatrix4(transform);

//   // Iterate by the number of physics steps we want to use to avoid tunneling.
//   // We'll need to do a loop and then break with the first hit. We don't want to keep iterating
//   // as the later results will be useless to us.

//   for (let i = 0; i < ITERATIONS; i++) {
//     // Move it by the direction and max distance.
//     const delta = maxDistance / ITERATIONS;
//     line.start.addScaledVector(direction, delta);
//     line.end.addScaledVector(direction, delta);
//     box.min.addScaledVector(direction, delta);
//     box.max.addScaledVector(direction, delta);

//     store.collision = collider.geometry.boundsTree.shapecast({
//       intersectsBounds: (bounds) => bounds.intersectsBox(box),
//       intersectsTriangle: (tri) => {
//         const distance = tri.closestPointToSegment(line, triPoint, capsulePoint);
//         // If the distance  is less than the radius of the character, we have a collision.
//         if (distance < radius) {
//           const depth = radius - distance;
//           const direction = capsulePoint.sub(triPoint).normalize();

//           // Move the line segment so there is no longer an intersection.
//           line.start.addScaledVector(direction, depth);
//           line.end.addScaledVector(direction, depth);

//           line.getCenter(originEnd);
//           tri.getNormal(normal);
//           return true;
//         }
//         return false;
//       },
//     });

//     if (store.collision) break;
//   }

//   // Debug
//   box.getCenter(store.capsule.position);

//   if (store.collision) {
//     store.distanceDelta = maxDistance - origin.distanceTo(originEnd);
//     console.log(store.distanceDelta);
//     return {
//       collider: collider,
//       point: triPoint,
//       normal: normal,
//       distance: origin.distanceTo(originEnd),
//     };
//   }
//   return null;
// };
