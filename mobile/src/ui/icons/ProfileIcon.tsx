import Svg, { Circle, Path } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de perfil / usuário. */
export function ProfileIcon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} />
      <Path
        d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
