import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/theme/theme';
import { radius, shadow, spacing } from '@/theme/tokens';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}

export function Cartao({ children, onPress, style, padding = spacing.lg }: Props) {
  const { colors, isDark } = useTheme();

  const base: StyleProp<ViewStyle> = [
    estilos.base,
    {
      backgroundColor: colors.surface,
      borderColor: colors.overlayBorder,
      padding,
      // Sombra só no tema claro; no escuro a borda já separa o cartão do fundo.
      boxShadow: isDark ? 'none' : shadow.sm,
    },
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        base,
        pressed && { opacity: 0.9, transform: [{ scale: 0.995 }] },
      ]}
    >
      {children}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
