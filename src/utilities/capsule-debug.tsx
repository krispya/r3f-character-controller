import { useThree, extend, Object3DNode, createPortal, Color, useUpdate } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { LineGeometry, LineMaterial, Line2 } from 'three-stdlib';

extend({ Line2, LineGeometry, LineMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    lineGeometry: Object3DNode<LineGeometry, typeof LineGeometry>;
    lineMaterial: Object3DNode<LineMaterial, typeof LineMaterial>;
    line2: Object3DNode<Line2, typeof Line2>;
  }
}

type CapsuleDebugProps = {
  capsule: { radius: number; height: number; position?: THREE.Vector3 };
  color?: Color;
};

function createPoints(radius = 1, height = 1, degrees = 30) {
  const points = [];
  const halfHeight = height / 2 - radius;

  // Left half circle
  for (let i = 0; i <= degrees; i++) {
    points.push(Math.cos(i * (Math.PI / degrees)) * radius, Math.sin(i * (Math.PI / degrees)) * radius + halfHeight, 0);
  }

  // Right half circle
  for (let i = 0; i <= degrees; i++) {
    points.push(
      -Math.cos(i * (Math.PI / degrees)) * radius,
      -Math.sin(i * (Math.PI / degrees)) * radius - halfHeight,
      0,
    );
  }

  // Closing point
  points.push(points[0], points[1], points[2]);

  return points;
}

export function CapsuleDebug({ capsule, color = 'yellow' }: CapsuleDebugProps) {
  const ref = useRef<THREE.Group>(null!);
  const scene = useThree((state) => state.scene);
  const [radius, setRadius] = useState(capsule.radius);
  const [height, setHeight] = useState(capsule.height);

  useUpdate(() => {
    if (radius !== capsule.radius) setRadius(capsule.radius);
    if (height !== capsule.height) setHeight(capsule.height);
    if (capsule.position) ref.current.position.copy(capsule.position);
  });

  return (
    <>
      {createPortal(
        <group ref={ref}>
          <line2 geometry={new LineGeometry().setPositions(createPoints(radius, height))}>
            <lineMaterial attach="material" color={color} linewidth={0.002} />
          </line2>
          <line2
            rotation={[0, Math.PI / 2, 0]}
            geometry={new LineGeometry().setPositions(createPoints(radius, height))}>
            <lineMaterial color={color} linewidth={0.002} />
          </line2>
          <line2
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, height / 2 - radius, 0]}
            geometry={new LineGeometry().setPositions(createPoints(radius, radius * 2))}>
            <lineMaterial color={color} linewidth={0.002} />
          </line2>
          <line2
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, -(height / 2 - radius), 0]}
            geometry={new LineGeometry().setPositions(createPoints(radius, radius * 2))}>
            <lineMaterial color={color} linewidth={0.002} />
          </line2>
        </group>,
        scene,
      )}
    </>
  );
}
