import { useUpdate } from '@react-three/fiber';
import { CharacterControllerContext } from 'character/contexts/character-controller-context';
import { useContext, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { createModifier } from './use-modifiers';
import { WALK_SPEED } from './walking';

export type FallingProps = {
  speed?: number;
  movement?: () => THREE.Vector3;
};

export function Falling({ speed = WALK_SPEED * 0.5, movement }: FallingProps) {
  const { addModifier, removeModifier, getIsFalling } = useContext(CharacterControllerContext);
  const modifier = createModifier('falling');

  useLayoutEffect(() => {
    addModifier(modifier);
    return () => removeModifier(modifier);
  }, [addModifier, modifier, removeModifier]);

  useUpdate(() => {
    if (!movement) return;
    const input = movement();
    const isFalling = getIsFalling();

    if (isFalling && input.length() > 0) {
      const scaledInput = input.multiplyScalar(speed);

      modifier.value.copy(scaledInput);
    } else {
      modifier.value.set(0, 0, 0);
    }
  });

  return null;
}
