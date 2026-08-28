import Svg, { Circle, Line, Rect } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de ônibus. */
export function BusIcon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Rect x={4} y={4} width={16} height={13} rx={2} stroke={color} strokeWidth={2} />
      <Line
        x1={4}
        y1={10}
        x2={20}
        y2={10}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx={7.5} cy={19.5} r={1.5} stroke={color} strokeWidth={2} />
      <Circle cx={16.5} cy={19.5} r={1.5} stroke={color} strokeWidth={2} />
    </Svg>
  );
}
