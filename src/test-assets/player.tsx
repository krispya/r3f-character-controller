import { useMemo, useRef } from 'react';
import * as THREE from 'three';

type PlayerProps = {
  radius: number;
  length: number;
};

export function Player({ radius = 0.5, length = 0.65 }: PlayerProps) {
  const playerRef = useRef<THREE.Mesh>(null!);
  // const height = radius * 2 + length;

  const geometry = useMemo(() => {
    const _geometry = new THREE.CapsuleBufferGeometry(radius, length, 8, 16);
    // return _geometry.translate(0, -height / 2, 0);
    return _geometry.translate(0, -length / 2, 0);
  }, [length, radius]);

  return (
    <>
      <mesh ref={playerRef} geometry={geometry}>
        <meshStandardMaterial />
      </mesh>
      <pointLight intensity={1.2} color="#38e4ed" />
    </>
  );
}
