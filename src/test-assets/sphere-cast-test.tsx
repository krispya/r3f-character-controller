import { useUpdate } from '@react-three/fiber';
import { SphereCaster } from 'collider/scene-queries/sphere-caster';
import { useCollider } from 'collider/stores/collider-store';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

type SphereCastTestProps = {
  origin?: [number, number, number];
  radius?: number;
  maxDistance?: number;
  direction?: [number, number, number];
  autoUpdate?: boolean;
};

export function SphereCastTest({
  origin = [0, 0, 0],
  radius = 0.25,
  maxDistance = 6,
  direction = [0, 0, -1],
}: SphereCastTestProps) {
  const [store] = useState(() => ({
    origin: new THREE.Vector3(...origin),
    direction: new THREE.Vector3(...direction),
  }));
  const [sphereCaster] = useState(() => new SphereCaster(radius, store.origin, store.direction, maxDistance));
  const collider = useCollider((state) => state.collider);

  useEffect(() => {
    sphereCaster.origin = store.origin;
    sphereCaster.needsUpdate = true;
  }, [origin, store, sphereCaster]);

  useEffect(() => {
    sphereCaster.direction = store.direction;
    sphereCaster.needsUpdate = true;
  }, [direction, store, sphereCaster]);

  useUpdate(() => {
    if (collider) sphereCaster.intersectMesh(collider);
  });

  return null;
}
