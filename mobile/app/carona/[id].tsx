import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { aposMudanca, chaves } from '@/api/chaves';
import {
  ApiError,
  cancelarReserva,
  localizacaoDaCarona,
  meusPedidos,
  obterCarona,
  reservarVaga,
} from '@/api/client';
import { invalidar } from '@/api/invalidar';
import { formatarValor, rotuloTipo, vagasDisponiveis } from '@/domain/carona';
import { distanciaKm, pontosDaRota } from '@/domain/geo';
import type { Coordenada } from '@/domain/geo';
import type { LocalizacaoCarona } from '@/domain/types';
// TEMP: `estaVerificado` fica sem uso enquanto o gate abaixo está desligado.
// import { estaVerificado } from '@/domain/verificacao';
import { useSessao } from '@/session/session';
import { useTheme } from '@/theme/theme';
import { radius, spacing } from '@/theme/tokens';
import {
  Avatar,
  Botao,
  Cartao,
  Carregando,
  Erro,
  Etiqueta,
  MapaCarona,
  Tela,
  Texto,
  TituloSecao,
  avisar,
  confirmar,
} from '@/ui';
import { DestinationFlagIcon, LocationPinIcon } from '@/ui/icons';

/**
 * De quanto em quanto tempo o app pergunta a posição do motorista.
 *
 * 8 s é o meio da faixa de 5 a 10 s que docs/MAPA-AO-VIVO.md definiu pra
 * fase 1. Mais curto que isso queima bateria e plano de dados do passageiro
 * pra ganhar precisão que ninguém percebe num carro a 60 km/h.
 */
const INTERVALO_DE_POSICAO_MS = 8_000;

/**
 * A frase que acompanha o mapa.
 *
 * Existe porque mapa sozinho não é acessível e nem sempre é claro: um pino
 * parado na origem não diz se o motorista ainda não saiu ou se algo deu
 * errado. O texto também é o que sobra pra quem abre no navegador, onde não
 * existe mapa.
 *
 * `falhou` separa duas coisas que pareciam a mesma: não ter posição porque o
 * motorista não compartilhou, e não ter posição porque a busca quebrou.
 * Juntar as duas fazia a tela culpar o motorista por erro de rede.
 */
function resumoDaViagem(
  loc: LocalizacaoCarona | null,
  destino: Coordenada | null,
  falhou: boolean,
): { titulo: string; detalhe: string; aoVivo: boolean } {
  if (falhou) {
    return {
      titulo: 'Não deu pra atualizar',
      detalhe: 'A posição na tela pode estar velha. Tentando de novo em instantes.',
      aoVivo: false,
    };
  }

  if (!loc) {
    return {
      titulo: 'Posição indisponível',
      detalhe: 'O motorista ainda não compartilhou a localização desta carona.',
      aoVivo: false,
    };
  }

  if (loc.estado === 'NOT_STARTED') {
    return {
      titulo: 'Ainda não saiu',
      detalhe: 'O motorista aparece se movendo a partir de uns 15 min antes do horário.',
      aoVivo: false,
    };
  }

  if (loc.estado === 'COMPLETED') {
    return {
      titulo: 'Viagem concluída',
      detalhe: 'O motorista chegou ao destino.',
      aoVivo: false,
    };
  }

  if (!destino) {
    return { titulo: 'A caminho', detalhe: 'O motorista já está em movimento.', aoVivo: true };
  }

  const km = distanciaKm({ lat: loc.lat, lng: loc.lng }, destino);
  return {
    titulo: 'A caminho',
    // "em linha reta" não é preciosismo: a rua sempre dá mais volta que isso,
    // e passageiro que espera 2 km de rua vendo 2 km de régua acha que o
    // motorista parou.
    detalhe: `Cerca de ${km.toFixed(1).replace('.', ',')} km do destino, em linha reta.`,
    aoVivo: true,
  };
}

