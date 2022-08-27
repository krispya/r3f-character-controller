import { movementMachine } from 'character/machines/movement-machine';
import { Modifier } from 'character/modifiers/use-modifiers';
import { createContext } from 'react';
import { InterpreterFrom } from 'xstate';

type CharacterControllerState = {
  addModifier: (modifier: Modifier) => void;
  removeModifier: (modifier: Modifier) => void;
  fsm: InterpreterFrom<typeof movementMachine>;
  getDeltaVector: () => THREE.Vector3;
  getVelocity: () => THREE.Vector3;
  getIsGroundedMovement: () => boolean;
  getIsFalling: () => boolean;
  getIsWalking: () => boolean;
  getGroundNormal: () => THREE.Vector3;
};

export const CharacterControllerContext = createContext<CharacterControllerState>(null!);
