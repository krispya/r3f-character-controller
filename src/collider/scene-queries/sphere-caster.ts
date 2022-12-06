import { getDebug } from 'debug/react/debug';
import * as THREE from 'three';
import { ExtendedTriangle } from 'three-mesh-bvh';

const DEBUG = getDebug();

const pool = { vecA: new THREE.Vector3(), vecB: new THREE.Vector3(), vecC: new THREE.Vector3() };

function getLowestRoot(a: number, b: number, c: number, maxR: number) {
  const determinant = b * b - 4 * a * c;

  if (determinant < 0) {
    return null;
  }

  const sqrtD = Math.sqrt(determinant);
  let r1 = (-b - sqrtD) / (2 * a);
  let r2 = (-b + sqrtD) / (2 * a);

  if (r1 > r2) {
    const temp = r2;
    r2 = r1;
    r1 = temp;
  }

  if (r1 > 0 && r1 < maxR) {
    return r1;
  }

  if (r2 > 0 && r2 < maxR) {
    return r2;
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
  const c = vecA.dot(vecA) - t * t;

  return getLowestRoot(a, b, c, t);
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
    if (f >= 0 && f <= 1) {
      const point = pool.vecC.copy(vertexA).addScaledVector(edge, f);
      return [newT, point];
    }
  }

  return [newT, vertexA];
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

    DEBUG.drawBox3(this.aabb);
    DEBUG.drawRay({ origin: this.origin, direction: this.direction, distance: this.distance });

    mesh.geometry.boundsTree?.shapecast({
      intersectsBounds: (bounds) => bounds.intersectsBox(this.aabb),
      intersectsTriangle: (tri) => {
        DEBUG.drawTriangle(tri.clone(), { alwaysOnTop: true, opacity: 0.1 });

        // Convert to spherical coordinates.
        this.triSpherical.copy(tri);
        this.triSpherical.a.divideScalar(this.radius);
        this.triSpherical.b.divideScalar(this.radius);
        this.triSpherical.c.divideScalar(this.radius);

        this.triSpherical.getPlane(this.triPlane);

        // We only check for front-facing triangles. Back-faces are ignored!
        if (tri.isFrontFacing(this.direction)) {
          let t0, t1;
          let isEmbeddedInPlane = false;
          let foundCollision = false;

          const signedDistanceToTrianglePlane = this.triPlane.distanceToPoint(this.originSpherical);
          const normalDotVelocity = this.triPlane.normal.dot(this.velocitySpherical);

          // If the sphere is traveling parallel to the plane, we are embedded
          // in it or missing it completely.
          if (Math.abs(normalDotVelocity) < 0.0001) {
            // Triangle is coplanar with ray, and ray is pointing
            // parallel to plane. No hit if origin not within plane.
            if (Math.abs(signedDistanceToTrianglePlane) >= 1) {
              return false;
            }

            // Ray origin is within plane. It intersets the whole range.
            isEmbeddedInPlane = true;
            t0 = 0;
            t1 = 1;
          } else {
            // Compute intersection interval of ray with triangle plane.
            t0 = (-1 - signedDistanceToTrianglePlane) / normalDotVelocity;
            t1 = (1 - signedDistanceToTrianglePlane) / normalDotVelocity;

            // console.log(t0, t1);

            // Swap so t0 < t1.
            if (t0 > t1) {
              const tmp = t0;
              t0 = t1;
              t1 = tmp;
            }

            // Exit with no collision as soon as interval is empty.
            if (t0 > 1 || t1 < 0) {
              return false;
            }

            // Clamp to [0,1].
            if (t0 < 0) t0 = 0;
            if (t1 < 0) t1 = 0;
            if (t0 > 1) t0 = 1;
            if (t1 > 1) t1 = 1;
          }

          // If the closest possible collision point is further away
          // than an already detected collision then there's no point
          // in testing further.
          // if (t0 >= this.t) return;

          // t0 and t1 now represent the range of the sphere movement
          // during which it intersects with the triangle plane.
          // Collisions cannot happen outside that range.

          if (!isEmbeddedInPlane) {
            // Check if the sphere intersection with the plane is inside the triangle.
            const planeIntersectionPoint = pool.vecA
              .subVectors(this.originSpherical, this.triPlane.normal)
              .addScaledVector(this.velocitySpherical, t0);

            // console.log('not embedded');

            if (this.triSpherical.containsPoint(planeIntersectionPoint)) {
              foundCollision = true;
              this.t = t0;
              this.impactPoint.copy(planeIntersectionPoint);

              // console.log('inside triangle');

              // Collisions against the face will always be closer than vertex or edge collisions
              // so we can stop checking now.
              // return true;
            }
          }

          if (foundCollision === false) {
            const velocityLengthSqr = this.velocitySpherical.lengthSq();
            let newT = 0 as number | null;
            let impactPoint: THREE.Vector3;

            newT = testVertex(this.triSpherical.a, velocityLengthSqr, this.t, this.originSpherical, this.velocity);
            if (newT !== null) {
              foundCollision = true;
              this.t = newT;
              this.impactPoint.copy(this.triSpherical.a);
            }

            newT = testVertex(this.triSpherical.b, velocityLengthSqr, this.t, this.originSpherical, this.velocity);
            if (newT !== null) {
              foundCollision = true;
              this.t = newT;
              this.impactPoint.copy(this.triSpherical.b);
            }

            newT = testVertex(this.triSpherical.c, velocityLengthSqr, this.t, this.originSpherical, this.velocity);
            if (newT !== null) {
              foundCollision = true;
              this.t = newT;
              this.impactPoint.copy(this.triSpherical.c);
            }

            [newT, impactPoint] = testEdge(
              this.triSpherical.a,
              this.triSpherical.b,
              velocityLengthSqr,
              this.t,
              this.originSpherical,
              this.velocity,
            );
            if (newT !== null) {
              foundCollision = true;
              this.t = newT;
              this.impactPoint.copy(impactPoint);
            }

            [newT, impactPoint] = testEdge(
              this.triSpherical.b,
              this.triSpherical.c,
              velocityLengthSqr,
              this.t,
              this.originSpherical,
              this.velocity,
            );
            if (newT !== null) {
              foundCollision = true;
              this.t = newT;
              this.impactPoint.copy(impactPoint);
            }

            [newT, impactPoint] = testEdge(
              this.triSpherical.c,
              this.triSpherical.a,
              velocityLengthSqr,
              this.t,
              this.originSpherical,
              this.velocity,
            );
            if (newT !== null) {
              foundCollision = true;
              this.t = newT;
              this.impactPoint.copy(impactPoint);
            }

            if (foundCollision) {
              const distToCollision = this.velocitySpherical.length() * this.t;

              if (this.isCollided === false || distToCollision < this.nearestDistance) {
                this.nearestDistance = distToCollision;
                this.isCollided = true;
                tri.getNormal(this.impactNormal);
              }
            }
          }
        }
      },
    });

    DEBUG.drawPoint(this.impactPoint);
    // console.log(this.impactPoint, this.nearestDistance);
  }
}
