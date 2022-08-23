import { useCallback, useState } from 'react';
import * as THREE from 'three';

export class Modifier {
  private _value: THREE.Vector3;

  constructor(x?: number, y?: number, z?: number) {
    this._value = new THREE.Vector3(x, y, z);
  }

  get value(): THREE.Vector3 {
    return this._value;
  }

  set value(value: THREE.Vector3) {
    this._value = value;
  }
}

export const createModifier = (x?: number, y?: number, z?: number) => new Modifier(x, y, z);

export function useModifiers() {
  const [modifiers] = useState<Modifier[]>([]);

  const addModifier = (modifier: Modifier) => modifiers.push(modifier);

  const removeModifier = useCallback(
    (modifier: Modifier) => {
      const index = modifiers.indexOf(modifier);
      if (index !== -1) modifiers.splice(index, 1);
    },
    [modifiers],
  );

  return { modifiers, addModifier, removeModifier };
}
