import './app.css';
import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import { useController } from './controller';
import { Level } from './level';
import { PlayerController } from './player-controller';
import { Player } from './player';

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

  return (
    <>
      <Level />
      {/* <Level scale={[2, 2, 2]} position={[0.5, 0, 0]} /> */}
      <PlayerController>
        <Player radius={0.5 / 2} length={0.65 / 2} />
      </PlayerController>

      <ambientLight intensity={1} />
      <Environment preset="apartment" />

      <OrbitControls />
    </>
  );
}

export default function App() {
  return (
    <Canvas shadows gl={{ physicallyCorrectLights: true }} camera={{ position: [5, 3, -10], fov: 50 }}>
      <Game />
    </Canvas>
  );
}
