import { useUpdate } from '@react-three/fiber';
import { CharacterControllerContext } from 'character/contexts/character-controller-context';
import { useContext, useLayoutEffect, useEffect, useRef } from 'react';
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
  const { modifiers, addModifier, removeModifier, fsm } = useContext(CharacterControllerContext);
  const isGrounded = useRef(false);
  const modifier = createModifier('gravity');

  useLayoutEffect(() => {
    addModifier(modifier);
    return () => removeModifier(modifier);
  }, [addModifier, gravity, modifier, modifiers, removeModifier]);

  useEffect(() => {
    const subscription = fsm.subscribe((state) => {
      isGrounded.current = state.matches('grounded');
    });
    return () => subscription.unsubscribe();
  }, [fsm]);

  useUpdate((_, delta) => {
    if (isGrounded.current) {
      modifier.value.y = alwaysOn ? gravity : groundedGravity;
    } else {
      modifier.value.y = Math.max(modifier.value.y + gravity * delta, maxFallSpeed);
    }
  });

  return null;
}
