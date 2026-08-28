import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/theme';
import { fontSize, fontWeight, radius, spacing } from '@/theme/tokens';
import { Texto } from './Texto';

/**
 * Só existe UMA cor de ação principal no app (`primario`). `tonal` é a mesma
 * cor num tom suave para ações de segunda prioridade na mesma tela — não uma
 * segunda cor de marca competindo pela atenção. `fantasma` é neutro,
 * `perigo` é sempre a ação destrutiva.
 */
type Variante = 'primario' | 'tonal' | 'fantasma' | 'perigo';
type Tamanho = 'md' | 'sm' | 'lg';

const ALTURA: Record<Tamanho, number> = { sm: 34, md: 44, lg: 52 };

/**
 * Alvo mínimo de toque recomendado por Apple e Google. O botão pequeno é menor
 * que isso de propósito, para caber nas listas, então a diferença é compensada
 * com `hitSlop`: a área tocável cresce sem o desenho mudar.
 */
const ALVO_MINIMO = 44;

function folgaDeToque(altura: number): number {
  return Math.max(0, Math.ceil((ALVO_MINIMO - altura) / 2));
}

interface Props {
  titulo: string;
  onPress?: () => void;
  variante?: Variante;
  tamanho?: Tamanho;
  bloco?: boolean;
  carregando?: boolean;
  desabilitado?: boolean;
  /** Ícone à esquerda do rótulo — um componente do set em `@/ui/icons`, já dimensionado. */
  icone?: ReactNode;
  /**
   * Texto que o leitor de tela anuncia. Obrigatório quando o rótulo visível é
   * curto demais para dizer sozinho o que o botão faz.
   */
  acessibilidade?: string;
  style?: StyleProp<ViewStyle>;
}

export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  tamanho = 'md',
  bloco = false,
  carregando = false,
  desabilitado = false,
  icone,
  acessibilidade,
  style,
}: Props) {
  const { colors } = useTheme();
  const inativo = desabilitado || carregando;

  const fundo: Record<Variante, string> = {
    primario: colors.primary,
    tonal: colors.primarySoft,
    fantasma: 'transparent',
    perigo: colors.dangerSoft,
  };
  const texto: Record<Variante, string> = {
    primario: colors.onPrimary,
    tonal: colors.primary,
    fantasma: colors.text,
    perigo: colors.danger,
  };
  const borda: Record<Variante, string> = {
    primario: 'transparent',
    tonal: 'transparent',
    fantasma: colors.border,
    perigo: 'transparent',
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={acessibilidade ?? titulo}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      disabled={inativo}
      onPress={onPress}
      hitSlop={folgaDeToque(ALTURA[tamanho])}
      style={({ pressed }) => [
        estilos.base,
        {
          minHeight: ALTURA[tamanho],
          backgroundColor: fundo[variante],
          borderColor: borda[variante],
          opacity: inativo ? 0.55 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !inativo ? 0.985 : 1 }],
        },
        bloco && estilos.bloco,
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={texto[variante]} size="small" />
      ) : (
        <View style={estilos.conteudo}>
          {icone}
          <Texto
            style={{
              color: texto[variante],
              fontSize: tamanho === 'sm' ? fontSize.sm : fontSize.md,
              fontWeight: fontWeight.heavy,
            }}
          >
            {titulo}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  bloco: { alignSelf: 'stretch', width: '100%' },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
