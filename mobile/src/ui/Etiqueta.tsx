import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/theme';
import { fontSize, fontWeight, radius, spacing } from '@/theme/tokens';
import { Texto } from './Texto';

/** As pílulas de estado do app. `ida` usa a cor de marca, `volta` usa sucesso. */
export type TomEtiqueta =
  'cinza' | 'primaria' | 'sucesso' | 'perigo' | 'aviso' | 'ida' | 'volta';

interface Props {
  children: string;
  tom?: TomEtiqueta;
  style?: StyleProp<ViewStyle>;
}

export function Etiqueta({ children, tom = 'cinza', style }: Props) {
  const { colors } = useTheme();

  const paleta: Record<TomEtiqueta, { fundo: string; texto: string }> = {
    cinza: { fundo: colors.overlay, texto: colors.textMuted },
    primaria: { fundo: colors.primarySoft, texto: colors.primary },
    sucesso: { fundo: colors.successSoft, texto: colors.success },
    perigo: { fundo: colors.dangerSoft, texto: colors.danger },
    aviso: { fundo: colors.warningSoft, texto: colors.warning },
    ida: { fundo: colors.primarySoft, texto: colors.primary },
    volta: { fundo: colors.successSoft, texto: colors.success },
  };

  const { fundo, texto } = paleta[tom];

  return (
    <View style={[estilos.base, { backgroundColor: fundo }, style]}>
      <Texto
        numberOfLines={1}
        style={{ color: texto, fontSize: fontSize.xs, fontWeight: fontWeight.heavy }}
      >
        {children}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});
