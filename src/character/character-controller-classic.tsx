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
// import { raycast } from 'collider/scene-queries/raycast';
import { computeCapsulePenetration, PenetrationInfo } from 'collider/scene-queries/compute-capsule-penetration';

export type CapsuleConfig = { radius: number; height: number; center?: THREE.Vector3 };

export type HitInfo = {
  collider: THREE.Object3D;
  normal: THREE.Vector3;
  distance: number;
  location: THREE.Vector3;
  impactPoint: THREE.Vector3;
  impactNormal: THREE.Vector3;
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
  groundOffset?: number;
  nearGround?: number | false;
  transform?: TransformFn;
};

const TOLERANCE = 1e-5;
const STEPS = 5;

export function CharacterController({
  id,
  children,
  debug = false,
  capsule,
  transform,
  groundOffset = 0.1,
  nearGround = 1,
  slopeLimit = 45,
}: CharacterControllerProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const [addCharacter, removeCharacter] = useCharacterController((state) => [
    state.addCharacter,
    state.removeCharacter,
  ]);

  const capsuleDebugRef = useRef<THREE.Group>(null!);

  const [pool] = useState({ vecA: new THREE.Vector3(), vecB: new THREE.Vector3() });
  const [store] = useState({
    depenetrateVector: new THREE.Vector3(),
    depenetrateVectorRaw: new THREE.Vector3(),
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
    penInfo: null as PenetrationInfo | null,
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

  const updateGroundedState = useCallback(
    (dt: number) => {
      store.character.updateMatrixWorld();
      const { boundingCapsule: capsule, matrix } = store.character;

      store.isNearGround = false;
      store.isSliding = false;
      // Set isGrounded true if our depenetration vector y is larger than a quarter of movement y.
      store.isGrounded = store.depenetrateVectorRaw.y > Math.abs(dt * store.movement.y * 0.25);

      // TODO: Can actually just be a sphere cast to simplify logic.
      const [centerTest] = capsuleCastMTD(
        capsule.radius / 4,
        capsule.halfHeight,
        matrix,
        pool.vecA.set(0, -1, 0),
        groundOffset,
      );

      if (centerTest) store.groundNormal.copy(centerTest.impactNormal);
      else if (store.penInfo) store.groundNormal.copy(store.penInfo.normal);

      const angle = calculateSlope(store.groundNormal);

      // If our ground test from the center of the capsule fails we might be hanging over nothing.
      // But this will also fail if we are walking up a steep slope. So we check the angle of the
      // tri we intersected with. If it is above our slope limit, we slide.
      // In some situations it is also possible to get stuck intersecting a tri oriented horizontally
      // while hanging off a ledge. Here we simply check if the angle is mostly flat.
      // We can safely assume this since if we are on flat ground the ground test would not fail in the first place.
      if (!centerTest && (angle > slopeLimit || angle < 10)) {
        store.isGrounded = false;
      }

      if (angle > slopeLimit && !(angle === 90 || angle === 0)) {
        store.isSliding = true;
      }

      if (nearGround && store.movement.y <= 0) {
        const [nearGroundHit] = capsuleCastMTD(
          capsule.radius / 4,
          capsule.halfHeight,
          matrix,
          pool.vecA.set(0, -1, 0),
          nearGround,
        );
        if (nearGroundHit) store.isNearGround = true;
      }
    },
    [calculateSlope, nearGround, pool, slopeLimit, groundOffset, store],
  );

  const updateMovementMode = () => {
    // Set character movement state. We have a cooldown to prevent false positives.
    if (store.isModeReady) {
      if (store.isGrounded) fsm.send('WALK');
      if (!store.isGrounded) fsm.send('FALL');
    }
  };

  const calculateMovement = (dt: number) => {
    store.velocity.set(0, 0, 0);
    store.movement.set(0, 0, 0);

    for (const modifier of modifiers) {
      store.velocity.add(modifier.value);
    }

    // Movement is the local space vector provided by velocity for a given dt.
    store.movement.addScaledVector(store.velocity, dt);
    store.maxDistance = store.movement.length();
    store.direction.copy(store.movement).normalize();
  };

  const moveCharacter = (dt: number) => {
    const { boundingCapsule: capsule, position } = store.character;
    store.groundNormal.set(0, 0, 0);

    store.character.position.addScaledVector(store.movement, dt);
    store.character.updateMatrixWorld();

    store.penInfo = computeCapsulePenetration(capsule.radius, capsule.halfHeight, store.character.matrix);

    if (store.penInfo) store.depenetrateVectorRaw.subVectors(store.penInfo.location, position);
    else store.depenetrateVectorRaw.set(0, 0, 0);

    store.depenetrateVector.copy(store.depenetrateVectorRaw);
    const offset = Math.max(0.0, store.depenetrateVector.length() - TOLERANCE);
    store.depenetrateVector.normalize().multiplyScalar(offset);

    store.character.position.add(store.depenetrateVector);
  };

  useUpdate((_, dt) => {
    calculateMovement(dt);

    for (let i = 0; i < STEPS; i++) {
      moveCharacter(1 / STEPS);
    }

    updateGroundedState(dt / STEPS);
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
  const getDeltaVector = useCallback(() => store.depenetrateVector, [store]);
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
