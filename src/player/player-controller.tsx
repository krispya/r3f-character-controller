import { Stages, useUpdate } from '@react-three/fiber';
import { useCameraController } from 'camera/stores/camera-store';
import { CharacterController, CharacterControllerProps } from 'character/character-controller';
import { Falling, FallingProps } from 'character/modifiers/falling';
import { Gravity, GravityProps } from 'character/modifiers/gravity';
import { Jump, JumpProps } from 'character/modifiers/jump';
import { Walking, WalkingProps, WALK_SPEED } from 'character/modifiers/walking';
import { useCharacterController } from 'character/stores/character-store';
import { useInputs } from 'input/input-controller';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

type PlayerControllerProps = CharacterControllerProps &
  Omit<GravityProps, 'alwaysOn'> &
  Omit<JumpProps, 'jump'> &
  Omit<WalkingProps, 'movement' | 'speed'> &
  Omit<FallingProps, 'movement' | 'speed'> & {
    gravityAlwaysOn?: boolean;
    walkSpeed?: number;
    airControl?: number;
  };

export function PlayerController({
  children,
  walkSpeed = WALK_SPEED,
  airControl = 0.5,
  id,
  ...props
}: PlayerControllerProps) {
  const [store] = useState(() => ({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    walk: new THREE.Vector3(),
    move: new THREE.Vector2(),
  }));

  const character = useCharacterController((state) => state.characters.get(id));
  const setTarget = useCameraController((state) => state.setTarget);
  const inputs = useInputs();

  useEffect(() => setTarget(character as THREE.Object3D), [character, setTarget]);

  // Reset if we fall off the level.
  useUpdate(() => {
    if (character && character.position.y < -10) {
      if (props.position) {
        if (Array.isArray(props.position)) character.position.set(...props.position);
        if (props.position instanceof THREE.Vector3) character.position.copy(props.position);
        if (typeof props.position === 'number') character.position.set(props.position, props.position, props.position);
      } else {
        character.position.set(0, 0, 0);
      }
    }
  });

  // Update the player's movement vector based on camera direction.
  useUpdate((state) => {
    const { move: moveInput } = inputs;
    const { forward, right, walk, move } = store;

    move.set(moveInput.x, moveInput.y);
    const magnitude = Math.min(move.length(), 1);
    move.normalize();

    forward.set(0, 0, -1).applyQuaternion(state.camera.quaternion);
    forward.normalize().multiplyScalar(move.y);
    forward.y = 0;

    right.set(1, 0, 0).applyQuaternion(state.camera.quaternion);
    right.normalize().multiplyScalar(move.x);
    right.y = 0;

    walk.addVectors(forward, right).multiplyScalar(magnitude);
  }, Stages.Early);

  return (
    <CharacterController
      id={id}
      position={props.position}
      debug={props.debug}
      maxIterations={props.maxIterations}
      groundDetectionOffset={props.groundDetectionOffset}
      capsule={props.capsule}
      rotateTime={props.rotateTime}
      slopeLimit={props.slopeLimit}
      capsuleCast={props.capsuleCast}>
      {children}
      <Walking movement={() => store.walk} speed={walkSpeed} />
      <Falling movement={() => store.walk} speed={walkSpeed * airControl} />
      <Jump jump={() => inputs.jump} jumpSpeed={props.jumpSpeed} />
      <Gravity
        gravity={props.gravity}
        groundedGravity={props.groundedGravity}
        alwaysOn={props.gravityAlwaysOn}
        maxFallSpeed={props.maxFallSpeed}
      />
    </CharacterController>
  );
}
