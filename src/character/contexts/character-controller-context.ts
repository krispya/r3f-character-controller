import { Modifier } from 'character/modifiers/use-modifiers';
import { createContext } from 'react';

type CharacterControllerState = {
  modifiers: Modifier[];
  addModifier: (modifier: Modifier) => void;
  removeModifier: (modifier: Modifier) => void;
};

export const CharacterControllerContext = createContext<CharacterControllerState>(null!);
