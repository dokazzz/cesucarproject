import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './types';

interface Props extends IconProps {
  /** Estado preenchido (favoritado). Padrão é o contorno. */
  filled?: boolean;
}

/** Ícone de favorito (estrela), com estado preenchido opcional via `filled`. */
export function FavoriteStarIcon({
  size = 24,
  color = 'currentColor',
  filled = false,
  ...props
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12 2.5 15.1 8.8 22 9.8 17 14.7 18.2 21.5 12 18.2 5.8 21.5 7 14.7 2 9.8 8.9 8.8 12 2.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}
