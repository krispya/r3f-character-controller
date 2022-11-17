export class HitInfo {
  public collider: THREE.Object3D;
  public point: THREE.Vector3;
  public location: THREE.Vector3;
  public normal: THREE.Vector3;
  public distance: number;

  constructor(
    collider: THREE.Object3D,
    point: THREE.Vector3,
    location: THREE.Vector3,
    normal: THREE.Vector3,
    distance: number,
  ) {
    this.collider = collider;
    this.point = point;
    this.location = location;
    this.normal = normal;
    this.distance = distance;
  }
}
