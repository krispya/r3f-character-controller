import { getDebug } from 'debug/react/debug';
import * as THREE from 'three';
import { ExtendedTriangle } from 'three-mesh-bvh';
// @ts-ignore
import { traceSphereTriangle, TraceInfo } from 'gl-swept-sphere-triangle';

const DEBUG = getDebug();

const pool = { vecA: new THREE.Vector3(), vecB: new THREE.Vector3(), vecC: new THREE.Vector3() };

// Solves a quadratic equation and returns the lowest root between 0 and maxR.
function getLowestRoot(a: number, b: number, c: number, maxR: number) {
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null;
  }

  const sqrtD = Math.sqrt(discriminant);
  let root1 = (-b - sqrtD) / (2 * a);
  let root2 = (-b + sqrtD) / (2 * a);

  if (root1 > root2) {
    const temp = root2;
    root2 = root1;
    root1 = temp;
  }

  if (root1 > 0 && root1 < maxR) {
    return root1;
  }

  if (root2 > 0 && root2 < maxR) {
    return root2;
  }

  return null;
}

function getLowestRootTest(a: number, b: number, c: number, maxR: number) {
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    console.log('vertex: disc < 0');
    return null;
  }

  const sqrtD = Math.sqrt(discriminant);
  let root1 = (-b - sqrtD) / (2 * a);
  let root2 = (-b + sqrtD) / (2 * a);

  if (root1 > root2) {
    const temp = root2;
    root2 = root1;
    root1 = temp;
  }

  console.log('vertex: ', root1, root2);

  if (root1 > 0 && root1 < maxR) {
    return root1;
  }

  if (root2 > 0 && root2 < maxR) {
    return root2;
  }

  return null;
}

function testVertex(
  vertex: THREE.Vector3,
  velocityLengthSqr: number,
  t: number,
  origin: THREE.Vector3,
  velocity: THREE.Vector3,
) {
  const vecA = pool.vecA.subVectors(vertex, origin);
  const a = velocityLengthSqr;
  const b = 2 * vecA.dot(velocity);
  const c = vecA.lengthSq() - 1;

  return getLowestRootTest(a, b, c, t);
}

function testEdge(
  vertexA: THREE.Vector3,
  vertexB: THREE.Vector3,
  velocityLengthSqr: number,
  t: number,
  origin: THREE.Vector3,
  velocity: THREE.Vector3,
): [number | null, THREE.Vector3] {
  const edge = pool.vecA.subVectors(vertexB, vertexA);
  const originToVertex = pool.vecB.subVectors(vertexA, origin);

  const edgeLengthSqr = edge.lengthSq();
  const edgeDotVelocity = edge.dot(velocity);
  const edgeDotOriginToVertex = edge.dot(originToVertex);

  const a = edgeLengthSqr * -velocityLengthSqr + edgeDotVelocity * edgeDotVelocity;
  const b = edgeLengthSqr * (2 * velocity.dot(originToVertex)) - 2 * edgeDotVelocity * edgeDotOriginToVertex;
  const c = edgeLengthSqr * (1 - originToVertex.lengthSq()) + edgeDotOriginToVertex * edgeDotOriginToVertex;

  const newT = getLowestRoot(a, b, c, t);

  if (newT !== null) {
    // Check if intersection is within the line segment.
    const f = (edgeDotVelocity * newT - edgeDotOriginToVertex) / edgeLengthSqr;
    console.log('f: ', f);

    if (f >= 0 && f <= 1) {
      const point = pool.vecC.copy(vertexA).addScaledVector(edge, f);
      return [newT, point];
    }
  }

  return [null, vertexA];
}

export class SphereCaster {
  public origin: THREE.Vector3;
  public radius: number;
  public distance: number;
  public direction: THREE.Vector3;
  public needsUpdate: boolean;

