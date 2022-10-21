import { Color, extend, Object3DNode, useUpdate } from '@react-three/fiber';
import { useState } from 'react';
import { Line2, LineGeometry, LineMaterial } from 'three-stdlib';
import * as THREE from 'three';

extend({ Line2, LineGeometry, LineMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    lineGeometry: Object3DNode<LineGeometry, typeof LineGeometry>;
    lineMaterial: Object3DNode<LineMaterial, typeof LineMaterial>;
    line2: Object3DNode<Line2, typeof Line2>;
  }
}

type RayWireframeProps = {
  color?: Color;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  distance: number | React.MutableRefObject<number>;
};

export function RayWireframe({ color = 'red', origin, direction, distance }: RayWireframeProps) {
  const [store] = useState({
    lineGeo: new LineGeometry(),
    farPoint: new THREE.Vector3(),
  });

  useUpdate(() => {
    const { farPoint } = store;
    let _distance = 0;

    if (typeof distance === 'number') {
      _distance = distance;
    } else {
      _distance = distance.current;
    }

    farPoint.copy(origin);
    farPoint.addScaledVector(direction, _distance);
    store.lineGeo.setPositions([origin.x, origin.y, origin.z, farPoint.x, farPoint.y, farPoint.z]);
  });

  console.log('ray: ', distance);

  return (
    <line2 geometry={store.lineGeo}>
      <lineMaterial attach="material" color={color} linewidth={0.002} />
    </line2>
  );
}
