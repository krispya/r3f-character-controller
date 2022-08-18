import { MeasureHandler, useMeasure } from 'hooks/use-measure';
import { useCallback, useState } from 'react';
import * as THREE from 'three';

export type Bounding = {
  radius: number;
  length: number;
  line: THREE.Line3;
};

export function useBoundingVolume(ref: React.MutableRefObject<THREE.Object3D>) {
  const [bounding] = useState<Bounding>(() => ({ radius: 0, length: 0, line: new THREE.Line3() }));

  const handleMeasure = useCallback<MeasureHandler>(
    (size) => {
      bounding.radius = size.x / 2;
      bounding.length = size.y - bounding.radius * 2;

      const offset = bounding.length / 2;

      bounding.line.end.copy(new THREE.Vector3(0, -offset, 0));
      bounding.line.start.copy(new THREE.Vector3(0, offset, 0));
    },
    [bounding],
  );

  useMeasure(ref, handleMeasure, { precise: true });

  return bounding;
}
