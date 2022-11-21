import create from 'zustand';

type PlayerState = {
  actions: any;
  setActions: (actions: any) => void;
};

export const usePlayer = create<PlayerState>((set) => ({
  actions: {},
  setActions: (actions: any) => set({ actions }),
}));
