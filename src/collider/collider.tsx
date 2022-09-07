import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useCollider } from 'collider/stores/collider-store';
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
  MeshBVH,
  MeshBVHVisualizer,
  SAH,
} from 'three-mesh-bvh';
import * as THREE from 'three';
// @ts-ignore // Using our own SimplifyModifier to fix a bug.
import { SimplifyModifier } from './SimplifyModifier';
import { useUpdate } from '@react-three/fiber';

type ColliderProps = {
  children: React.ReactNode;
  debug?: boolean | { collider?: boolean; bvh?: boolean };
  simplify?: number;
};

export function Collider({ children, debug = { collider: false, bvh: false }, simplify }: ColliderProps) {
  const ref = useRef<THREE.Group>(null!);
  const [collider, setCollider] = useCollider((state) => [state.collider, state.setCollider]);
  const [bvhVisualizer, setBvhVisualizer] = useState<MeshBVHVisualizer | undefined>(undefined);
  const [store] = useState({
    init: true,
    boxMap: {} as Record<string, THREE.Box3>,
    prevBoxMap: {} as Record<string, THREE.Box3>,
  });
  const _debug = debug === true ? { collider: true, bvh: false } : debug;

  const buildColliderGeometry = useCallback(() => {
    const geometries: THREE.BufferGeometry[] = [];
    // This is more imporant than it seems. We want to make sure our geometry is centered with the Box3
    // to avoid floating point precision headaches.
    // const box = new THREE.Box3();
    // box.setFromObject(ref.current);
    // box.getCenter(ref.current.position).negate();
    ref.current.updateMatrixWorld();

    // Traverse the child meshes so we can create a merged gemoetry for BVH calculations.
    ref.current.traverse((c) => {
      if (c instanceof THREE.Mesh && c.geometry) {
        // Make sure all bounding boxes are computed.
        if (c.geometry.boundingBox === null) c.geometry.computeBoundingBox();
        store.boxMap[c.uuid] = c.geometry.boundingBox;
        const cloned = c.geometry.clone();
        cloned.applyMatrix4(c.matrixWorld);
        // All attributes except position so that the geometry can be safely merged.
        for (const key in cloned.attributes) {
          if (key !== 'position') {
            cloned.deleteAttribute(key);
          }
        }
        geometries.push(cloned);
      }
    });

    store.prevBoxMap = { ...store.boxMap };

    // Merge the geometry.
    let merged = BufferGeometryUtils.mergeBufferGeometries(geometries, false);
    merged = BufferGeometryUtils.mergeVertices(merged);

    // Simplify the geometry for better performance.
    if (simplify) {
      const modifier = new SimplifyModifier();
      const count = Math.floor(merged.attributes.position.count * simplify);
      merged = modifier.modify(merged, count);
    }

    return merged;
  }, [simplify, store]);

  const rebuildBVH = useCallback(() => {
    const merged = buildColliderGeometry();
    collider?.geometry.dispose();
    collider?.geometry.copy(merged);
    collider?.geometry.computeBoundsTree();
  }, [buildColliderGeometry, collider?.geometry]);

  // Initialization of BVH collider.
  useEffect(() => {
    if (!ref.current || !store.init) return;

    const merged = buildColliderGeometry();
    merged.boundsTree = new MeshBVH(merged, { strategy: SAH });

    const collider = new THREE.Mesh(
      merged,
      new THREE.MeshBasicMaterial({
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    collider.raycast = acceleratedRaycast;
    collider.geometry.computeBoundsTree = computeBoundsTree;
    collider.geometry.disposeBoundsTree = disposeBoundsTree;

    setCollider(collider);

    store.init = false;
  }, [buildColliderGeometry, setCollider, store]);

  // Initialization of BVH visualizer.
  useEffect(() => {
    if (collider) {
      const visualizer = new MeshBVHVisualizer(collider, 10);
      setBvhVisualizer(visualizer);
    }
  }, [collider]);

  // Dispose of the BVH if we unmount.
  useEffect(() => {
    return () => collider?.geometry.disposeBoundsTree();
  }, [collider?.geometry]);

  useUpdate(() => {
    if (!collider) return;

    store.boxMap = {};
    ref.current.traverse((c) => {
      if (c instanceof THREE.Mesh && c.geometry) {
        if (c.geometry.boundingBox === null) c.geometry.computeBoundingBox();
        store.boxMap[c.uuid] = c.geometry.boundingBox;
      }
    });

    if (Object.keys(store.boxMap).length !== Object.keys(store.prevBoxMap).length) {
      console.log('Collider: Meshes changed. Rebuilding BVH.');
      rebuildBVH();
      store.prevBoxMap = { ...store.boxMap };
      return;
    }

    for (const uuid in store.boxMap) {
      const current = store.boxMap[uuid];
      const prev = store.prevBoxMap[uuid];

      if (current.equals(prev)) continue;

      console.log('Collider: Mesh changed. Rebuilding BVH.');
      rebuildBVH();
      store.prevBoxMap = { ...store.boxMap };
      break;
    }

    store.prevBoxMap = { ...store.boxMap };
  });

  return (
    <>
      <group ref={ref}>{children}</group>
      {_debug && collider && <primitive visible={_debug.collider} object={collider} />}
      {_debug && bvhVisualizer && <primitive visible={_debug.bvh} object={bvhVisualizer} />}
    </>
  );
}
