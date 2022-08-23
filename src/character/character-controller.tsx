import { Stages, useUpdate, Vector3 } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useCollider } from 'collider/stores/collider-store';
import { useLineDebug } from 'utilities/use-line-debug';
import { useBoxDebug } from 'utilities/use-box-debug';
import { useVolumeDebug } from 'utilities/use-volume-debug';
import { useBoundingVolume } from './bounding-volume/use-bounding-volume';
import { useCharacterController } from './stores/character-store';
import { useModifiers } from './modifiers/use-modifiers';
import { CharacterControllerContext } from './contexts/character-controller-context';
import { useInterpret } from '@xstate/react';
import { characterMachine } from './machines/character-machine';

export type CharacterControllerProps = {
  children: React.ReactNode;
  debug?: boolean;
  position?: Vector3;
  iterations?: number;
  interpolation?: boolean;
};

const FIXED_STEP = 1 / 60;
// For reasons unknown, an additional iteration is required every 15 units of force to prevent tunneling.
// This isn't affected by the length of the character's body. I'll automate this once I do more testing.
const ITERATIONS = 5;

export function CharacterController({
  children,
  debug = false,
  position,
  iterations = ITERATIONS,
  interpolation = true,
}: CharacterControllerProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const [character, setCharacter] = useCharacterController((state) => [state.character, state.setCharacter]);

  const [store] = useState(() => ({
    vec: new THREE.Vector3(),
    vec2: new THREE.Vector3(),
    prev: new THREE.Vector3(),
    box: new THREE.Box3(),
    line: new THREE.Line3(),
  }));

  // Get movement modifiers.
  const { modifiers, addModifier, removeModifier } = useModifiers();

  // Get fininte state machine.
  const fsm = useInterpret(characterMachine);

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
    if (!character) return;
    meshRef.current.position.copy(character.position);
  };

  // Applies forces to the character, then checks for collision.
  // If one is detected then the character is moved to no longer collide.
  const step = useCallback(
    (delta: number) => {
      if (!collider?.geometry.boundsTree || !character) return;

      const { line, vec, vec2, box, prev } = store;
      const { boundingCapsule: capsule, boundingBox } = character;

      prev.copy(character.position);
      vec.set(0, 0, 0);

      // Appply forces.
      for (const modifier of modifiers) {
        vec.add(modifier.value);
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
            // Move the line segment so there is no longer an intersection.
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

  const interpolatePosition = useCallback(() => {
    if (!character) return;
    const { prev } = store;
    const alpha = Stages.Fixed.alpha;
    const distance = prev.distanceTo(character.position);
    // If we move more 1 unit assume we are teleporting and don't interpolate.
    if (distance && distance < 1) character?.position.lerpVectors(prev, character.position, alpha);
  }, [character, store]);

  // Set fixed step size.
  useLayoutEffect(() => {
    Stages.Fixed.fixedStep = FIXED_STEP;
  }, []);

  // Run physics simulation in fixed loop.
  useUpdate((_, delta) => {
    for (let i = 0; i < iterations; i++) {
      step(delta / iterations);
    }
  }, Stages.Fixed);

  // Finally, sync mesh so movement is visible.
  useUpdate(() => {
    if (interpolation) interpolatePosition();
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
    <CharacterControllerContext.Provider value={{ modifiers, addModifier, removeModifier, fsm }}>
      <group position={position} ref={meshRef}>
        {children}
      </group>
    </CharacterControllerContext.Provider>
  );
}
