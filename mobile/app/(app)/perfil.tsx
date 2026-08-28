import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { CIDADES, CURSOS } from '@/domain/types';
import {
  formatarTelefone,
  normalizarPlaca,
  validarNome,
  validarPlaca,
} from '@/domain/validacao';
import {
  DESCRICOES_VERIFICACAO,
  ROTULOS_VERIFICACAO,
  TOM_VERIFICACAO,
} from '@/domain/verificacao';
import { resetarDemo } from '@/mocks/db';
import { useSessao } from '@/session/session';
import { useTheme } from '@/theme/theme';
import { radius, spacing } from '@/theme/tokens';
import {
  Avatar,
  Botao,
  Campo,
  Cartao,
  Chip,
  Etiqueta,
  Marcador,
  Tela,
  Texto,
  TituloSecao,
  avisar,
} from '@/ui';

export default function Perfil() {
  const router = useRouter();
  const { user, sair, atualizarUsuario } = useSessao();
  const { colors } = useTheme();

  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState(user?.full_name ?? '');
  const [telefone, setTelefone] = useState(user?.phone ?? '');
  const [curso, setCurso] = useState(user?.course ?? null);
  const [cidade, setCidade] = useState(user?.city ?? null);
  const [bairro, setBairro] = useState(user?.neighborhood ?? '');
  const [marca, setMarca] = useState(user?.vehicle_brand ?? '');
  const [modelo, setModelo] = useState(user?.vehicle_model ?? '');
  const [cor, setCor] = useState(user?.vehicle_color ?? '');
  const [placa, setPlaca] = useState(user?.vehicle_plate ?? '');
  const [erros, setErros] = useState<Record<string, string>>({});

  if (!user) return null;

  const motorista = user.role === 'DRIVER' || user.role === 'ADMIN';

  async function salvar() {
    const novos: Record<string, string> = {};

    const vNome = validarNome(nome);
    if (!vNome.ok) novos.nome = vNome.erro;

    const vPlaca = validarPlaca(placa);
    if (!vPlaca.ok) novos.placa = vPlaca.erro;

    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setSalvando(true);
    try {
      await atualizarUsuario({
        full_name: nome.trim(),
        phone: telefone || null,
        course: curso,
        city: cidade,
        neighborhood: bairro.trim() || null,
        vehicle_brand: marca.trim() || null,
        vehicle_model: modelo.trim() || null,
        vehicle_color: cor.trim() || null,
        vehicle_plate: placa ? normalizarPlaca(placa) : null,
      });
      setEditando(false);
    } finally {
      setSalvando(false);
    }
  }

  async function trocarPapel() {
    const novo = motorista ? 'PASSENGER' : 'DRIVER';
    await atualizarUsuario({ role: novo });
    avisar(
      'Pronto',
      novo === 'DRIVER'
        ? 'Agora você pode publicar caronas. A aba "Oferecer" apareceu.'
        : 'Você voltou a ser passageiro.',
    );
  }

  return (
    <KeyboardAvoidingView
      style={estilos.raiz}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Tela>
        <View style={{ gap: spacing.xs }}>
          <Marcador>Conta</Marcador>
          <Texto variante="titulo">Meu perfil</Texto>
        </View>

        <Cartao padding={spacing.xl}>
          <View style={estilos.identidade}>
            <Avatar iniciais={user.avatar} tamanho={64} />
            <View style={estilos.identidadeInfo}>
              <Texto variante="subtitulo" numberOfLines={1}>
                {user.full_name}
              </Texto>
              <Texto variante="legenda" cor="suave">
                {`RGM ${user.rgm}`}
              </Texto>
              <Etiqueta tom={motorista ? 'primaria' : 'sucesso'}>
                {motorista ? 'Motorista' : 'Passageiro'}
              </Etiqueta>
            </View>
          </View>
        </Cartao>

        <Cartao padding={spacing.xl}>
          <View style={{ gap: spacing.md }}>
            <View style={estilos.linhaVerificacao}>
              <TituloSecao>Verificação de aluno</TituloSecao>
              <Etiqueta tom={TOM_VERIFICACAO[user.verification_status]}>
                {ROTULOS_VERIFICACAO[user.verification_status]}
              </Etiqueta>
            </View>
            <Texto variante="legenda" cor="suave">
              {DESCRICOES_VERIFICACAO[user.verification_status]}
            </Texto>
            <Botao
              titulo={
                user.verification_status === 'VERIFIED'
                  ? 'Ver verificação'
                  : 'Completar verificação'
              }
              variante={user.verification_status === 'VERIFIED' ? 'fantasma' : 'tonal'}
              bloco
              onPress={() => router.push('/verificacao')}
            />
          </View>
        </Cartao>

        {editando ? (
          <>
            <Cartao padding={spacing.xl}>
              <View style={{ gap: spacing.lg }}>
                <TituloSecao>Dados pessoais</TituloSecao>

                <Campo
                  rotulo="Nome completo"
                  valor={nome}
                  onChange={setNome}
                  autoCapitalize="words"
                  erro={erros.nome ?? null}
                />
                <Campo
                  rotulo="Telefone"
                  valor={telefone}
                  onChange={(v) => setTelefone(formatarTelefone(v))}
                  placeholder="(51) 99999-0000"
                  teclado="phone-pad"
                  maxLength={15}
                />
                <Campo
                  rotulo="Bairro"
                  valor={bairro}
                  onChange={setBairro}
                  autoCapitalize="words"
                />

                <View style={{ gap: spacing.sm }}>
                  <Texto variante="legenda" peso="bold" cor="suave">
                    Cidade
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
                </View>

                <View style={{ gap: spacing.sm }}>
                  <Texto variante="legenda" peso="bold" cor="suave">
                    Curso
                  </Texto>
                  <View style={estilos.chips}>
                    {CURSOS.map((c) => (
                      <Chip
                        key={c}
                        rotulo={c}
                        ativo={curso === c}
                        onPress={() => setCurso(curso === c ? null : c)}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </Cartao>

            <Cartao padding={spacing.xl}>
              <View style={{ gap: spacing.lg }}>
                <TituloSecao>Veículo</TituloSecao>
                <Campo
                  rotulo="Marca"
                  valor={marca}
                  onChange={setMarca}
                  placeholder="Volkswagen"
                />
                <Campo
                  rotulo="Modelo"
                  valor={modelo}
                  onChange={setModelo}
                  placeholder="Gol 2020"
                />
                <Campo rotulo="Cor" valor={cor} onChange={setCor} placeholder="Prata" />
                <Campo
                  rotulo="Placa"
                  valor={placa}
                  onChange={(v) => setPlaca(v.toUpperCase())}
                  placeholder="ABC1D23"
                  maxLength={8}
                  autoCapitalize="characters"
                  erro={erros.placa ?? null}
                  dica="ABC1234 (antiga) ou ABC1D23 (Mercosul)."
                />
              </View>
            </Cartao>

            <Botao titulo="Salvar alterações" onPress={salvar} carregando={salvando} bloco />
            <Botao
              titulo="Cancelar"
              variante="fantasma"
              bloco
              onPress={() => setEditando(false)}
            />
          </>
        ) : (
          <>
            <Cartao padding={spacing.xl}>
              <View style={{ gap: spacing.md }}>
                <TituloSecao>Dados</TituloSecao>
                <Linha rotulo="Instituição" valor={user.institution} />
                <Linha rotulo="Curso" valor={user.course} />
                <Linha rotulo="Cidade" valor={user.city} />
                <Linha rotulo="Bairro" valor={user.neighborhood} />
                <Linha rotulo="Telefone" valor={user.phone} />
              </View>
            </Cartao>

            {motorista ? (
              <Cartao padding={spacing.xl}>
                <View style={{ gap: spacing.md }}>
                  <TituloSecao>Veículo</TituloSecao>
                  <Linha rotulo="Marca" valor={user.vehicle_brand} />
                  <Linha rotulo="Modelo" valor={user.vehicle_model} />
                  <Linha rotulo="Cor" valor={user.vehicle_color} />
                  <Linha rotulo="Placa" valor={user.vehicle_plate} />
                </View>
              </Cartao>
            ) : null}

            <Botao titulo="Editar perfil" onPress={() => setEditando(true)} bloco />
          </>
        )}

        <Cartao padding={spacing.xl}>
          <View style={{ gap: spacing.md }}>
            <TituloSecao>Tipo de conta</TituloSecao>
            <Texto variante="legenda" cor="suave">
              {motorista
                ? 'Como motorista você publica caronas e aprova quem embarca.'
                : 'Vire motorista pra publicar suas próprias rotas.'}
            </Texto>
            <Botao
              titulo={motorista ? 'Voltar a ser passageiro' : 'Quero ser motorista'}
              variante="tonal"
              bloco
              onPress={() => void trocarPapel()}
            />
          </View>
        </Cartao>

        <View style={[estilos.demo, { borderColor: colors.border }]}>
          <Texto variante="micro" cor="apagado">
            ÁREA DE DEMONSTRAÇÃO
          </Texto>
          <Botao
            titulo="Resetar dados da demo"
            variante="fantasma"
            tamanho="sm"
            bloco
            onPress={() => {
              resetarDemo();
              avisar('Pronto', 'Os dados voltaram ao estado inicial.');
            }}
          />
        </View>

        <Botao titulo="Sair da conta" variante="perigo" bloco onPress={() => void sair()} />
      </Tela>
    </KeyboardAvoidingView>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <View style={estilos.linhaDado}>
      <Texto variante="legenda" cor="suave">
        {rotulo}
      </Texto>
      <Texto variante="legenda" peso="bold" numberOfLines={1} style={estilos.linhaValor}>
        {valor || '—'}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  identidade: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identidadeInfo: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  linhaVerificacao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  linhaDado: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  linhaValor: { flexShrink: 1, textAlign: 'right' },
  demo: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
