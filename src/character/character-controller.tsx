import { Stages, useUpdate, Vector3 } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useCollider } from 'collider/stores/collider-store';
import { CapsuleConfig, useBoundingVolume } from './bounding-volume/use-bounding-volume';
import { useCharacterController } from './stores/character-store';
import { useModifiers } from './modifiers/use-modifiers';
import { CharacterControllerContext } from './contexts/character-controller-context';
import { useInterpret } from '@xstate/react';
import { movementMachine } from './machines/movement-machine';
import { AirCollision } from './modifiers/air-collision';
import { VolumeDebug } from './bounding-volume/volume-debug';
import { quatSmoothDamp } from 'utilities/quatDamp';

export type CharacterControllerProps = {
  children: React.ReactNode;
  debug?: boolean | { showCollider?: boolean; showLine?: boolean; showBox?: boolean; showForce?: boolean };
  position?: Vector3;
  iterations?: number;
  groundDetectionOffset?: number;
  capsule?: CapsuleConfig;
  rotateSpeed?: number;
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
  groundDetectionOffset = 0.1,
  capsule = 'auto',
  rotateSpeed = 0.2,
}: CharacterControllerProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const [character, setCharacter] = useCharacterController((state) => [state.character, state.setCharacter]);

  const _debug =
    typeof debug === 'boolean' ? { showCollider: true, showLine: false, showBox: false, showForce: false } : debug;

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
    isGrounded: false,
    isGroundedMovement: false,
    isFalling: false,
    groundNormal: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    angle: 0,
    currentQuat: new THREE.Quaternion(),
    targetQuat: new THREE.Quaternion(),
  });

  // Get movement modifiers.
  const { modifiers, addModifier, removeModifier } = useModifiers();

  // Get fininte state machine.
  const fsm = useInterpret(
    movementMachine,
    {
      actions: {
        onFall: () => {
          clearTimeout(store.timer);
          store.toggle = false;
          store.timer = setTimeout(() => (store.toggle = true), 100);
        },
        onWalk: () => {
          clearTimeout(store.timer);
          store.toggle = false;
          store.timer = setTimeout(() => (store.toggle = true), 100);
        },
      },
    },
    (state) => {
      store.isGroundedMovement = state.matches('walking');
      store.isFalling = state.matches('falling');
    },
  );

  // Get world collider BVH.
  const collider = useCollider((state) => state.collider);

  // Build bounding volume. Right now it can only be a capsule.
  const bounding = useBoundingVolume(capsule, meshRef);
  useLayoutEffect(() => setCharacter(bounding), [bounding, setCharacter]);

  const moveCharacter = useCallback(
    (velocity: THREE.Vector3, delta: number) => {
      character?.position.addScaledVector(velocity, delta);
      character?.updateMatrixWorld();
    },
    [character],
  );

  const detectGround = useCallback(() => {
    if (!character || !collider) return false;

    const { raycaster, vec, groundNormal } = store;
    const { boundingCapsule: capsule } = character;

    raycaster.set(character.position, vec.set(0, -1, 0));
    raycaster.far = capsule.height / 2 + capsule.radius + groundDetectionOffset;
    raycaster.firstHitOnly = true;
    const res = raycaster.intersectObject(collider, false);
    res[0]?.face ? groundNormal.copy(res[0].face.normal) : groundNormal.set(0, 0, 0);

    return res.length !== 0;
  }, [character, collider, groundDetectionOffset, store]);

  const syncMeshToBoundingVolume = () => {
    if (!character) return;
    meshRef.current.position.copy(character.position);
  };

  const calculateVelocity = () => {
    const { velocity, direction } = store;
    velocity.set(0, 0, 0);
    direction.set(0, 0, 0);

    for (const modifier of modifiers) {
      velocity.add(modifier.value);

      if (modifier.name === 'walking' || modifier.name === 'falling') {
        direction.add(modifier.value);
      }
    }

    direction.normalize().negate();
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

      // Discard values smaller than our tolerance.
      const offset = Math.max(0, deltaVector.length() - 1e-7);
      deltaVector.normalize().multiplyScalar(offset);

      character.position.add(deltaVector);

      // Set character movement state. We have a cooldown to prevent false positives.
      store.isGrounded = detectGround();
      if (store.toggle) {
        if (store.isGrounded) fsm.send('WALK');
        if (!store.isGrounded) fsm.send('FALL');
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

  // Sync mesh so movement is visible.
  useUpdate(() => {
    syncMeshToBoundingVolume();
  }, Stages.Update);

  // Rotate the mesh to point in the direction of movement.
  useUpdate((_, delta) => {
    if (!meshRef.current || !character) return;
    const { direction, vec, currentQuat, targetQuat } = store;

    if (direction.length() !== 0) store.angle = Math.atan2(direction.x, direction.z);
    targetQuat.setFromAxisAngle(vec.set(0, 1, 0), store.angle);

    quatSmoothDamp(currentQuat, targetQuat, rotateSpeed, delta);
    meshRef.current.quaternion.copy(currentQuat);
  }, Stages.Late);

  const getVelocity = useCallback(() => store.velocity, [store]);
  const getDeltaVector = useCallback(() => store.deltaVector, [store]);
  const getIsGroundedMovement = useCallback(() => store.isGroundedMovement, [store]);
  const getIsWalking = useCallback(() => store.isGroundedMovement, [store]);
  const getIsFalling = useCallback(() => store.isFalling, [store]);
  const getGroundNormal = useCallback(() => store.groundNormal, [store]);

  return (
    <CharacterControllerContext.Provider
      value={{
        addModifier,
        removeModifier,
        fsm,
        getVelocity,
        getDeltaVector,
        getIsGroundedMovement,
        getIsWalking,
        getIsFalling,
        getGroundNormal,
      }}>
      <group position={position} ref={meshRef}>
        <group position={capsule === 'auto' ? 0 : capsule.center}>{children}</group>
      </group>

      <AirCollision />

      {character && _debug && (
        <VolumeDebug
          bounding={character}
          showCollider={_debug.showCollider}
          showLine={_debug.showLine}
          showBox={_debug.showBox}
          showForce={_debug.showForce}
        />
      )}
    </CharacterControllerContext.Provider>
  );
}
