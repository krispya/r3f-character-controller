import { Sphere } from '@react-three/drei';
import { Vector3 } from '@react-three/fiber';
import { capsuleCast } from 'collider/scene-queries/capsuleCast';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type CastTestProps = {
  position: Vector3;
};

export function CastTest({ position }: CastTestProps) {
  const ref = useRef<THREE.Mesh>(null!);

  useEffect(() => {
    const direction = new THREE.Vector3(0, 0, -1);
    capsuleCast(0.25, 0.5, ref.current.matrix, direction, 5);
  }, []);

  return (
    <Sphere ref={ref} args={[0.25]} position={position}>
      <meshStandardMaterial />
    </Sphere>
  );
}
