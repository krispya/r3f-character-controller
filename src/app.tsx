import './app.css';
import { Canvas, Stages } from '@react-three/fiber';
import { StrictMode, Suspense, useCallback, useLayoutEffect, useState } from 'react';
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
import { ExtendedTriangle } from 'three-mesh-bvh';

const FIXED_STEP = 1 / 60;

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
    line: new THREE.Line3(),
    box: new THREE.Box3(),
    hitTri: new ExtendedTriangle(),
    hitDistance: 0,
    hitDirection: new THREE.Vector3(),
  }));
  const collider = useCollider((state) => state.collider);

  const capsuleCast = useCallback(
    (radius: number, height: number, transform: THREE.Matrix4, direction: THREE.Vector3, maxDistance: number) => {
      if (!collider?.geometry?.boundsTree) return null;
      const { triPoint, capsulePoint, line, box, hitTri } = store;

      // Build the capsule line segment (and two points).
      const halfPointHeight = height / 2 - radius;
      line.start.set(0, halfPointHeight, 0);
      line.end.set(0, -halfPointHeight, 0);
      // Apply the transform to the points.
      // line.start.applyMatrix4(transform);
      // line.end.applyMatrix4(transform);
      // Move it by the direction and max distance.
      // line.start.addScaledVector(direction, maxDistance);
      // line.end.addScaledVector(direction, maxDistance);
      // Build the box.
      box.setFromPoints([line.start, line.end]);
      box.min.addScalar(-radius);
      box.max.addScalar(radius);
      // Iterate by the number of physics steps we want to use to avoid tunneling.

      console.log(transform);

      const collision = collider.geometry.boundsTree.shapecast({
        intersectsBounds: (bounds) => bounds.intersectsBox(box),
        intersectsTriangle: (tri) => {
          store.hitDistance = tri.closestPointToSegment(line, triPoint, capsulePoint);

          // If the store.hitDistance  is less than the radius of the character, we have a collision.
          if (store.hitDistance < radius) {
            const depth = radius - store.hitDistance;
            store.hitDirection = capsulePoint.sub(triPoint).normalize();
            hitTri.copy(tri);
          }
        },
      });

      if (collision) {
        return {
          distance: store.hitDistance,
          direction: store.hitDirection,
          triangle: hitTri,
        };
      } else {
        return null;
      }
    },
    [collider, store],
  );

  return (
    <Suspense>
      <InputSystem />

      <Fauna />
      <Collider autoUpdate debug>
        <Terrain />
        <TestExtenstionTerrain />
      </Collider>

      <PlayerController
        capsuleCast={capsuleCast}
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
