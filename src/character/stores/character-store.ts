import { BoundingVolume } from 'character/bounding-volume/use-bounding-volume';
import create from 'zustand';

type CharacterState = {
  character: BoundingVolume;
  setCharacter: (character: BoundingVolume) => void;
};

export const useCharacterController = create<CharacterState>((set) => ({
  character: new BoundingVolume(),
  setCharacter: (character) => set({ character }),
}));
