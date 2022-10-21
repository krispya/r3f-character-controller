import { Sphere } from '@react-three/drei';
import { applyProps, useUpdate, Vector3 } from '@react-three/fiber';
import { Instance } from '@react-three/fiber/dist/declarations/src/core/renderer';
import { capsuleCast, HitInfo } from 'collider/scene-queries/capsule-cast';
import { CapsuleCastDebug } from 'collider/scene-queries/debug/capsule-cast-debug';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type CastTestProps = {
  position?: Vector3;
  radius?: number;
  halfHeight?: number;
  autoUpdate?: boolean;
};

export function CastTest({ position, radius = 0.25, halfHeight = 0.25, autoUpdate = false }: CastTestProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const hitInfoRef = useRef<HitInfo | null>(null);
  const [store] = useState({ direction: new THREE.Vector3(0, 0, -1), maxDistance: 8 });
  const [isInit, setIsInit] = useState(false);

  useEffect(() => {
    if (autoUpdate) return;

    applyProps(ref.current as unknown as Instance, { position });
    ref.current.updateMatrix();
    hitInfoRef.current = capsuleCast(radius, halfHeight, ref.current.matrix, store.direction, store.maxDistance);

    setIsInit(true);
  }, [halfHeight, isInit, radius, store, position, autoUpdate]);

  useUpdate(() => {
    if (!autoUpdate) return;
    hitInfoRef.current = capsuleCast(radius, halfHeight, ref.current.matrix, store.direction, store.maxDistance);
  });

  return (
    <>
      <Sphere ref={ref} args={[radius]} position={position}>
        <meshStandardMaterial />
      </Sphere>
      {isInit && (
        <CapsuleCastDebug
          radius={radius}
          halfHeight={halfHeight}
          transform={ref.current.matrix}
          direction={store.direction}
          maxDistance={store.maxDistance}
          hitInfoRef={hitInfoRef}
        />
      )}
    </>
  );
}
