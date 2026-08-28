import Svg, { Circle, Line } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de GPS / localização atual (alvo com miras). */
export function GpsIcon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
      <Line
        x1={12}
        y1={2}
        x2={12}
        y2={5}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={12}
        y1={19}
        x2={12}
        y2={22}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={2}
        y1={12}
        x2={5}
        y2={12}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={19}
        y1={12}
        x2={22}
        y2={12}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
