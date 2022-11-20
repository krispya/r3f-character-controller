import { Stages, useUpdate, Vector3 } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useCharacterController } from './stores/character-store';
import { useModifiers } from './modifiers/use-modifiers';
import { CharacterControllerContext } from './contexts/character-controller-context';
import { useInterpret } from '@xstate/react';
import { movementMachine } from './machines/movement-machine';
import { SmoothDamp } from '@gsimone/smoothdamp';
import { Capsule } from 'collider/geometry/capsule';
import { capsuleCastMTD } from 'collider/scene-queries/capsule-cast-mtd';
import { CapsuleWireframe } from 'collider/geometry/debug/capsule-wireframe';
import { Character } from './stores/character';
import { raycast } from 'collider/scene-queries/raycast';

export type CapsuleConfig = { radius: number; height: number; center?: Vector3 };

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
  position?: Vector3;
  groundDetectionOffset?: number;
  capsule: CapsuleConfig;
  rotateTime?: number;
  slopeLimit?: number;
};

export function CharacterController({
  id,
  children,
  debug = false,
  position,
  groundDetectionOffset = 0.1,
  capsule,
  rotateTime = 0.1,
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
    groundNormal: new THREE.Vector3(),
    targetAngle: 0,
    currentAngle: 0,
    currentQuat: new THREE.Quaternion(),
    targetQuat: new THREE.Quaternion(),
    smoothDamp: new SmoothDamp(rotateTime, 100),
    // Character store
    character: new Character(capsule.radius, capsule.height / 2),
    velocity: new THREE.Vector3(),
    movement: new THREE.Vector3(),
    maxDistance: 0,
    direction: new THREE.Vector3(),
    inputDirection: new THREE.Vector3(),
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
  }, [id, removeCharacter, addCharacter, capsule]);

  useLayoutEffect(() => {
    store.character.boundingCapsule.set(capsule.radius, capsule.height / 2);
  }, [capsule]);

  const detectGround = useCallback((): HitInfo | null => {
    const { boundingCapsule: capsule } = store.character;
    return raycast(store.character.position, pool.vecA.set(0, -1, 0), capsule.halfHeight + groundDetectionOffset);
  }, [groundDetectionOffset, raycast, store]);

  const updateGroundedState = useCallback(() => {
    const hit = detectGround();
    store.isGrounded = hit !== null ? true : false;
    if (hit) store.groundNormal.copy(hit.normal);
  }, [detectGround, store]);

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
    store.inputDirection.set(0, 0, 0);
    store.movement.set(0, 0, 0);

    for (const modifier of modifiers) {
      store.velocity.add(modifier.value);

      if (modifier.name === 'walking' || modifier.name === 'falling') {
        store.inputDirection.add(modifier.value);
      }
    }

    // Movement is the local space vector provided by velocity for a given dt.
    store.movement.addScaledVector(store.velocity, dt);
    store.maxDistance = store.movement.length();
    store.direction.copy(store.movement).normalize();

    store.inputDirection.normalize().negate();
  };

  const moveCharacter = () => {
    const { boundingCapsule: capsule, matrix } = store.character;

    [store.hitInfo, store.mtd] = capsuleCastMTD(
      capsule.radius,
      capsule.halfHeight,
      matrix,
      store.direction,
      store.maxDistance,
    );

    if (store.hitInfo) {
      store.character.position.copy(store.hitInfo.location);
      store.isGrounded = true;
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
  useUpdate(() => {
    // We update the character matrix manually since it isn't part of the scene graph.
    store.character.updateMatrix();
    meshRef.current.position.copy(store.character.position);
  }, Stages.Update);

  // Rotate the mesh to point in the direction of movement.
  // TODO: Try using a quaternion slerp instead.
  useUpdate((_, delta) => {
    if (!meshRef.current) return;
    store.smoothDamp.smoothTime = rotateTime;

    if (store.inputDirection.length() !== 0) {
      store.targetAngle = Math.atan2(store.inputDirection.x, store.inputDirection.z);
    } else {
      store.targetAngle = store.currentAngle;
    }

    const angleDelta = store.targetAngle - store.currentAngle;
    // If the angle delta is greater than PI radians, we need to rotate the other way.
    // This stops the character from rotating the long way around.
    if (Math.abs(angleDelta) > Math.PI) {
      store.targetAngle = store.targetAngle - Math.sign(angleDelta) * Math.PI * 2;
    }

    store.currentAngle = store.smoothDamp.get(store.currentAngle, store.targetAngle, delta);
    // Make sure our character's angle never exceeds 2PI radians.
    if (store.currentAngle > Math.PI) store.currentAngle -= Math.PI * 2;
    if (store.currentAngle < -Math.PI) store.currentAngle += Math.PI * 2;

    meshRef.current.setRotationFromAxisAngle(pool.vecA.set(0, 1, 0), store.currentAngle);
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
      <group position={capsule.center}>
        <group ref={meshRef}>{children}</group>
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
