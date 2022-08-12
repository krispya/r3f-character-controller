import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Stars } from '@react-three/drei';
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
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
    </>
  );
}
