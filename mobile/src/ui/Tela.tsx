import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/theme';
import { spacing } from '@/theme/tokens';
import { Texto } from './Texto';

/** Pílula maiúscula acima do título de uma seção de tela. */
export function Marcador({ children }: { children: string }) {
  const { colors } = useTheme();

  return (
    <View style={[estilos.marcador, { backgroundColor: colors.primarySoft }]}>
      <Texto
        variante="micro"
        peso="heavy"
        style={{ color: colors.primary, letterSpacing: 0.8, textTransform: 'uppercase' }}
      >
        {children}
      </Texto>
    </View>
  );
}

/** Título de seção com o ponto de marca à esquerda. */
export function TituloSecao({ children }: { children: string }) {
  const { colors } = useTheme();

  return (
    <View style={estilos.tituloSecao}>
      <View style={[estilos.ponto, { backgroundColor: colors.primary }]} />
      <Texto variante="secao">{children}</Texto>
    </View>
  );
}

interface TelaProps {
  children: ReactNode;
  /** `false` quando a tela já tem a própria FlatList rolando. */
  rolavel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Tela({ children, rolavel = true, style }: TelaProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const conteudo: StyleProp<ViewStyle> = [
    estilos.conteudo,
    { paddingBottom: insets.bottom + spacing.xxl },
    style,
  ];

  if (!rolavel) {
    return <View style={[estilos.raiz, { backgroundColor: colors.bg }]}>{children}</View>;
  }

  return (
    <ScrollView
      style={[estilos.raiz, { backgroundColor: colors.bg }]}
      contentContainerStyle={conteudo}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  conteudo: { padding: spacing.lg, gap: spacing.lg },
  marcador: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tituloSecao: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ponto: { width: 7, height: 7, borderRadius: 4 },
});
