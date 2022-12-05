import * as THREE from 'three';
import { RayHelper, RayInfo } from './helpers/ray-helper';

type DebugObjectState = {
  timer: number;
  isActive: boolean;
  object3D: THREE.Object3D & { dispose?: () => void };
  persist: boolean;
};

type DebugObjectOptions = {
  persist?: boolean;
};

type DebugObject = THREE.Object3D | THREE.Box3 | RayInfo;
type Constructor = new (...args: any[]) => any;

const DISPOSE_TIMER_DEFAULT = 100;

function createDraw<T extends DebugObject>(debug: Debug, constructor?: Constructor) {
  return (object: T, options?: DebugObjectOptions) => {
    if (debug.debugMap.has(object)) {
      const state = debug.debugMap.get(object);
      state!.isActive = true;

      return;
    }

    const object3D = constructor ? new constructor(object) : object;
    object3D.userData = { isDebug: true };

    debug.scene.add(object3D);
    debug.debugKeys.push(object);
    debug.debugMap.set(object, {
      timer: debug.disposeTimer,
      isActive: true,
      object3D: object3D,
      persist: options?.persist ?? false,
    });
  };
}

export class Debug {
  private _debugKeys: DebugObject[];
  private _debugMap: WeakMap<DebugObject, DebugObjectState>;

  public scene: THREE.Scene;
  public disposeTimer: number;

  constructor(scene: THREE.Scene, disposeTimer?: number) {
    this.scene = scene;
    this._debugKeys = [];
    this._debugMap = new WeakMap();
    this.disposeTimer = disposeTimer ?? DISPOSE_TIMER_DEFAULT;
  }

  get debugKeys() {
    return this._debugKeys;
  }

  get debugMap() {
    return this._debugMap;
  }

  update(dt: number) {
    this._debugKeys.forEach((debugObject, index) => {
      const state = this._debugMap.get(debugObject);
      if (!state) return;

      // No lifecycle if we are persisting.
      if (state.persist) return;

      if (!state.isActive) {
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
      }

      state.isActive = false;
    });
  }

  draw = createDraw<THREE.Object3D>(this);

  drawBox3 = createDraw<THREE.Box3>(this, THREE.Box3Helper);

  drawRay = createDraw<RayInfo>(this, RayHelper);

  drawSpotlight = createDraw<THREE.SpotLight>(this, THREE.SpotLightHelper);
}
