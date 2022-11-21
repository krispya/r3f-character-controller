import { useInterpret } from '@xstate/react';
import { CharacterControllerContext } from 'character/contexts/character-controller-context';
import { useContext } from 'react';
import * as THREE from 'three';
import { playerMachine } from './player-machine';
import { usePlayer } from './player-store';

const zeroVec = new THREE.Vector3(0, 0, 0);

export function PlayerRig() {
  const { fsm: service, getVelocity } = useContext(CharacterControllerContext);
  const actions = usePlayer((state) => state.actions);

  const fsm = useInterpret(playerMachine, {
    actions: {
      onIdle: () => {
        console.log('idling');
        actions?.Idle?.reset();
        actions?.Idle?.play();
        actions?.Idle?.fadeIn(0.3);
      },
      onIdleExit: () => {
        actions?.Idle?.fadeOut(0.3);
      },
      onFall: () => {
        console.log('falling');
      },
      onWalk: () => {
        console.log('walking');
        actions?.Walking?.reset();
        actions?.Walking?.play();
        actions?.Walking?.fadeIn(0.3);
      },
      onWalkExit: () => {
        actions?.Walking?.fadeOut(0.3);
      },
    },
  });

  service.onTransition((state) => {
    const velocity = getVelocity();

    if (state.matches('walking')) {
      if (velocity.equals(zeroVec)) fsm.send('IDLE');
      else fsm.send('WALK');
    }

    if (state.matches('falling')) {
      fsm.send('FALL');
    }
  });

  return null;
}
