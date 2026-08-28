import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { listarCaronas } from '@/api/client';
import { ROTULOS_FAIXA, type FaixaHorario } from '@/domain/carona';
import { CIDADES, type Tipo } from '@/domain/types';
import { useSessao } from '@/session/session';
import { useTheme } from '@/theme/theme';
import { spacing } from '@/theme/tokens';
import { CartaoCarona, Carregando, Chip, Marcador, Texto, Vazio } from '@/ui';
import { SearchIcon } from '@/ui/icons';

const FAIXAS: FaixaHorario[] = ['manha', 'tarde', 'noite'];

export default function Buscar() {
  const router = useRouter();
  const { user } = useSessao();
  const { colors } = useTheme();

  const [cidade, setCidade] = useState<string | null>(null);
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [faixa, setFaixa] = useState<FaixaHorario | null>(null);
  const [comVagas, setComVagas] = useState(false);
  const [ordenar, setOrdenar] = useState<'horario' | 'preco'>('horario');

  const filtro = useMemo(
    () => ({
      cidade: cidade ?? undefined,
      tipo: tipo ?? undefined,
      faixa: faixa ?? undefined,
      somenteComVagas: comVagas,
      ordenar,
    }),
    [cidade, tipo, faixa, comVagas, ordenar],
  );

  const caronas = useQuery({
    queryKey: ['caronas', filtro],
    queryFn: () => listarCaronas(filtro, user?.id ?? null),
  });

  const total = caronas.data?.length ?? 0;

  /** Um `label` de cidade que muda com o tipo, igual ao site faz. */
  const rotuloCidade =
    tipo === 'ida' ? 'Cidade de origem' : tipo === 'volta' ? 'Cidade de destino' : 'Sua cidade';

  return (
    <View style={[estilos.raiz, { backgroundColor: colors.bg }]}>
      <View style={[estilos.filtros, { borderBottomColor: colors.border }]}>
        <Marcador>Procurar</Marcador>

        <Texto variante="micro" cor="suave">
          VIAGEM
        </Texto>
        <View style={estilos.linha}>
          <Chip rotulo="⇄ Todas" ativo={tipo === null} onPress={() => setTipo(null)} />
          <Chip rotulo="→ Ida" ativo={tipo === 'ida'} onPress={() => setTipo('ida')} />
          <Chip rotulo="← Volta" ativo={tipo === 'volta'} onPress={() => setTipo('volta')} />
        </View>

        <Texto variante="micro" cor="suave">
          {rotuloCidade.toUpperCase()}
        </Texto>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={estilos.linha}>
            <Chip rotulo="Qualquer" ativo={cidade === null} onPress={() => setCidade(null)} />
            {CIDADES.map((c) => (
              <Chip
                key={c}
                rotulo={c}
                ativo={cidade === c}
                onPress={() => setCidade(cidade === c ? null : c)}
              />
            ))}
          </View>
        </ScrollView>

        <Texto variante="micro" cor="suave">
          FILTROS
        </Texto>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={estilos.linha}>
            <Chip rotulo="Com vagas" ativo={comVagas} onPress={() => setComVagas((v) => !v)} />
            <Chip
              rotulo="Menor preço"
              ativo={ordenar === 'preco'}
              onPress={() => setOrdenar(ordenar === 'preco' ? 'horario' : 'preco')}
            />
            {FAIXAS.map((f) => (
              <Chip
                key={f}
                rotulo={ROTULOS_FAIXA[f]}
                ativo={faixa === f}
                onPress={() => setFaixa(faixa === f ? null : f)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {caronas.isPending ? (
        <Carregando texto="Buscando caronas…" />
      ) : (
        <FlatList
          data={caronas.data ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          refreshing={caronas.isFetching}
          onRefresh={() => void caronas.refetch()}
          ListHeaderComponent={
            <Texto variante="legenda" cor="suave">
              {`${total} carona${total !== 1 ? 's' : ''} encontrada${total !== 1 ? 's' : ''}`}
            </Texto>
          }
          ListEmptyComponent={
            <Vazio
              icone={<SearchIcon size={28} color={colors.textDim} />}
              titulo="Nenhuma carona encontrada"
              descricao="Ajuste os filtros ou tente outro dia."
              acao={{
                titulo: 'Limpar filtros',
                onPress: () => {
                  setCidade(null);
                  setTipo(null);
                  setFaixa(null);
                  setComVagas(false);
                },
              }}
            />
          }
          renderItem={({ item }) => (
            <CartaoCarona
              ride={item}
              onPress={() => router.push({ pathname: '/carona/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  filtros: { gap: spacing.sm, padding: spacing.lg, borderBottomWidth: 1 },
  linha: { flexDirection: 'row', gap: spacing.sm },
  lista: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
});
