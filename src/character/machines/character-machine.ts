import { createMachine } from 'xstate';

export const characterMachine = createMachine({
  id: 'character',
  initial: 'idling',
  predictableActionArguments: true,
  states: {
    idling: {
      on: {
        MOVE: { target: 'moving' },
        FALL: { target: 'falling' },
        SLIDE: { target: 'sliding' },
      },
    },
    moving: {
      on: {
        IDLE: { target: 'idling' },
        FALL: { target: 'falling' },
        SLIDE: { target: 'sliding' },
      },
    },
    falling: {},
    sliding: {},
  },
});
