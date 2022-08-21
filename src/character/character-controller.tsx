import { Stages, useUpdate, Vector3 } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useCollider } from 'collider/stores/collider-store';
import { useLineDebug } from 'debug/use-line-debug';
import { useBoxDebug } from 'debug/use-box-debug';
import { useVolumeDebug } from 'debug/use-volume-debug';
import { useBoundingVolume } from './hooks/use-bounding-volume';
import { useCharacterController } from './stores/character-store';
import { useModifiers } from './hooks/use-modifiers';

export type CharacterControllerProps = {
  children: React.ReactNode;
  debug?: boolean;
  gravity?: number;
  position?: Vector3;
};

const GRAVITY = -9.81;
const FIXED_STEP = 1 / 60;
const PHYSICS_STEPS = 3;

export function CharacterController({
  children,
  debug = false,
  gravity = GRAVITY,
  position,
}: CharacterControllerProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const [character, setCharacter] = useCharacterController((state) => [state.character, state.setCharacter]);

  const [store] = useState(() => ({
    vec: new THREE.Vector3(),
    vec2: new THREE.Vector3(),
    obj: new THREE.Object3D(),
    box: new THREE.Box3(),
    line: new THREE.Line3(),
    matrix: new THREE.Matrix4(),
  }));

  // Set up modifiers.
  const { modifiers, addModifier, removeModifier } = useModifiers();

  // Get world collider BVH.
  const collider = useCollider((state) => state.collider);

  // Build bounding volume. Right now it can only be a capsule.
  const bounding = useBoundingVolume(meshRef);
  useLayoutEffect(() => setCharacter(bounding), [bounding, setCharacter]);

  const moveCharacter = useCallback(
    (velocity: THREE.Vector3, delta: number) => {
      character?.position.addScaledVector(velocity, delta);
      character?.updateMatrixWorld();
    },
    [character],
  );

  const syncMeshToBoundingVolume = () => {
    meshRef.current.position.copy(bounding.position);
  };

  // Applies forces to the character, then checks for collision.
  // If one is detected then the character is moved to no longer collide.
  const step = useCallback(
    (delta: number) => {
      if (!collider?.geometry.boundsTree || !character) return;

      const { line, vec, vec2, box } = store;
      const { boundingCapsule: capsule, boundingBox } = character;

      vec.set(0, 0, 0);

      // Appply forces.
      for (const modifier of modifiers) {
        vec.add(modifier);
      }

      moveCharacter(vec, delta);

      // Update bounding volume.
      character.computeBoundingVolume();
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
      line.getCenter(newPosition);
      deltaVector.subVectors(newPosition, character.position);
      character.position.add(deltaVector);
    },
    [character, collider?.geometry.boundsTree, modifiers, moveCharacter, store],
  );

  // Set fixed step size.
  useLayoutEffect(() => {
    Stages.Fixed.fixedStep = FIXED_STEP;
  }, []);

  // Add gravity.
  useLayoutEffect(() => {
    const modifier = new THREE.Vector3(0, gravity, 0);
    addModifier(modifier);
    return () => removeModifier(modifier);
  }, [addModifier, gravity, modifiers, removeModifier]);

  // Run physics simulation in fixed loop.
  useUpdate((_, delta) => {
    for (let i = 0; i < PHYSICS_STEPS; i++) {
      step(delta / PHYSICS_STEPS);
    }
  }, Stages.Fixed);

  // Finally, sync mesh so movement is visible.
  useUpdate(() => {
    syncMeshToBoundingVolume();
  }, Stages.Update);

  // Debugging visualizations.
  // We need to compute the bounding volume twice in order to visualize its change.
  useUpdate(() => {
    if (debug) {
      character?.updateMatrixWorld();
      character?.computeBoundingVolume();
    }
  }, Stages.Update);

  useLineDebug(debug ? store.line : null);
  useBoxDebug(debug ? character?.boundingBox : null);
  useVolumeDebug(debug ? bounding : null);

  return (
    <group position={position} ref={meshRef}>
      {children}
    </group>
  );
}
