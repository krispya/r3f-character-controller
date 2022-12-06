import * as THREE from 'three';

export type RayInfo = {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  distance: number;
};

export class TriangleHelper extends THREE.LineSegments {
  public triangle: THREE.Triangle;

  constructor(triangle: THREE.Triangle) {
    const points = [triangle.a, triangle.b, triangle.c];
    const geometry = new THREE.BufferGeometry().setFromPoints(points).setIndex([0, 1, 1, 2, 2, 0]);
    const material = new THREE.LineBasicMaterial({
      color: 0x0000ff,
      toneMapped: false,
      depthTest: false,
      opacity: 0.15,
      transparent: true,
    });

    super(geometry, material);

    this.type = 'TriangleHelper';
    this.triangle = triangle;
  }

  set(triangle: THREE.Triangle) {
    this.triangle = triangle;
  }

  setMaterial(color?: THREE.ColorRepresentation, depthTest?: boolean) {
    const material = this.material as THREE.LineBasicMaterial;
    if (color) material.color.set(color);
    if (depthTest) material.depthTest = depthTest;
  }

  updateMatrixWorld() {
    const points = [this.triangle.a, this.triangle.b, this.triangle.c];
    this.geometry.setFromPoints(points);
  }

  dispose() {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
