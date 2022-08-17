import { useThree, useUpdate } from '@react-three/fiber';
import { Bounding } from 'character/hooks/use-bounding-volume';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function useCapsuleDebug(bounding: Bounding, box: THREE.Box3) {
  const capsuleRef = useRef<THREE.Mesh>(null!);
  const [vec] = useState(() => new THREE.Vector3());
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    capsuleRef.current = new THREE.Mesh(
      new THREE.CapsuleBufferGeometry(bounding.radius, bounding.length, 8, 16),
      new THREE.MeshBasicMaterial({ color: 'cyan', depthTest: false, wireframe: true }),
    );
    scene.add(capsuleRef.current);
    return () => {
      scene.remove(capsuleRef.current);
    };
  }, [bounding, bounding.length, bounding.radius, scene]);

  useUpdate(() => {
    if (!box) return;
    box.getCenter(vec);
    capsuleRef.current.position.copy(vec);
  });
}
