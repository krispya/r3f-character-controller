import { Stages, useUpdate } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useController } from 'controls/controller';
import * as THREE from 'three';
import { useMachine } from '@xstate/react';
import { useStore } from 'stores/store';
import { useLineDebug } from 'debug/use-line-debug';
import { characterControlsMachine } from './character-machine';
import { useBoxDebug } from 'debug/use-box-debug';
import { useVolumeDebug } from 'debug/use-volume-debug';
import { MeasureHandler, useMeasure } from 'hooks/use-measure';

type DirectionVec = {
  [key: string]: [number, number, number];
  forward: [number, number, number];
  backward: [number, number, number];
  left: [number, number, number];
  right: [number, number, number];
};

export type Bounding = {
  radius: number;
  length: number;
  segment: THREE.Line3;
};

export type CharacterControllerProps = {
  children: React.ReactNode;
};

const GRAVITY = -9.81;

export function CharacterController({ children }: CharacterControllerProps) {
  // Refs
  const characterRef = useRef<THREE.Group>(null!);

  // Three instances and consts
  const [temp] = useState(() => ({
    vec: new THREE.Vector3(),
    vec2: new THREE.Vector3(),
    box: new THREE.Box3(),
    segment: new THREE.Line3(),
    matrix: new THREE.Matrix4(),
  }));
  const directionVec: DirectionVec = { forward: [0, 0, -1], backward: [0, 0, 1], left: [-1, 0, 0], right: [1, 0, 0] };
  const [upVec] = useState(() => new THREE.Vector3(0, 1, 0));

  // Stored states
  const [, send] = useMachine(characterControlsMachine);
  const collider = useStore((state) => state.collider);
  const setPlayer = useStore((state) => state.setPlayer);

  // Player controls and consts
  const controls = useController();
  const [character] = useState(() => ({
    speed: 6,
    jumpSpeed: 6,
    groundScalar: 0.75,
    isGrounded: false,
    velocity: new THREE.Vector3(),
  }));
  const [bounding] = useState<Bounding>(() => ({ radius: 0, length: 0, segment: new THREE.Line3() }));

  // Store the character as player
  useEffect(() => {
    if (characterRef.current) setPlayer(characterRef.current);
  }, [setPlayer]);

  const handleMeasure = useCallback<MeasureHandler>(
    (size, box) => {
      temp.box.copy(box);
      bounding.radius = size.x / 2;
      bounding.length = size.y - bounding.radius * 2;

      const offset = bounding.length - bounding.length / 2;

      bounding.segment.end.copy(new THREE.Vector3(0, -offset, 0));
      bounding.segment.start.copy(new THREE.Vector3(0, offset, 0));
    },
    [bounding, temp.box],
  );

  useMeasure(characterRef, handleMeasure, { precise: true });

  // Player movement loop
  useUpdate((state, delta) => {
    if (!controls) return;

    const { move, jump: isJumping } = controls;
    const isMoving = move.x !== 0 || move.y !== 0;

    // Apply gravity and velocities to the character
    character.velocity.y += character.isGrounded ? 0 : delta * GRAVITY;
    characterRef.current.position.addScaledVector(character.velocity, delta);

    if (isMoving || isJumping) {
      // Get the angle between the camera and character
      const angle = Math.atan2(
        state.camera.position.x - characterRef.current.position.x,
        state.camera.position.z - characterRef.current.position.z,
      );

      // TODO: Very broken. Actually this whole method is bad. Just redo it.
      if (isMoving) {
        send('RUN');
        // for (const direction in move) {
        //   if (!move[direction]) continue;
        //   temp.vec.set(...directionVec[direction]).applyAxisAngle(upVec, angle);
        //   characterRef.current.position.addScaledVector(temp.vec, character.speed * delta);
        // }
      }

      if (isJumping) {
        send('JUMP');
        if (character.isGrounded) character.velocity.y = character.jumpSpeed;
      }
    }
    {
      send('IDLE');
    }
    // Update the character's matrix for movement now so we can update it again for collision later
    characterRef.current.updateMatrixWorld();
  }, Stages.Update);

  useUpdate((state, delta) => {
    if (!collider?.geometry?.boundsTree) return;

    // Prepare the line segment that we will use to check for collisions
    temp.segment.copy(bounding.segment);
    temp.segment.start.applyMatrix4(characterRef.current.matrixWorld);
    temp.segment.end.applyMatrix4(characterRef.current.matrixWorld);

    // Build a bounding box that represents the collision area
    temp.box.makeEmpty();
    temp.box.setFromPoints([temp.segment.start, temp.segment.end]);
    temp.box.min.addScalar(-bounding.radius);
    temp.box.max.addScalar(bounding.radius);

    collider.geometry.boundsTree.shapecast({
      // Use the character's box to check for collisions
      intersectsBounds: (box) => box.intersectsBox(temp.box),
      // Check if the triangle is intersecting the capsule and adjust the capsule position if it is
      // To do this we will use the line segment and assume the bounds are a radius distance from it in every direction
      intersectsTriangle: (tri) => {
        const triPoint = temp.vec;
        const capsulePoint = temp.vec2;
        // Get the distance between interescting triangle and line
        const distance = tri.closestPointToSegment(temp.segment, triPoint, capsulePoint);
        // If the distance is less than the radius of the character, we have a collision
        if (distance < bounding.radius) {
          // Get depth and direction of the collision
          const depth = bounding.radius - distance;
          const direction = capsulePoint.sub(triPoint).normalize();
          // Move the line segment so there is no longer an intersection with the character's box
          temp.segment.start.addScaledVector(direction, depth);
          temp.segment.end.addScaledVector(direction, depth);
        }
      },
    });

    // Get the adjusted position of the capsule collider in world space after checking
    // triangle collisions and moving it.
    const newPosition = temp.vec;
    temp.segment.getCenter(newPosition);

    // Check how much the collider was moved
    const deltaVector = temp.vec2;
    deltaVector.subVectors(newPosition, characterRef.current.position);

    // If the player was primarily adjusted vertically we assume it's on something we should consider ground.
    // The groundScalar helps us make the character more sticky or slippery. A value less than 1 will make the
    // character stickier while a value greater than 1 will make the character slippery
    character.isGrounded = deltaVector.y > Math.abs(delta * character.velocity.y * character.groundScalar);
    // console.log(deltaVector.y);

    // Discards deltaVector values smaller than our magic number
    // TODO: Figure out this magic number stuff
    const offset = Math.max(0.0, deltaVector.length() - 1e-7);
    if (offset === 0) deltaVector.normalize().multiplyScalar(offset);
    // console.log('final: ', deltaVector.y);

    // Adjust the player model
    characterRef.current.position.add(deltaVector);

    if (!character.isGrounded) {
      // We check if the character has collisions while in the air and apply them to its velocity
      deltaVector.normalize();
      character.velocity.addScaledVector(deltaVector, -deltaVector.dot(character.velocity));
    } else {
      // Set velocity to 0 if we are on the ground otherwise the character will get dragged through the floor
      character.velocity.set(0, 0, 0);
    }
  }, Stages.Update);

  useUpdate(() => {
    if (characterRef.current.position.y < -10) {
      characterRef.current.position.set(0, 0, 0);
      character.velocity.set(0, 0, 0);
    }
  });

  // Box3 and Line3 visualizers for debugging
  useLineDebug(temp.segment);
  useBoxDebug(temp.box);
  useVolumeDebug(bounding, temp.box);

  return <group ref={characterRef}>{children}</group>;
}