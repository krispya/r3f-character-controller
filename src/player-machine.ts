import { createMachine } from 'xstate';

export const playerControlsMachine = createMachine({
  id: 'player-controls',
  initial: 'idling',
  states: {
    idling: {
      on: {
        RUN: { target: 'running' },
      },
    },
    running: {
      on: {
        IDLE: { target: 'idling' },
      },
    },
    jumping: {},
  },
});
