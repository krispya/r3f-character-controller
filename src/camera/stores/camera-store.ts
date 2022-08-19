import * as THREE from 'three';
import create from 'zustand';

interface CameraState {
  target: THREE.Object3D | null;
  setTarget: (target: THREE.Object3D) => void;
}

export const useCameraController = create<CameraState>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
}));
