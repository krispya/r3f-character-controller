import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function useMeasure(): [React.Ref<THREE.Mesh>, THREE.Vector3, THREE.Box3] {
  const ref = useRef<THREE.Mesh>(null!);
  const [size, setSize] = useState(() => new THREE.Vector3(0, 0, 0));
  const [box, setBox] = useState(() => new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)));

  useEffect(() => {
    if (!ref.current) return;
    const _box = new THREE.Box3().setFromObject(ref.current);
    const _size = new THREE.Vector3();
    _box.getSize(_size);
    setSize(_size);
    setBox(_box);
  }, [ref]);

  return [ref, size, box];
}
