import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/theme';
import { fontSize, fontWeight } from '@/theme/tokens';

type Variante = 'display' | 'titulo' | 'subtitulo' | 'secao' | 'corpo' | 'legenda' | 'micro';

const ESTILOS: Record<Variante, TextStyle> = {
  display: { fontSize: fontSize.display, fontWeight: fontWeight.heavy, letterSpacing: -0.8 },
  titulo: { fontSize: fontSize.xxl, fontWeight: fontWeight.heavy, letterSpacing: -0.5 },
  subtitulo: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  secao: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  corpo: { fontSize: fontSize.md, fontWeight: fontWeight.regular },
  legenda: { fontSize: fontSize.sm, fontWeight: fontWeight.regular },
  micro: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
};

interface Props extends TextProps {
  variante?: Variante;
  cor?:
    'padrao' | 'suave' | 'apagado' | 'primaria' | 'sucesso' | 'aviso' | 'perigo' | 'onPrimaria';
  peso?: keyof typeof fontWeight;
}

export function Texto({ variante = 'corpo', cor = 'padrao', peso, style, ...rest }: Props) {
  const { colors } = useTheme();

  const cores = {
    padrao: colors.text,
    suave: colors.textMuted,
    apagado: colors.textDim,
    primaria: colors.primary,
    sucesso: colors.success,
    aviso: colors.warning,
    perigo: colors.danger,
    onPrimaria: colors.onPrimary,
  };

  return (
    <Text
      style={[
        ESTILOS[variante],
        { color: cores[cor] },
        peso ? { fontWeight: fontWeight[peso] } : null,
        style,
      ]}
      {...rest}
    />
  );
}
