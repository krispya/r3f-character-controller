import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Stages } from './app';

export function Player({ radius = 0.5, length = 0.65 }) {
  const playerRef = useRef<THREE.Mesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  // const height = radius * 2 + length;

  const geometry = useMemo(() => {
    const _geometry = new THREE.CapsuleBufferGeometry(radius, length, 8, 16);
    // return _geometry.translate(0, -height / 2, 0);
    return _geometry.translate(0, -length / 2, 0);
  }, []);

  useFrame(() => {
    if (!playerRef.current || !lightRef.current) return;
    lightRef.current.position.copy(playerRef.current.position);
  }, Stages.Late);

  return (
    <>
      <mesh ref={playerRef} geometry={geometry}>
        <meshStandardMaterial />
      </mesh>
      <pointLight ref={lightRef} intensity={1.2} color="#38e4ed" />
    </>
  );
}
