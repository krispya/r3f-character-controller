import { useHelper } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export function Player({ radius = 0.5, length = 0.65 }) {
  const playerRef = useRef(null!);
  // const height = radius * 2 + length;

  useHelper(false, THREE.BoxHelper);

  const geometry = useMemo(() => {
    const _geometry = new THREE.CapsuleBufferGeometry(radius, length, 8, 16);
    // return _geometry.translate(0, -height / 2, 0);
    return _geometry.translate(0, -length / 2, 0);
  }, []);

  return (
    <mesh ref={playerRef} geometry={geometry}>
      <meshStandardMaterial />
    </mesh>
  );
}
