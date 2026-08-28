import Svg, { Circle, Path } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de pino de localização (map marker). */
export function LocationPinIcon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={2.25} fill={color} stroke="none" />
    </Svg>
  );
}
