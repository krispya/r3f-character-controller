import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Environment, Stars } from '@react-three/drei';
import { LayerMaterial, Color, Depth } from 'lamina';
import * as THREE from 'three';
import { Stages } from '../app';

export default function Space() {
  const depthRef = useRef<any>(null!);

  useFrame(({ clock }) => {
    if (depthRef.current) {
      depthRef.current.alpha = Math.sin(clock.elapsedTime * 0.1) * 0.4 + 0.4;
    }
  }, Stages.Update);

  return (
    <>
      <Environment frames={Infinity} background resolution={256}>
        <mesh scale={100}>
          <sphereGeometry args={[1, 64, 64]} />
          <LayerMaterial side={THREE.BackSide}>
            <Color color="#312a49" alpha={1} mode="normal" />
            <Depth
              ref={depthRef}
              colorA="hotpink"
              colorB="#447"
              alpha={0.8}
              mode="normal"
              near={0}
              far={300}
              origin={[100, 100, 100]}
            />
          </LayerMaterial>
        </mesh>
      </Environment>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
    </>
  );
}
