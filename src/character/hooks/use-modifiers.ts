import { useCallback, useState } from 'react';
import * as THREE from 'three';

export type Modifier = THREE.Vector3;

export function useModifiers() {
  const [modifiers] = useState<Modifier[]>([]);
  const addModifier = useCallback((modifier: Modifier) => modifiers.push(modifier), [modifiers]);
  const removeModifier = useCallback(
    (modifier: Modifier) => {
      const index = modifiers.indexOf(modifier);
      if (index !== -1) modifiers.splice(index, 1);
    },
    [modifiers],
  );

  return { modifiers, addModifier, removeModifier };
}
