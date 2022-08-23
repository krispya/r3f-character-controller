import { CharacterControllerContext } from 'character/contexts/character-controller-context';
import { useContext, useLayoutEffect } from 'react';
import { createModifier } from './use-modifiers';

type GravityProps = {
  gravity?: number;
};

const GRAVITY = -9.81;

export function Gravity({ gravity = GRAVITY }: GravityProps) {
  const { modifiers, addModifier, removeModifier } = useContext(CharacterControllerContext);

  useLayoutEffect(() => {
    const modifier = createModifier(0, gravity, 0);
    addModifier(modifier);
    return () => removeModifier(modifier);
  }, [addModifier, gravity, modifiers, removeModifier]);

  return null;
}
