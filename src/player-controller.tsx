import { VectorControl, BooleanControl, Controller, KeyboardDevice } from '@hmans/controlfreak';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useController } from './controller';
import { Stages } from './app';
import * as THREE from 'three';
import { createMachine } from 'xstate';
import { useMachine } from '@xstate/react';
import { useStore } from './store';
import { useHelper } from '@react-three/drei';
import { useLineDebug } from './use-line-debug';

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

const playerControlsMachine = createMachine({
  id: 'player-controls',
  initial: 'idling',
  states: {
    idling: {
      on: {
        RUN: { target: 'running' },
      },
    },
    running: {
      on: {
        IDLE: { target: 'idling' },
      },
    },
    jumping: {},
  },
});

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
  const playerRef = useRef<THREE.Group>(null!);
  const lineRef = useRef<THREE.Line>(null!);

  // Three instances and consts
  const [temp] = useState(() => ({
    vec: new THREE.Vector3(),
    vec2: new THREE.Vector3(),
    box: new THREE.Box3(),
    segment: new THREE.Line3(),
  }));
  const directionVec: DirectionVec = { forward: [0, 0, -1], backward: [0, 0, 1], left: [-1, 0, 0], right: [1, 0, 0] };
  const [upVec] = useState(() => new THREE.Vector3(0, 1, 0));
  // A line segment that points down. We will update its end vector in an effect
  const [playerSegment] = useState(() => new THREE.Line3(new THREE.Vector3(), new THREE.Vector3(0, -1, 0)));

  // Stored states
  const [controller, keyboard] = useController((state) => [state.controller, state.keyboard]);
  const [fsm, send] = useMachine(playerControlsMachine);
  const collider = useStore((state) => state.collider);

  // Player controls and consts
  const controls = usePlayerControls();
  const playerSpeed = 6;
  const playerRadius = useRef(0);

  // Bind move and jump controls
  useEffect(() => bindPlayerControls(controller, keyboard), [controller, keyboard]);

  // Set math objects based on the player's size. We will use these to calculate intersections later
  useEffect(() => {
    if (playerRef.current) {
      const vec = new THREE.Vector3();
      temp.box.setFromObject(playerRef.current);
      temp.box.getSize(vec);
      playerSegment.end.copy(new THREE.Vector3(0, -vec.y / 2, 0));
      playerRadius.current = vec.x / 2;
    }
  }, []);

  useFrame((state, delta) => {
    const { move } = controls.current;
    const isMoving = move.forward || move.backward || move.left || move.right;

    if (isMoving) {
      send('RUN');

      // Get the angle between the camera and character
      const angle = Math.atan2(
        state.camera.position.x - playerRef.current.position.x,
        state.camera.position.z - playerRef.current.position.z,
      );

      // Loop over move directions and apply movement to the character
      for (const direction in move) {
        if (!move[direction]) continue;
        temp.vec.set(...directionVec[direction]).applyAxisAngle(upVec, angle);
        playerRef.current.position.addScaledVector(temp.vec, playerSpeed * delta);
      }
    } else {
      send('IDLE');
    }
  }, Stages.Update);

  useFrame(() => {
    if (!collider?.geometry?.boundsTree) return;

    // Prepare the line segment that we will use to check for collisions
    temp.segment.copy(playerSegment);
    temp.segment.start.applyMatrix4(playerRef.current.matrixWorld);
    temp.segment.end.applyMatrix4(playerRef.current.matrixWorld);

    collider.geometry.boundsTree.shapecast({
      // Use the character's box to check for collisions
      intersectsBounds: (box) => box.intersectsBox(temp.box),
      // Check if the triangle is intersecting the capsule and adjust the capsule position if it is
      // To do this we will use the line segment that starts at the origin of the character and ends at the top
      intersectsTriangle: (tri) => {
        const triPoint = temp.vec;
        const capsulePoint = temp.vec2;
        // Get the distance between interescting triangle and line
        const distance = tri.closestPointToSegment(temp.segment, triPoint, capsulePoint);
        // If the distance is less than the radius of the character, we have a collision
        if (distance < playerRadius.current) {
          // Get depth and direction of the collision
          const depth = playerRadius.current - distance;
          const direction = capsulePoint.sub(triPoint).normalize();
          // Move the line segment so there is no longer an intersection with the character's box
          temp.segment.start.addScaledVector(direction, depth);
          temp.segment.end.addScaledVector(direction, depth);
        }
      },
    });

    // Get the adjusted position of the capsule collider in world space after checking
    // triangle collisions and moving it. temp.segment.start is assumed to be
    // the origin of the player model
    const newPosition = temp.vec;
    newPosition.copy(temp.segment.start);

    // Check how much the collider was moved
    const deltaVector = temp.vec2;
    deltaVector.subVectors(newPosition, playerRef.current.position);

    // If the player was primarily adjusted vertically we assume it's on something we should consider ground
    // playerIsOnGround = deltaVector.y > Math.abs( delta * playerVelocity.y * 0.25 );

    const offset = Math.max(0.0, deltaVector.length() - 1e-5);
    deltaVector.normalize().multiplyScalar(offset);

    // Adjust the player model
    // playerRef.current.position.add(deltaVector);
  }, Stages.Update);

  // Box3 and Line3 visualizers for debugging
  useHelper(playerRef, THREE.BoxHelper);
  useLineDebug(temp.segment);

  return <group ref={playerRef}>{children}</group>;
}
