import './app.css';
import { Environment, OrbitControls, useHelper } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useRef } from 'react';
import { useController } from './controller';
import { PlayerController } from './player-controller';
import { Player } from './player';
import { CameraController } from './camera-controller';
import { Fauna } from './level/fauna';
import { Terrain } from './level/terrain';
import { Collider } from './collider';
import Space from './level/space';
import * as THREE from 'three';

export const Stages = {
  Early: -200,
  Update: -100,
  Late: 0,
};

function Game() {
  const controller = useController();

  // Start our controller
  useLayoutEffect(() => {
    controller.start();
  }, [controller]);

  // Update the controller on an early loop
  useFrame(() => {
    controller.update();
  }, Stages.Early);

  const lightRef = useRef(null!);
  useHelper(null, THREE.SpotLightHelper);

  return (
    <Suspense>
      <Suspense>
        <Fauna />
        <Collider>
          <Terrain />
        </Collider>

        <PlayerController>
          <Player radius={0.5 / 2} length={0.65 / 2} />
        </PlayerController>
      </Suspense>

      <Space />
      <ambientLight intensity={0.3} />
      <hemisphereLight intensity={0.95} color="#eacb6e" groundColor="red" />
      <spotLight
        ref={lightRef}
        castShadow
        color="orange"
        intensity={1000}
        position={[80, 50, -40]}
        angle={0.25}
        penumbra={1}
        shadow-mapSize={[128, 128]}
        shadow-bias={0.00005}
      />

      {/* <OrbitControls /> */}
      <CameraController />
    </Suspense>
  );
}

export default function App() {
  return (
    <Canvas shadows gl={{ physicallyCorrectLights: true }}>
      <Game />
    </Canvas>
  );
}
