import Svg, { Circle, Path } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de motocicleta. */
export function MotorcycleIcon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx={5} cy={18} r={3} stroke={color} strokeWidth={2} />
      <Circle cx={19} cy={18} r={3} stroke={color} strokeWidth={2} />
      <Path
        d="M5 18h4l3-6h6M12 12l2 6h5M15 8h3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
