import { Cylinder, useHelper } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

type PlayerProps = {
  radius: number;
  length: number;
};

export function Player({ radius = 0.5, length = 0.65 }: PlayerProps) {
  const playerRef = useRef<THREE.Mesh>(null!);

  const geometry = useMemo(() => new THREE.CapsuleBufferGeometry(radius, length, 8, 16), [length, radius]);

  useHelper(playerRef, THREE.BoxHelper, 'purple');

  return (
    <>
      <mesh ref={playerRef} geometry={geometry}>
        <meshStandardMaterial />
      </mesh>
      {/* <Cylinder ref={playerRef} args={[0.5, 0.5, 2, 16]} /> */}
      <pointLight intensity={1.2} color="#38e4ed" />
    </>
  );
}
