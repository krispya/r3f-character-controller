import { useUpdate } from '@react-three/fiber';
import { CharacterControllerContext } from 'character/contexts/character-controller-context';
import { useContext, useLayoutEffect, useState } from 'react';
import * as THREE from 'three';
import { createModifier } from './use-modifiers';

export const DEFAULT_WALK_SPEED = 5;
const DEFAULT_MAX_ANGLE = 65;

export type WalkingProps = {
  speed?: number;
  movement?: () => THREE.Vector3;
  adjustToSlope?: boolean;
};

export function Walking({ speed = DEFAULT_WALK_SPEED, movement, adjustToSlope = true }: WalkingProps) {
  const { addModifier, removeModifier, getIsWalking, getGroundNormal } = useContext(CharacterControllerContext);
  const modifier = createModifier('walking');
  const [store] = useState({
    upVec: new THREE.Vector3(0, 1, 0),
    slopeRotation: new THREE.Quaternion(),
    adjustedVelocity: new THREE.Vector3(),
    input: new THREE.Vector3(),
  });

  useLayoutEffect(() => {
    addModifier(modifier);
    return () => removeModifier(modifier);
  }, [addModifier, modifier, removeModifier]);

  const adjustVelocityToSlope = (velocity: THREE.Vector3) => {
    const { slopeRotation, upVec, adjustedVelocity } = store;

    const normal = getGroundNormal();
    slopeRotation.setFromUnitVectors(upVec, normal);
    adjustedVelocity.copy(velocity).applyQuaternion(slopeRotation);

    // Push our velocity a little down so we stick to slopes better.
    adjustedVelocity.y -= 0.05;

    const radians = store.upVec.angleTo(normal);
    const angle = THREE.MathUtils.radToDeg(radians);

    if (adjustedVelocity.y < 0 && angle < DEFAULT_MAX_ANGLE) {
      return adjustedVelocity;
    }

    return velocity;
  };

  useUpdate(() => {
    if (!movement) return;
    const { input } = store;

    input.copy(movement());
    const isWalking = getIsWalking();

    if (isWalking && input.length() > 0) {
      const velocity = input.multiplyScalar(speed);
      if (adjustToSlope) velocity.copy(adjustVelocityToSlope(velocity));
      modifier.value.copy(velocity);
    } else {
      modifier.value.set(0, 0, 0);
    }
  });

  return null;
}
