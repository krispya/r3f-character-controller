import { Stages, useUpdate } from '@react-three/fiber';
import { useCameraController } from 'camera/stores/camera-store';
import { CharacterController, CharacterControllerProps } from 'character/character-controller';
import { Gravity } from 'character/modifiers/gravity';
import { Movement } from 'character/modifiers/movement';
import { useCharacterController } from 'character/stores/character-store';
import { useControls } from 'controls/controller';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

type PlayerControllerProps = CharacterControllerProps & {
  gravity?: number;
  movementSpeed?: number;
};

export function PlayerController({ children, gravity, movementSpeed, ...rest }: PlayerControllerProps) {
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
    if (character && character.position.y < -5) {
      if (rest.position) {
        if (Array.isArray(rest.position)) character.position.set(...rest.position);
        if (rest.position instanceof THREE.Vector3) character.position.copy(rest.position);
        if (typeof rest.position === 'number') character.position.set(rest.position, rest.position, rest.position);
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
    <CharacterController {...rest}>
      {children}
      <Gravity gravity={gravity} />
      <Movement movementSpeed={movementSpeed} movement={() => store.movement} />
    </CharacterController>
  );
}
