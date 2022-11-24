import { Stages, useUpdate } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useCharacterController } from './stores/character-store';
import { useModifiers } from './modifiers/use-modifiers';
import { CharacterControllerContext } from './contexts/character-controller-context';
import { useInterpret } from '@xstate/react';
import { movementMachine } from './machines/movement-machine';
import { Capsule } from 'collider/geometry/capsule';
import { capsuleCastMTD } from 'collider/scene-queries/capsule-cast-mtd';
import { CapsuleWireframe } from 'collider/geometry/debug/capsule-wireframe';
import { Character } from './stores/character';
import { raycast } from 'collider/scene-queries/raycast';

export type CapsuleConfig = { radius: number; height: number; center?: THREE.Vector3 };

export type HitInfo = {
  collider: THREE.Object3D;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  location: THREE.Vector3;
};

export type MTD = {
  distance: number;
  direction: THREE.Vector3;
};

export type CapsuleCastFn = (
  radius: number,
  height: number,
  transform: THREE.Matrix4,
  direction: THREE.Vector3,
  maxDistance: number,
) => HitInfo | null;

export type OverlapCapsuleFn = (radius: number, height: number, transform: THREE.Matrix4) => THREE.Mesh[];

export type RaycastFn = (origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number) => HitInfo | null;

export type TransformFn = (character: Character, dt: number) => void;

export type ComputePenetrationFn = (
  colliderA: Capsule,
  transformA: THREE.Matrix4,
  colliderB: THREE.BufferGeometry,
  transformB: THREE.Matrix4,
) => MTD | null;

export type CharacterControllerProps = {
  id: string;
  children: React.ReactNode;
  debug?: boolean;
  capsule: CapsuleConfig;
  slopeLimit?: number;
  snapToGround?: number;
  nearGround?: number | false;
  transform?: TransformFn;
};

const TOLERANCE = 1e-7;

