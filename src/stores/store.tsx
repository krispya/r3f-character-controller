import * as THREE from 'three';
import create from 'zustand';

interface ColliderState {
  collider: THREE.Mesh | null;
  player: THREE.Object3D | null;
  setCollider: (collider: THREE.Mesh) => void;
  setPlayer: (player: THREE.Object3D) => void;
}

export const useStore = create<ColliderState>((set, get) => ({
  collider: null,
  player: null,
  setCollider: (collider) => set({ collider }),
  setPlayer: (player) => set({ player }),
}));
