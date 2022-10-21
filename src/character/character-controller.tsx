import { Stages, useUpdate, Vector3 } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CapsuleConfig } from './bounding-volume/use-bounding-volume';
import { useCharacterController } from './stores/character-store';
import { useModifiers } from './modifiers/use-modifiers';
import { CharacterControllerContext } from './contexts/character-controller-context';
import { useInterpret } from '@xstate/react';
import { movementMachine } from './machines/movement-machine';
import { AirCollision } from './modifiers/air-collision';
import { VolumeDebug } from './bounding-volume/volume-debug';
import { SmoothDamp } from '@gsimone/smoothdamp';
import { notEqualToZero } from 'utilities/math';
import { useEventHandler } from 'utilities/use-event-handler';

export type HitInfo = {
  collider: THREE.Object3D;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  //uv/textCoord: THREE.Vector2;
  //triangleIndex: number;
  //transform: THREE.Matrix4;
};

export type Capsule = {
  radius: number;
  height: number;
};

export type CapsuleCastHandler = (
  radius: number,
  height: number,
  transform: THREE.Matrix4,
  direction: THREE.Vector3,
  maxDistance: number,
) => HitInfo | null;

export type OverlapCapsuleHandler = (radius: number, height: number, transform: THREE.Matrix4) => THREE.Object3D[];
export type RaycastHandler = (origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number) => HitInfo | null;

export type CharacterControllerProps = {
  id: string;
  children: React.ReactNode;
  debug?: boolean | { showCollider?: boolean; showLine?: boolean; showBox?: boolean; showForce?: boolean };
  position?: Vector3;
  maxIterations?: number;
  groundDetectionOffset?: number;
  capsule?: CapsuleConfig;
  rotateTime?: number;
  slopeLimit?: number;
  capsuleCast: CapsuleCastHandler;
  overlapCapsule: OverlapCapsuleHandler;
  raycast: RaycastHandler;
};

export class Character extends THREE.Object3D {
  public isCharacter: boolean;
  public boundingCapsule: Capsule;
  public boundingBox: THREE.Box3;

  constructor(radius: number, height: number) {
    super();
    this.type = 'Character';
    this.isCharacter = true;
    this.boundingCapsule = { radius, height };
    this.boundingBox = new THREE.Box3();
  }
}

const MAX_ITERATIONS = 10;

