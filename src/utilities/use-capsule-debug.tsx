import { createPortal, extend, Object3DNode, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Line as LineThree } from 'three';
import { LineGeometry, LineMaterial, Line2 } from 'three-stdlib';

extend({ Line2, LineGeometry, LineMaterial, LineThree });

declare module '@react-three/fiber' {
  interface ThreeElements {
    lineGeometry: Object3DNode<LineGeometry, typeof LineGeometry>;
    lineMaterial: Object3DNode<LineMaterial, typeof LineMaterial>;
    line2: Object3DNode<Line2, typeof Line2>;
    lineThree: Object3DNode<LineThree, typeof LineThree>;
  }
}

function createCapsulePoints(radius = 1, length = 1, degrees = 30) {
  const points = [];

  // Left half circle
  for (let i = 0; i <= degrees; i++) {
    points.push(Math.cos(i * (Math.PI / degrees)) * radius, Math.sin(i * (Math.PI / degrees)) * radius + length / 2, 0);
  }

  // Right half circle
  for (let i = 0; i <= degrees; i++) {
    points.push(
      -Math.cos(i * (Math.PI / degrees)) * radius,
      -Math.sin(i * (Math.PI / degrees)) * radius - length / 2,
      0,
    );
  }

  // Closing point
  points.push(points[0], points[1], points[2]);

  return points;
}

function CapsuleLine() {
  return (
    <>
      <line2 geometry={new LineGeometry().setPositions(createCapsulePoints(capsule.radius, capsule.height))}>
        <lineMaterial attach="material" color={color} linewidth={0.002} />
      </line2>
      <line2
        rotation={[0, Math.PI / 2, 0]}
        geometry={new LineGeometry().setPositions(createCapsulePoints(capsule.radius, capsule.height))}>
        <lineMaterial color={color} linewidth={0.002} />
      </line2>
      <line2
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, capsule.height / 2, 0]}
        geometry={new LineGeometry().setPositions(createCapsulePoints(capsule.radius, 0))}>
        <lineMaterial color={color} linewidth={0.002} />
      </line2>
      <line2
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, -capsule.height / 2, 0]}
        geometry={new LineGeometry().setPositions(createCapsulePoints(capsule.radius, 0))}>
        <lineMaterial color={color} linewidth={0.002} />
      </line2>
    </>
  );
}

export function useCapsuleDebug(radius: number, line: THREE.Line3) {
  const scene = useThree((state) => state.scene);

  return createPortal();
}