  private originSpherical: THREE.Vector3;
  private end: THREE.Vector3;
  private velocity: THREE.Vector3;
  private velocitySpherical: THREE.Vector3;
  private isCollided: boolean;
  private t: number;
  private impactPoint: THREE.Vector3;
  private impactNormal: THREE.Vector3;
  private aabb: THREE.Box3;
  private triSpherical: ExtendedTriangle;
  private triPlane: THREE.Plane;
  private nearestDistance: number;
  private location: THREE.Vector3;
  private traceInfo: TraceInfo;

  constructor(radius?: number, origin?: THREE.Vector3, direction?: THREE.Vector3, distance?: number) {
    this.radius = radius ?? 1;
    this.origin = origin ?? new THREE.Vector3();
    this.distance = distance ?? 0;
    this.direction = direction ?? new THREE.Vector3(0, 0, -1);
    this.needsUpdate = false;

    this.originSpherical = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.end = new THREE.Vector3();
    this.velocitySpherical = new THREE.Vector3();
    this.isCollided = false;
    this.t = 0;
    this.impactPoint = new THREE.Vector3();
    this.impactNormal = new THREE.Vector3();
    this.aabb = new THREE.Box3();
    this.triSpherical = new ExtendedTriangle();
    this.triPlane = new THREE.Plane();
    this.nearestDistance = 0;
    this.location = new THREE.Vector3();

    this.traceInfo = new TraceInfo();

    this.update();
  }

  private update() {
    if (!this.needsUpdate) return;

    this.originSpherical = this.originSpherical.copy(this.origin).divideScalar(this.radius);
    this.velocity = this.velocity.set(0, 0, 0).addScaledVector(this.direction, this.distance);
    this.end = this.end.copy(this.origin).add(this.velocity);
    this.velocitySpherical = this.velocitySpherical.copy(this.velocity).divideScalar(this.radius);
    this.aabb = this.aabb.setFromPoints([this.origin, this.end]);
    this.aabb.min.addScalar(-this.radius);
    this.aabb.max.addScalar(this.radius);

    this.needsUpdate = false;
  }

  set(radius: number, origin: THREE.Vector3, direction: THREE.Vector3, distance: number) {
    this.radius = radius;
    this.origin = origin;
    this.distance = distance;
    this.direction = direction;

    this.update();
  }

  intersectMesh(mesh: THREE.Mesh) {
    if (this.needsUpdate) this.update();
    this.isCollided = false;
    this.t = 1;
    this.impactPoint.set(0, 0, 0);
    this.nearestDistance = Infinity;

    this.traceInfo.resetTrace(
      [this.origin.x, this.origin.y, this.origin.z],
      [this.end.x, this.end.y, this.end.z],
      this.radius,
    );

    DEBUG.drawBox3(this.aabb);
    DEBUG.drawRay({ origin: this.origin, direction: this.direction, distance: this.distance });

    console.log(this.traceInfo);

    mesh.geometry.boundsTree?.shapecast({
      intersectsBounds: (bounds) => bounds.intersectsBox(this.aabb),
      intersectsTriangle: (tri) => {
        traceSphereTriangle(
          [tri.a.x, tri.a.y, tri.a.z],
          [tri.b.x, tri.b.y, tri.b.z],
          [tri.c.x, tri.c.y, tri.c.z],
          this.traceInfo,
        );
      },
    });

    if (this.traceInfo.collision) {
      const temp: [number, number, number] = [0, 0, 0];
      this.traceInfo.getTraceEndpoint(temp);
      this.location.set(...temp);
      this.impactPoint.set(
        this.traceInfo.intersectPoint[0],
        this.traceInfo.intersectPoint[1],
        this.traceInfo.intersectPoint[2],
      );

      console.log('t: ', this.traceInfo.t);
      DEBUG.drawPoint(this.impactPoint);
      DEBUG.drawPoint(this.location, { color: 'blue' });
      DEBUG.drawWireSphere({ center: this.location, radius: this.radius }, { color: 'blue', opacity: 0.5 });
    }
  }
}
