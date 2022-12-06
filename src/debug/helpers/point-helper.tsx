import * as THREE from 'three';

export class PointHelper extends THREE.Mesh {
  public point: THREE.Vector3;
  public _radius: number;

  constructor(point: THREE.Vector3, radius = 0.03) {
    const geometry = new THREE.SphereGeometry(radius, 7, 7);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    super(geometry, material);

    this.type = 'PointHelper';
    this.point = point;
    this._radius = radius;

    this.position.copy(point);
  }

  get radius() {
    return this._radius;
  }

  set radius(value) {
    this._radius = value;
    this.geometry.copy(new THREE.SphereGeometry(value, 7, 7));
  }

  updateMatrixWorld() {
    this.position.copy(this.point);
    super.updateMatrixWorld();
  }

  dispose() {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
