import { Character } from 'character/character-controller';
import create from 'zustand';

type CharacterState = {
  characters: Map<string, Character>;
  setCharacter: (id: string, character: Character) => void;
};

export const useCharacterController = create<CharacterState>((set) => ({
  characters: new Map(),
  setCharacter: (id, character) => set((state) => ({ characters: state.characters.set(id, character) })),
}));
