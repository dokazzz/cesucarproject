import type { SvgProps } from 'react-native-svg';

/**
 * Props comuns a todo ícone do set. `size` escala largura e altura juntas
 * (o `viewBox` continua 24x24, então o traço escala proporcionalmente);
 * `color` alimenta o `stroke="currentColor"` de cada forma. Qualquer outra
 * prop de `SvgProps` (`style`, `onPress`, `testID`, ...) passa direto pro
 * `<Svg>` raiz de cada componente.
 */
export interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}
