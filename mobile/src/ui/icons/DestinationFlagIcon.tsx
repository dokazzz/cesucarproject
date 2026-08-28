import Svg, { Line, Path } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de destino (bandeira de chegada). */
export function DestinationFlagIcon({
  size = 24,
  color = 'currentColor',
  ...props
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Line x1={5} y1={21} x2={5} y2={3} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M5 4h12.5l-3.2 4 3.2 4H5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
