export {};

// const [storeCCD] = useState(() => ({
//   triPoint: new THREE.Vector3(),
//   capsulePoint: new THREE.Vector3(),
//   line: new THREE.Line3(),
//   originLine: new THREE.Line3(),
//   origin: new THREE.Vector3(),
//   originEnd: new THREE.Vector3(),
//   obb: new OrientedBox(new THREE.Vector3(), new THREE.Vector3()),
//   collision: false,
//   normal: new THREE.Vector3(),
//   raycaster: new THREE.Raycaster(),
//   distanceDelta: 0,
//   mat: new THREE.Matrix4(),
//   vecA: new THREE.Vector3(),
//   vecB: new THREE.Vector3(),
//   vecC: new THREE.Vector3(),
// }));

// const capsuleCastCCD = useCallback<CapsuleCastHandler>(
//   (radius, height, transform, direction, maxDistance) => {
//     if (!collider?.geometry?.boundsTree) return null;
//     const { triPoint, capsulePoint, line, obb, normal, origin, originEnd, mat, vecA, vecB, vecC, originLine } =
//       storeCCD;

//     // direction = new THREE.Vector3(0.35, 0.1, 0);
//     // maxDistance = 2;
//     // maxDistance = maxDistance * 10;

//     const horizontal = vecA.set(direction.x, 0, direction.z).multiplyScalar(maxDistance);
//     const vertical = vecB.set(0, direction.y, 0).multiplyScalar(maxDistance);
//     const isHorizontalNotZero = notEqualToZero(horizontal.x) || notEqualToZero(horizontal.z);

//     // Build the ccd quad + box.
//     const halfPointHeight = height / 2 - radius;
//     line.start.set(0, halfPointHeight, 0);
//     line.end.set(0, -halfPointHeight, 0);

//     // Save the origin line for later.
//     originLine.copy(line);
//     originLine.start.applyMatrix4(transform);
//     originLine.end.applyMatrix4(transform);

//     if (vertical.y > 0) {
//       line.start.y = vertical.length() + halfPointHeight;
//       line.start.x = radius;
//       line.start.z = -radius;
//       line.end.x = -radius;
//       line.end.z = radius;
//     }
//     if (vertical.y < 0) {
//       line.end.y = -(vertical.length() + halfPointHeight);
//       line.start.x = radius;
//       line.start.z = -radius;
//       line.end.x = -radius;
//       line.end.z = radius;
//     }
//     if (isHorizontalNotZero) {
//       line.start.z = horizontal.length();
//       line.start.x = radius;
//       line.end.x = -radius;
//     }

//     // Build the box.
//     vecB.set(0, 0, 0);
//     vecA.set(0, 0, 0);
//     vecC.set(0, 0, 0);
//     direction.y = 0;

//     const position = vecA.setFromMatrixPosition(transform);
//     const target = vecB.applyMatrix4(transform).addScaledVector(direction, -maxDistance);
//     const up = vecC.set(0, 1, 0);

//     mat.setPosition(position);
//     mat.lookAt(position, target, up);

//     obb.set(line.start, line.end, mat);

//     // Check collision.
//     storeCCD.collision = collider.geometry.boundsTree.shapecast({
//       intersectsBounds: (bounds) => obb.intersectsBox(bounds),
//       intersectsTriangle: (tri) => {
//         tri.closestPointToSegment(originLine, triPoint, capsulePoint);
//         return true;
//       },
//       traverseBoundsOrder: (bounds) => {
//         return bounds.distanceToPoint(originLine.getCenter(vecC));
//       },
//     });

//     if (storeCCD.collision) {
//       return {
//         collider: collider,
//         point: triPoint,
//         normal: normal,
//         distance: origin.distanceTo(originEnd),
//       };
//     }
//     return null;
//   },
//   [collider, storeCCD],
// );
