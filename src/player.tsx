import { useHelper } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export function Player() {
  const playerRef = useRef(null!);
  useHelper(false, THREE.BoxHelper);

  const radius = 0.5;
  const length = 0.65;
  const height = 0.5 * 2 + 0.65;

  const geometry = useMemo(() => {
    const _geometry = new THREE.CapsuleBufferGeometry(radius, length, 8, 16);
    return _geometry.translate(0, -height / 2, 0);
  }, []);

  return (
    <mesh ref={playerRef} geometry={geometry}>
      <meshStandardMaterial />
    </mesh>
  );
}
