import * as THREE from 'three';
import { ExtendedBox3Helper } from './helpers/extended-box3-helper';
import { PointHelper } from './helpers/point-helper';
import { RayHelper, RayInfo } from './helpers/ray-helper';
import { SphereInterface, SphereHelper, WireSphereHelper } from './helpers/sphere-helper';
import { TriangleDebugOptions, TriangleHelper, WireTriangleHelper } from './helpers/triangle-helper';

type DebugObject = THREE.Object3D | THREE.Box3 | THREE.Vector3 | THREE.Triangle | RayInfo | SphereInterface;
type Constructor = new (...args: any[]) => any;

export type DebugMaterialOptions = {
  color?: THREE.ColorRepresentation;
  alwaysOnTop?: boolean;
  opacity?: number;
  fog?: boolean;
};

type DebugHelper = THREE.Object3D & {
  dispose: () => void;
  set: (...args: any[]) => void;
  setMaterial: (options: DebugMaterialOptions) => void;
};

type DebugHelperState = {
  object: DebugObject;
  isActive: boolean;
};

type DebugObjectState = {
  isActive: boolean;
  helper: DebugHelper;
  persist: boolean;
};

type DebugDrawOptions = {
  persist?: boolean;
} & DebugMaterialOptions;

type TriangleDrawOptions = TriangleDebugOptions & {
  persist?: boolean;
};

const GROUP_NAME = '__debug';

function removeObjectFromPool(debug: Debug, object: DebugHelper) {
  const poolIndex = debug.poolKeys.indexOf(object);
  if (poolIndex !== -1) debug.poolKeys.splice(poolIndex, 1);
}

function createDraw<T extends DebugObject, K extends DebugDrawOptions = DebugDrawOptions>(
  debug: Debug,
  constructor?: Constructor,
) {
  return (object: T, options?: K) => {
    // Check if we are calling with the same object. If so, keep it active and update.
    if (debug.debugMap.has(object)) {
      const state = debug.debugMap.get(object);
      const helperState = debug.helperMap.get(state!.helper);

      state!.isActive = true;
      helperState!.isActive = true;

      removeObjectFromPool(debug, state!.helper);

      return;
    }

    const poolOrCreate = () => {
      // Check the pool of inactive helpers and see if we can take over one of them
      // instead of instantiating a new one and wasting all those resources.
      for (const poolHelper of debug.poolKeys) {
        const state = debug.helperMap.get(poolHelper);

        if (state && poolHelper instanceof (constructor as unknown as () => void)) {
          poolHelper.set(object);

          removeObjectFromPool(debug, poolHelper);

          state!.isActive = true;
          if (options) poolHelper.setMaterial(options);

          return;
        }
      }

      // If all else fails, we assume it is a new debug call that we have to create helpers for.
      const helper = constructor ? new constructor(object, options) : object;
      helper.userData = { isDebug: true };

      debug.group.add(helper);
      debug.debugKeys.push(helper);
      debug.debugMap.set(object, {
        isActive: true,
        helper,
        persist: options?.persist ?? false,
      });
      debug.helperMap.set(helper, { isActive: true, object });
    };

    // Defer searching the pool/creating our debug objects for the next phase.
    debug.deferred.push(poolOrCreate);
  };
}

export class Debug {
  private _debugKeys: DebugHelper[];
  private _debugMap: WeakMap<DebugObject, DebugObjectState>;
  private _helperMap: WeakMap<DebugHelper, DebugHelperState>;
  private _poolKeys: DebugHelper[];
  private _deferred: (() => void)[];
  private _group: THREE.Group;
  private _scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this._scene = scene;
    this._debugKeys = [];
    this._debugMap = new WeakMap();
    this._helperMap = new WeakMap();
    this._poolKeys = [];
    this._deferred = [];

    this._group = new THREE.Group();
    this._group.name = GROUP_NAME;
    scene.add(this._group);
  }

  get debugKeys() {
    return this._debugKeys;
  }

  get debugMap() {
    return this._debugMap;
  }

  get helperMap() {
    return this._helperMap;
  }

  get poolKeys() {
    return this._poolKeys;
  }

  get deferred() {
    return this._deferred;
  }

  get group() {
    return this._group;
  }

  get scene() {
    return this._scene;
  }

  set scene(scene: THREE.Scene) {
    this._scene = scene;

    // If our debug group doesn't exist on the new scene, create it.
    if (!scene.getObjectByName(GROUP_NAME)) {
      this._group = new THREE.Group();
      this._group.name = GROUP_NAME;
      scene.add(this._group);
    }
  }

  update() {
    // In order to know which debug objects can be pooled, we need to wait to see which get
    // referred again in a draw call. Any draw call with a new reference was deferred to now
    // where we can assume any objects left are pooled.
    this._deferred.forEach((fn) => {
      fn();
    });

    // console.log('pool: ', this._poolKeys);
    // console.log('debug after: ', this.debugMap);
    // console.log('helper after: ', this.helperMap);

    this._deferred.length = 0;

    this._debugKeys.forEach((helper, index) => {
      const state = this._helperMap.get(helper);
      if (!state) return;

      // No lifecycle if we are persisting.
      // if (state.persist) return;

      if (!state.isActive) {
        this.group.remove(helper);
        helper.dispose();
        this._helperMap.delete(helper);
        this._debugMap.delete(state.object);
        this._debugKeys.splice(index, 1);

        removeObjectFromPool(this, helper);

        return;
      }

      this._poolKeys.push(helper);
      state.isActive = false;
    });
  }

  draw = createDraw<THREE.Object3D>(this);

  drawBox3 = createDraw<THREE.Box3>(this, ExtendedBox3Helper);
  drawRay = createDraw<RayInfo>(this, RayHelper);
  drawPoint = createDraw<THREE.Vector3>(this, PointHelper);
  drawWireTriangle = createDraw<THREE.Triangle>(this, WireTriangleHelper);
  drawTriangle = createDraw<THREE.Triangle, TriangleDrawOptions>(this, TriangleHelper);
  drawWireSphere = createDraw<SphereInterface>(this, WireSphereHelper);
  drawSphere = createDraw<SphereInterface>(this, SphereHelper);

  drawSpotlight = createDraw<THREE.SpotLight>(this, THREE.SpotLightHelper);
  drawPointlight = createDraw<THREE.PointLight>(this, THREE.PointLightHelper);
  drawDirectionalLight = createDraw<THREE.DirectionalLight>(this, THREE.DirectionalLightHelper);
  drawHemisphereLight = createDraw<THREE.HemisphereLight>(this, THREE.HemisphereLightHelper);
}
