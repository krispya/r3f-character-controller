import { useUpdate } from '@react-three/fiber';
import { CharacterControllerContext } from 'character/contexts/character-controller-context';
import { useContext, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { createModifier } from './use-modifiers';

type MovementProps = {
  movementSpeed?: number;
  movement?: () => THREE.Vector3;
};

export function Movement({ movementSpeed = 5, movement }: MovementProps) {
  const { modifiers, addModifier, removeModifier } = useContext(CharacterControllerContext);
  const moveModifier = createModifier();

  useLayoutEffect(() => {
    addModifier(moveModifier);
    return () => removeModifier(moveModifier);
  }, [addModifier, modifiers, moveModifier, removeModifier]);

  useUpdate(() => {
    if (!movement) return;
    const _movement = movement();
    const isMoving = _movement.length() > 0;

    if (isMoving) {
      //   send('MOVE');
      moveModifier.value.copy(_movement.multiplyScalar(movementSpeed));
    } else {
      //   send('IDLE');
      moveModifier.value.set(0, 0, 0);
    }
  });

  return null;
}
