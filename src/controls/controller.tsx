import { Controller, KeyboardDevice } from '@hmans/controlfreak';
import create, { StateSelector } from 'zustand';

interface ControllerState {
  controller: Controller;
  keyboard: KeyboardDevice;
}

const useStore = create<ControllerState>(() => {
  const controller = new Controller();
  const keyboard = new KeyboardDevice();
  controller.addDevice(keyboard);

  return { controller, keyboard };
});

export const useController = (selector?: StateSelector<any, any>) => {
  const controller = useStore(selector ?? ((state) => state.controller));
  return controller;
};