export function CharacterController({
  id,
  children,
  debug = false,
  position,
  maxIterations = MAX_ITERATIONS,
  groundDetectionOffset = 0.1,
  capsule = 'auto',
  rotateTime = 0.1,
  capsuleCast,
  raycast,
  overlapCapsule,
}: CharacterControllerProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const [character, setCharacter] = useCharacterController((state) => [state.characters.get(id), state.setCharacter]);

  // const _debug = debug === true ? { showCollider: true, showLine: false, showBox: false, showForce: false } : debug;

  const [store] = useState({
    vecA: new THREE.Vector3(),
    vecB: new THREE.Vector3(),
    vecC: new THREE.Vector3(),
    deltaVector: new THREE.Vector3(),
    box: new THREE.Box3(),
    line: new THREE.Line3(),
    prevLine: new THREE.Line3(),
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

  const capsuleCastHandler = useEventHandler<typeof capsuleCast>(capsuleCast);
  const overlapCapsuleHandler = useEventHandler<typeof overlapCapsule>(overlapCapsule);
  const raycastHandler = useEventHandler<typeof raycast>(raycast);

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

  useLayoutEffect(() => setCharacter(id, new Character(0.27, 0.27 * 2 + 1)), [id, setCharacter]);

  const detectGround = useCallback((): HitInfo | null => {
    if (!character) return null;
    const { vecB } = store;
    const { boundingCapsule: capsule } = character;
    return raycastHandler(character.position, vecB.set(0, -1, 0), capsule.height / 2 + groundDetectionOffset);
  }, [character, groundDetectionOffset, raycastHandler, store]);

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
      moveList.push(vertical.clone());
      if (isHorizontalNotZero) moveList.push(horizontal.clone());
      return;
    }

    // Process down vector component next.
    // This covers some logic for stepping and sliding that I'll add later.
    if (vertical.y < 0) {
      if (isHorizontalNotZero) moveList.push(horizontal.clone());
      moveList.push(vertical.clone());
      return;
    }

    // Process horizontal component last.
    // Will add some stepping logic here later.
    moveList.push(horizontal.clone());
  };

  const resolveCollision = useCallback(
    (position: THREE.Vector3) => {
      if (!character) return;
      // Move the (virtual) position to the hit point. (The move direction * hit distance)
      // Then we need to get penetration information at this position.
      const transform = new THREE.Matrix4().copy(character.matrix).setPosition(position);
      const colliders = overlapCapsuleHandler(
        character.boundingCapsule.radius,
        character.boundingCapsule.height,
        transform,
      );
      // We do an intersection test and make an array of all overlapping colliders at the target move position.
      // Then loop through this array and push away from each collider to get a final direction and distance.
      // Then calculate and return that delta vector calling another physics function ComputePenetration.
    },
    [character, overlapCapsuleHandler],
  );

  const moveLoop = (dt: number) => {
    if (!character) return;
    const { moveList, vecA, vecB, vecC } = store;
    let index = 0;
    const virtualPosition = vecB.copy(character.position);
    // Apply delta time to the move vectors.
    moveList.forEach((move) => move.multiplyScalar(dt));

    for (let i = 0; i < maxIterations; i++) {
      const currentMove = vecA.copy(moveList[index]);
      const moveDirection = vecC.copy(currentMove).normalize();

      // Test for collision with a capsule cast in the movement direction.
      const hit = capsuleCastHandler(
        character.boundingCapsule.radius,
        character.boundingCapsule.height / 2,
        character.matrix,
        moveDirection,
        currentMove.length(),
      );

      // If there is a collision, resolve it.
      if (hit) {
        const move = new THREE.Vector3().copy(moveDirection).multiplyScalar(hit.distance);
        const position = new THREE.Vector3().copy(character.position).add(move);
        // console.log('recalc: ', position);
        resolveCollision(position);
        // virtualPosition.add(deltaVector);
        virtualPosition.add(currentMove);
      } else {
        // Else move the character by the full movement vector.
        virtualPosition.add(currentMove);
      }

      // // Depenetrate
      // const deltaVector = depenetrate();
      // if (deltaVector) virtualPosition.add(deltaVector);

      if (index < moveList.length) index++;
      if (index === moveList.length) break;
    }

    character.position.copy(virtualPosition);
    updateGroundedState();
    updateMovementMode();
  };

  // Applies forces to the character, then checks for collision.
  // If one is detected then the character is moved to no longer collide.
  // const step = useCallback(
  //   (delta: number) => {
  //     if (!collider?.geometry.boundsTree || !character) return;

  //     const { line, vecA: vec, vecB: vec2, box, movement: velocity, deltaVector, groundNormal } = store;
  //     const { boundingCapsule: capsule, boundingBox } = character;

  //     // Start by moving the character.
  //     moveCharacter(velocity, delta);

  //     // Update bounding volume.
  //     character.computeBoundingVolume();
  //     line.copy(capsule.line);
  //     box.copy(boundingBox);

  //     // Check for collisions.
  //     collider.geometry.boundsTree.shapecast({
  //       intersectsBounds: (bounds) => bounds.intersectsBox(box),
  //       intersectsTriangle: (tri) => {
  //         const triPoint = vec;
  //         const capsulePoint = vec2;
  //         const distance = tri.closestPointToSegment(line, triPoint, capsulePoint);

  //         // If the distance is less than the radius of the character, we have a collision.
  //         if (distance < capsule.radius) {
  //           const depth = capsule.radius - distance;
  //           const direction = capsulePoint.sub(triPoint).normalize();

  //           // Move the line segment so there is no longer an intersection.
  //           line.start.addScaledVector(direction, depth);
  //           line.end.addScaledVector(direction, depth);
  //         }
  //       },
  //     });

  //     const newPosition = vec;
  //     deltaVector.set(0, 0, 0);
  //     // Bounding volume origin is calculated. This might lose percision.
  //     line.getCenter(newPosition);
  //     deltaVector.subVectors(newPosition, character.position);

  //     // Discard values smaller than our tolerance.
  //     const offset = Math.max(0, deltaVector.length() - 1e-7);
  //     deltaVector.normalize().multiplyScalar(offset);

  //     character.position.add(deltaVector);

  //     const [isGrounded, face] = detectGround();
  //     store.isGrounded = isGrounded;
  //     if (face) groundNormal.copy(face.normal);

  //     // Set character movement state. We have a cooldown to prevent false positives.
  //     if (store.toggle) {
  //       if (store.isGrounded) fsm.send('WALK');
  //       if (!store.isGrounded) fsm.send('FALL');
  //     }
  //   },
  //   [character, collider?.geometry.boundsTree, detectGround, fsm, moveCharacter, store],
  // );

  useUpdate((_, dt) => {
    calculateMovement();
    decomposeMovement();
    moveLoop(dt);
  }, Stages.Fixed);

  // Sync mesh so movement is visible.
  useUpdate(() => {
    if (!character) return;
    // We update the character matrix manually since it isn't part of the scene graph.
    character.updateMatrix();
    meshRef.current.position.copy(character.position);
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
      <group ref={meshRef}>{children}</group>
      {/* <AirCollision /> */}

      {/* {character && _debug && (
        <VolumeDebug
          bounding={character}
          showCollider={_debug.showCollider}
          showLine={_debug.showLine}
          showBox={_debug.showBox}
          showForce={_debug.showForce}
        />
      )} */}
    </CharacterControllerContext.Provider>
  );
}
