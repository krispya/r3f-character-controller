import { useUpdate } from '@react-three/fiber';
import { CharacterControllerContext } from 'character/contexts/character-controller-context';
import { useContext, useLayoutEffect, useState } from 'react';
import * as THREE from 'three';
import { createModifier } from './use-modifiers';

export const WALK_SPEED = 5;

export type WalkingProps = {
  speed?: number;
  movement?: () => THREE.Vector3;
};

export function Walking({ speed = WALK_SPEED, movement }: WalkingProps) {
  const { addModifier, removeModifier, getIsWalking } = useContext(CharacterControllerContext);
  const modifier = createModifier('walking');

  useLayoutEffect(() => {
    addModifier(modifier);
    return () => removeModifier(modifier);
  }, [addModifier, modifier, removeModifier]);

  useUpdate(() => {
    if (!movement) return;

    const input = movement();
    const isWalking = getIsWalking();

    if (isWalking && input.length() > 0) {
      modifier.value.copy(input.multiplyScalar(speed));
    } else {
      modifier.value.set(0, 0, 0);
    }
  });

  return null;
}
