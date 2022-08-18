import { useUpdate } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStore } from 'stores/store';
import { useLineDebug } from 'debug/use-line-debug';
import { useBoxDebug } from 'debug/use-box-debug';
import { useCapsuleDebug } from 'debug/use-capsule-debug';
import { useBoundingVolume } from './hooks/use-bounding-volume';

type Modifier = THREE.Vector3;

export type CharacterControllerProps = {
  children: React.ReactNode;
};

const GRAVITY = -9.81;

export function CharacterController({ children }: CharacterControllerProps) {
  const characterRef = useRef<THREE.Group>(null!);
  const [character] = useState(() => ({
    speed: 6,
    jumpSpeed: 6,
    velocity: new THREE.Vector3(),
  }));

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
  const bounding = useBoundingVolume(characterRef);

  const moveCharacter = useCallback(
    (velocity: THREE.Vector3, delta: number) => {
      store.obj.position.copy(characterRef.current.position);
      store.obj.position.addScaledVector(velocity, delta);
      store.obj.updateMatrixWorld();
    },
    [store.obj],
  );

  // Add gravity.
  useLayoutEffect(() => {
    const modifier = new THREE.Vector3(0, GRAVITY, 0);
    modifiers.push(modifier);
    return () => {
      const index = modifiers.indexOf(modifier);
      if (index !== -1) modifiers.splice(index, 1);
    };
  }, [modifiers]);

  // Character movement engine.
  useUpdate((state, delta) => {
    store.vec.set(0, 0, 0);

    for (const modifier of modifiers) {
      store.vec.add(modifier);
    }

    moveCharacter(store.vec, delta);
  });

  // Character collision engine.
  useUpdate(() => {
    if (!collider?.geometry?.boundsTree) return;
    const { box, line, vec, vec2, obj } = store;

    // Build a world space bounding volume.
    line.copy(bounding.line);
    line.start.applyMatrix4(obj.matrixWorld);
    line.end.applyMatrix4(obj.matrixWorld);
    box.makeEmpty();
    box.setFromPoints([line.start, line.end]);
    box.min.addScalar(-bounding.radius);
    box.max.addScalar(bounding.radius);

    // Check for collisions.
    collider.geometry.boundsTree.shapecast({
      intersectsBounds: (box) => box.intersectsBox(box),
      intersectsTriangle: (tri) => {
        const triPoint = vec;
        const capsulePoint = vec2;
        const distance = tri.closestPointToSegment(line, triPoint, capsulePoint);
        // If the distance is less than the radius of the character, we have a collision.
        if (distance < bounding.radius) {
          const depth = bounding.radius - distance;
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
    deltaVector.subVectors(newPosition, characterRef.current.position);

    characterRef.current.position.add(deltaVector);
    box.setFromObject(characterRef.current);
  });

  // Reset if we fall off the level.
  useUpdate(() => {
    if (characterRef.current.position.y < -10) {
      characterRef.current.position.set(0, 0, 0);
      character.velocity.set(0, 0, 0);
    }
  });

  // Debugging visualizations
  useLineDebug(store.line);
  useBoxDebug(store.box);
  useCapsuleDebug(bounding, store.box);

  return (
    <group position={[0, 2, 0]} ref={characterRef}>
      {children}
    </group>
  );
}
