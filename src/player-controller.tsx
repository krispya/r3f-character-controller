import { VectorControl, BooleanControl, Controller, KeyboardDevice } from '@hmans/controlfreak';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { useController } from './controller';
import { Stages } from './app';
import * as THREE from 'three';
import { createMachine } from 'xstate';
import { useMachine } from '@xstate/react';
import { useStore } from './store';

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

type Controls = {
  move: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
  };
  jump: boolean;
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
  const playerRef = useRef<THREE.Group>(null!);
  const [temp] = useState(() => ({ vec: new THREE.Vector3(), box: new THREE.Box3() }));
  const directionVec = { forward: [0, 0, -1], backward: [0, 0, 1], left: [-1, 0, 0], right: [1, 0, 0] };
  const [upVec] = useState(() => new THREE.Vector3(0, 1, 0));

  const [controller, keyboard] = useController((state) => [state.controller, state.keyboard]);
  const [fsm, send] = useMachine(playerControlsMachine);
  const collider = useStore((state) => state.collider);

  const playerSpeed = 6;
  const controls = usePlayerControls();

  const once = useRef(true);

  // Bind move and jump controls
  useEffect(() => bindPlayerControls(controller, keyboard), [controller, keyboard]);

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
    if (!once.current) return;
    temp.box.setFromObject(playerRef.current);
    // console.log(collider.geometry.boundsTree)
    // collider.geometry.boundsTree.shapecast({
    //   intersectBounds: (box) => box.intersectsBox(temp.box),
    //   intersectsTriangle: (tri) => {
    //     console.log('help')
    //   }
    // })
    once.current = false;
  }, Stages.Update);

  return <group ref={playerRef}>{children}</group>;
}
