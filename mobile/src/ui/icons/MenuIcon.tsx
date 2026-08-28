import Svg, { Line } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de menu (hambúrguer). */
export function MenuIcon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Line x1={4} y1={6} x2={20} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line
        x1={4}
        y1={12}
        x2={20}
        y2={12}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={4}
        y1={18}
        x2={20}
        y2={18}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
