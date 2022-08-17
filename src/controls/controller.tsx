import {
  BooleanControl,
  Controller as CFController,
  GamepadDevice,
  KeyboardDevice,
  TouchDevice,
  VectorControl,
} from '@hmans/controlfreak';
import { Stages, useUpdate } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import create from 'zustand';

type ControllerState = {
  controller: CFController;
};

type Devices = 'keyboard' | 'gamepad' | 'touch';
type ActionDevices = { keyboard?: KeyboardDevice; gamepad?: GamepadDevice; touch?: TouchDevice };

type ControllerProps = {
  devices?: Devices | Devices[];
  actions: (devices: ActionDevices) => {
    [key: string]: {
      type: 'vector' | 'boolean';
      steps: any[];
    };
  };
  pause?: boolean;
};

const useStore = create<ControllerState>(() => ({
  controller: new CFController(),
}));

export function Controller({
  devices = ['keyboard', 'gamepad', 'touch'],
  actions: createActions,
  pause = false,
}: ControllerProps) {
  const deviceMap = useRef<Map<string, KeyboardDevice | GamepadDevice | TouchDevice>>(new Map());
  const controller = useStore((state) => state.controller);

  // Add devices
  useLayoutEffect(() => {
    const _devices = !Array.isArray(devices) ? [devices] : devices;
    const _deviceMap = deviceMap.current;
    for (const device of _devices) {
      switch (device) {
        case 'keyboard':
          _deviceMap.set('keyboard', new KeyboardDevice());
          controller.addDevice(_deviceMap.get('keyboard')!);
          break;
        case 'gamepad':
          _deviceMap.set('gamepad', new GamepadDevice());
          controller.addDevice(_deviceMap.get('gamepad')!);
          break;
        case 'touch':
          _deviceMap.set('touch', new TouchDevice());
          controller.addDevice(_deviceMap.get('touch')!);
          break;
        default:
          throw new Error(`Unknown device: ${device}`);
      }
    }

    return () => {
      for (const device of _deviceMap.values()) {
        controller.removeDevice(device);
      }
    };
  }, [controller, devices]);

  // Create actions and bind them
  useLayoutEffect(() => {
    const _devices = Object.fromEntries(deviceMap.current);
    const actions = createActions(_devices);

    for (const [key, value] of Object.entries(actions)) {
      let type;
      switch (value.type) {
        case 'vector':
          type = VectorControl;
          break;
        case 'boolean':
          type = BooleanControl;
          break;
        default:
          throw new Error(`Unknown action type: ${value.type}`);
      }
      const control = controller.addControl(key, type);

      for (const step of value.steps) {
        control.addStep(step);
      }
    }
  }, [controller, createActions]);

  // Start our controller
  useLayoutEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);

  // Update the controller on an early loop
  useUpdate(() => {
    if (!pause) controller.update();
  }, Stages.Early);

  return null;
}

export function useController() {
  const controller = useStore((state) => state.controller);
  const controls: { [key: string]: any } = {};

  // This is a hack to demonstrate a cleaner API
  useUpdate(() => {
    for (const [key, value] of Object.entries(controller.controls)) {
      controls[key] = value.value;
    }
  }, Stages.Early);

  return controls;
}
