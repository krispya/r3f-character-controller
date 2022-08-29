import { createPortal, extend, Object3DNode, Stages, useThree, useUpdate } from '@react-three/fiber';
import { BoundingVolume } from 'character/bounding-volume/use-bounding-volume';
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

type VolumeDebugProps = {
  bounding: BoundingVolume;
  showLine?: boolean;
  showBox?: boolean;
};

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

function createBoxGeometry() {
  const indices = new Uint16Array([0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]);
  const positions = new Float32Array(8 * 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  return geometry;
}

export function VolumeDebug({ bounding, showLine = false, showBox = false }: VolumeDebugProps) {
  const ref = useRef<THREE.Group>(null!);
  const boxRef = useRef<THREE.LineSegments>(null!);
  const [vec] = useState(() => new THREE.Vector3());
  const scene = useThree((state) => state.scene);

  useUpdate(() => {
    bounding.boundingBox.getCenter(vec);
    ref.current.position.copy(vec);

    // Update bounding box.

    if (showBox) {
      const min = bounding.boundingBox.min;
      const max = bounding.boundingBox.max;

      const position = boxRef.current.geometry.attributes.position;
      const array = position.array as number[];

      array[0] = max.x;
      array[1] = max.y;
      array[2] = max.z;
      array[3] = min.x;
      array[4] = max.y;
      array[5] = max.z;
      array[6] = min.x;
      array[7] = min.y;
      array[8] = max.z;
      array[9] = max.x;
      array[10] = min.y;
      array[11] = max.z;
      array[12] = max.x;
      array[13] = max.y;
      array[14] = min.z;
      array[15] = min.x;
      array[16] = max.y;
      array[17] = min.z;
      array[18] = min.x;
      array[19] = min.y;
      array[20] = min.z;
      array[21] = max.x;
      array[22] = min.y;
      array[23] = min.z;

      position.needsUpdate = true;

      boxRef.current.geometry.computeBoundingSphere();
    }
  }, Stages.Late);

  return (
    <>
      {createPortal(
        <>
          <group ref={ref}>
            {/* Capsule collider visualization */}
            <line2
              geometry={new LineGeometry().setPositions(
                createCapsulePoints(bounding.boundingCapsule.radius, bounding.boundingCapsule.length),
              )}>
              <lineMaterial attach="material" color={'yellow'} linewidth={0.002} />
            </line2>
            <line2
              rotation={[0, Math.PI / 2, 0]}
              geometry={new LineGeometry().setPositions(
                createCapsulePoints(bounding.boundingCapsule.radius, bounding.boundingCapsule.length),
              )}>
              <lineMaterial color={'yellow'} linewidth={0.002} />
            </line2>
            <line2
              rotation={[Math.PI / 2, 0, 0]}
              position={[0, bounding.boundingCapsule.length / 2, 0]}
              geometry={new LineGeometry().setPositions(createCapsulePoints(bounding.boundingCapsule.radius, 0))}>
              <lineMaterial color={'yellow'} linewidth={0.002} />
            </line2>
            <line2
              rotation={[Math.PI / 2, 0, 0]}
              position={[0, -bounding.boundingCapsule.length / 2, 0]}
              geometry={new LineGeometry().setPositions(createCapsulePoints(bounding.boundingCapsule.radius, 0))}>
              <lineMaterial color={'yellow'} linewidth={0.002} />
            </line2>

            {/* Collision line visualization */}
            {showLine && (
              <line
                // @ts-ignore. TS is confused and thinks this is an svg line.
                geometry={new THREE.BufferGeometry().setFromPoints([
                  bounding.boundingCapsule.line.start,
                  bounding.boundingCapsule.line.end,
                ])}>
                <lineBasicMaterial color={'red'} />
              </line>
            )}
          </group>

          {/* Bounding box visualization */}
          {showBox && (
            <lineSegments ref={boxRef} geometry={createBoxGeometry()}>
              <lineBasicMaterial color={'red'} />
            </lineSegments>
          )}
        </>,
        scene,
      )}
    </>
  );
}