/** Abre o WhatsApp já com a mensagem pronta, como o site faz. */
function abrirWhatsApp(telefone: string, mensagem: string) {
  const numero = telefone.replace(/\D/g, '');
  const url = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
  void Linking.openURL(url).catch(() =>
    avisar('WhatsApp', 'Não foi possível abrir o WhatsApp neste dispositivo.'),
  );
}

export default function DetalheCarona() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSessao();
  const { colors } = useTheme();
  const qc = useQueryClient();

  const carona = useQuery({
    queryKey: chaves.caronas.uma(id),
    queryFn: () => obterCarona(id, user?.id ?? null),
    enabled: Boolean(id),
  });

  const pedidos = useQuery({
    queryKey: chaves.pedidos.meus(user?.id ?? ''),
    queryFn: () => meusPedidos(user!.id),
    enabled: Boolean(user),
  });

  const reservar = useMutation({
    mutationFn: () => reservarVaga(id, user!),
    onSuccess: () => {
      invalidar(qc, aposMudanca.reserva);
      avisar('Solicitação enviada', 'Agora é esperar o motorista confirmar.');
    },
    onError: (e) => avisar('Não deu', e instanceof ApiError ? e.message : 'Tente de novo.'),
  });

  const cancelar = useMutation({
    mutationFn: () => cancelarReserva(id, user!.id),
    onSuccess: () => invalidar(qc, aposMudanca.reserva),
  });

  // Derivados calculados ANTES de qualquer `return`, porque o `useQuery` do
  // mapa depende deles e todo hook tem que rodar em toda renderização
  // (Regras dos Hooks). Por isso trabalham com `carona.data` ainda podendo
  // ser `undefined`, em vez de esperar o guarda de carregamento lá embaixo.
  const talvez = carona.data;
  const meuPedido = (pedidos.data ?? []).find((p) => p.ride_id === id);
  const souMotorista = Boolean(user && talvez && user.id === talvez.driver_id);
  const aprovado = meuPedido?.status === 'APPROVED';
  const pendente = meuPedido?.status === 'PENDING';
  // TEMP: gate de verificação de aluno desligado a pedido — reverter para
  // `user ? estaVerificado(user) : false` (e descomentar o import acima)
  // quando a validação voltar a ser exigida.
  const verificado = true;

  const emAndamento = talvez?.status === 'ACTIVE' || talvez?.status === 'FULL';
  const podeVerMapa = Boolean(talvez) && emAndamento && (souMotorista || aprovado);

  /**
   * Fase 1 do rastreamento: polling, não WebSocket (docs/MAPA-AO-VIVO.md).
   *
   * `enabled` desliga o laço pra quem não tem reserva aprovada, então o app
   * nem chega a pedir a posição. Isso economiza request, mas não é o que
   * protege: quem proíbe é o backend. Aqui é só educação do cliente.
   */
  const localizacao = useQuery({
    queryKey: chaves.localizacao.daCarona(id),
    queryFn: () => localizacaoDaCarona(id, user?.id ?? null),
    enabled: podeVerMapa,
    refetchInterval: INTERVALO_DE_POSICAO_MS,
  });

  if (carona.isPending) return <Carregando />;

  if (carona.isError || !carona.data) {
    return (
      <Tela>
        <Erro
          mensagem="Não foi possível carregar esta carona."
          onTentar={() => void carona.refetch()}
        />
      </Tela>
    );
  }

  const r = carona.data;
  const vagas = vagasDisponiveis(r);
  const rota = pontosDaRota(r.departure_city, r.tipo);
  const posicao = localizacao.data
    ? { lat: localizacao.data.lat, lng: localizacao.data.lng }
    : null;
  const resumo = resumoDaViagem(
    localizacao.data ?? null,
    rota?.destino ?? null,
    localizacao.isError,
  );

  return (
    <Tela>
      <Cartao padding={spacing.xl}>
        <View style={{ gap: spacing.lg }}>
          <View style={estilos.rota}>
            <LocationPinIcon size={18} color={colors.primary} />
            <Texto variante="subtitulo" numberOfLines={1} style={estilos.cidade}>
              {r.origem}
            </Texto>
            <Texto style={{ color: colors.textDim, fontSize: 18 }}>{'→'}</Texto>
            <DestinationFlagIcon size={18} color={colors.success} />
            <Texto variante="subtitulo" numberOfLines={1} style={estilos.cidade}>
              {r.destino}
            </Texto>
          </View>

          <View style={estilos.etiquetas}>
            <Etiqueta tom={r.tipo === 'ida' ? 'ida' : 'volta'}>{rotuloTipo(r.tipo)}</Etiqueta>
            <Etiqueta>{r.data}</Etiqueta>
            <Etiqueta>{r.horario}</Etiqueta>
            <Etiqueta tom={vagas > 0 ? 'sucesso' : 'perigo'}>
              {vagas > 0 ? `${vagas} vaga${vagas !== 1 ? 's' : ''}` : 'Esgotado'}
            </Etiqueta>
          </View>

          <View style={[estilos.preco, { backgroundColor: colors.primarySoft }]}>
            <Texto variante="titulo" style={{ color: colors.primary }}>
              {`R$${formatarValor(r.valor)}`}
            </Texto>
            <Texto variante="micro" cor="suave">
              por pessoa · rateio da gasolina
            </Texto>
          </View>
        </View>
      </Cartao>

      <Cartao padding={spacing.xl}>
        <View style={{ gap: spacing.lg }}>
          <TituloSecao>Motorista</TituloSecao>
          <View style={estilos.motorista}>
            <Avatar iniciais={r.driver_avatar} tamanho={52} />
            <View style={estilos.motoristaInfo}>
              <Texto variante="corpo" peso="heavy" numberOfLines={1}>
                {r.driver}
              </Texto>
              {r.course ? (
                <Texto variante="micro" cor="suave" peso="regular" numberOfLines={1}>
                  {r.course}
                </Texto>
              ) : null}
            </View>
          </View>

          {r.driver_institution ? (
            <View style={estilos.dado}>
              <Texto variante="legenda" cor="suave">
                Instituição
              </Texto>
              <Texto variante="legenda" peso="bold">
                {r.driver_institution}
              </Texto>
            </View>
          ) : null}

          {r.vehicle ? (
            <View style={estilos.dado}>
              <Texto variante="legenda" cor="suave">
                Veículo
              </Texto>
              <Texto variante="legenda" peso="bold">
                {[r.vehicle, r.driver_vehicle_color].filter(Boolean).join(' · ')}
              </Texto>
            </View>
          ) : null}

          {r.neighborhood ? (
            <View style={estilos.dado}>
              <Texto variante="legenda" cor="suave">
                Bairro de saída
              </Texto>
              <Texto variante="legenda" peso="bold">
                {r.neighborhood}
              </Texto>
            </View>
          ) : null}

          {r.license_plate ? (
            <View style={estilos.dado}>
              <Texto variante="legenda" cor="suave">
                Placa
              </Texto>
              <Texto variante="legenda" peso="bold">
                {r.license_plate}
              </Texto>
            </View>
          ) : (
            <Texto variante="micro" cor="apagado" peso="regular">
              Placa e telefone do motorista aparecem depois que ele confirmar sua vaga.
            </Texto>
          )}
        </View>
      </Cartao>

      {podeVerMapa && rota ? (
        <Cartao padding={spacing.xl}>
          <View style={{ gap: spacing.lg }}>
            <TituloSecao>Onde está a carona</TituloSecao>

            <MapaCarona
              origem={rota.origem}
              destino={rota.destino}
              motorista={posicao}
              rotuloOrigem={r.origem}
              rotuloDestino={r.destino}
              descricao={`Mapa da carona de ${r.origem} para ${r.destino}. ${resumo.titulo}. ${resumo.detalhe}`}
            />

            <View style={estilos.dado}>
              <Texto variante="legenda" peso="bold">
                {resumo.titulo}
              </Texto>
              {/*
                Indicador estável, não o `isFetching`. Com a busca resolvendo
                em milissegundos, "atualizando" aparecia e sumia a cada 8
                segundos, empurrando o texto ao lado. Piscar não informa nada:
                o que o passageiro quer saber é se aquilo ali é a posição de
                agora, e isso não muda entre uma volta e outra do laço.
              */}
              {resumo.aoVivo ? (
                <View style={estilos.aoVivo}>
                  <View style={[estilos.pontoAoVivo, { backgroundColor: colors.success }]} />
                  <Texto variante="micro" cor="suave" peso="bold">
                    ao vivo
                  </Texto>
                </View>
              ) : null}
            </View>
            <Texto variante="micro" cor="suave" peso="regular">
              {resumo.detalhe}
            </Texto>
          </View>
        </Cartao>
      ) : null}

      {souMotorista ? (
        <Cartao padding={spacing.xl}>
          <Texto variante="legenda" cor="suave">
            Esta carona é sua. Gerencie as solicitações na aba Início.
          </Texto>
        </Cartao>
      ) : (
        <View style={{ gap: spacing.md }}>
          {aprovado ? (
            <>
              <Botao
                titulo="Falar com o motorista"
                variante="tonal"
                bloco
                tamanho="lg"
                onPress={() => {
                  if (!r.driver_phone) {
                    avisar('Sem telefone', 'O motorista não informou telefone.');
                    return;
                  }
                  abrirWhatsApp(
                    r.driver_phone,
                    `Oi ${r.driver}! Sou ${user?.full_name} do Uroute. Confirmando a carona ${r.origem} para ${r.destino} às ${r.horario} do dia ${r.data}.`,
                  );
                }}
              />
              <Botao
                titulo="Cancelar reserva"
                variante="perigo"
                bloco
                onPress={() => cancelar.mutate()}
              />
            </>
          ) : pendente ? (
            <>
              <View style={[estilos.aviso, { backgroundColor: colors.warningSoft }]}>
                <Texto variante="legenda" peso="bold" style={{ color: colors.warning }}>
                  Aguardando confirmação do motorista
                </Texto>
              </View>
              <Botao
                titulo="Cancelar solicitação"
                variante="perigo"
                bloco
                onPress={() => cancelar.mutate()}
              />
            </>
          ) : !verificado ? (
            <View
              style={[estilos.aviso, { backgroundColor: colors.warningSoft, gap: spacing.sm }]}
            >
              <Texto variante="legenda" peso="bold" style={{ color: colors.warning }}>
                Verificação de aluno pendente
              </Texto>
              <Texto variante="micro" cor="suave" style={{ textAlign: 'center' }}>
                Complete a verificação pra poder reservar vagas.
              </Texto>
              <Botao
                titulo="Completar verificação"
                variante="tonal"
                bloco
                onPress={() => router.push('/verificacao')}
              />
            </View>
          ) : vagas > 0 ? (
            <Botao
              titulo="Reservar vaga"
              bloco
              tamanho="lg"
              carregando={reservar.isPending}
              onPress={() =>
                confirmar({
                  titulo: 'Confirmar reserva',
                  mensagem: `${r.origem} → ${r.destino} às ${r.horario}\nR$${formatarValor(r.valor)} por pessoa`,
                  textoConfirmar: 'Reservar',
                  onConfirmar: () => reservar.mutate(),
                })
              }
            />
          ) : (
            <View style={[estilos.aviso, { backgroundColor: colors.dangerSoft }]}>
              <Texto variante="legenda" peso="bold" style={{ color: colors.danger }}>
                Esta carona já está cheia.
              </Texto>
            </View>
          )}
        </View>
      )}

      <Botao titulo="Fechar" variante="fantasma" bloco onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  rota: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cidade: { flexShrink: 1 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  preco: { alignItems: 'center', gap: 2, padding: spacing.lg, borderRadius: radius.sm },
  motorista: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  motoristaInfo: { flex: 1, gap: 2 },
  dado: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  aviso: { padding: spacing.lg, borderRadius: radius.sm, alignItems: 'center' },
  aoVivo: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pontoAoVivo: { width: 7, height: 7, borderRadius: 4 },
});
