import { BoundingVolume } from 'character/hooks/use-bounding-volume';
import create from 'zustand';

type CharacterState = {
  character: BoundingVolume;
  setCharacter: (character: BoundingVolume) => void;
};

export const useCharacterController = create<CharacterState>((set) => ({
  character: new BoundingVolume(),
  setCharacter: (character) => set({ character }),
}));
