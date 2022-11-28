import { useUpdate } from '@react-three/fiber';
import { CharacterControllerContext } from 'character/contexts/character-controller-context';
import { useContext, useLayoutEffect } from 'react';
import { createModifier } from './use-modifiers';

export type GravityProps = {
  gravity?: number;
  maxFallSpeed?: number;
};

export const GRAVITY = -9.81;

export function Gravity({ gravity = GRAVITY, maxFallSpeed = -30 }: GravityProps) {
  const { addModifier, removeModifier, getIsGroundedMovement, getIsSliding } = useContext(CharacterControllerContext);
  const modifier = createModifier('gravity');

  useLayoutEffect(() => {
    addModifier(modifier);
    return () => removeModifier(modifier);
  }, [addModifier, gravity, modifier, removeModifier]);

  useUpdate((_, delta) => {
    const isGrounded = getIsGroundedMovement();
    const isSliding = getIsSliding();

    if (isGrounded) {
      if (isSliding) modifier.value.y = Math.max(modifier.value.y + gravity * delta, maxFallSpeed);
      else modifier.value.y = 0;
    } else {
      modifier.value.y = Math.max(modifier.value.y + gravity * delta, maxFallSpeed);
    }
  });

  return null;
}
