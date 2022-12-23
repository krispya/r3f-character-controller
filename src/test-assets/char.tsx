import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { GLTF } from 'three-stdlib';
import { usePlayer } from 'player/player-store';

type GLTFResult = GLTF & {
  nodes: {
    Body: THREE.SkinnedMesh;
    Hips: THREE.Bone;
  };
  materials: {
    ['combined_material_9554669693.001']: THREE.MeshStandardMaterial;
  };
};

// type ActionName = 'Dance 1' | 'Pose 1' | 'Walking';
// type GLTFActions = Record<ActionName, THREE.AnimationAction>;

export function Char(props: JSX.IntrinsicElements['group']) {
  const group = useRef<THREE.Group>(null!);
  // @ts-ignore
  const { nodes, materials, animations } = useGLTF('/char.glb') as GLTFResult;
  const { actions } = useAnimations<any>(animations, group);

  const setActions = usePlayer((state) => state.setActions);

  console.log('actions:', actions);

  useEffect(() => {
    setActions(actions);
  }, [setActions, actions]);

  return (
    <group ref={group} {...props} dispose={null} scale={0.006}>
      s
      <group name="Scene">
        <group name="root" position={[-1.02, -0.16, -1.7]} rotation={[0.03, 0.03, -0.01]} scale={0.01}>
          <primitive object={nodes.rootx} />
          <group name="Shirt001">
            <skinnedMesh
              name="6s-mesh-sktchfb004"
              geometry={nodes['6s-mesh-sktchfb004'].geometry}
              material={materials['light-skin-mat.001']}
              skeleton={nodes['6s-mesh-sktchfb004'].skeleton}
              receiveShadow
              castShadow
            />
            <skinnedMesh
              name="6s-mesh-sktchfb004_1"
              geometry={nodes['6s-mesh-sktchfb004_1'].geometry}
              material={materials['white-mat.003']}
              skeleton={nodes['6s-mesh-sktchfb004_1'].skeleton}
              receiveShadow
              castShadow
            />
            <skinnedMesh
              name="6s-mesh-sktchfb004_2"
              geometry={nodes['6s-mesh-sktchfb004_2'].geometry}
              material={materials['Material.014']}
              skeleton={nodes['6s-mesh-sktchfb004_2'].skeleton}
              receiveShadow
              castShadow
            />
            <skinnedMesh
              name="6s-mesh-sktchfb004_3"
              geometry={nodes['6s-mesh-sktchfb004_3'].geometry}
              material={materials['Material.004']}
              skeleton={nodes['6s-mesh-sktchfb004_3'].skeleton}
              receiveShadow
              castShadow
            />
            <skinnedMesh
              name="6s-mesh-sktchfb004_4"
              geometry={nodes['6s-mesh-sktchfb004_4'].geometry}
              material={materials['white-mat.001']}
              skeleton={nodes['6s-mesh-sktchfb004_4'].skeleton}
              receiveShadow
              castShadow
            />
            <skinnedMesh
              name="6s-mesh-sktchfb004_5"
              geometry={nodes['6s-mesh-sktchfb004_5'].geometry}
              material={materials['light-gray-mat.001']}
              skeleton={nodes['6s-mesh-sktchfb004_5'].skeleton}
              receiveShadow
              castShadow
            />
            <skinnedMesh
              name="6s-mesh-sktchfb004_6"
              geometry={nodes['6s-mesh-sktchfb004_6'].geometry}
              material={materials['Material.011']}
              skeleton={nodes['6s-mesh-sktchfb004_6'].skeleton}
              receiveShadow
              castShadow
            />
            <skinnedMesh
              name="6s-mesh-sktchfb004_7"
              geometry={nodes['6s-mesh-sktchfb004_7'].geometry}
              material={materials['Material.009']}
              skeleton={nodes['6s-mesh-sktchfb004_7'].skeleton}
              receiveShadow
              castShadow
            />
            <skinnedMesh
              name="6s-mesh-sktchfb004_8"
              geometry={nodes['6s-mesh-sktchfb004_8'].geometry}
              material={materials['Material.001']}
              skeleton={nodes['6s-mesh-sktchfb004_8'].skeleton}
              receiveShadow
              castShadow
            />
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload('/char.glb');
