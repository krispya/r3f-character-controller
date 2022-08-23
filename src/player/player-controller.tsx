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
};

export function PlayerController({ children, gravity, ...rest }: PlayerControllerProps) {
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
      character.position.set(0, 0, 0);
    }
  });

  // Update the player's movement vector based on camera direction.
  useUpdate((state) => {
    const { move } = controls;
    const { forward, right, movement } = store;

    forward.set(0, 0, -1);
    forward.applyQuaternion(state.camera.quaternion);
    forward.y = 0;
    forward.normalize().multiplyScalar(move.y);

    right.set(1, 0, 0);
    right.applyQuaternion(state.camera.quaternion);
    right.y = 0;
    right.normalize().multiplyScalar(move.x);

    movement.addVectors(forward, right);
  }, Stages.Early);

  return (
    <CharacterController {...rest}>
      {children}
      <Gravity gravity={gravity} />
      <Movement movement={() => store.movement} />
    </CharacterController>
  );
}
