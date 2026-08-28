import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  ApiError,
  aprovarPedido,
  listarCaronas,
  meusPedidos,
  naoLidas,
  pedidosRecebidos,
  recusarPedido,
} from '@/api/client';
import { aposMudanca, chaves } from '@/api/chaves';
import { invalidar } from '@/api/invalidar';
import { formatarValor } from '@/domain/carona';
import { hojeISO } from '@/domain/datas';
import { useSessao } from '@/session/session';
import { useTheme } from '@/theme/theme';
import { spacing } from '@/theme/tokens';
import {
  Avatar,
  Botao,
  Cartao,
  CartaoCarona,
  Carregando,
  Etiqueta,
  Texto,
  TituloSecao,
  Vazio,
  avisar,
} from '@/ui';
import { BellIcon, CarIcon, SearchIcon } from '@/ui/icons';

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Inicio() {
  const router = useRouter();
  const { user, sair } = useSessao();
  const { colors } = useTheme();
  const qc = useQueryClient();

  const motorista = user?.role === 'DRIVER' || user?.role === 'ADMIN';
  const hoje = hojeISO();

  // Todo hook fica ACIMA de qualquer `return` — Regras dos Hooks. Sem usuário
  // as queries ficam desligadas pelo `enabled` em vez de não serem chamadas.
  const caronasHoje = useQuery({
    queryKey: chaves.caronas.lista({ data: hoje }),
    queryFn: () => listarCaronas({ data: hoje }, user!.id),
    enabled: Boolean(user),
  });

  const reservas = useQuery({
    queryKey: chaves.pedidos.meus(user?.id ?? ''),
    queryFn: () => meusPedidos(user!.id),
    enabled: Boolean(user),
  });

  const solicitacoes = useQuery({
    queryKey: chaves.pedidos.recebidos(user?.id ?? ''),
    queryFn: () => pedidosRecebidos(user!.id),
    enabled: Boolean(user) && motorista,
  });

  const alertas = useQuery({
    queryKey: chaves.notificacoes.naoLidas,
    queryFn: naoLidas,
    enabled: Boolean(user),
  });

  function recarregarDecisao() {
    invalidar(qc, aposMudanca.decisaoDoMotorista);
  }

  const aprovar = useMutation({
    mutationFn: (pedidoId: string) => aprovarPedido(pedidoId, user!.id),
    onSuccess: recarregarDecisao,
    onError: (e) => avisar('Não deu', e instanceof ApiError ? e.message : 'Tente de novo.'),
  });

  const recusar = useMutation({
    mutationFn: (pedidoId: string) => recusarPedido(pedidoId, user!.id),
    onSuccess: recarregarDecisao,
  });

  if (!user) return null;

  const ativas = (reservas.data ?? []).filter((p) => p.status !== 'CANCELLED');
  const economia = ativas.reduce((soma, p) => soma + p.ride.valor, 0) * 3;
  const carregandoAlgo =
    caronasHoje.isFetching || reservas.isFetching || solicitacoes.isFetching;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={estilos.conteudo}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={carregandoAlgo}
          onRefresh={recarregarDecisao}
          tintColor={colors.primary}
        />
      }
    >
      <View style={estilos.cabecalho}>
        <Avatar iniciais={user.avatar} tamanho={52} />
        <View style={estilos.saudacao}>
          <Texto variante="subtitulo" numberOfLines={1}>
            {`${saudacao()}, ${user.full_name.split(' ')[0]}`}
          </Texto>
          <Etiqueta tom={motorista ? 'primaria' : 'sucesso'}>
            {motorista ? 'Motorista' : 'Passageiro'}
          </Etiqueta>
        </View>
        <Botao
          titulo={alertas.data ? String(alertas.data) : ''}
          acessibilidade={
            alertas.data
              ? `Notificações, ${alertas.data} não lida${alertas.data > 1 ? 's' : ''}`
              : 'Notificações'
          }
          icone={<BellIcon size={18} color={colors.text} />}
          onPress={() => router.push('/notificacoes')}
          variante="fantasma"
          tamanho="sm"
        />
      </View>

      <View style={estilos.kpis}>
        <Cartao style={estilos.kpi} padding={spacing.lg}>
          <Texto variante="titulo" style={{ color: colors.primary }}>
            {String(ativas.length)}
          </Texto>
          <Texto variante="micro" cor="suave">
            Reservas ativas
          </Texto>
        </Cartao>
        <Cartao style={estilos.kpi} padding={spacing.lg}>
          <Texto variante="titulo" style={{ color: colors.success }}>
            {`R$${formatarValor(economia)}`}
          </Texto>
          <Texto variante="micro" cor="suave">
            Economia no mês
          </Texto>
        </Cartao>
      </View>

      {motorista ? (
        <View style={estilos.secao}>
          <TituloSecao>Solicitações pendentes</TituloSecao>
          {solicitacoes.isPending ? (
            <Carregando />
          ) : (solicitacoes.data ?? []).length === 0 ? (
            <Vazio
              icone={<CarIcon size={28} color={colors.textDim} />}
              titulo="Sem solicitações"
              descricao="Quando alguém pedir vaga nas suas caronas, aparece aqui."
            />
          ) : (
            (solicitacoes.data ?? []).map((p) => (
              <Cartao key={p.id}>
                <View style={estilos.pedido}>
                  <Avatar iniciais={p.passenger_name.slice(0, 2).toUpperCase()} tamanho={40} />
                  <View style={estilos.pedidoInfo}>
                    <Texto variante="corpo" peso="heavy" numberOfLines={1}>
                      {p.passenger_name}
                    </Texto>
                    <Texto variante="micro" cor="suave" peso="regular" numberOfLines={1}>
                      {`${p.ride.origem} → ${p.ride.destino} · ${p.ride.horario} · ${p.ride.data}`}
                    </Texto>
                  </View>
                </View>
                <View style={estilos.pedidoAcoes}>
                  <Botao
                    titulo="Confirmar"
                    tamanho="sm"
                    onPress={() => aprovar.mutate(p.id)}
                    carregando={aprovar.isPending && aprovar.variables === p.id}
                    style={estilos.flex}
                  />
                  <Botao
                    titulo="Recusar"
                    tamanho="sm"
                    variante="perigo"
                    onPress={() => recusar.mutate(p.id)}
                    style={estilos.flex}
                  />
                </View>
              </Cartao>
            ))
          )}
        </View>
      ) : null}

      <View style={estilos.secao}>
        <TituloSecao>Minhas reservas</TituloSecao>
        {reservas.isPending ? (
          <Carregando />
        ) : ativas.length === 0 ? (
          <Vazio
            icone={<SearchIcon size={28} color={colors.textDim} />}
            titulo="Nenhuma reserva ativa"
            descricao="Escolha uma carona disponível para começar."
            acao={{ titulo: 'Procurar carona', onPress: () => router.push('/(app)/buscar') }}
          />
        ) : (
          ativas.map((p) => (
            <CartaoCarona
              key={p.id}
              ride={p.ride}
              compacto
              meuStatus={p.status === 'PENDING' || p.status === 'APPROVED' ? p.status : null}
              onPress={() =>
                router.push({ pathname: '/carona/[id]', params: { id: p.ride_id } })
              }
            />
          ))
        )}
      </View>

      <View style={estilos.secao}>
        <TituloSecao>Caronas de hoje</TituloSecao>
        {caronasHoje.isPending ? (
          <Carregando />
        ) : (caronasHoje.data ?? []).length === 0 ? (
          <Vazio
            titulo="Sem caronas hoje"
            descricao="Procure outros dias ou volte mais tarde."
          />
        ) : (
          (caronasHoje.data ?? [])
            .slice(0, 4)
            .map((r) => (
              <CartaoCarona
                key={r.id}
                ride={r}
                compacto
                onPress={() => router.push({ pathname: '/carona/[id]', params: { id: r.id } })}
              />
            ))
        )}
        <Botao
          titulo="Ver todas as caronas"
          variante="fantasma"
          bloco
          onPress={() => router.push('/(app)/buscar')}
        />
      </View>

      <Cartao style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
        <View style={{ gap: spacing.sm }}>
          <Texto variante="secao">Comunidade uRoute</Texto>
          <Texto variante="legenda" cor="suave">
            Faça parte da rede de caronas universitárias e ajude outros estudantes a chegarem à
            instituição.
          </Texto>
          <Botao
            titulo="Explorar rotas"
            variante="tonal"
            bloco
            onPress={() => router.push('/(app)/buscar')}
          />
        </View>
      </Cartao>

      <Botao titulo="Sair da conta" variante="fantasma" bloco onPress={() => void sair()} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  saudacao: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  kpis: { flexDirection: 'row', gap: spacing.md },
  kpi: { flex: 1, alignItems: 'flex-start', gap: spacing.xs },
  secao: { gap: spacing.md },
  pedido: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pedidoInfo: { flex: 1, gap: 2 },
  pedidoAcoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  flex: { flex: 1 },
});
