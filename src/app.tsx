import './app.css';
import { Canvas, Stages } from '@react-three/fiber';
import { StrictMode, Suspense, useLayoutEffect } from 'react';
import { CameraController } from 'camera/camera-controller';
import { Fauna } from 'test-assets/fauna';
import { Terrain } from 'test-assets/terrain';
import { Collider } from 'collider/collider';
import Space from 'test-assets/space';
import { PlayerController } from 'player/player-controller';
import { TestExtenstionTerrain } from 'test-assets/test-extension-terrain';
import { InputSystem } from 'input/input-system';
import { Wander } from 'test-assets/wander';
import * as THREE from 'three';
import { Debug } from 'debug/react/debug';
import { SphereCastTest } from 'test-assets/sphere-cast-test';
// import { CastTest } from 'test-assets/cast-test';

const FIXED_STEP = 1 / 60;

function Game() {
  // Set fixed step size.
  useLayoutEffect(() => {
    Stages.Fixed.fixedStep = FIXED_STEP;
  }, []);

  return (
    <Suspense>
      <InputSystem />

      <Fauna />
      <Collider>
        <Terrain />
        <TestExtenstionTerrain />
      </Collider>

      <PlayerController
        id="player"
        position={[4, 0, -9]}
        walkSpeed={3.8}
        airControl={0.5}
        capsule={{ radius: 0.25, height: 1.15, center: new THREE.Vector3(0, -0.25, 0) }}
        // slopeLimit={90}
        // gravity={-1}
        debug>
        <Wander />
      </PlayerController>
      <CameraController />

      <SphereCastTest origin={[4.5, -1.5, -10.7]} radius={0.25} maxDistance={10} />

      <Space />
      <ambientLight intensity={0.5} />
      <hemisphereLight intensity={0.95} color="#eacb6e" groundColor="red" />
      <spotLight
        castShadow
        color="#edbf6f"
        intensity={200}
        position={[80, 50, -40]}
        angle={0.35}
        penumbra={1}
        shadow-mapSize={[2048 * 2, 2048 * 2]}
        shadow-bias={-0.00001}
        shadow-near={0.5}
        shadow-far={50}
        shadow-left={-20}
        shadow-bottom={-20}
        shadow-right={20}
        shadow-top={20}
      />
    </Suspense>
  );
}

export default function App() {
  return (
    <Canvas shadows gl={{ physicallyCorrectLights: true }}>
      <StrictMode>
        <Debug>
          <Game />
        </Debug>
      </StrictMode>
    </Canvas>
  );
}
