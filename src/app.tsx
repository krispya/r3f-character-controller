import './app.css';
import { Canvas, Stages, useUpdate } from '@react-three/fiber';
import { StrictMode, Suspense, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { CameraController } from 'camera/camera-controller';
import { Fauna } from 'test-assets/fauna';
import { Terrain } from 'test-assets/terrain';
import { Collider } from 'collider/collider';
import Space from 'test-assets/space';
import { PlayerController } from 'player/player-controller';
import { MushroomBoi } from 'test-assets/mushroom-boi';
import { TestExtenstionTerrain } from 'test-assets/test-extension-terrain';
import { InputSystem } from 'input/input-system';
import { useCollider } from 'collider/stores/collider-store';
import * as THREE from 'three';
import { LineDebug } from 'utilities/line-debug';
import { CapsuleCastHandler, OverlapCapsuleHandler, RaycastHandler } from 'character/character-controller';
import { Box, Sphere } from '@react-three/drei';
import { CapsuleDebug } from 'utilities/capsule-debug';
import { BoxDebug } from 'utilities/box-debug';
import { OrientedBox } from 'three-mesh-bvh';
import { OrientedBoxDebug } from 'utilities/oriented-box-debug';
import { Matrix3 } from 'three';
import { notEqualToZero } from 'utilities/math';

const FIXED_STEP = 1 / 60;
const ITERATIONS = 5;

function Game() {
  // Set fixed step size.
  useLayoutEffect(() => {
    Stages.Fixed.fixedStep = FIXED_STEP;
  }, []);

  // Moving physics functions out here so we can separate them from the CCT.
  // I'll find a home for them eventually.
  const [store] = useState(() => ({
    capsule: { radius: 0, height: 0, position: new THREE.Vector3() },
    triPoint: new THREE.Vector3(),
    capsulePoint: new THREE.Vector3(),
    line: new THREE.Line3(),
    origin: new THREE.Vector3(),
    originEnd: new THREE.Vector3(),
    box: new THREE.Box3(),
    collision: false,
    normal: new THREE.Vector3(),
    raycaster: new THREE.Raycaster(),
    distanceDelta: 0,
  }));

  const collider = useCollider((state) => state.collider);

  function buildCapsule(radius: number, height: number, transform: THREE.Matrix4, line: THREE.Line3, box?: THREE.Box3) {
    const halfPointHeight = height / 2 - radius;
    line.start.set(0, halfPointHeight, 0);
    line.end.set(0, -halfPointHeight, 0);
    // Apply the transform to the points.
    line.start.applyMatrix4(transform);
    line.end.applyMatrix4(transform);
    // Build the box.
    if (box) {
      box.setFromPoints([line.start, line.end]);
      box.min.addScalar(-radius);
      box.max.addScalar(radius);
    }
  }

  // TODO: Need to test at starting position first to see if we're already colliding.

  const capsuleCast = useCallback<CapsuleCastHandler>(
    (radius, height, transform, direction, maxDistance) => {
      if (!collider?.geometry?.boundsTree) return null;
      const { triPoint, capsulePoint, line, box, normal, origin, originEnd } = store;

      // Debug
      store.capsule.radius = radius;
      store.capsule.height = height;

      // Build the capsule line segment (and two points).
      buildCapsule(radius, height, transform, line, box);
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
        box.min.addScaledVector(direction, delta);
        box.max.addScaledVector(direction, delta);

        store.collision = collider.geometry.boundsTree.shapecast({
          intersectsBounds: (bounds) => bounds.intersectsBox(box),
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

      // Debug
      box.getCenter(store.capsule.position);

      if (store.collision) {
        store.distanceDelta = maxDistance - origin.distanceTo(originEnd);
        console.log(store.distanceDelta);
        return {
          collider: collider,
          point: triPoint,
          normal: normal,
          distance: origin.distanceTo(originEnd),
        };
      }
      return null;
    },
    [collider, store],
  );

  const [storeCCD] = useState(() => ({
    triPoint: new THREE.Vector3(),
    capsulePoint: new THREE.Vector3(),
    line: new THREE.Line3(),
    originLine: new THREE.Line3(),
    origin: new THREE.Vector3(),
    originEnd: new THREE.Vector3(),
    obb: new OrientedBox(new THREE.Vector3(), new THREE.Vector3()),
    collision: false,
    normal: new THREE.Vector3(),
    raycaster: new THREE.Raycaster(),
    distanceDelta: 0,
    mat: new THREE.Matrix4(),
    vecA: new THREE.Vector3(),
    vecB: new THREE.Vector3(),
    vecC: new THREE.Vector3(),
  }));

  const capsuleCastCCD = useCallback<CapsuleCastHandler>(
    (radius, height, transform, direction, maxDistance) => {
      if (!collider?.geometry?.boundsTree) return null;
      const { triPoint, capsulePoint, line, obb, normal, origin, originEnd, mat, vecA, vecB, vecC, originLine } =
        storeCCD;

      // direction = new THREE.Vector3(0.35, 0, 0.5);
      // maxDistance = 2;
      maxDistance = maxDistance * 10;

      const horizontal = vecA.set(direction.x, 0, direction.z).multiplyScalar(maxDistance);
      const vertical = vecB.set(0, direction.y, 0).multiplyScalar(maxDistance);
      const isHorizontalNotZero = notEqualToZero(horizontal.x) || notEqualToZero(horizontal.z);

      // Build the ccd quad + box.
      const halfPointHeight = height / 2 - radius;
      line.start.set(0, halfPointHeight, 0);
      line.end.set(0, -halfPointHeight, 0);

      // Save the origin line for later.
      originLine.copy(line);
      originLine.start.applyMatrix4(transform);
      originLine.end.applyMatrix4(transform);

      if (vertical.y > 0) {
        line.start.y = vertical.length() + halfPointHeight;
        line.start.x = radius;
        line.start.z = -radius;
        line.end.x = -radius;
        line.end.z = radius;
      }
      if (vertical.y < 0) {
        line.end.y = -(vertical.length() + halfPointHeight);
        line.start.x = radius;
        line.start.z = -radius;
        line.end.x = -radius;
        line.end.z = radius;
      }
      if (isHorizontalNotZero) {
        line.start.z = horizontal.length();
        line.start.x = radius;
        line.end.x = -radius;
      }

      // Build the box.
      vecB.set(0, 0, 0);
      vecA.set(0, 0, 0);
      vecC.set(0, 0, 0);
      direction.y = 0;

      const position = vecA.setFromMatrixPosition(transform);
      const target = vecB.applyMatrix4(transform).addScaledVector(direction, -maxDistance);
      const up = vecC.set(0, 1, 0);

      mat.setPosition(position);
      mat.lookAt(position, target, up);

      obb.set(line.start, line.end, mat);

      // Check collision.
      storeCCD.collision = collider.geometry.boundsTree.shapecast({
        intersectsBounds: (bounds) => obb.intersectsBox(bounds),
        intersectsTriangle: (tri) => {
          tri.closestPointToSegment(originLine, triPoint, capsulePoint);
          return true;
        },
        traverseBoundsOrder: (bounds) => {
          return bounds.distanceToPoint(originLine.getCenter(vecC));
        },
      });

      if (storeCCD.collision) {
        return {
          collider: collider,
          point: triPoint,
          normal: normal,
          distance: origin.distanceTo(originEnd),
        };
      }
      return null;
    },
    [collider, storeCCD],
  );

  const raycast = useCallback<RaycastHandler>(
    (origin, direction, maxDistance) => {
      if (!collider) return null;

      const { raycaster } = store;
      raycaster.set(origin, direction);
      raycaster.far = maxDistance;
      raycaster.firstHitOnly = true;
      const hit = raycaster.intersectObject(collider, false);

      if (hit.length > 0 && hit[0].face) {
        return {
          collider: collider,
          point: hit[0].point,
          normal: hit[0].face.normal,
          distance: hit[0].distance,
        };
      }
      return null;
    },
    [collider, store],
  );

  const [storeB] = useState(() => ({
    line: new THREE.Line3(),
    box: new THREE.Box3(),
  }));

  const overlapCapsule = useCallback<OverlapCapsuleHandler>(
    (radius, height, transform) => {
      const { line, box } = storeB;
      buildCapsule(radius, height, transform, line, box);
      return [];
    },
    [storeB],
  );

  const sphereRef = useRef<THREE.Mesh>(null!);
  const originRef = useRef<THREE.Mesh>(null!);
  useUpdate(() => {
    if (sphereRef.current) {
      sphereRef.current.matrixAutoUpdate = false;
      if (storeCCD.collision) sphereRef.current.matrix.setPosition(storeCCD.triPoint);
      sphereRef.current.visible = storeCCD.collision;
    }
    if (originRef.current) {
      originRef.current.matrixAutoUpdate = false;
      originRef.current.matrix.setPosition(store.originEnd);
      if (store.distanceDelta >= 0) {
        (originRef.current.material as THREE.MeshBasicMaterial).color.set('blue');
      } else {
        (originRef.current.material as THREE.MeshBasicMaterial).color.set('green');
      }
    }
  });

  return (
    <Suspense>
      <Sphere ref={sphereRef} args={[0.05]}>
        <meshBasicMaterial color="red" depthTest={true} />
      </Sphere>
      {/*<Sphere ref={originRef} args={[0.05]}>
        <meshBasicMaterial color="blue" depthTest={false} />
      </Sphere> */}
      {/* <LineDebug line={storeCCD.originLine} /> */}
      {/* <CapsuleDebug capsule={storeCCD.capsule} /> */}
      {/* <BoxDebug box={storeCCD.box} /> */}
      <OrientedBoxDebug box={storeCCD.obb} />

      <InputSystem />

      <Fauna />
      <Collider autoUpdate>
        <Terrain />
        <TestExtenstionTerrain />
      </Collider>

      <PlayerController
        id="player"
        capsuleCast={capsuleCastCCD}
        raycast={raycast}
        overlapCapsule={overlapCapsule}
        position={[0, 2, 0]}
        walkSpeed={5}
        airControl={0.5}
        capsule={{ radius: 0.27 }}
        slopeLimit={90}
        gravity={-14}
        debug={{ showBox: true, showCollider: true }}>
        <MushroomBoi scale={0.25} rotation={[0, -Math.PI / 2, 0]} />
      </PlayerController>
      <CameraController />

      <Space />
      <ambientLight intensity={0.4} />
      <hemisphereLight intensity={0.95} color="#eacb6e" groundColor="red" />
      <spotLight
        castShadow
        color="#edbf6f"
        intensity={100}
        position={[80, 50, -40]}
        angle={0.35}
        penumbra={1}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.00001}
      />
    </Suspense>
  );
}

export default function App() {
  return (
    <Canvas shadows gl={{ physicallyCorrectLights: true }}>
      <StrictMode>
        <Game />
      </StrictMode>
    </Canvas>
  );
}
