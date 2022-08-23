import { MeasureHandler, useMeasure } from 'hooks/use-measure';
import { useCallback, useState } from 'react';
import * as THREE from 'three';

export type Capsule = {
  radius: number;
  length: number;
  line: THREE.Line3;
};

export class BoundingVolume extends THREE.Object3D {
  public isBoundingVolume: boolean;
  public boundingCapsule: Capsule;
  public boundingBox: THREE.Box3;

  constructor() {
    super();
    this.type = 'BoundingVolume';
    this.isBoundingVolume = true;
    this.boundingCapsule = { radius: 0, length: 0, line: new THREE.Line3() };
    this.boundingBox = new THREE.Box3();
  }

  computeBoundingVolume() {
    const { line, length } = this.boundingCapsule;
    const box = this.boundingBox;

    const offset = length / 2;

    line.end.set(0, -offset, 0);
    line.start.set(0, offset, 0);

    line.start.applyMatrix4(this.matrixWorld);
    line.end.applyMatrix4(this.matrixWorld);
    box.makeEmpty();
    box.setFromPoints([line.start, line.end]);
    box.min.addScalar(-this.boundingCapsule.radius);
    box.max.addScalar(this.boundingCapsule.radius);
  }
}

export function useBoundingVolume(ref: React.MutableRefObject<THREE.Object3D>) {
  const [bounding] = useState<BoundingVolume>(() => new BoundingVolume());

  const handleMeasure = useCallback<MeasureHandler>(
    (size) => {
      const capsule = bounding.boundingCapsule;
      capsule.radius = size.x / 2;
      capsule.length = size.y - capsule.radius * 2;

      const offset = capsule.length / 2;

      capsule.line.end.copy(new THREE.Vector3(0, -offset, 0));
      capsule.line.start.copy(new THREE.Vector3(0, offset, 0));

      bounding.applyMatrix4(ref.current.matrix);
    },
    [bounding, ref],
  );

  useMeasure(ref, handleMeasure, { precise: true });

  return bounding;
}
