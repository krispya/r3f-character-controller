import { useThree, useUpdate } from '@react-three/fiber';
import { Debug as DebugImpl } from 'debug/debug';
import { createContext, useContext } from 'react';
import * as THREE from 'three';

const DEBUG = new DebugImpl(new THREE.Scene());
export const getDebug = () => DEBUG;

export const DebugContext = createContext<DebugImpl>(DEBUG);

export function Debug({ children }: { children: React.ReactNode }) {
  const scene = useThree((state) => state.scene);
  DEBUG.scene = scene;

  useUpdate(() => {
    DEBUG.update();
  });

  return <DebugContext.Provider value={DEBUG}>{children}</DebugContext.Provider>;
}

export function useDebug() {
  return useContext(DebugContext);
}