export function CharacterController({
  id,
  children,
  debug = false,
  capsule,
  transform,
  snapToGround = 0.1,
  nearGround = 1,
  slopeLimit = 50,
}: CharacterControllerProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const [addCharacter, removeCharacter] = useCharacterController((state) => [
    state.addCharacter,
    state.removeCharacter,
  ]);

  const capsuleDebugRef = useRef<THREE.Group>(null!);

  const [pool] = useState({ vecA: new THREE.Vector3(), vecB: new THREE.Vector3() });
  const [store] = useState({
    deltaVector: new THREE.Vector3(),
    isGrounded: false,
    isGroundedMovement: false,
    isFalling: false,
    isSliding: false,
    isNearGround: false,
    groundNormal: new THREE.Vector3(),
    // Character store
    character: new Character(capsule.radius, capsule.height / 2),
    velocity: new THREE.Vector3(),
    movement: new THREE.Vector3(),
    maxDistance: 0,
    direction: new THREE.Vector3(),
    collision: false,
    hitInfo: null as HitInfo | null,
    mtd: null as MTD | null,
    // FSM store
    isModeReady: true,
    timer: 0,
  });

  // Get movement modifiers.
  const { modifiers, addModifier, removeModifier } = useModifiers();

  // Get fininte state machine.
  // TODO: I think there is a delay switching states when done in the callback.
  // I should investigate at some point.
  const fsm = useInterpret(
    movementMachine,
    {
      actions: {
        onFall: () => {
          clearTimeout(store.timer);
          store.isModeReady = false;
          store.timer = setTimeout(() => (store.isModeReady = true), 100);
        },
        onWalk: () => {
          clearTimeout(store.timer);
          store.isModeReady = false;
          store.timer = setTimeout(() => (store.isModeReady = true), 100);
        },
      },
    },
    (state) => {
      store.isGroundedMovement = state.matches('walking');
      store.isFalling = state.matches('falling');
    },
  );

  // Create character game object on init.
  useLayoutEffect(() => {
    addCharacter(id, store.character);
    return () => {
      removeCharacter(id);
    };
  }, [id, removeCharacter, addCharacter, capsule, store]);

  useLayoutEffect(() => {
    store.character.boundingCapsule.set(capsule.radius, capsule.height / 2);
  }, [capsule, store]);

  const calculateSlope = useCallback(
    (normal: THREE.Vector3) => {
      const upVec = pool.vecA.set(0, 1, 0);
      const radians = upVec.angleTo(normal);
      return THREE.MathUtils.radToDeg(radians);
    },
    [pool],
  );

  const detectGround = useCallback(
    (offset: number, withCapsule?: boolean): HitInfo | null => {
      store.character.updateMatrix();
      const { boundingCapsule: capsule, matrix } = store.character;
      const downVec = pool.vecA.set(0, -1, 0);

      if (!withCapsule) {
        const raycastHit = raycast(store.character.position, downVec, capsule.halfHeight + offset);
        return raycastHit;
      }

      if (withCapsule) {
        const [capcastHit] = capsuleCastMTD(capsule.radius / 2, capsule.halfHeight, matrix, downVec, offset);
        return capcastHit;
      }

      return null;
    },
    [pool, store],
  );

  const updateGroundedState = useCallback(() => {
    store.isSliding = false;
    store.isGrounded = false;
    store.isNearGround = false;
    store.groundNormal.set(0, 0, 0);

    // If we are moving up, we don't need to check for the ground.
    if (store.movement.y > 0) return;

    if (store.hitInfo) {
      // console.log('isGrounded collision');
      const angle = calculateSlope(store.hitInfo.normal);
      const rayHit = detectGround(snapToGround, false);

      if (rayHit && angle <= slopeLimit) {
        store.isSliding = true;
      }

      store.isGrounded = true;

      if (rayHit) {
        store.groundNormal.copy(rayHit.normal);
      } else {
        store.groundNormal.copy(store.hitInfo.normal);
      }

      return;
    }

    const hit = detectGround(snapToGround, true);

    if (hit) {
      // console.log('isGrounded cast');
      const angle = calculateSlope(hit.normal);

      if (hit && angle <= slopeLimit) {
        store.isSliding = true;
      }

      store.isGrounded = true;
      store.groundNormal.copy(hit.normal);

      const deltaVector = pool.vecA;
      deltaVector.subVectors(hit.location, store.character.position);

      // Only snap to ground if we are above nearly flat terrain.
      // It's a bit of a workaround but it works for now.
      if (deltaVector.length() > TOLERANCE && Math.abs(angle) <= 10) {
        store.character.position.copy(hit.location);
      }
    }

    if (nearGround) {
      const nearGroundHit = detectGround(nearGround, true);
      if (nearGroundHit) store.isNearGround = true;
    }

    // console.log('Is NOT grounded');
  }, [store, detectGround, snapToGround, calculateSlope, slopeLimit, nearGround, pool.vecA]);

  const updateMovementMode = () => {
    // Set character movement state. We have a cooldown to prevent false positives.
    if (store.isModeReady) {
      if (store.isGrounded) fsm.send('WALK');
      if (!store.isGrounded) fsm.send('FALL');
    }
  };

  const calculateMovement = (dt: number) => {
    store.velocity.set(0, 0, 0);
    store.direction.set(0, 0, 0);
    store.movement.set(0, 0, 0);

    for (const modifier of modifiers) {
      store.velocity.add(modifier.value);
      // console.log(modifier.name, modifier.value);
    }

    // Movement is the local space vector provided by velocity for a given dt.
    store.movement.addScaledVector(store.velocity, dt);
    store.maxDistance = store.movement.length();
    store.direction.copy(store.movement).normalize();
  };

  const moveCharacter = () => {
    const { boundingCapsule: capsule, matrix, position } = store.character;

    [store.hitInfo, store.mtd] = capsuleCastMTD(
      capsule.radius,
      capsule.halfHeight,
      matrix,
      store.direction,
      store.maxDistance,
    );

    if (store.hitInfo) {
      // Discard changes in position smaller than our tolerance.
      store.deltaVector.subVectors(store.hitInfo.location, position);
      const clampedLength = Math.max(store.deltaVector.length() - TOLERANCE, 0);
      store.deltaVector.normalize().multiplyScalar(clampedLength);

      store.character.position.add(store.deltaVector);
    } else {
      store.character.position.add(store.movement);
    }
  };

  useUpdate((_, dt) => {
    calculateMovement(dt);
    moveCharacter();
    updateGroundedState();
    updateMovementMode();
  }, Stages.Fixed);

  // Sync mesh so movement is visible.
  useUpdate((_, dt) => {
    // We update the character matrix manually since it isn't part of the scene graph.
    if (transform) transform(store.character, dt);
    store.character.updateMatrix();
    meshRef.current.position.copy(store.character.position);
    meshRef.current.rotation.copy(store.character.rotation);
  }, Stages.Update);

  useUpdate(() => {
    if (!capsuleDebugRef.current || !debug) return;
    capsuleDebugRef.current.position.copy(store.character.position);
    capsuleDebugRef.current.updateMatrix();
  }, Stages.Late);

  const getVelocity = useCallback(() => store.velocity, [store]);
  const getDeltaVector = useCallback(() => store.deltaVector, [store]);
  const getIsGroundedMovement = useCallback(() => store.isGroundedMovement, [store]);
  const getIsWalking = useCallback(() => store.isGroundedMovement, [store]);
  const getIsFalling = useCallback(() => store.isFalling, [store]);
  const getIsSliding = useCallback(() => store.isSliding, [store]);
  const getIsNearGround = useCallback(() => store.isNearGround, [store]);
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
        getIsSliding,
        getIsNearGround,
      }}>
      <group position={capsule.center}>
        <group ref={meshRef}>
          <>{children}</>
        </group>
      </group>
      {/* <AirCollision /> */}
      {debug && (
        <CapsuleWireframe
          ref={capsuleDebugRef}
          radius={store.character?.boundingCapsule.radius ?? 0}
          halfHeight={store.character?.boundingCapsule.halfHeight ?? 0}
        />
      )}
    </CharacterControllerContext.Provider>
  );
}
