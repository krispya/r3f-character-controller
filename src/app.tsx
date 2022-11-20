import './app.css';
import { Canvas, Stages } from '@react-three/fiber';
import { StrictMode, Suspense, useLayoutEffect } from 'react';
import { CameraController } from 'camera/camera-controller';
import { Fauna } from 'test-assets/fauna';
import { Terrain } from 'test-assets/terrain';
import { Collider } from 'collider/collider';
import Space from 'test-assets/space';
import { PlayerController } from 'player/player-controller';
import { MushroomBoi } from 'test-assets/mushroom-boi';
import { TestExtenstionTerrain } from 'test-assets/test-extension-terrain';
import { InputSystem } from 'input/input-system';
import { Wander } from 'test-assets/wander';
import * as THREE from 'three';

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
      <Collider autoUpdate>
        <Terrain />
        <TestExtenstionTerrain />
      </Collider>

      {/* <CastTest position={[4.5, -1.5, -9]} radius={0.25} halfHeight={0.55} maxDistance={8} autoUpdate /> */}

      <PlayerController
        id="player"
        position={[0, 2, 0]}
        walkSpeed={5}
        airControl={0.5}
        capsule={{ radius: 0.25, height: 1.15, center: new THREE.Vector3(0, -0.25, 0) }}
        slopeLimit={90}
        gravity={-14}
        debug>
        {/* <MushroomBoi scale={0.25} rotation={[0, -Math.PI / 2, 0]} /> */}
        <Wander />
      </PlayerController>
      <CameraController />

      <Space />
      <ambientLight intensity={0.65} />
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
