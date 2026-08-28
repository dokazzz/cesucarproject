import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fontSize, fontWeight, lightColors, radius, spacing } from '@/theme/tokens';

interface Props {
  children: ReactNode;
  /** Onde reportar em produção. Na Sprint 5 isto vira a chamada do Sentry. */
  aoFalhar?: (erro: Error, info: ErrorInfo) => void;
}

interface Estado {
  erro: Error | null;
}

/**
 * Último anteparo antes da tela branca.
 *
 * Precisa ser classe: `componentDidCatch` não tem equivalente em hook. É o
 * único componente de classe do projeto, e é por isso.
 *
 * Nenhum componente de `@/ui` entra aqui — `<Texto>` e `<Botao>` chamam
 * `useTheme()`, e este anteparo fica FORA do `<ThemeProvider>` na árvore (ver
 * `app/_layout.tsx`) bem para sobreviver se for justamente o provider de tema
 * que quebrar. Um filho que lê `ThemeContext` sem provider por perto lançaria
 * de novo, e o anteparo cairia junto com o que deveria segurar.
 */
export class LimiteDeErro extends Component<Props, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // Em desenvolvimento o Expo já mostra a stack; este log é o que sobra
    // quando o app estiver empacotado e a stack não aparecer para ninguém.
    console.error('[Uroute] erro não tratado:', erro, info.componentStack);
    this.props.aoFalhar?.(erro, info);
  }

  private tentarDeNovo = () => {
    this.setState({ erro: null });
  };

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    // Sem acesso ao tema; o claro é legível nos dois fundos.
    const c = lightColors;

    return (
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={estilos.conteudo}>
        <View style={[estilos.cartao, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[estilos.subtitulo, { color: c.text }]}>Alguma coisa quebrou aqui</Text>

          <Text style={[estilos.corpo, { color: c.textMuted }]}>
            Não foi culpa sua. Tente de novo — se continuar, avise no grupo com o texto abaixo,
            que ajuda a achar o problema.
          </Text>

          <View
            style={[
              estilos.detalhe,
              { backgroundColor: c.surfaceMuted, borderColor: c.border },
            ]}
          >
            <Text style={[estilos.micro, { color: c.danger }]}>
              {erro.message || String(erro)}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={this.tentarDeNovo}
            style={({ pressed }) => [
              estilos.botao,
              { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[estilos.botaoTexto, { color: c.onPrimary }]}>Tentar de novo</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }
}

const estilos = StyleSheet.create({
  conteudo: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  cartao: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  detalhe: {
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  subtitulo: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  corpo: { fontSize: fontSize.sm, fontWeight: fontWeight.regular },
  micro: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  botao: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  botaoTexto: { fontSize: fontSize.md, fontWeight: fontWeight.heavy },
});
