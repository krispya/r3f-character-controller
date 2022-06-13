import { useFrame, useThree } from '@react-three/fiber';
import { MutableRefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Stages } from './app';

export function useLineDebug(line: THREE.Line3 | null = null) {
  const lineRef = useRef<THREE.Line>(null!);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if (!line) return;
    const points = [];
    points.push(line.start);
    points.push(line.end);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const _line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 'red', depthTest: false }));
    scene.add(_line);
    lineRef.current = _line;

    return () => {
      scene.remove(_line);
    };
  }, []);

  useFrame(() => {
    if (lineRef.current && line) {
      const points = [];
      points.push(line.start);
      points.push(line.end);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      lineRef.current.geometry = geometry;
    }
  }, Stages.Late);
}
