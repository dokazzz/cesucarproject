import Svg, { Circle, Path } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de rota (linha curva entre um ponto de partida e um de chegada). */
export function RouteIcon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx={5.5} cy={18.5} r={2.25} stroke={color} strokeWidth={2} />
      <Circle cx={18.5} cy={5.5} r={2.25} stroke={color} strokeWidth={2} />
      <Path
        d="M7.6 18.5H14a3.5 3.5 0 0 0 3.5-3.5v0A3.5 3.5 0 0 0 14 11.5h-4A3.5 3.5 0 0 1 6.5 8v0A3.5 3.5 0 0 1 10 4.5h6.4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
