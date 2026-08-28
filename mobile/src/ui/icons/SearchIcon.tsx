import Svg, { Circle, Line } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de busca (lupa). */
export function SearchIcon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
      <Line
        x1={21}
        y1={21}
        x2={16.65}
        y2={16.65}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
