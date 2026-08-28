import Svg, { Circle, Path } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de bicicleta. */
export function BicycleIcon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx={5.5} cy={17.5} r={3.5} stroke={color} strokeWidth={2} />
      <Circle cx={18.5} cy={17.5} r={3.5} stroke={color} strokeWidth={2} />
      <Path
        d="M5.5 17.5H12L9 12h7l2.5 5.5M9 12 7 8M16 12l2-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
