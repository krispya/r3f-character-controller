import { OrbitControls } from '@react-three/drei';
import { useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useUpdate, useThree, Stages } from '@react-three/fiber';
import { useCameraController } from './stores/camera-store';

// TODO: Implement the PerspectiveCamera with portaling

export function CameraController() {
  const [camera] = useState(() => {
    const _camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    _camera.position.set(2, 3, -2);
    return _camera;
  });
  const controlsRef = useRef<any>(null!);
  const target = useCameraController((state) => state.target);
  const set = useThree(({ set }) => set);

  useLayoutEffect(() => {
    const oldCam = camera;
    set(() => ({ camera: camera! }));
    return () => set(() => ({ camera: oldCam }));
  }, [camera, set]);

  useUpdate(() => {
    if (!target) return;
    camera.position.sub(controlsRef.current.target);
    controlsRef.current.target.copy(target.position);
    camera.position.add(target.position);
  }, Stages.Update);

  return (
    <OrbitControls
      dampingFactor={0.1}
      ref={controlsRef}
      camera={camera}
      minDistance={1}
      maxDistance={3}
      maxPolarAngle={Math.PI / 2}
    />
  );
}
