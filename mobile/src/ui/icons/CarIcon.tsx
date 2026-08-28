import Svg, { Circle, Path } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de carro. */
export function CarIcon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M4 17h16M5 17v-6.2a1 1 0 0 1 .4-.8l2.7-2a2 2 0 0 1 1.2-.4h5.4a2 2 0 0 1 1.2.4l2.7 2a1 1 0 0 1 .4.8V17"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={7.5} cy={17} r={1.8} stroke={color} strokeWidth={2} />
      <Circle cx={16.5} cy={17} r={1.8} stroke={color} strokeWidth={2} />
    </Svg>
  );
}
