export function createCapsuleVertices(radius = 1, halfHeight = 1, degrees = 30) {
  const points = [];

  // Left half circle
  for (let i = 0; i <= degrees; i++) {
    points.push(Math.cos(i * (Math.PI / degrees)) * radius, Math.sin(i * (Math.PI / degrees)) * radius + halfHeight, 0);
  }

  // Right half circle
  for (let i = 0; i <= degrees; i++) {
    points.push(
      -Math.cos(i * (Math.PI / degrees)) * radius,
      -Math.sin(i * (Math.PI / degrees)) * radius - halfHeight,
      0,
    );
  }

  // Closing point
  points.push(points[0], points[1], points[2]);

  return points;
}
