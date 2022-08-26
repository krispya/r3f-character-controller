/* eslint-disable @typescript-eslint/no-empty-function */
import { createMachine } from 'xstate';

const groundStates = {
  initial: 'idling',
  states: {
    idling: {
      on: {
        MOVE: 'moving',
        SLIDE: 'sliding',
      },
      entry: 'onIdle',
    },
    moving: {
      on: {
        IDLE: 'idling',
        SLIDE: 'sliding',
      },
      entry: 'onMove',
    },
    sliding: {},
  },
};

const airborneStates = {
  initial: 'falling',
  states: {
    jumping: {
      on: {
        FALL: 'falling',
      },
      entry: 'onJump',
    },
    falling: {
      on: {
        JUMP: 'jumping',
      },
      entry: 'onFall',
    },
  },
};

export const characterMachine = createMachine(
  {
    id: 'character',
    predictableActionArguments: true,
    initial: 'grounded',
    states: {
      grounded: {
        on: {
          AIRBORNE: 'airborne',
          JUMP: 'airborne.jumping',
        },
        entry: 'onGrounded',
        ...groundStates,
      },
      airborne: {
        on: { GROUNDED: 'grounded' },
        entry: 'onAirborne',
        ...airborneStates,
      },
    },
  },
  {
    actions: {
      onGrounded: () => {},
      onAirborne: () => {},
      onIdle: () => {},
      onMove: () => {},
      onJump: () => {},
      onFall: () => {},
    },
  },
);
