import './app.css';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Controller } from 'controls/controller';
import { Player } from 'test-assets/player';
import { CameraController } from 'camera/camera-controller';
import { Fauna } from 'test-assets/fauna';
import { Terrain } from 'test-assets/terrain';
import { Collider } from 'collider/collider';
import Space from 'test-assets/space';
import { PlayerController } from 'player/player-controller';

function Game() {
  return (
    <Suspense>
      <Controller
        devices="keyboard"
        actions={({ keyboard }) => ({
          move: { type: 'vector', steps: [keyboard?.compositeVector('KeyW', 'KeyS', 'KeyA', 'KeyD')] },
          jump: { type: 'boolean', steps: [keyboard?.whenKeyPressed('Space')] },
        })}
      />

      <Fauna />
      <Collider>
        <Terrain />
      </Collider>

      <PlayerController position={[0, 5, 0]} gravity={-5} movementSpeed={10} debug>
        <Player radius={0.5 / 2} length={0.65 / 2} />
      </PlayerController>

      <Space />
      <ambientLight intensity={0.3} />
      <hemisphereLight intensity={0.95} color="#eacb6e" groundColor="red" />
      <spotLight
        castShadow
        color="orange"
        intensity={1000}
        position={[80, 50, -40]}
        angle={0.25}
        penumbra={1}
        shadow-mapSize={[128, 128]}
        shadow-bias={0.00005}
      />

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
