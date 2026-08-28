import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { CIDADES, CURSOS, INSTITUICOES } from '@/domain/types';
import {
  apenasDigitosRgm,
  formatarTelefone,
  validarConfirmacaoSenha,
  validarNome,
  validarRgm,
  validarSenha,
} from '@/domain/validacao';
import { useSessao } from '@/session/session';
import { useTheme } from '@/theme/theme';
import { radius, spacing } from '@/theme/tokens';
import {
  Botao,
  Campo,
  Cartao,
  Chip,
  Marcador,
  SeletorBusca,
  Tela,
  Texto,
  TituloSecao,
} from '@/ui';

type Papel = 'passenger' | 'driver';

export default function Cadastro() {
  const router = useRouter();
  const { criarConta } = useSessao();
  const { colors } = useTheme();

  const [nome, setNome] = useState('');
  const [rgm, setRgm] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [telefone, setTelefone] = useState('');
  const [curso, setCurso] = useState<string | null>(null);
  const [cidade, setCidade] = useState<string | null>(null);
  const [instituicao, setInstituicao] = useState<string | null>(null);
  const [papel, setPapel] = useState<Papel>('passenger');

  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  function limpar(campo: string) {
    setErros((e) => {
      const { [campo]: _descartado, ...resto } = e;
      return resto;
    });
  }

  async function submeter() {
    const novos: Record<string, string> = {};

    const vNome = validarNome(nome);
    if (!vNome.ok) novos.nome = vNome.erro;

    const vRgm = validarRgm(rgm);
    if (!vRgm.ok) novos.rgm = vRgm.erro;

    const vSenha = validarSenha(senha);
    if (!vSenha.ok) novos.senha = vSenha.erro;

    const vConf = validarConfirmacaoSenha(senha, confirmacao);
    if (!vConf.ok) novos.confirmacao = vConf.erro;

    if (!cidade) novos.cidade = 'Escolha sua cidade.';
    if (!instituicao) novos.instituicao = 'Escolha sua instituição de ensino.';

    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setEnviando(true);
    try {
      await criarConta({
        full_name: nome.trim(),
        rgm,
        role: papel,
        course: curso,
        city: cidade,
        phone: telefone || null,
        institution: instituicao,
      });
      router.replace('/(app)/inicio');
    } catch (e) {
      setErros({
        rgm: e instanceof ApiError ? e.message : 'Não foi possível criar a conta.',
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={estilos.raiz}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Tela>
        <View style={{ gap: spacing.xs }}>
          <Marcador>Cadastro</Marcador>
          <Texto variante="titulo">Criar conta</Texto>
          <Texto variante="legenda" cor="suave">
            O cadastro é por RGM, então só quem é do CESUCA entra.
          </Texto>
        </View>

        <Cartao padding={spacing.xl}>
          <View style={{ gap: spacing.lg }}>
            <TituloSecao>Seus dados</TituloSecao>

            <Campo
              rotulo="Nome completo"
              obrigatorio
              valor={nome}
              onChange={(v) => {
                setNome(v);
                limpar('nome');
              }}
              placeholder="Ex.: Ana Paula Souza"
              autoCapitalize="words"
              autoComplete="name"
              erro={erros.nome ?? null}
            />

            <Campo
              rotulo="RGM"
              obrigatorio
              valor={rgm}
              onChange={(v) => {
                setRgm(apenasDigitosRgm(v));
                limpar('rgm');
              }}
              placeholder="00000000"
              teclado="number-pad"
              maxLength={8}
              autoCapitalize="none"
              dica="8 dígitos numéricos."
              erro={erros.rgm ?? null}
            />

            <Campo
              rotulo="Telefone"
              valor={telefone}
              onChange={(v) => setTelefone(formatarTelefone(v))}
              placeholder="(51) 99999-0000"
              teclado="phone-pad"
              maxLength={15}
              autoComplete="tel"
              dica="Só aparece pra quem você aprovar na carona."
            />

            <Campo
              rotulo="Senha"
              obrigatorio
              senha
              valor={senha}
              onChange={(v) => {
                setSenha(v);
                limpar('senha');
              }}
              placeholder="Mínimo 6 caracteres"
              autoCapitalize="none"
              erro={erros.senha ?? null}
            />

            <Campo
              rotulo="Confirmar senha"
              obrigatorio
              senha
              valor={confirmacao}
              onChange={(v) => {
                setConfirmacao(v);
                limpar('confirmacao');
              }}
              placeholder="Repita a senha"
              autoCapitalize="none"
              erro={erros.confirmacao ?? null}
            />
          </View>
        </Cartao>

        <Cartao padding={spacing.xl}>
          <View style={{ gap: spacing.lg }}>
            <TituloSecao>De onde você vem</TituloSecao>

            <View style={{ gap: spacing.sm }}>
              <Texto variante="legenda" peso="bold" cor="suave">
                Cidade *
              </Texto>
              <View style={estilos.chips}>
                {CIDADES.map((c) => (
                  <Chip
                    key={c}
                    rotulo={c}
                    ativo={cidade === c}
                    onPress={() => {
                      setCidade(c);
                      limpar('cidade');
                    }}
                  />
                ))}
              </View>
              {erros.cidade ? (
                <Texto variante="micro" cor="perigo">
                  {erros.cidade}
                </Texto>
              ) : null}
            </View>

            <SeletorBusca
              rotulo="Instituição de ensino"
              obrigatorio
              opcoes={INSTITUICOES}
              valor={instituicao}
              onChange={(v) => {
                setInstituicao(v);
                limpar('instituicao');
              }}
              placeholder="Busque sua instituição"
              dica="Depois do cadastro, você confirma com um documento."
              erro={erros.instituicao ?? null}
            />

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
          <View style={{ gap: spacing.md }}>
            <TituloSecao>Tipo de conta</TituloSecao>
            <Texto variante="legenda" cor="suave">
              Dá pra trocar depois no perfil.
            </Texto>

            <View style={estilos.papeis}>
              {OPCOES_PAPEL.map((op) => {
                const ativo = papel === op.valor;
                return (
                  <Pressable
                    key={op.valor}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativo }}
                    onPress={() => setPapel(op.valor)}
                    style={[
                      estilos.papel,
                      {
                        backgroundColor: ativo ? colors.primarySoft : colors.surfaceMuted,
                        borderColor: ativo ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Texto variante="corpo" peso="heavy">
                      {op.titulo}
                    </Texto>
                    <Texto variante="micro" cor="suave" peso="regular">
                      {op.desc}
                    </Texto>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Cartao>

        <Botao
          titulo="Criar conta"
          onPress={submeter}
          carregando={enviando}
          bloco
          tamanho="lg"
        />
        <Botao
          titulo="Já tenho conta"
          onPress={() => router.back()}
          variante="fantasma"
          bloco
        />
      </Tela>
    </KeyboardAvoidingView>
  );
}

const OPCOES_PAPEL = [
  { valor: 'passenger', titulo: 'Passageiro', desc: 'Procuro carona' },
  { valor: 'driver', titulo: 'Motorista', desc: 'Ofereço carona' },
] as const satisfies readonly { valor: Papel; titulo: string; desc: string }[];

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  papeis: { flexDirection: 'row', gap: spacing.md },
  papel: {
    flex: 1,
    gap: 2,
    padding: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 2,
  },
});
