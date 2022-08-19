import { useUpdate } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStore } from 'stores/store';
import { useLineDebug } from 'debug/use-line-debug';
import { useBoxDebug } from 'debug/use-box-debug';
import { useVolumeDebug } from 'debug/use-volume-debug';
import { useBoundingVolume } from './hooks/use-bounding-volume';

type Modifier = THREE.Vector3;

export type CharacterControllerProps = {
  children: React.ReactNode;
  debug?: boolean;
};

const GRAVITY = -9.81;

export function CharacterController({ children, debug = false }: CharacterControllerProps) {
  const meshRef = useRef<THREE.Group>(null!);

  const [store] = useState(() => ({
    vec: new THREE.Vector3(),
    vec2: new THREE.Vector3(),
    obj: new THREE.Object3D(),
    box: new THREE.Box3(),
    line: new THREE.Line3(),
    matrix: new THREE.Matrix4(),
  }));
  const [modifiers] = useState<Modifier[]>([]);

  // Get world collider BVH.
  const collider = useStore((state) => state.collider);

  // Build bounding volume. Right now it can only be a capsule.
  const bounding = useBoundingVolume(meshRef);

  const moveCharacter = useCallback(
    (velocity: THREE.Vector3, delta: number) => {
      bounding.position.addScaledVector(velocity, delta);
      bounding.updateMatrixWorld();
    },
    [bounding],
  );

  const syncMeshToBoundingVolume = () => {
    meshRef.current.position.copy(bounding.position);
  };

  // Add gravity.
  useLayoutEffect(() => {
    const modifier = new THREE.Vector3(0, GRAVITY, 0);
    modifiers.push(modifier);
    return () => {
      const index = modifiers.indexOf(modifier);
      if (index !== -1) modifiers.splice(index, 1);
    };
  }, [modifiers]);

  // Apply forces.
  useUpdate((state, delta) => {
    store.vec.set(0, 0, 0);

    for (const modifier of modifiers) {
      store.vec.add(modifier);
    }

    moveCharacter(store.vec, delta);
  });

  // Detect collisions and apply position displacements.
  useUpdate(() => {
    if (!collider?.geometry?.boundsTree) return;
    const { line, vec, vec2, box } = store;
    const { boundingCapsule: capsule, boundingBox } = bounding;

    // Update bounding volume.
    bounding.computeBoundingVolume();
    line.copy(capsule.line);
    box.copy(boundingBox);

    // Check for collisions.
    collider.geometry.boundsTree.shapecast({
      intersectsBounds: (box) => box.intersectsBox(box),
      intersectsTriangle: (tri) => {
        const triPoint = vec;
        const capsulePoint = vec2;
        const distance = tri.closestPointToSegment(line, triPoint, capsulePoint);
        // If the distance is less than the radius of the character, we have a collision.
        if (distance < capsule.radius) {
          const depth = capsule.radius - distance;
          const direction = capsulePoint.sub(triPoint).normalize();
          // Move the line segment so there is no longer an intersection with the character's box.
          line.start.addScaledVector(direction, depth);
          line.end.addScaledVector(direction, depth);
        }
      },
    });

    const newPosition = vec;
    const deltaVector = vec2;
    // Bounding volume origin is calculated. This might lose percision.
    // We can determine how much the character has moved by looking at the origin point.
    line.getCenter(newPosition);
    deltaVector.subVectors(newPosition, bounding.position);
    bounding.position.add(deltaVector);
  });

  // Finally, sync mesh so movement is visible.
  useUpdate(() => {
    syncMeshToBoundingVolume();
  });

  // Reset if we fall off the level.
  useUpdate(() => {
    if (bounding.position.y < -10) {
      bounding.position.set(0, 0, 0);
    }
  });

  // Debugging visualizations
  useUpdate(() => {
    if (debug) {
      bounding.updateMatrixWorld();
      bounding.computeBoundingVolume();
    }
  });

  useLineDebug(debug ? store.line : null);
  useBoxDebug(debug ? bounding.boundingBox : null);
  useVolumeDebug(debug ? bounding : null);

  return (
    <group position={[0, 2, 0]} ref={meshRef}>
      {children}
    </group>
  );
}
