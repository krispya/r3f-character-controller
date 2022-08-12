import { VectorControl, BooleanControl, Controller, KeyboardDevice } from '@hmans/controlfreak';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { useController } from './controller';
import { Stages } from './app';
import * as THREE from 'three';
import { useMachine } from '@xstate/react';
import { useStore } from './store';
import { useLineDebug } from './debug/use-line-debug';
import { playerControlsMachine } from './player-machine';
import { useBoxDebug } from './debug/use-box-debug';

type Controls = {
  move: {
    [key: string]: boolean;
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
  };
  jump: boolean;
};

type DirectionVec = {
  [key: string]: [number, number, number];
  forward: [number, number, number];
  backward: [number, number, number];
  left: [number, number, number];
  right: [number, number, number];
};

const GRAVITY = -9.81;

const bindPlayerControls = (controller: Controller, keyboard: KeyboardDevice) => {
  controller.addControl('move', VectorControl).addStep(keyboard.compositeVector('KeyW', 'KeyS', 'KeyA', 'KeyD'));
  controller.addControl('jump', BooleanControl).addStep(keyboard.whenKeyPressed('Space'));

  return () => {
    controller.removeControl('move');
    controller.removeControl('jump');
  };
};

export function usePlayerControls() {
  const controls = useRef<Controls>({
    move: {
      forward: false,
      backward: false,
      left: false,
      right: false,
    },
    jump: false,
  });
  const controller = useController();

  useFrame(() => {
    const forward = controller.controls.move?.value.y > 0 ?? false;
    const backward = controller.controls.move?.value.y < 0 ?? false;
    const left = controller.controls.move?.value.x < 0 ?? false;
    const right = controller.controls.move?.value.x > 0 ?? false;
    const jump = controller.controls.jump?.value ?? false;
    controls.current = { move: { forward, backward, left, right }, jump };
  }, Stages.Early);

  return controls;
}

export function PlayerController({ children }: { children: React.ReactNode }) {
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
  const [controller, keyboard] = useController((state) => [state.controller, state.keyboard]);
  const [fsm, send] = useMachine(playerControlsMachine);
  const collider = useStore((state) => state.collider);
  const setPlayer = useStore((state) => state.setPlayer);

  // Player controls and consts
  const controls = usePlayerControls();
  const [character] = useState(() => ({
    speed: 6,
    jumpSpeed: 6,
    groundScalar: 0.95,
    isGrounded: false,
    velocity: new THREE.Vector3(),
  }));
  const [bounding] = useState(() => ({ radius: 0, length: 0, segment: new THREE.Line3() }));

  // Bind move and jump controls
  useEffect(() => bindPlayerControls(controller, keyboard), [controller, keyboard]);

  // Store the character as player
  useEffect(() => {
    if (characterRef.current) setPlayer(characterRef.current);
  }, []);

  // Set math objects based on the player's size. We will use these to calculate intersections later
  useEffect(() => {
    if (characterRef.current) {
      const vec = new THREE.Vector3();
      temp.box.setFromObject(characterRef.current);
      temp.box.getSize(vec);
      bounding.radius = vec.x / 2;
      bounding.length = vec.y - bounding.radius * 2;
      bounding.segment.end.copy(new THREE.Vector3(0, -bounding.length, 0));
    }
  }, []);

  // Player movement loop
  useFrame((state, delta) => {
    const { move, jump: isJumping } = controls.current;
    const isMoving = move.forward || move.backward || move.left || move.right;

    // Apply gravity and velocities to the character
    character.velocity.y += character.isGrounded ? 0 : delta * GRAVITY;
    characterRef.current.position.addScaledVector(character.velocity, delta);

    if (isMoving || isJumping) {
      // Get the angle between the camera and character
      const angle = Math.atan2(
        state.camera.position.x - characterRef.current.position.x,
        state.camera.position.z - characterRef.current.position.z,
      );

      // Loop over move directions and apply movement to the character
      if (isMoving) {
        send('RUN');
        for (const direction in move) {
          if (!move[direction]) continue;
          temp.vec.set(...directionVec[direction]).applyAxisAngle(upVec, angle);
          characterRef.current.position.addScaledVector(temp.vec, character.speed * delta);
        }
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

  useFrame((state, delta) => {
    if (!collider?.geometry?.boundsTree) return;

    // Prepare the line segment that we will use to check for collisions
    temp.segment.copy(bounding.segment);
    temp.segment.start.applyMatrix4(characterRef.current.matrixWorld);
    temp.segment.end.applyMatrix4(characterRef.current.matrixWorld);

    // Build a bounding box that represents the collision area
    // The setFromObject and manual box3 build method should yield the same result
    // I'm not sure which is faster, but I was doing this for debug
    temp.box.makeEmpty();
    // temp.box.setFromObject(characterRef.current);
    temp.box.expandByPoint(temp.segment.start);
    temp.box.expandByPoint(temp.segment.end);
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
    // triangle collisions and moving it. We use temp.segment.start as the origin
    const newPosition = temp.vec;
    newPosition.copy(temp.segment.start);

    // Check how much the collider was moved
    const deltaVector = temp.vec2;
    deltaVector.subVectors(newPosition, characterRef.current.position);

    // If the player was primarily adjusted vertically we assume it's on something we should consider ground.
    // The groundScalar helps us make the character more sticky or slippery. A value less than 1 will make the
    // character stickier while a value greater than 1 will make the character slippery
    character.isGrounded = deltaVector.y > Math.abs(delta * character.velocity.y * character.groundScalar);

    // Discards deltaVector values smaller than our magic number
    // TODO: Figure out this magic number stuff
    const offset = Math.max(0.0, deltaVector.length() - 1e-4);
    deltaVector.normalize().multiplyScalar(offset);

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

  useFrame((state, delta) => {
    if (characterRef.current.position.y < -10) {
      characterRef.current.position.set(0, 0, 0);
      character.velocity.y = 0;
    }
  });

  // Box3 and Line3 visualizers for debugging
  useLineDebug(temp.segment);
  useBoxDebug(temp.box);

  return <group ref={characterRef}>{children}</group>;
}
