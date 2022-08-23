import { useThree, useUpdate } from '@react-three/fiber';
import { BoundingVolume } from 'character/bounding-volume/use-bounding-volume';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function useVolumeDebug(bounding: BoundingVolume | null) {
  const capsuleRef = useRef<THREE.Mesh>(null!);
  const [vec] = useState(() => new THREE.Vector3());
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if (!bounding) return;
    const { boundingCapsule: capsule } = bounding;
    capsuleRef.current = new THREE.Mesh(
      new THREE.CapsuleBufferGeometry(capsule.radius, capsule.length, 8, 16),
      new THREE.MeshBasicMaterial({ color: 'cyan', depthTest: false, wireframe: true }),
    );
    scene.add(capsuleRef.current);
    return () => {
      scene.remove(capsuleRef.current);
    };
  }, [bounding, scene]);

  useUpdate(() => {
    if (!bounding?.boundingBox) return;
    bounding.boundingBox.getCenter(vec);
    capsuleRef.current.position.copy(vec);
  });
}
