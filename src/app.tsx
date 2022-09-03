import './app.css';
import { Canvas } from '@react-three/fiber';
import { StrictMode, Suspense } from 'react';
import { Controller } from 'controls/controller';
// import { Player } from 'test-assets/player';
import { CameraController } from 'camera/camera-controller';
import { Fauna } from 'test-assets/fauna';
import { Terrain } from 'test-assets/terrain';
import { Collider } from 'collider/collider';
import Space from 'test-assets/space';
import { PlayerController } from 'player/player-controller';
import { MushroomBoi } from 'test-assets/mushroom-boi';
// import { SimplePlane } from 'test-assets/simple-plane';
// import { LowPolyIslands } from 'test-assets/low-poly-island';

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
      <Collider simplify={0.35}>
        <Terrain />
        {/* <SimplePlane /> */}
        {/* <LowPolyIslands /> */}
      </Collider>

      <PlayerController
        position={[0, 5, 0]}
        walkSpeed={5}
        airControl={0.5}
        capsule={{ radius: 0.27 }}
        // debug={{ showBox: true, showCollider: true }}
      >
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
        angle={0.25}
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
