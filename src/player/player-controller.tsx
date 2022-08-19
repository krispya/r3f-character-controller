import { useUpdate } from '@react-three/fiber';
import { useCameraController } from 'camera/stores/camera-store';
import { CharacterController, CharacterControllerProps } from 'character/character-controller';
import { useCharacterController } from 'character/stores/character-store';
import { useEffect } from 'react';

type PlayerControllerProps = CharacterControllerProps;

export function PlayerController({ children, ...rest }: PlayerControllerProps) {
  const character = useCharacterController((state) => state.character);
  const setTarget = useCameraController((state) => state.setTarget);

  useEffect(() => setTarget(character), [character, setTarget]);

  // Reset if we fall off the level.
  useUpdate(() => {
    if (character && character.position.y < -10) {
      character.position.set(0, 0, 0);
    }
  });

  return <CharacterController {...rest}>{children}</CharacterController>;
}
