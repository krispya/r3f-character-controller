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
import { CapsuleCastHandler, RaycastHandler } from 'character/character-controller';
import { Sphere } from '@react-three/drei';

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
    triPoint: new THREE.Vector3(),
    capsulePoint: new THREE.Vector3(),
    origin: new THREE.Vector3(),
    line: new THREE.Line3(),
    box: new THREE.Box3(),
    collision: false,
    normal: new THREE.Vector3(),
    distance: 0,
    raycaster: new THREE.Raycaster(),
  }));
  const collider = useCollider((state) => state.collider);

  const capsuleCast = useCallback<CapsuleCastHandler>(
    (radius, height, transform, direction, maxDistance) => {
      if (!collider?.geometry?.boundsTree) return null;
      const { triPoint, capsulePoint, line, box, normal, origin } = store;

      // Build the capsule line segment (and two points).
      const halfPointHeight = height / 2 - radius;
      origin.set(0, 0, 0);
      line.start.set(0, halfPointHeight, 0);
      line.end.set(0, -halfPointHeight, 0);
      // Apply the transform to the points.
      origin.applyMatrix4(transform);
      line.start.applyMatrix4(transform);
      line.end.applyMatrix4(transform);
      // Build the box.
      box.setFromPoints([line.start, line.end]);
      box.min.addScalar(-radius);
      box.max.addScalar(radius);

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
          distance: origin.distanceTo(triPoint),
        };
      }
      return null;
    },
    [collider, store],
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

  const sphereRef = useRef<THREE.Mesh>(null!);
  useUpdate(() => {
    sphereRef.current.position.copy(store.origin);
  });

  return (
    <Suspense>
      <Sphere ref={sphereRef} args={[0.05]}>
        <meshBasicMaterial color="red" depthTest={false} />
      </Sphere>
      <LineDebug line={store.line} />

      <InputSystem />

      <Fauna />
      <Collider autoUpdate debug>
        <Terrain />
        <TestExtenstionTerrain />
      </Collider>

      <PlayerController
        id="player"
        capsuleCast={capsuleCast}
        raycast={raycast}
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
