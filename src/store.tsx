import { Mesh } from 'three'
import create from 'zustand'

interface ColliderState {
  collider: Mesh | null
  setCollider: (collider: Mesh) => void
}

export const useStore = create<ColliderState>((set, get) => ({
  collider: null,
  setCollider: (collider) => set({ collider })
}))
