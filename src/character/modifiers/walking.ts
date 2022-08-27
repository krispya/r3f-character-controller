import { useUpdate } from '@react-three/fiber';
import { CharacterControllerContext } from 'character/contexts/character-controller-context';
import { useContext, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { createModifier } from './use-modifiers';

export const WALK_SPEED = 5;

export type WalkingProps = {
  speed?: number;
  movement?: () => THREE.Vector3;
};

export function Walking({ speed = WALK_SPEED, movement }: WalkingProps) {
  const { addModifier, removeModifier, getIsWalking, getGroundNormal } = useContext(CharacterControllerContext);
  const modifier = createModifier('walking');

  useLayoutEffect(() => {
    addModifier(modifier);
    return () => removeModifier(modifier);
  }, [addModifier, modifier, removeModifier]);

  const adjustVelocityToSlope = (velocity: THREE.Vector3) => {
    const normal = getGroundNormal();
    const slopeRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    const adjustedVelocity = new THREE.Vector3().copy(velocity).applyQuaternion(slopeRotation);

    if (adjustedVelocity.y < 0) {
      return adjustedVelocity;
    }

    return velocity;
  };

  useUpdate(() => {
    if (!movement) return;

    const input = movement();
    const isWalking = getIsWalking();

    if (isWalking && input.length() > 0) {
      const velocity = input.multiplyScalar(speed);
      velocity.copy(adjustVelocityToSlope(velocity));
      modifier.value.copy(velocity);
    } else {
      modifier.value.set(0, 0, 0);
    }
  });

  return null;
}
