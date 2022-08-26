import { useUpdate } from '@react-three/fiber';
import { CharacterControllerContext } from 'character/contexts/character-controller-context';
import { useContext, useLayoutEffect, useRef, useEffect } from 'react';
import { createModifier } from './use-modifiers';

export function AirCollision() {
  const { modifiers, addModifier, removeModifier, fsm, getDeltaVector, getVelocity } =
    useContext(CharacterControllerContext);
  const modifier = createModifier('air-collision');
  const isGrounded = useRef(false);

  useLayoutEffect(() => {
    addModifier(modifier);
    return () => removeModifier(modifier);
  }, [addModifier, modifiers, removeModifier, modifier]);

  useEffect(() => {
    const subscription = fsm.subscribe((state) => {
      isGrounded.current = state.matches('grounded');
    });
    return () => subscription.unsubscribe();
  }, [fsm]);

  useUpdate(() => {
    // Reflect velocity if character collides while airborne.
    if (!isGrounded.current) {
      const velocity = getVelocity();
      const deltaVector = getDeltaVector();

      deltaVector.normalize();
      deltaVector.multiplyScalar(-deltaVector.dot(velocity));
      modifier.value.copy(deltaVector);
    } else {
      modifier.value.set(0, 0, 0);
    }
  });

  return null;
}
