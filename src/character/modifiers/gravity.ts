import { useUpdate } from '@react-three/fiber';
import { CharacterControllerContext } from 'character/contexts/character-controller-context';
import { useContext, useLayoutEffect, useState } from 'react';
import { createModifier } from './use-modifiers';

export type GravityProps = {
  gravity?: number;
  groundedGravity?: number;
  alwaysOn?: boolean;
  maxFallSpeed?: number;
};

export const GRAVITY = -9.81;

export function Gravity({
  gravity = GRAVITY,
  groundedGravity = 0,
  alwaysOn = false,
  maxFallSpeed = -50,
}: GravityProps) {
  const { addModifier, removeModifier, getIsGroundedMovement } = useContext(CharacterControllerContext);
  const modifier = createModifier('gravity');
  const [store] = useState({ prevIsGrounded: false });

  useLayoutEffect(() => {
    addModifier(modifier);
    return () => removeModifier(modifier);
  }, [addModifier, gravity, modifier, removeModifier]);

  useUpdate((_, delta) => {
    const isGrounded = getIsGroundedMovement();

    // Our isGrounded detection has an offset so the state sets early when falling.
    // We check the previous isGrounded so we get an extra frame of falling to make sure we touch the ground.
    if (store.prevIsGrounded) {
      modifier.value.y = alwaysOn ? gravity : groundedGravity;
    } else {
      modifier.value.y = Math.max(modifier.value.y + gravity * delta, maxFallSpeed);
    }

    store.prevIsGrounded = isGrounded;
  });

  return null;
}
