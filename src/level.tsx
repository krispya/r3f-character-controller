import { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Collider } from './collider';

export function Level(props: any) {
  const group = useRef();
  const { nodes, materials }: any = useGLTF('/jungle-merged.glb');
  return (
    <group ref={group} {...props} dispose={null}>
      <group position={[2.84, -1.08, 2.73]} scale={0.03}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Sphere001.geometry}
          material={nodes.Sphere001.material}
          position={[1.24, -4.68, 2.42]}
          rotation={[-2.6, -0.35, -2.81]}
          scale={[0.87, 0.87, 0.87]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Cylinder031.geometry}
          material={nodes.Cylinder031.material}
          position={[2.89, 1.45, -1.54]}
          rotation={[1.7, 0.03, 2.99]}
          scale={[0.49, 0.49, 0.49]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Cylinder034.geometry}
          material={nodes.Cylinder034.material}
          position={[-0.48, 2.57, 1.03]}
          rotation={[1.69, -0.05, 2.34]}
          scale={[0.49, 0.49, 0.49]}
        />
      </group>
      <group position={[0.14, -1.96, -1.29]} rotation={[1.98, -1.38, 2.08]} scale={[0.02, 0.02, 0.02]}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Sphere002.geometry}
          material={nodes.Sphere002.material}
          position={[1.24, -4.68, 2.42]}
          rotation={[-2.6, -0.35, -2.81]}
          scale={[0.87, 0.87, 0.87]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Cylinder035.geometry}
          material={nodes.Cylinder035.material}
          position={[2.89, 1.45, -1.54]}
          rotation={[1.7, 0.03, 2.99]}
          scale={[0.49, 0.49, 0.49]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Cylinder036.geometry}
          material={nodes.Cylinder036.material}
          position={[-0.48, 2.57, 1.03]}
          rotation={[1.69, -0.05, 2.34]}
          scale={[0.49, 0.49, 0.49]}
        />
      </group>
      <group position={[-2.4, -1.7, -1.83]} rotation={[0, -0.54, 0]} scale={0.03}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Plane981.geometry}
          material={nodes.Plane981.material}
          position={[-2.18, 0.93, -4.74]}
          rotation={[-Math.PI, 0.54, -Math.PI]}
          scale={[0.74, 0.89, 0.74]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Plane984.geometry}
          material={nodes.Plane984.material}
          position={[4.36, 0.93, 3.56]}
          rotation={[0, 1.1, 0]}
          scale={[0.74, 0.89, 0.74]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Plane977.geometry}
          material={nodes.Plane977.material}
          position={[1.32, 0.27, 6.39]}
          rotation={[0, -1.15, 0]}
          scale={[2.73, 1.96, 1.96]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Plane979.geometry}
          material={nodes.Plane979.material}
          position={[3.21, -1.16, 5.87]}
          rotation={[0, -0.95, -0.26]}
          scale={[2.73, 1.96, 1.96]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Plane980.geometry}
          material={nodes.Plane980.material}
          position={[3.68, -1.16, -1.6]}
          rotation={[0, 0.27, -0.26]}
          scale={[2.73, 1.96, 1.96]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Plane982.geometry}
          material={nodes.Plane982.material}
          position={[-1.18, -1.16, -6.91]}
          rotation={[0, 1.07, -0.26]}
          scale={[2.73, 1.96, 1.96]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Plane985.geometry}
          material={nodes.Plane985.material}
          position={[6.29, -1.16, 2.28]}
          rotation={[0, 0.02, -0.26]}
          scale={[2.73, 1.96, 1.96]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Plane986.geometry}
          material={nodes.Plane986.material}
          position={[-4.95, -1.16, -9.76]}
          rotation={[0, 1.19, -0.26]}
          scale={[2.73, 1.96, 1.96]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Plane987.geometry}
          material={nodes.Plane987.material}
          position={[-0.69, -1.16, 0.25]}
          rotation={[0, -0.69, -0.26]}
          scale={[2.73, 1.96, 1.96]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Plane976.geometry}
          material={nodes.Plane976.material}
          position={[2.92, 1.64, -1.01]}
          rotation={[-0.11, 0.14, 0.6]}
          scale={[2.02, 1.45, 1.45]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Plane978.geometry}
          material={nodes.Plane978.material}
          position={[0.03, -0.63, -3.57]}
          rotation={[-0.28, 0.75, 0.42]}
          scale={[2.02, 1.45, 1.45]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Plane983.geometry}
          material={nodes.Plane983.material}
          position={[3.99, -0.63, 4.99]}
          rotation={[-0.21, -0.27, 0.16]}
          scale={[2.02, 1.45, 1.45]}
        />
      </group>
      <Collider>
        <group position={[-0.05, -2.02, -0.06]} scale={0.03}>
          <mesh castShadow receiveShadow geometry={nodes.Mesh725.geometry} material={materials['Material #34']} />
          <mesh castShadow receiveShadow geometry={nodes.Mesh725_1.geometry} material={materials['Material #38']} />
          <mesh castShadow receiveShadow geometry={nodes.Mesh725_2.geometry} material={nodes.Mesh725_2.material} />
          <mesh castShadow receiveShadow geometry={nodes.Mesh725_3.geometry} material={materials['Material #39']} />
          <mesh castShadow receiveShadow geometry={nodes.Mesh725_4.geometry} material={materials['Material #31']} />
          <mesh castShadow receiveShadow geometry={nodes.Mesh725_5.geometry} material={materials['Material #311']} />
          <mesh castShadow receiveShadow geometry={nodes.Mesh725_6.geometry} material={nodes.Mesh725_6.material} />
          <mesh castShadow receiveShadow geometry={nodes.Mesh725_7.geometry} material={materials['Material #37']} />
          <mesh castShadow receiveShadow geometry={nodes.Mesh725_8.geometry} material={materials['Material #36']} />
          <mesh castShadow receiveShadow geometry={nodes.Mesh725_9.geometry} material={materials['Material #42']} />
          <mesh castShadow receiveShadow geometry={nodes.Mesh725_10.geometry} material={materials['Material #44']} />
        </group>
      </Collider>
      <group position={[2.7, -1.63, 0.35]} rotation={[Math.PI, -0.41, Math.PI]} scale={[0.03, 0.03, 0.03]}>
        <mesh castShadow receiveShadow geometry={nodes.Mesh1331.geometry} material={materials['Material #35.001']} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh1331_1.geometry} material={materials['Material #38.001']} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh1331_2.geometry} material={materials['Material #33.001']} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh1331_3.geometry} material={materials['Material #32.001']} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh1331_4.geometry} material={materials['Material #288.001']} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh1331_5.geometry} material={materials['Material #26.001']} />
      </group>
    </group>
  );
}

useGLTF.preload('/jungle-merged.glb');
