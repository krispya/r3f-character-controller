import React, { useEffect, useRef, useState } from 'react';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useStore } from './store';
import { MeshBVH, MeshBVHVisualizer } from 'three-mesh-bvh';
import * as THREE from 'three';

type ColliderProps = {
  children: React.ReactNode;
};

export function Collider({ children }: ColliderProps) {
  const ref = useRef<THREE.Group>(null!);
  const [collider, setCollider] = useStore((state) => [state.collider, state.setCollider]);
  const [visualizer, setVisualizer] = useState<MeshBVHVisualizer | undefined>(undefined);
  const init = useRef(true);

  useEffect(() => {
    if (!ref.current) return;
    if (!init.current) return;
    const geometries: THREE.BufferGeometry[] = [];

    // Force a matrix world update to make are all calculations are synchronized
    ref.current.updateMatrixWorld();

    // Traverse the child meshes so we can create a merged gemoetry for BVH calculations.
    ref.current.traverse((c) => {
      // Only the gemoetry is relevant here
      if (c instanceof THREE.Mesh && c.geometry) {
        // Clone the geometry so it can safely be modified
        const cloned = c.geometry.clone();
        // Start by applying the world matrix of its parent for scale, rotation, translation, etc.
        cloned.applyMatrix4(c.matrixWorld);
        // All attributes except position so that the geometry can be safely merged
        for (const key in cloned.attributes) {
          if (key !== 'position') {
            cloned.deleteAttribute(key);
          }
        }
        geometries.push(cloned);
      }
    });
    // Create and store a local copy of the merged geometry
    const merged = BufferGeometryUtils.mergeBufferGeometries(geometries, false);
    // Create a BVH for the geometry
    merged.boundsTree = new MeshBVH(merged);
    // Create and store a mesh with BVH. We add a wireframe material for debugging
    const collider = new THREE.Mesh(merged);
    if (collider.material instanceof THREE.MeshBasicMaterial) {
      collider.material.wireframe = true;
      collider.material.opacity = 0.5;
      collider.material.transparent = true;
    }
    setCollider(collider);
    // Set flag so we don't init our BVH more than once
    init.current = false;
  }, [setCollider]);

  useEffect(() => {
    if (collider) {
      const visualizer = new MeshBVHVisualizer(collider, 10);
      setVisualizer(visualizer);
    }
  }, [collider]);

  return (
    <>
      <group ref={ref}>
        <group visible={true}>{children}</group>
      </group>
      {collider && <primitive visible={false} object={collider} />}
      {visualizer && <primitive visible={false} object={visualizer} />}
    </>
  );
}
