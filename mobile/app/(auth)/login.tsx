import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { apenasDigitosRgm, validarRgm, validarSenha } from '@/domain/validacao';
import { CONTAS_DEMO } from '@/mocks/db';
import { useSessao } from '@/session/session';
import { useTheme } from '@/theme/theme';
import { radius, spacing } from '@/theme/tokens';
import { Botao, Campo, Cartao, Tela, Texto } from '@/ui';

export default function Login() {
  const router = useRouter();
  const { entrar } = useSessao();
  const { colors } = useTheme();

  const [rgm, setRgm] = useState('');
  const [senha, setSenha] = useState('');
  const [erroRgm, setErroRgm] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function submeter() {
    setErroRgm(null);
    setErroSenha(null);

    const vRgm = validarRgm(rgm);
    if (!vRgm.ok) return setErroRgm(vRgm.erro);

    const vSenha = validarSenha(senha);
    if (!vSenha.ok) return setErroSenha(vSenha.erro);

    setEnviando(true);
    try {
      await entrar(rgm, senha);
      router.replace('/(app)/inicio');
    } catch (e) {
      setErroSenha(
        e instanceof ApiError ? e.message : 'Não foi possível entrar. Tente de novo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  /** Preenche uma conta de demo com um toque — a demo tem que ser rápida. */
  function usarConta(indice: number) {
    const conta = CONTAS_DEMO[indice];
    if (!conta) return;
    setRgm(conta.rgm);
    setSenha(conta.senha);
    setErroRgm(null);
    setErroSenha(null);
  }

  return (
    <KeyboardAvoidingView
      style={estilos.raiz}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Tela style={estilos.conteudo}>
        <View style={estilos.marca}>
          <Texto variante="display" cor="primaria">
            uRoute
          </Texto>
          <Texto variante="legenda" cor="suave">
            Carona. Conexão. Comunidade.
          </Texto>
        </View>

        <Cartao padding={spacing.xl}>
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.xs }}>
              <Texto variante="subtitulo">Bem-vindo de volta</Texto>
              <Texto variante="legenda" cor="suave">
                Entre com sua conta para acessar reservas, rotas e notificações.
              </Texto>
            </View>

            <Campo
              rotulo="RGM"
              obrigatorio
              valor={rgm}
              onChange={(v) => {
                setRgm(apenasDigitosRgm(v));
                setErroRgm(null);
              }}
              placeholder="00000000"
              teclado="number-pad"
              maxLength={8}
              autoCapitalize="none"
              autoComplete="username"
              dica="8 dígitos numéricos — sem letras ou espaços."
              erro={erroRgm}
            />

            <Campo
              rotulo="Senha"
              obrigatorio
              senha
              valor={senha}
              onChange={(v) => {
                setSenha(v);
                setErroSenha(null);
              }}
              placeholder="Sua senha"
              autoCapitalize="none"
              autoComplete="password"
              erro={erroSenha}
            />

            <Botao
              titulo="Entrar"
              onPress={submeter}
              carregando={enviando}
              bloco
              tamanho="lg"
            />

            <View style={estilos.linhaCadastro}>
              <Texto variante="legenda" cor="suave">
                Não tem conta?{' '}
              </Texto>
              <Texto
                variante="legenda"
                cor="primaria"
                peso="heavy"
                onPress={() => router.push('/(auth)/cadastro')}
              >
                Cadastre-se grátis
              </Texto>
            </View>
          </View>
        </Cartao>

        <View
          style={[
            estilos.demo,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Texto variante="micro" cor="apagado">
            CONTAS DE DEMONSTRAÇÃO — senha 123456
          </Texto>
          <View style={estilos.botoesDemo}>
            {CONTAS_DEMO.map((c, i) => (
              <Botao
                key={c.rgm}
                titulo={`${c.papel} · ${c.rgm}`}
                onPress={() => usarConta(i)}
                variante="fantasma"
                tamanho="sm"
              />
            ))}
          </View>
        </View>
      </Tela>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  conteudo: { justifyContent: 'center', flexGrow: 1, gap: spacing.xl },
  marca: { alignItems: 'center', gap: spacing.xs },
  linhaCadastro: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  demo: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1 },
  botoesDemo: { gap: spacing.sm },
});
