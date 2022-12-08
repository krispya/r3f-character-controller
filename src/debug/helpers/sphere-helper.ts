import * as THREE from 'three';
import { DebugMaterialOptions } from 'debug/debug';
import { createCircleVertices } from 'debug/math/createCirclePoints';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface SphereInterface {
  center: THREE.Vector3;
  radius: number;
}

export class SphereHelper extends THREE.Mesh {
  public sphere: SphereInterface;

  constructor(sphere: SphereInterface, options?: DebugMaterialOptions) {
    const geometry = new THREE.SphereGeometry(sphere.radius, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: options?.color ?? 0x0000ff,
      toneMapped: false,
      depthTest: !options?.alwaysOnTop ?? true,
      opacity: options?.opacity ?? 1,
      transparent: options?.opacity && options?.opacity < 1 ? true : false,
      fog: options?.fog ?? true,
    });

    super(geometry, material);

    this.type = 'SphereHelper';
    this.sphere = sphere;
    this.position.copy(sphere.center);
  }

  set(sphere: SphereInterface) {
    this.sphere = sphere;
    const geometry = new THREE.SphereGeometry(sphere.radius, 8, 8);
    this.geometry.copy(geometry);
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
    this.position.copy(this.sphere.center);
    super.updateMatrixWorld();
  }

  dispose() {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}

export class WireSphereHelper extends THREE.Line {
  public sphere: SphereInterface;

  constructor(sphere: SphereInterface, options?: DebugMaterialOptions) {
    const vertices = new Float32Array(createCircleVertices(sphere.radius));
    const geometryA = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const geometryB = geometryA.clone().rotateY(Math.PI / 2);
    const geometryC = geometryA.clone().rotateX(Math.PI / 2);

    const merged = BufferGeometryUtils.mergeBufferGeometries([geometryA, geometryC, geometryB]);

    const material = new THREE.LineBasicMaterial({
      color: options?.color ?? 0x0000ff,
      toneMapped: false,
      depthTest: !options?.alwaysOnTop ?? true,
      opacity: options?.opacity ?? 1,
      transparent: options?.opacity && options?.opacity < 1 ? true : false,
      fog: options?.fog ?? true,
    });

    super(merged, material);

    this.type = 'WireSphereHelper';
    this.sphere = sphere;
    this.position.copy(sphere.center);
  }

  set(sphere: SphereInterface) {
    const vertices = new Float32Array(createCircleVertices(sphere.radius));
    const geometryA = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const geometryB = geometryA.clone().rotateY(Math.PI / 2);
    const geometryC = geometryA.clone().rotateX(Math.PI / 2);

    const merged = BufferGeometryUtils.mergeBufferGeometries([geometryA, geometryC, geometryB]);

    this.geometry.copy(merged);
    this.sphere = sphere;
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
    this.position.copy(this.sphere.center);
    super.updateMatrixWorld();
  }

  dispose() {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
