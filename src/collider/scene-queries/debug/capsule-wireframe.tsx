import { Color, extend, GroupProps, Object3DNode } from '@react-three/fiber';
import React, { useEffect, useState } from 'react';
import { Line2, LineGeometry, LineMaterial } from 'three-stdlib';

extend({ Line2, LineGeometry, LineMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    lineGeometry: Object3DNode<LineGeometry, typeof LineGeometry>;
    lineMaterial: Object3DNode<LineMaterial, typeof LineMaterial>;
    line2: Object3DNode<Line2, typeof Line2>;
  }
}

export type CapsuleWireframeProps = GroupProps & {
  radius: number;
  halfHeight: number;
  color?: Color;
};

function createPoints(radius = 1, halfHeight = 1, degrees = 30) {
  const points = [];
  const segmentHalfHeight = halfHeight - radius;

  // Left half circle
  for (let i = 0; i <= degrees; i++) {
    points.push(
      Math.cos(i * (Math.PI / degrees)) * radius,
      Math.sin(i * (Math.PI / degrees)) * radius + segmentHalfHeight,
      0,
    );
  }

  // Right half circle
  for (let i = 0; i <= degrees; i++) {
    points.push(
      -Math.cos(i * (Math.PI / degrees)) * radius,
      -Math.sin(i * (Math.PI / degrees)) * radius - segmentHalfHeight,
      0,
    );
  }

  // Closing point
  points.push(points[0], points[1], points[2]);

  return points;
}

const CapsuleWireframeForwardRef = React.forwardRef<THREE.Group, CapsuleWireframeProps>(function CapsuleWireframe(
  { radius, halfHeight, color = 'red', ...props },
  ref,
) {
  const [store] = useState({
    lineGeo1: new LineGeometry(),
    lineGeo2: new LineGeometry(),
    lineGeo3: new LineGeometry(),
    lineGeo4: new LineGeometry(),
  });
  const segmentHalfHeight = halfHeight - radius;

  useEffect(() => {
    store.lineGeo1.setPositions(createPoints(radius, halfHeight));
    store.lineGeo2.setPositions(createPoints(radius, halfHeight));
    store.lineGeo3.setPositions(createPoints(radius, radius));
    store.lineGeo4.setPositions(createPoints(radius, radius));
  }, [halfHeight, radius, store]);

  return (
    <group ref={ref} {...props}>
      <line2 geometry={store.lineGeo1}>
        <lineMaterial attach="material" color={color} linewidth={0.002} />
      </line2>
      <line2 rotation={[0, Math.PI / 2, 0]} geometry={store.lineGeo2}>
        <lineMaterial color={color} linewidth={0.002} />
      </line2>
      <line2 rotation={[Math.PI / 2, 0, 0]} position={[0, segmentHalfHeight, 0]} geometry={store.lineGeo3}>
        <lineMaterial color={color} linewidth={0.002} />
      </line2>
      <line2 rotation={[Math.PI / 2, 0, 0]} position={[0, -segmentHalfHeight, 0]} geometry={store.lineGeo4}>
        <lineMaterial color={color} linewidth={0.002} />
      </line2>
    </group>
  );
});

export { CapsuleWireframeForwardRef as CapsuleWireframe };
