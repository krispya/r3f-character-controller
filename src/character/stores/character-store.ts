import { BoundingVolume } from 'character/bounding-volume/use-bounding-volume';
import create from 'zustand';

type CharacterState = {
  character: BoundingVolume | null;
  setCharacter: (character: BoundingVolume) => void;
};

export const useCharacterController = create<CharacterState>((set) => ({
  character: null,
  setCharacter: (character) => set({ character }),
}));
