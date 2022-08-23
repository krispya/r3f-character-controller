import { characterMachine } from 'character/machines/character-machine';
import { Modifier } from 'character/modifiers/use-modifiers';
import { createContext } from 'react';
import { InterpreterFrom } from 'xstate';

type CharacterControllerState = {
  modifiers: Modifier[];
  addModifier: (modifier: Modifier) => void;
  removeModifier: (modifier: Modifier) => void;
  fsm: InterpreterFrom<typeof characterMachine>;
};

export const CharacterControllerContext = createContext<CharacterControllerState>(null!);
