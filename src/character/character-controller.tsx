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
import { SmoothDamp } from '@gsimone/smoothdamp';
import { notEqualToZero } from 'utilities/math';

export type CharacterControllerProps = {
  children: React.ReactNode;
  debug?: boolean | { showCollider?: boolean; showLine?: boolean; showBox?: boolean; showForce?: boolean };
  position?: Vector3;
  iterations?: number;
  groundDetectionOffset?: number;
  capsule?: CapsuleConfig;
  rotateTime?: number;
  slopeLimit?: number;
};

// For reasons unknown, an additional iteration is required every 15 units of force to prevent tunneling.
// This isn't affected by the length of the character's body. I'll automate this once I do more testing.
const ITERATIONS = 5;
const MAX_ITERATIONS = 10;

export function CharacterController({
  children,
  debug = false,
  position,
  iterations = ITERATIONS,
  groundDetectionOffset = 0.1,
  capsule = 'auto',
  rotateTime = 0.1,
}: CharacterControllerProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const [character, setCharacter] = useCharacterController((state) => [state.character, state.setCharacter]);

  const _debug = debug === true ? { showCollider: true, showLine: false, showBox: false, showForce: false } : debug;

  const [store] = useState({
    vecA: new THREE.Vector3(),
    vecB: new THREE.Vector3(),
    vecC: new THREE.Vector3(),
    deltaVector: new THREE.Vector3(),
    box: new THREE.Box3(),
    line: new THREE.Line3(),
    prevLine: new THREE.Line3(),
    raycaster: new THREE.Raycaster(),
    toggle: true,
    timer: 0,
    isGrounded: false,
    isGroundedMovement: false,
    isFalling: false,
    groundNormal: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    targetAngle: 0,
    currentAngle: 0,
    currentQuat: new THREE.Quaternion(),
    targetQuat: new THREE.Quaternion(),
    smoothDamp: new SmoothDamp(rotateTime, 100),
    movement: new THREE.Vector3(),
    moveList: [] as THREE.Vector3[],
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

  const detectGround = useCallback((): [boolean, THREE.Face | null] => {
    if (!character || !collider) return [false, null];

    const { raycaster, vecB: vec2 } = store;
    const { boundingCapsule: capsule } = character;

    raycaster.set(character.position, vec2.set(0, -1, 0));
    raycaster.far = capsule.height / 2 + capsule.radius + groundDetectionOffset;
    raycaster.firstHitOnly = true;
    const res = raycaster.intersectObject(collider, false);

    return [res.length !== 0, res[0]?.face ?? null];
  }, [character, collider, groundDetectionOffset, store]);

  const syncMeshToBoundingVolume = () => {
    if (!character) return;
    meshRef.current.position.copy(character.position);
  };

  const calculateMovement = () => {
    const { movement, direction } = store;
    movement.set(0, 0, 0);
    direction.set(0, 0, 0);

    for (const modifier of modifiers) {
      movement.add(modifier.value);

      if (modifier.name === 'walking' || modifier.name === 'falling') {
        direction.add(modifier.value);
      }
    }

    direction.normalize().negate();
  };

  const decomposeMovement = () => {
    const { movement, moveList, vecA, vecB } = store;
    moveList.length = 0;

    const horizontal = vecA.set(movement.x, 0, movement.z);
    const vertical = vecB.set(0, movement.y, 0);
    const isHorizontalNotZero = notEqualToZero(horizontal.x) || notEqualToZero(horizontal.z);

    // Process up vector component first.
    if (vertical.y > 0) {
      moveList.push(vertical);
      if (isHorizontalNotZero) moveList.push(horizontal.clone());
      return;
    }

    // Process down vector component next.
    // This covers some logic for stepping and sliding that I'll add later.
    if (vertical.y < 0) {
      if (isHorizontalNotZero) moveList.push(horizontal.clone());
      moveList.push(vertical);
      return;
    }

    // Process horizontal component last.
    // Will add some stepping logic here later.
    moveList.push(horizontal);
  };

  const moveLoop = () => {
    const { moveList, vecA, vecB } = store;
    let index = 0;
    const currentMove = moveList[index];
    const virtualPosition = vecB.copy(character.position);

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const currentMoveRef = vecA.copy(currentMove);

      // Test for collision with a capsule cast in the movement direction.
      const hit = capsuleCast(radius, height, transform, direction, maxDistance);

      // If there is a collision, move the character to the point of collision.
      if (hit) {
        const deltaVector = resolveCollision(hit);
        virtualPosition.add(deltaVector);
      } else {
        // Else move the character by the full movement vector.
        virtualPosition.add(currentMoveRef);
      }

      // Depenetrate
      const deltaVector = depenetrate();
      if (deltaVector) virtualPosition.add(deltaVector);

      if (index < moveList.length - 1) index++;
      if (index === moveList.length - 1) break;
    }

    character.position.copy(virtualPosition);
  };

  // Applies forces to the character, then checks for collision.
  // If one is detected then the character is moved to no longer collide.
  const step = useCallback(
    (delta: number) => {
      if (!collider?.geometry.boundsTree || !character) return;

      const { line, vecA: vec, vecB: vec2, box, movement: velocity, deltaVector, groundNormal } = store;
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

      const [isGrounded, face] = detectGround();
      store.isGrounded = isGrounded;
      if (face) groundNormal.copy(face.normal);

      // Set character movement state. We have a cooldown to prevent false positives.
      if (store.toggle) {
        if (store.isGrounded) fsm.send('WALK');
        if (!store.isGrounded) fsm.send('FALL');
      }
    },
    [character, collider?.geometry.boundsTree, detectGround, fsm, moveCharacter, store],
  );

  useUpdate(() => {
    calculateMovement();
    decomposeMovement();

    // for (let i = 0; i < iterations; i++) {
    //   step(delta / iterations);
    // }
  }, Stages.Fixed);

  // Sync mesh so movement is visible.
  useUpdate(() => {
    syncMeshToBoundingVolume();
  }, Stages.Update);

  // Rotate the mesh to point in the direction of movement.
  // TODO: Try using a quaternion slerp instead.
  useUpdate((_, delta) => {
    if (!meshRef.current || !character) return;
    const { direction, vecA: vec, smoothDamp } = store;
    smoothDamp.smoothTime = rotateTime;

    if (direction.length() !== 0) {
      store.targetAngle = Math.atan2(direction.x, direction.z);
    } else {
      store.targetAngle = store.currentAngle;
    }

    const angleDelta = store.targetAngle - store.currentAngle;
    // If the angle delta is greater than PI radians, we need to rotate the other way.
    // This stops the character from rotating the long way around.
    if (Math.abs(angleDelta) > Math.PI) {
      store.targetAngle = store.targetAngle - Math.sign(angleDelta) * Math.PI * 2;
    }

    store.currentAngle = smoothDamp.get(store.currentAngle, store.targetAngle, delta);
    // Make sure our character's angle never exceeds 2PI radians.
    if (store.currentAngle > Math.PI) store.currentAngle -= Math.PI * 2;
    if (store.currentAngle < -Math.PI) store.currentAngle += Math.PI * 2;

    meshRef.current.setRotationFromAxisAngle(vec.set(0, 1, 0), store.currentAngle);
  }, Stages.Late);

  const getVelocity = useCallback(() => store.movement, [store]);
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
