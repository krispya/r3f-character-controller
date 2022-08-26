import { Stages, useUpdate } from '@react-three/fiber';
import { useCameraController } from 'camera/stores/camera-store';
import { CharacterController, CharacterControllerProps } from 'character/character-controller';
import { Gravity, GravityProps } from 'character/modifiers/gravity';
import { Jump, JumpProps } from 'character/modifiers/jump';
import { Movement, MovementProps } from 'character/modifiers/movement';
import { useCharacterController } from 'character/stores/character-store';
import { useControls } from 'controls/controller';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

type PlayerControllerProps = CharacterControllerProps &
  Omit<GravityProps, 'alwaysOn'> &
  Omit<JumpProps, 'jump'> &
  Omit<MovementProps, 'movement'> & {
    gravityAlwaysOn?: boolean;
  };

export function PlayerController({ children, ...props }: PlayerControllerProps) {
  const [store] = useState(() => ({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    movement: new THREE.Vector3(),
  }));

  const character = useCharacterController((state) => state.character);
  const setTarget = useCameraController((state) => state.setTarget);
  const controls = useControls();

  useEffect(() => setTarget(character), [character, setTarget]);

  // Reset if we fall off the level.
  useUpdate(() => {
    if (character && character.position.y < -10) {
      if (props.position) {
        if (Array.isArray(props.position)) character.position.set(...props.position);
        if (props.position instanceof THREE.Vector3) character.position.copy(props.position);
        if (typeof props.position === 'number') character.position.set(props.position, props.position, props.position);
      } else {
        character.position.set(0, 0, 0);
      }
    }
  });

  // Update the player's movement vector based on camera direction.
  useUpdate((state) => {
    const { move } = controls;
    const { forward, right, movement } = store;

    forward.set(0, 0, -1).applyQuaternion(state.camera.quaternion);
    forward.normalize().multiplyScalar(move.y);
    forward.y = 0;

    right.set(1, 0, 0).applyQuaternion(state.camera.quaternion);
    right.normalize().multiplyScalar(move.x);
    forward.y = 0;

    movement.addVectors(forward, right);
  }, Stages.Early);

  return (
    <CharacterController
      position={props.position}
      debug={props.debug}
      iterations={props.iterations}
      groundedOffset={props.groundedOffset}>
      {children}
      <Gravity
        gravity={props.gravity}
        groundedGravity={props.groundedGravity}
        alwaysOn={props.gravityAlwaysOn}
        maxFallSpeed={props.maxFallSpeed}
      />
      <Movement movement={() => store.movement} movementSpeed={props.movementSpeed} />
      <Jump jump={() => controls.jump} jumpSpeed={props.jumpSpeed} />
    </CharacterController>
  );
}
