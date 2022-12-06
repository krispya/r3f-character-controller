import * as THREE from 'three';
import { PointHelper } from './helpers/point-helper';
import { RayHelper, RayInfo } from './helpers/ray-helper';
import { TriangleHelper } from './helpers/triangle-helper';

type DebugObjectState = {
  timer: number;
  isActive: boolean;
  object3D: THREE.Object3D & { dispose?: () => void; set?: (...args: any[]) => void };
  persist: boolean;
  once: boolean;
};

type DebugObjectOptions = {
  persist?: boolean;
  once?: boolean;
};

type DebugObject = THREE.Object3D | THREE.Box3 | THREE.Vector3 | THREE.Triangle | RayInfo;
type Constructor = new (...args: any[]) => any;

const DISPOSE_TIMER_DEFAULT = 100;

function createDraw<T extends DebugObject>(debug: Debug, constructor?: Constructor) {
  return (object: T, options?: DebugObjectOptions) => {
    // Check if we are calling with the same object. If so, keep it active and update.
    if (debug.debugMap.has(object)) {
      const state = debug.debugMap.get(object);

      state!.isActive = true;

      const poolIndex = debug.poolKeys.indexOf(object);
      if (poolIndex !== -1) debug.poolKeys.splice(poolIndex, 1);

      return;
    }

    const poolOrCreate = () => {
      // Check the pool of inactive helpers and see if we can take over one of them
      // instead of instantiating a new one and wasting all those resources.
      for (const poolObject of debug.poolKeys) {
        if (poolObject.constructor === object.constructor) {
          const state = debug.debugMap.get(poolObject);
          if (state!.object3D?.set) state!.object3D.set(object);

          const poolIndex = debug.poolKeys.indexOf(poolObject);
          if (poolIndex !== -1) debug.poolKeys.splice(poolIndex, 1);

          state!.isActive = true;

          return;
        }
      }

      // If all else fails, we assume it is a new debug call that we have to create helpers for.
      const object3D = constructor ? new constructor(object) : object;
      object3D.userData = { isDebug: true };

      debug.scene.add(object3D);
      debug.debugKeys.push(object);
      debug.debugMap.set(object, {
        timer: debug.disposeTimer,
        isActive: true,
        object3D: object3D,
        persist: options?.persist ?? false,
        once: options?.once ?? false,
      });
    };

    // Defer searching the pool/creating our debug objects for the next phase.
    debug.deferred.push(poolOrCreate);
  };
}

export class Debug {
  private _debugKeys: DebugObject[];
  private _debugMap: WeakMap<DebugObject, DebugObjectState>;
  private _poolKeys: DebugObject[];
  private _deferred: (() => void)[];

  public scene: THREE.Scene;
  public disposeTimer: number;

  constructor(scene: THREE.Scene, disposeTimer?: number) {
    this.scene = scene;
    this._debugKeys = [];
    this._debugMap = new WeakMap();
    this._poolKeys = [];
    this._deferred = [];
    this.disposeTimer = disposeTimer ?? DISPOSE_TIMER_DEFAULT;
  }

  get debugKeys() {
    return this._debugKeys;
  }

  get debugMap() {
    return this._debugMap;
  }

  get poolKeys() {
    return this._poolKeys;
  }

  get deferred() {
    return this._deferred;
  }

  update(dt: number) {
    // In order to know which debug objects can be pooled, we need to wait to see which get
    // referred again in a draw call. Any draw call with a new reference was deferred to now
    // where we can assume any objects left are pooled.
    this._deferred.forEach((fn) => {
      fn();
    });

    this._deferred.length = 0;

    this._debugKeys.forEach((debugObject, index) => {
      const state = this._debugMap.get(debugObject);
      if (!state) return;

      // No lifecycle if we are persisting.
      if (state.persist) return;

      if (!state.isActive) {
        if (state.timer === this.disposeTimer) this._poolKeys.push(debugObject);

        state.timer -= dt * 1000;
        this.scene.remove(state.object3D);
      }

      if (state.isActive && state.timer < this.disposeTimer) {
        this.scene.add(state.object3D);
        state.timer = this.disposeTimer;
      }

      if (state.timer <= 0) {
        if (state.object3D?.dispose) state.object3D.dispose();
        this._debugMap.delete(debugObject);
        this._debugKeys.splice(index, 1);

        const poolIndex = this._poolKeys.indexOf(debugObject);
        if (poolIndex !== -1) this._poolKeys.splice(poolIndex, 1);
      }

      state.isActive = false;
      this._poolKeys.push(debugObject);
    });
  }

  draw = createDraw<THREE.Object3D>(this);

  drawBox3 = createDraw<THREE.Box3>(this, THREE.Box3Helper);
  drawRay = createDraw<RayInfo>(this, RayHelper);
  drawPoint = createDraw<THREE.Vector3>(this, PointHelper);
  drawTriangle = createDraw<THREE.Triangle>(this, TriangleHelper);

  drawSpotlight = createDraw<THREE.SpotLight>(this, THREE.SpotLightHelper);
  drawPointlight = createDraw<THREE.PointLight>(this, THREE.PointLightHelper);
  drawDirectionalLight = createDraw<THREE.DirectionalLight>(this, THREE.DirectionalLightHelper);
  drawHemisphereLight = createDraw<THREE.HemisphereLight>(this, THREE.HemisphereLightHelper);
}
