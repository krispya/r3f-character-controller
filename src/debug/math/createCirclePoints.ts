import { createCapsuleVertices } from './createCapsulePoints';

export function createCircleVertices(radius = 1, degrees = 30) {
  return createCapsuleVertices(radius, 0, degrees);
}
