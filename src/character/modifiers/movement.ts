import { useUpdate } from '@react-three/fiber';
import { CharacterControllerContext } from 'character/contexts/character-controller-context';
import { useContext, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { createModifier } from './use-modifiers';

export type MovementProps = {
  movementSpeed?: number;
  movement?: () => THREE.Vector3;
};

export function Movement({ movementSpeed = 5, movement }: MovementProps) {
  const { modifiers, addModifier, removeModifier, fsm } = useContext(CharacterControllerContext);
  const modifier = createModifier('movement');

  useLayoutEffect(() => {
    addModifier(modifier);
    return () => removeModifier(modifier);
  }, [addModifier, modifiers, modifier, removeModifier]);

  useUpdate(() => {
    if (!movement) return;
    const _movement = movement();
    const isMoving = _movement.length() > 0;

    if (isMoving) {
      fsm.send('MOVE');
      modifier.value.copy(_movement.multiplyScalar(movementSpeed));
    } else {
      fsm.send('IDLE');
      modifier.value.set(0, 0, 0);
    }
  });

  return null;
}
