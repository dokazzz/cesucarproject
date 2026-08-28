import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { aposMudanca, chaves } from '@/api/chaves';
import { ApiError, cancelarCarona, minhasCaronas, publicarCarona } from '@/api/client';
import { invalidar } from '@/api/invalidar';
import { calcularRateio, formatarValor, rotaDe, rotuloTipo } from '@/domain/carona';
import { CIDADES, type Tipo } from '@/domain/types';
import { validarValor, validarVagas } from '@/domain/validacao';
// TEMP: `estaVerificado` fica sem uso enquanto o gate abaixo está desligado.
// import { estaVerificado } from '@/domain/verificacao';
import { hojeISO } from '@/domain/datas';
import { useSessao } from '@/session/session';
import { useTheme } from '@/theme/theme';
import { radius, spacing } from '@/theme/tokens';
import {
  Botao,
  Campo,
  Cartao,
  CartaoCarona,
  Carregando,
  Chip,
  Marcador,
  Tela,
  Texto,
  TituloSecao,
  Vazio,
  avisar,
  confirmar,
} from '@/ui';
import { CarIcon } from '@/ui/icons';

const VAGAS_POSSIVEIS = [1, 2, 3, 4] as const;

export default function Oferecer() {
  const router = useRouter();
  const { user } = useSessao();
  const { colors } = useTheme();
  const qc = useQueryClient();

  const [tipo, setTipo] = useState<Tipo>('ida');
  const [cidade, setCidade] = useState<string | null>(null);
  const [bairro, setBairro] = useState('');
  const [data, setData] = useState(hojeISO());
  const [horario, setHorario] = useState('07:00');
  const [vagas, setVagas] = useState(3);
  const [valor, setValor] = useState('');

  // Calculadora de rateio — números crus, resultado derivado.
  const [distancia, setDistancia] = useState('');
  const [consumo, setConsumo] = useState('');
  const [precoLitro, setPrecoLitro] = useState('');

  const [erros, setErros] = useState<Record<string, string>>({});

  const rateio = useMemo(
    () =>
      calcularRateio(
        Number(distancia.replace(',', '.')),
        Number(consumo.replace(',', '.')),
        Number(precoLitro.replace(',', '.')),
        vagas,
      ),
    [distancia, consumo, precoLitro, vagas],
  );

  const minhas = useQuery({
    queryKey: chaves.caronas.doMotorista(user?.id ?? ''),
    queryFn: () => minhasCaronas(user!.id),
    enabled: Boolean(user),
  });

  const publicar = useMutation({
    mutationFn: () =>
      publicarCarona(
        {
          tipo,
          cidade: cidade!,
          bairro: bairro.trim() || null,
          data,
          horario,
          vagas,
          valor: Number(valor.replace(',', '.')),
        },
        user!.id,
      ),
    onSuccess: () => {
      invalidar(qc, aposMudanca.carona);
      setValor('');
      setBairro('');
      avisar('Publicado', 'Sua carona já aparece na busca.');
    },
    onError: (e) => avisar('Não deu', e instanceof ApiError ? e.message : 'Tente de novo.'),
  });

  const cancelar = useMutation({
    mutationFn: (rideId: string) => cancelarCarona(rideId, user!.id),
    onSuccess: () => invalidar(qc, aposMudanca.carona),
  });

  if (!user) return null;

  // TEMP: gate de verificação de aluno desligado a pedido — reverter para
  // `estaVerificado(user)` (e descomentar o import acima) quando a validação
  // voltar a ser exigida.
  const verificado = true;

  function submeter() {
    const novos: Record<string, string> = {};

    if (!cidade) novos.cidade = 'Escolha a cidade.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) novos.data = 'Use o formato AAAA-MM-DD.';
    if (!/^\d{2}:\d{2}$/.test(horario)) novos.horario = 'Use o formato HH:MM.';

    const vVagas = validarVagas(vagas);
    if (!vVagas.ok) novos.vagas = vVagas.erro;

    const numero = Number(valor.replace(',', '.'));
    const vValor = validarValor(numero);
    if (!valor) novos.valor = 'Informe o valor por pessoa.';
    else if (!vValor.ok) novos.valor = vValor.erro;

    setErros(novos);
    if (Object.keys(novos).length === 0) publicar.mutate();
  }

  const previa = cidade ? rotaDe(cidade, tipo) : null;

  return (
    <KeyboardAvoidingView
      style={estilos.raiz}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Tela>
        <View style={{ gap: spacing.xs }}>
          <Marcador>Motorista</Marcador>
          <Texto variante="titulo">Ofereça sua carona</Texto>
        </View>

        {!verificado ? (
          <Cartao padding={spacing.xl}>
            <View style={{ gap: spacing.md }}>
              <Texto variante="secao" style={{ color: colors.warning }}>
                Verificação de aluno pendente
              </Texto>
              <Texto variante="legenda" cor="suave">
                Pra publicar caronas, primeiro confirme seu vínculo com a instituição.
              </Texto>
              <Botao
                titulo="Completar verificação"
                variante="tonal"
                bloco
                onPress={() => router.push('/verificacao')}
              />
            </View>
          </Cartao>
        ) : (
          <>
            <Cartao padding={spacing.xl}>
              <View style={{ gap: spacing.lg }}>
                <TituloSecao>A viagem</TituloSecao>

                <View style={estilos.linha}>
                  <Chip rotulo="→ Ida" ativo={tipo === 'ida'} onPress={() => setTipo('ida')} />
                  <Chip
                    rotulo="← Volta"
                    ativo={tipo === 'volta'}
                    onPress={() => setTipo('volta')}
                  />
                </View>

                {previa ? (
                  <View style={[estilos.previa, { backgroundColor: colors.surfaceRaised }]}>
                    <Texto variante="corpo" peso="heavy" style={{ textAlign: 'center' }}>
                      {`${previa.origem}  →  ${previa.destino}`}
                    </Texto>
                    <Texto variante="micro" cor="suave" style={{ textAlign: 'center' }}>
                      {rotuloTipo(tipo)}
                    </Texto>
                  </View>
                ) : null}

                <View style={{ gap: spacing.sm }}>
                  <Texto variante="legenda" peso="bold" cor="suave">
                    {tipo === 'ida' ? 'Cidade de origem *' : 'Cidade de destino *'}
                  </Texto>
                  <View style={estilos.chips}>
                    {CIDADES.map((c) => (
                      <Chip
                        key={c}
                        rotulo={c}
                        ativo={cidade === c}
                        onPress={() => setCidade(c)}
                      />
                    ))}
                  </View>
                  {erros.cidade ? (
                    <Texto variante="micro" cor="perigo">
                      {erros.cidade}
                    </Texto>
                  ) : null}
                </View>

                <Campo
                  rotulo="Bairro de saída"
                  valor={bairro}
                  onChange={setBairro}
                  placeholder="Ex.: Vila Cachoeirinha"
                  autoCapitalize="words"
                  dica="Ajuda o passageiro a saber se fica no caminho."
                />

                <Campo
                  rotulo="Data"
                  obrigatorio
                  valor={data}
                  onChange={setData}
                  placeholder="AAAA-MM-DD"
                  teclado="numbers-and-punctuation"
                  maxLength={10}
                  erro={erros.data ?? null}
                />

                <Campo
                  rotulo="Horário de saída"
                  obrigatorio
                  valor={horario}
                  onChange={setHorario}
                  placeholder="HH:MM"
                  teclado="numbers-and-punctuation"
                  maxLength={5}
                  erro={erros.horario ?? null}
                />
              </View>
            </Cartao>

            <Cartao padding={spacing.xl}>
              <View style={{ gap: spacing.lg }}>
                <TituloSecao>Vagas e valor</TituloSecao>

                <View style={{ gap: spacing.sm }}>
                  <Texto variante="legenda" peso="bold" cor="suave">
                    Vagas disponíveis *
                  </Texto>
                  <View style={estilos.linha}>
                    {VAGAS_POSSIVEIS.map((n) => (
                      <Chip
                        key={n}
                        rotulo={`${n} vaga${n > 1 ? 's' : ''}`}
                        ativo={vagas === n}
                        onPress={() => setVagas(n)}
                      />
                    ))}
                  </View>
                </View>

                <Campo
                  rotulo="Valor por pessoa (R$)"
                  obrigatorio
                  valor={valor}
                  onChange={setValor}
                  placeholder="Ex.: 10"
                  teclado="decimal-pad"
                  erro={erros.valor ?? null}
                />
              </View>
            </Cartao>

            <Cartao padding={spacing.xl}>
              <View style={{ gap: spacing.lg }}>
                <TituloSecao>Calculadora de rateio</TituloSecao>
                <Texto variante="legenda" cor="suave">
                  O custo é dividido entre você e os passageiros. É gasolina dividida, não
                  tarifa.
                </Texto>

                <Campo
                  rotulo="Distância (km)"
                  valor={distancia}
                  onChange={setDistancia}
                  placeholder="25"
                  teclado="decimal-pad"
                />
                <Campo
                  rotulo="Consumo (km/L)"
                  valor={consumo}
                  onChange={setConsumo}
                  placeholder="12"
                  teclado="decimal-pad"
                />
                <Campo
                  rotulo="Preço do combustível (R$/L)"
                  valor={precoLitro}
                  onChange={setPrecoLitro}
                  placeholder="6,00"
                  teclado="decimal-pad"
                />

                {rateio ? (
                  <View style={[estilos.resultado, { backgroundColor: colors.successSoft }]}>
                    <Texto variante="micro" cor="suave">
                      {`${rateio.litros.toFixed(1)} L · custo total R$${formatarValor(rateio.custoTotal)} · dividido por ${vagas + 1}`}
                    </Texto>
                    <Texto variante="subtitulo" style={{ color: colors.success }}>
                      {`R$${formatarValor(rateio.porPassageiro)} por pessoa`}
                    </Texto>
                    <Botao
                      titulo="Usar este valor"
                      variante="fantasma"
                      tamanho="sm"
                      onPress={() =>
                        setValor(rateio.porPassageiro.toFixed(2).replace('.', ','))
                      }
                    />
                  </View>
                ) : null}
              </View>
            </Cartao>

            <Botao
              titulo="Publicar carona"
              onPress={submeter}
              carregando={publicar.isPending}
              bloco
              tamanho="lg"
            />
          </>
        )}

        <View style={{ gap: spacing.md }}>
          <TituloSecao>Minhas caronas</TituloSecao>
          {minhas.isPending ? (
            <Carregando />
          ) : (minhas.data ?? []).length === 0 ? (
            <Vazio
              icone={<CarIcon size={28} color={colors.textDim} />}
              titulo="Você ainda não publicou nenhuma carona"
            />
          ) : (
            (minhas.data ?? []).map((r) => (
              <View key={r.id} style={{ gap: spacing.sm }}>
                <CartaoCarona ride={r} compacto />
                <Botao
                  titulo="Cancelar carona"
                  variante="perigo"
                  tamanho="sm"
                  onPress={() =>
                    confirmar({
                      titulo: 'Cancelar carona',
                      mensagem: 'Isso avisa quem já reservou. Confirma?',
                      textoConfirmar: 'Cancelar carona',
                      destrutivo: true,
                      onConfirmar: () => cancelar.mutate(r.id),
                    })
                  }
                />
              </View>
            ))
          )}
        </View>
      </Tela>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  linha: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  previa: { gap: 2, padding: spacing.lg, borderRadius: radius.sm },
  resultado: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.sm },
});
