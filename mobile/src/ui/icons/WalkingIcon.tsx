import Svg, { Circle, Path } from 'react-native-svg';

import type { IconProps } from './types';

/** Ícone de pedestre caminhando. */
export function WalkingIcon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx={13} cy={4} r={2} stroke={color} strokeWidth={2} />
      <Path
        d="M13.5 6.5 10.5 9.5 12 13l-2.5 4.5M12 13l3.5 1.5L17 19M13.5 8 17 9.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
