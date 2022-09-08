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
  autoUpdate?: boolean;
};

export function Collider({
  children,
  debug = { collider: false, bvh: false },
  simplify,
  autoUpdate = false,
}: ColliderProps) {
  const ref = useRef<THREE.Group>(null!);
  const [collider, setCollider] = useCollider((state) => [state.collider, state.setCollider]);
  const [bvhVisualizer, setBvhVisualizer] = useState<MeshBVHVisualizer | undefined>(undefined);
  const [store] = useState({
    init: true,
    boxMap: {} as Record<string, THREE.Box3>,
    prevBoxMap: {} as Record<string, THREE.Box3>,
    matrixMap: {} as Record<string, THREE.Matrix4>,
    prevMatrixMap: {} as Record<string, THREE.Matrix4>,
  });
  const _debug = debug === true ? { collider: true, bvh: false } : debug;

  const updateMaps = useCallback(
    (object: THREE.Object3D) => {
      if (object instanceof THREE.Group) {
        store.matrixMap[object.uuid] = object.matrix.clone();
      }
      if (object instanceof THREE.Mesh && object.geometry) {
        if (object.geometry.boundingBox === null) object.geometry.computeBoundingBox();
        store.boxMap[object.uuid] = object.geometry.boundingBox;
        store.matrixMap[object.uuid] = object.matrix.clone();
      }
    },
    [store],
  );

  const buildColliderGeometry = useCallback(() => {
    const geometries: THREE.BufferGeometry[] = [];

    // const box = new THREE.Box3();
    // box.setFromObject(ref.current);
    // box.getCenter(ref.current.position).negate();
    ref.current.updateMatrixWorld();

    // Traverse the child meshes so we can create a merged gemoetry for BVH calculations.
    ref.current.traverse((c) => {
      if (autoUpdate) updateMaps(c);
      if (c instanceof THREE.Mesh && c.geometry) {
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

    if (autoUpdate) {
      store.prevBoxMap = { ...store.boxMap };
      store.prevMatrixMap = { ...store.matrixMap };
    }

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
  }, [autoUpdate, simplify, store, updateMaps]);

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
    return () => {
      if (!collider) return;
      collider?.geometry.dispose();
      const material = collider?.material as THREE.Material;
      material.dispose();
    };
  }, [collider]);

  useUpdate(() => {
    if (!collider || !autoUpdate) return;

    store.boxMap = {};
    ref.current.traverse((c) => {
      if (c instanceof THREE.Group) {
        store.matrixMap[c.uuid] = c.matrix.clone();
      }
      if (c instanceof THREE.Mesh && c.geometry) {
        if (c.geometry.boundingBox === null) c.geometry.computeBoundingBox();
        store.boxMap[c.uuid] = c.geometry.boundingBox;
        store.matrixMap[c.uuid] = c.matrix.clone();
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

    for (const uuid in store.matrixMap) {
      const current = store.matrixMap[uuid];
      const prev = store.prevMatrixMap[uuid];

      if (current.equals(prev)) continue;

      console.log('Collider: Matrix changed. Rebuilding BVH.');
      rebuildBVH();
      store.prevMatrixMap = { ...store.matrixMap };
      break;
    }

    store.prevMatrixMap = { ...store.matrixMap };
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
