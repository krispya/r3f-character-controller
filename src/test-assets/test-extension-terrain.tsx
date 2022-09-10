import { Box } from '@react-three/drei';
import { Stages, useUpdate, Vector3 } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

function Steps({ stepHeight = 0.1, position = [0, 0, 0] }: { stepHeight?: number; position?: Vector3 }) {
  return (
    <group name="Steps" position={position}>
      <Box args={[1, stepHeight, 1]} position={[0, stepHeight * 1, 0]}>
        <meshStandardMaterial color="pink" />
      </Box>
      <Box args={[1, stepHeight, 1]} position={[0, stepHeight * 2, -stepHeight * 1]}>
        <meshStandardMaterial color="pink" />
      </Box>
      <Box args={[1, stepHeight, 1]} position={[0, stepHeight * 3, -stepHeight * 2]}>
        <meshStandardMaterial color="pink" />
      </Box>
    </group>
  );
}

export function TestExtenstionTerrain() {
  const platformARef = useRef<THREE.Mesh>(null!);
  const platformBRef = useRef<THREE.Mesh>(null!);

  useUpdate((state) => {
    const time = state.clock.getElapsedTime();
    platformARef.current.position.x = Math.sin(time);
    platformBRef.current.position.y = Math.sin(time) + 1.2;
  }, Stages.Fixed);

  return (
    <group position={[2, -2.8, -5.5]} rotation={[0, -0.15, 0]}>
      <Box name="Floor Platform" ref={platformARef} args={[4, 0.5, 4]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Box name="Elevator Platform" ref={platformBRef} args={[1.5, 0.25, 1]} position={[4, 0.5, -7.2]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Box name="Floor" args={[12, 0.25, 6]} position={[0, 0, -5]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Box name="Wall" args={[3.5, 0.5, 12]} position={[0, 1.625, -8]} rotation={[0, Math.PI / 2, Math.PI / 2]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Box name="Steep Ramp" args={[5, 0.25, 1.8]} position={[1, 1, -6.4]} rotation={[0, Math.PI / 2, 0.9]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Box name="Ramp" args={[4, 0.25, 1.8]} position={[-1, 1, -6.4]} rotation={[0, Math.PI / 2, 0.6]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Steps position={[-3, 0, -7.25]} stepHeight={0.2} />
      <Steps position={[-4, 0, -7.25]} stepHeight={0.3} />
    </group>
  );
}
