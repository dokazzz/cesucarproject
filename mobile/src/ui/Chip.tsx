import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/theme';
import { fontSize, fontWeight, radius, spacing } from '@/theme/tokens';
import { Texto } from './Texto';

/** Filtro rápido. Ativo = preenchido com a cor de marca. */
export function Chip({
  rotulo,
  ativo,
  onPress,
}: {
  rotulo: string;
  ativo: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      // Altura desenhada fica em torno de 36 px; a folga leva o alvo a 44.
      hitSlop={4}
      style={({ pressed }) => [
        estilos.base,
        {
          backgroundColor: ativo ? colors.primary : colors.surface,
          borderColor: ativo ? colors.primary : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Texto
        style={{
          color: ativo ? colors.onPrimary : colors.textMuted,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.bold,
        }}
      >
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
