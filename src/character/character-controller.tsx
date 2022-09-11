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

export function CharacterController({
  children,
  debug = false,
  position,
  iterations = ITERATIONS,
  groundDetectionOffset = 0.1,
  capsule = 'auto',
  rotateTime = 0.1,
  slopeLimit = 45,
}: CharacterControllerProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const [character, setCharacter] = useCharacterController((state) => [state.character, state.setCharacter]);

  const _debug = debug === true ? { showCollider: true, showLine: false, showBox: false, showForce: false } : debug;

  const [store] = useState({
    vec: new THREE.Vector3(),
    vec2: new THREE.Vector3(),
    deltaVector: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
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

    const { raycaster, vec2 } = store;
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

      const { line, vec, vec2, box, velocity, deltaVector, groundNormal, prevLine } = store;
      const { boundingCapsule: capsule, boundingBox } = character;
      let collisionSlopeCheck = false;

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

            // Check if the tri we collide with is within our slope limit.
            const dot = direction.dot(vec.set(0, 1, 0));
            const angle = THREE.MathUtils.radToDeg(Math.acos(dot));
            collisionSlopeCheck = angle <= slopeLimit && angle >= 0;

            console.log(collisionSlopeCheck, angle);

            // Move the line segment so there is no longer an intersection.
            if (collisionSlopeCheck || !store.isGroundedMovement) {
              line.start.addScaledVector(direction, depth);
              line.end.addScaledVector(direction, depth);
            } else {
              line.copy(prevLine);
            }
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
      // If collision slope check is passed, see if our character is over ground so we don't hover.
      // If we fail the collision slop check, double check it by casting down.
      // Can definitely clean this up.
      if (collisionSlopeCheck) {
        if (isGrounded && face) {
          store.isGrounded = true;
          groundNormal.copy(face.normal);
        } else {
          store.isGrounded = false;
          groundNormal.set(0, 0, 0);
        }
      } else {
        face ? groundNormal.copy(face.normal) : groundNormal.set(0, 0, 0);

        const dot = groundNormal.dot(vec.set(0, 1, 0));
        const angle = THREE.MathUtils.radToDeg(Math.acos(dot));

        if (isGrounded && angle <= slopeLimit) {
          store.isGrounded = true;
        } else {
          store.isGrounded = false;
        }
      }

      // Set character movement state. We have a cooldown to prevent false positives.
      if (store.toggle) {
        if (store.isGrounded) fsm.send('WALK');
        if (!store.isGrounded) fsm.send('FALL');
      }

      prevLine.copy(line);
    },
    [character, collider?.geometry.boundsTree, detectGround, fsm, moveCharacter, slopeLimit, store],
  );

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
  // TODO: Try using a quaternion slerp instead.
  useUpdate((_, delta) => {
    if (!meshRef.current || !character) return;
    const { direction, vec, smoothDamp } = store;
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
