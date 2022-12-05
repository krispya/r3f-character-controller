import * as THREE from 'three';

export type RayInfo = {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  distance: number;
};

export class RayHelper extends THREE.Line {
  public rayInfo: RayInfo;

  constructor(rayInfo: RayInfo) {
    const points = [];
    points.push(new THREE.Vector3().copy(rayInfo.origin));
    points.push(new THREE.Vector3().copy(rayInfo.origin).addScaledVector(rayInfo.direction, rayInfo.distance));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    super(geometry, new THREE.LineBasicMaterial({ color: 0x0000ff, toneMapped: false }));

    this.type = 'RayHelper';
    this.rayInfo = rayInfo;
  }

  updateMatrixWorld() {
    const points = [];
    points.push(new THREE.Vector3().copy(this.rayInfo.origin));
    points.push(
      new THREE.Vector3().copy(this.rayInfo.origin).addScaledVector(this.rayInfo.direction, this.rayInfo.distance),
    );
    this.geometry.setFromPoints(points);
  }

  dispose() {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
