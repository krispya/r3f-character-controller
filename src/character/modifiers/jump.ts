import { useUpdate } from '@react-three/fiber';
import { CharacterControllerContext } from 'character/contexts/character-controller-context';
import { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { GRAVITY } from './gravity';
import { createModifier } from './use-modifiers';

export type JumpProps = {
  jumpSpeed?: number;
  jump?: () => boolean;
  jumpDuration?: number;
  comebackAcceleration?: number;
};

export function Jump({ jumpSpeed = 6, jump, jumpDuration = 300, comebackAcceleration = GRAVITY * 2 }: JumpProps) {
  const { modifiers, addModifier, removeModifier, fsm, getDeltaVector } = useContext(CharacterControllerContext);
  const modifier = createModifier('jump');
  const [store] = useState({
    isRising: false,
    isGrounded: false,
    jumpBeingTime: 0,
    prevInput: false,
    inputReleased: true,
  });

  useLayoutEffect(() => {
    addModifier(modifier);
    return () => removeModifier(modifier);
  }, [addModifier, modifiers, modifier, removeModifier]);

  useEffect(() => {
    const subscription = fsm.subscribe((state) => {
      store.isGrounded = state.matches('grounded');
    });
    return () => subscription.unsubscribe();
  }, [fsm, store]);

  useEffect(() => {
    modifier.onJump = () => {
      store.isRising = true;
      store.jumpBeingTime = performance.now();
      modifier.value.set(0, jumpSpeed, 0);
    };
  }, [jumpSpeed, modifier, store]);

  useUpdate((_, delta) => {
    if (!jump) return;
    const jumpInput = jump();
    const deltaVector = getDeltaVector();
    if (store.prevInput && !jumpInput) store.inputReleased = true;

    if (store.isGrounded) {
      store.isRising = false;
      modifier.value.set(0, 0, 0);
    }

    if (jumpInput && store.isGrounded) {
      if (store.inputReleased) fsm.send('JUMP');
      store.inputReleased = false;
    }

    if (store.isRising && !jumpInput) store.isRising = false;

    if (store.isRising && performance.now() > store.jumpBeingTime + jumpDuration) store.isRising = false;

    if (!store.isRising && !store.isGrounded) modifier.value.y += comebackAcceleration * delta;

    if (deltaVector.normalize().y < -0.9) modifier.value.y = 0;

    store.prevInput = jumpInput;
  });

  return null;
}
