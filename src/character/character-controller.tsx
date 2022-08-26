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
import { AirCollision } from './modifiers/air-collision';

export type CharacterControllerProps = {
  children: React.ReactNode;
  debug?: boolean;
  position?: Vector3;
  iterations?: number;
  groundedOffset?: number;
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
  groundedOffset = 0.1,
}: CharacterControllerProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const [character, setCharacter] = useCharacterController((state) => [state.character, state.setCharacter]);

  const [store] = useState({
    vec: new THREE.Vector3(),
    vec2: new THREE.Vector3(),
    deltaVector: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    box: new THREE.Box3(),
    line: new THREE.Line3(),
    raycaster: new THREE.Raycaster(),
    toggle: true,
    timer: 0,
  });

  // Get movement modifiers.
  const { modifiers, addModifier, removeModifier } = useModifiers();

  // Get fininte state machine.
  const fsm = useInterpret(characterMachine, {
    actions: {
      onJump: () => {
        modifiers.forEach((modifier) => modifier?.onJump && modifier.onJump());
      },
      onAirborne: () => {
        clearTimeout(store.timer);
        store.toggle = false;
        store.timer = setTimeout(() => (store.toggle = true), 100);
      },
      onGrounded: () => {
        clearTimeout(store.timer);
        store.toggle = false;
        store.timer = setTimeout(() => (store.toggle = true), 100);
      },
    },
  });

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

  const detectGround = useCallback(() => {
    if (!character || !collider) return;
    const { raycaster, vec } = store;
    const { boundingCapsule: capsule } = character;

    raycaster.set(character.position, vec.set(0, -1, 0));
    raycaster.far = capsule.length / 2 + capsule.radius + groundedOffset;
    raycaster.firstHitOnly = true;
    const res = raycaster.intersectObject(collider, false);
    return res.length !== 0;
  }, [character, collider, groundedOffset, store]);

  const syncMeshToBoundingVolume = () => {
    if (!character) return;
    meshRef.current.position.copy(character.position);
  };

  const calculateVelocity = () => {
    const { velocity } = store;
    velocity.set(0, 0, 0);

    for (const modifier of modifiers) {
      velocity.add(modifier.value);
    }
  };

  // Applies forces to the character, then checks for collision.
  // If one is detected then the character is moved to no longer collide.
  const step = useCallback(
    (delta: number) => {
      if (!collider?.geometry.boundsTree || !character) return;

      const { line, vec, vec2, box, velocity, deltaVector } = store;
      const { boundingCapsule: capsule, boundingBox } = character;

      // Start by moving the character.
      moveCharacter(velocity, delta);

      // Update bounding volume.
      character.computeBoundingVolume();
      line.copy(capsule.line);
      box.copy(boundingBox);

      // Check for collisions.
      collider.geometry.boundsTree.shapecast({
        intersectsBounds: (bounds) => bounds.intersectsBox(box),
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
      deltaVector.set(0, 0, 0);
      // Bounding volume origin is calculated. This might lose percision.
      line.getCenter(newPosition);
      deltaVector.subVectors(newPosition, character.position);

      // Set precision to 1e-7.
      const offset = Math.max(0.0, deltaVector.length() - 1e-7);
      deltaVector.normalize().multiplyScalar(offset);

      character.position.add(deltaVector);

      const isGrounded = detectGround();

      // Set character world state. We have a cooldown to prevent false positives when jumping.
      if (store.toggle) {
        if (isGrounded) fsm.send('GROUNDED');
        if (!isGrounded) fsm.send('AIRBORNE');
      }
    },
    [character, collider?.geometry.boundsTree, detectGround, fsm, moveCharacter, store],
  );

  // Set fixed step size.
  useLayoutEffect(() => {
    Stages.Fixed.fixedStep = FIXED_STEP;
  }, []);

  // Run physics simulation in fixed loop.
  useUpdate((_, delta) => {
    calculateVelocity();

    for (let i = 0; i < iterations; i++) {
      step(delta / iterations);
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

  useLineDebug(debug ? character?.boundingCapsule.line : null);
  useBoxDebug(debug ? character?.boundingBox : null);
  useVolumeDebug(debug ? character : null);

  const getVelocity = useCallback(() => store.velocity, [store]);
  const getDeltaVector = useCallback(() => store.deltaVector, [store]);

  return (
    <CharacterControllerContext.Provider
      value={{
        modifiers,
        addModifier,
        removeModifier,
        fsm,
        getVelocity,
        getDeltaVector,
      }}>
      <group position={position} ref={meshRef}>
        {children}
      </group>
      <AirCollision />
    </CharacterControllerContext.Provider>
  );
}
