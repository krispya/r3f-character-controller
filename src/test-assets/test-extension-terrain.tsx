import { Box } from '@react-three/drei';

export function TestExtenstionTerrain() {
  return (
    <group position={[2, -2.8, -5.5]} rotation={[0, -0.15, 0]}>
      <Box args={[4, 0.5, 4]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Box args={[8, 0.25, 4]} position={[0, 0, -4]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Box args={[3.5, 0.5, 8]} position={[0, 1.625, -6]} rotation={[0, Math.PI / 2, Math.PI / 2]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Box args={[5, 0.25, 2]} position={[0, 1, -4.4]} rotation={[0, Math.PI / 2, 0.5]}>
        <meshStandardMaterial color="white" />
      </Box>
    </group>
  );
}
