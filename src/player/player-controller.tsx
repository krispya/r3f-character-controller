import { useCameraController } from 'camera/stores/camera-store';
import { CharacterController, CharacterControllerProps } from 'character/character-controller';
import { useCharacterController } from 'character/stores/character-store';
import { useEffect } from 'react';

type PlayerControllerProps = CharacterControllerProps;

export function PlayerController({ children, ...rest }: PlayerControllerProps) {
  const character = useCharacterController((state) => state.character);
  const setTarget = useCameraController((state) => state.setTarget);

  useEffect(() => setTarget(character), [character, setTarget]);

  return <CharacterController {...rest}>{children}</CharacterController>;
}
