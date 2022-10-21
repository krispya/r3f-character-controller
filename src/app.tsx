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
import { Sphere } from '@react-three/drei';
import { CapsuleDebug } from 'utilities/capsule-debug';
import { BoxDebug } from 'utilities/box-debug';
import { capsuleCast } from 'collider/scene-queries/capsuleCast';
import { CastTest } from 'test-assets/cast-test';

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
    distance: 0,
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

  // TODO: Make sure these raycasts return the proper collision info if
  // the origin is inside a shape (like capsule).

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

  // PhysX: Overlaps do not support hit flags and return only a boolean result.
  // PhysX: A sweep of length 0 is equivalent to an overlap check.
  // Basically, Do a capsuleCast at origin only but we only return the collided boolean.
  // No further calculatiosn necessary. This is how it will work for us but reading further,
  // PhysX actually uses a different algorithm here.

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
      if (store.collision) sphereRef.current.matrix.setPosition(store.triPoint);
      sphereRef.current.visible = store.collision;
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
      {/* <Sphere ref={sphereRef} args={[0.05]}>
        <meshBasicMaterial color="red" depthTest={true} />
      </Sphere> */}
      {/*<Sphere ref={originRef} args={[0.05]}>
        <meshBasicMaterial color="blue" depthTest={false} />
      </Sphere> */}
      {/* <LineDebug line={storeCCD.originLine} /> */}
      {/* <CapsuleDebug capsule={store.capsule} /> */}
      {/* <BoxDebug box={store.box} /> */}

      <InputSystem />

      <Fauna />
      <Collider autoUpdate>
        <Terrain />
        <TestExtenstionTerrain />
      </Collider>

      <CastTest position={[6.25, -1.5, -9]} />

      <PlayerController
        id="player"
        capsuleCast={capsuleCast as CapsuleCastHandler}
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
