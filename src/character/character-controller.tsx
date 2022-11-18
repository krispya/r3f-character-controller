import { Stages, useUpdate, Vector3 } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useCharacterController } from './stores/character-store';
import { useModifiers } from './modifiers/use-modifiers';
import { CharacterControllerContext } from './contexts/character-controller-context';
import { useInterpret } from '@xstate/react';
import { movementMachine } from './machines/movement-machine';
import { AirCollision } from './modifiers/air-collision';
import { VolumeDebug } from './bounding-volume/volume-debug';
import { SmoothDamp } from '@gsimone/smoothdamp';
import { notEqualToZero } from 'utilities/math';
import { Capsule } from 'collider/geometry/capsule';
import { capsuleCastMTD } from 'collider/scene-queries/capsule-cast-mtd';
import { CapsuleDebug } from 'utilities/capsule-debug';
import { CapsuleWireframe } from 'collider/scene-queries/debug/capsule-wireframe';
import { useCollider } from 'collider/stores/collider-store';

export type CapsuleConfig = { radius: number; height: number };

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
  debug?: boolean | { showCollider?: boolean; showLine?: boolean; showBox?: boolean; showForce?: boolean };
  position?: Vector3;
  groundDetectionOffset?: number;
  capsule: CapsuleConfig;
  rotateTime?: number;
  slopeLimit?: number;
  capsuleCast: CapsuleCastFn;
  overlapCapsule: OverlapCapsuleFn;
  raycast: RaycastFn;
  computePenetration: ComputePenetrationFn;
};
export class Character extends THREE.Object3D {
  public isCharacter: boolean;
  public boundingCapsule: Capsule;
  public boundingBox: THREE.Box3;

  constructor(radius: number, halfHeight: number) {
    super();
    this.type = 'Character';
    this.isCharacter = true;
    this.boundingCapsule = new Capsule(radius, halfHeight);
    this.boundingBox = new THREE.Box3();
  }
}

export function CharacterController({
  id,
  children,
  debug = false,
  position,
  groundDetectionOffset = 0.1,
  capsule,
  rotateTime = 0.1,
  capsuleCast,
  raycast,
  overlapCapsule,
  computePenetration,
}: CharacterControllerProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const [addCharacter, removeCharacter] = useCharacterController((state) => [
    state.addCharacter,
    state.removeCharacter,
  ]);

  // const _debug = debug === true ? { showCollider: true, showLine: false, showBox: false, showForce: false } : debug;

  const [store] = useState({
    vecA: new THREE.Vector3(),
    vecB: new THREE.Vector3(),
    vecC: new THREE.Vector3(),
    deltaVector: new THREE.Vector3(),
    toggle: true,
    timer: 0,
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

  // Create character game object on init.
  useLayoutEffect(() => {
    addCharacter(id, store.character);
    return () => {
      removeCharacter(id);
    };
  }, [id, removeCharacter, addCharacter, capsule]);

  const detectGround = useCallback((): HitInfo | null => {
    const { vecB, character } = store;
    if (!character) return null;
    const { boundingCapsule: capsule } = character;
    return raycast(character.position, vecB.set(0, -1, 0), capsule.halfHeight + groundDetectionOffset);
  }, [groundDetectionOffset, raycast, store]);

  const updateGroundedState = useCallback(() => {
    const hit = detectGround();
    store.isGrounded = hit !== null ? true : false;
    if (hit) store.groundNormal.copy(hit.normal);
  }, [detectGround, store]);

  const updateMovementMode = useCallback(() => {
    // Set character movement state. We have a cooldown to prevent false positives.
    if (store.toggle) {
      if (store.isGrounded) fsm.send('WALK');
      if (!store.isGrounded) fsm.send('FALL');
    }
  }, [fsm, store]);

  const calculateMovement = (dt: number) => {
    const { direction, inputDirection, velocity, movement } = store;

    velocity.set(0, 0, 0);
    direction.set(0, 0, 0);
    inputDirection.set(0, 0, 0);
    movement.set(0, 0, 0);

    for (const modifier of modifiers) {
      velocity.add(modifier.value);

      if (modifier.name === 'walking' || modifier.name === 'falling') {
        inputDirection.add(modifier.value);
      }
    }

    // Movement is the local space vector provided by velocity for a given dt.
    movement.addScaledVector(velocity, dt);
    store.maxDistance = movement.length();
    direction.copy(movement).normalize();

    inputDirection.normalize().negate();
  };

  const moveCharacter = () => {
    let { hitInfo, mtd, direction, character, movement, maxDistance } = store;
    const { boundingCapsule: capsule, matrix } = character;

    [hitInfo, mtd] = capsuleCastMTD(capsule.radius, capsule.halfHeight, matrix, direction, maxDistance);

    if (hitInfo) {
      character.position.copy(hitInfo.location);
      store.isGrounded = true;
    } else {
      character.position.add(movement);
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
    const { character } = store;
    // We update the character matrix manually since it isn't part of the scene graph.
    character.updateMatrix();
    meshRef.current.position.copy(character.position);
  }, Stages.Update);

  // Rotate the mesh to point in the direction of movement.
  // TODO: Try using a quaternion slerp instead.
  useUpdate((_, delta) => {
    const { character } = store;
    if (!meshRef.current || !character) return;
    const { inputDirection, vecA: vec, smoothDamp } = store;
    smoothDamp.smoothTime = rotateTime;

    if (inputDirection.length() !== 0) {
      store.targetAngle = Math.atan2(inputDirection.x, inputDirection.z);
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
      <group ref={meshRef}>{children}</group>
      {/* <AirCollision /> */}
      <CapsuleWireframe
        radius={store.character?.boundingCapsule.radius ?? 0}
        halfHeight={store.character?.boundingCapsule.halfHeight ?? 0}
      />
    </CharacterControllerContext.Provider>
  );
}
