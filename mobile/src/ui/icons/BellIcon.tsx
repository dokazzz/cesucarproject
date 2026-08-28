import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de notificação (sino). */
export function BellIcon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M6 10a6 6 0 1 1 12 0c0 3.2 1 5 1.6 5.8a1 1 0 0 1-.8 1.6H5.2a1 1 0 0 1-.8-1.6C5 15 6 13.2 6 10Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.5 20a2.5 2.5 0 0 0 5 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
