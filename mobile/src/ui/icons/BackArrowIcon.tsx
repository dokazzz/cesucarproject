import Svg, { Line, Path } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de voltar (seta para a esquerda). */
export function BackArrowIcon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Line
        x1={19}
        y1={12}
        x2={5}
        y2={12}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M11 6l-6 6 6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
