import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { radius, spacing } from '@/theme/tokens';
import { Botao } from './Botao';
import { Texto } from './Texto';

/** Caixa tracejada de estado vazio. */
export function Vazio({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone?: React.ReactNode;
  titulo: string;
  descricao?: string;
  acao?: { titulo: string; onPress: () => void };
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        estilos.vazio,
        { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
      ]}
    >
      {icone}
      <Texto variante="secao" style={{ textAlign: 'center' }}>
        {titulo}
      </Texto>
      {descricao ? (
        <Texto variante="legenda" cor="suave" style={{ textAlign: 'center' }}>
          {descricao}
        </Texto>
      ) : null}
      {acao ? (
        <Botao titulo={acao.titulo} onPress={acao.onPress} variante="fantasma" tamanho="sm" />
      ) : null}
    </View>
  );
}

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  const { colors } = useTheme();

  return (
    <View style={estilos.carregando}>
      <ActivityIndicator color={colors.primary} />
      <Texto variante="legenda" cor="suave">
        {texto}
      </Texto>
    </View>
  );
}

export function Erro({ mensagem, onTentar }: { mensagem: string; onTentar?: () => void }) {
  const { colors } = useTheme();

  return (
    <View style={[estilos.erro, { backgroundColor: colors.dangerSoft }]}>
      <Texto variante="legenda" style={{ color: colors.danger, flex: 1 }}>
        {mensagem}
      </Texto>
      {onTentar ? (
        <Botao titulo="Tentar de novo" onPress={onTentar} variante="fantasma" tamanho="sm" />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  vazio: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  carregando: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  erro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.sm,
  },
});
