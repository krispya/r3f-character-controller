import './app.css';
import { useHelper } from '@react-three/drei';
import { Canvas, Stages, useUpdate } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useRef } from 'react';
import { useController } from 'controls/controller';
import { CharacterController } from 'character/character-controller';
import { Player } from 'test-assets/player';
import { CameraController } from 'camera/camera-controller';
import { Fauna } from 'test-assets/fauna';
import { Terrain } from 'test-assets/terrain';
import { Collider } from 'collider/collider';
import Space from 'test-assets/space';
import * as THREE from 'three';

function Game() {
  const controller = useController();

  // Start our controller
  useLayoutEffect(() => {
    controller.start();
  }, [controller]);

  // Update the controller on an early loop
  useUpdate(() => {
    controller.update();
  }, Stages.Early);

  const lightRef = useRef(null!);
  useHelper(null, THREE.SpotLightHelper);

  return (
    <Suspense fallback={null}>
      <Fauna />
      <Collider>
        <Terrain />
      </Collider>

      <CharacterController>
        <Player radius={0.5 / 2} length={0.65 / 2} />
      </CharacterController>

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
