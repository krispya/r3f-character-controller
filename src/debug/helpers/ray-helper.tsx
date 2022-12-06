import * as THREE from 'three';

export type RayInfo = {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  distance: number;
};

export class RayHelper extends THREE.Line {
  public rayInfo: RayInfo;
  private end: THREE.Vector3;

  constructor(rayInfo: RayInfo) {
    const end = new THREE.Vector3().copy(rayInfo.origin).addScaledVector(rayInfo.direction, rayInfo.distance);
    const geometry = new THREE.BufferGeometry().setFromPoints([rayInfo.origin, end]);

    super(geometry, new THREE.LineBasicMaterial({ color: 0x0000ff, toneMapped: false }));

    this.type = 'RayHelper';
    this.rayInfo = rayInfo;
    this.end = end;
  }

  set(rayInfo: RayInfo) {
    this.rayInfo = rayInfo;
  }

  updateMatrixWorld() {
    this.end.copy(this.rayInfo.origin).addScaledVector(this.rayInfo.direction, this.rayInfo.distance);
    this.geometry.setFromPoints([this.rayInfo.origin, this.end]);
  }

  dispose() {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
