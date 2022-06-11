import { useHelper } from '@react-three/drei'
import { useRef } from 'react'
import { BoxHelper } from 'three'

export function Player() {
  const playerRef = useRef(null)
  useHelper(playerRef, BoxHelper)

  return (
    <mesh ref={playerRef}>
      <capsuleBufferGeometry ref={(ref) => ref?.translate(0, -0.65 / 2, 0)} args={[0.5, 0.65, 8, 16]} />
      <meshStandardMaterial />
    </mesh>
  )
}
