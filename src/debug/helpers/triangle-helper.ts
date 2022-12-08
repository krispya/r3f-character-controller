import { DebugMaterialOptions } from 'debug/debug';
import * as THREE from 'three';

export type TriangleDebugOptions = { winZFight: boolean } & DebugMaterialOptions;

export class TriangleHelper extends THREE.Mesh {
  public triangle: THREE.Triangle;
  public winZFight: boolean;

  private a: THREE.Vector3;
  private b: THREE.Vector3;
  private c: THREE.Vector3;
  private normal: THREE.Vector3;

  constructor(triangle: THREE.Triangle, options?: TriangleDebugOptions) {
    const a = new THREE.Vector3().copy(triangle.a);
    const b = new THREE.Vector3().copy(triangle.b);
    const c = new THREE.Vector3().copy(triangle.c);
    const normal = new THREE.Vector3();
    triangle.getNormal(normal);

    if (options?.winZFight) {
      a.addScaledVector(normal, 0.001);
      b.addScaledVector(normal, 0.001);
      c.addScaledVector(normal, 0.001);
    }

    const points = [a, b, c];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.MeshBasicMaterial({
      color: options?.color ?? 0x0000ff,
      toneMapped: false,
      depthTest: !options?.alwaysOnTop ?? true,
      opacity: options?.opacity ?? 1,
      transparent: options?.opacity && options?.opacity < 1 ? true : false,
      fog: options?.fog ?? true,
    });

    super(geometry, material);

    this.type = 'TriangleHelper';

    this.triangle = triangle;
    this.a = a;
    this.b = b;
    this.c = c;
    this.normal = normal;
    this.winZFight = options?.winZFight ?? false;
  }

  set(triangle: THREE.Triangle) {
    this.triangle = triangle;
    this.a.copy(triangle.a);
    this.b.copy(triangle.b);
    this.c.copy(triangle.c);

    if (this.winZFight) {
      this.a.addScaledVector(this.normal, 0.001);
      this.b.addScaledVector(this.normal, 0.001);
      this.c.addScaledVector(this.normal, 0.001);
    }
  }

  setMaterial(options: DebugMaterialOptions) {
    const material = this.material as THREE.MeshBasicMaterial;
    if (options.color) material.color.set(options.color);
    if (options.alwaysOnTop) material.depthTest = !options.alwaysOnTop;
    if (options.opacity) {
      material.opacity = options.opacity;
      material.transparent = options.opacity && options.opacity < 1 ? true : false;
    }
    if (options.fog) material.fog = options.fog;
  }

  updateMatrixWorld() {
    const points = [this.a, this.b, this.c];
    this.geometry.setFromPoints(points);
  }

  dispose() {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}

export class WireTriangleHelper extends THREE.LineSegments {
  public triangle: THREE.Triangle;

  constructor(triangle: THREE.Triangle, options?: DebugMaterialOptions) {
    const points = [triangle.a, triangle.b, triangle.c];
    const geometry = new THREE.BufferGeometry().setFromPoints(points).setIndex([0, 1, 1, 2, 2, 0]);
    const material = new THREE.LineBasicMaterial({
      color: options?.color ?? 0x0000ff,
      toneMapped: false,
      depthTest: !options?.alwaysOnTop ?? true,
      opacity: options?.opacity ?? 1,
      transparent: options?.opacity && options?.opacity < 1 ? true : false,
      fog: options?.fog ?? true,
    });

    super(geometry, material);

    this.type = 'WireTriangleHelper';
    this.triangle = triangle;
  }

  set(triangle: THREE.Triangle) {
    this.triangle = triangle;
  }

  setMaterial(options: DebugMaterialOptions) {
    const material = this.material as THREE.LineBasicMaterial;
    if (options.color) material.color.set(options.color);
    if (options.alwaysOnTop) material.depthTest = !options.alwaysOnTop;
    if (options.opacity) {
      material.opacity = options.opacity;
      material.transparent = options.opacity && options.opacity < 1 ? true : false;
    }
    if (options.fog) material.fog = options.fog;
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
