import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { fontSize, radius, spacing } from '@/theme/tokens';
import { Texto } from './Texto';

interface Props {
  rotulo: string;
  valor: string | null;
  opcoes: readonly string[];
  onChange: (v: string) => void;
  placeholder?: string;
  obrigatorio?: boolean;
  erro?: string | null;
  dica?: string;
}

/** Pequena seta triangular — não existe ícone de chevron no set, e um SVG novo
 * seria demais para dois pixels de UI. Duas bordas transparentes bastam. */
function Seta({ aberta, cor }: { aberta: boolean; cor: string }) {
  return (
    <View
      style={[
        estilos.seta,
        aberta
          ? { borderBottomWidth: 6, borderBottomColor: cor, marginBottom: 2 }
          : { borderTopWidth: 6, borderTopColor: cor, marginTop: 2 },
      ]}
    />
  );
}

/**
 * Campo de busca com lista filtrável — pensado pra semente pequena (dezenas
 * de itens), não pra um cadastro nacional.
 *
 * Cobre os dois jeitos que o pedido original deixou em aberto: dropdown
 * buscável quando a opção está na semente, texto livre quando não está — sem
 * precisar de dois componentes. Se a busca não bate com nada da lista,
 * aparece a opção de usar o texto digitado do mesmo jeito.
 */
export function SeletorBusca({
  rotulo,
  valor,
  opcoes,
  onChange,
  placeholder = 'Buscar...',
  obrigatorio = false,
  erro,
  dica,
}: Props) {
  const { colors } = useTheme();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return opcoes;
    return opcoes.filter((o) => o.toLowerCase().includes(termo));
  }, [opcoes, busca]);

  function selecionar(opcao: string) {
    onChange(opcao);
    setBusca('');
    setAberto(false);
  }

  const corBorda = erro ? colors.danger : aberto ? colors.primary : colors.border;

  return (
    <View style={estilos.grupo}>
      <View style={estilos.linhaRotulo}>
        <Texto variante="legenda" peso="bold" cor="suave">
          {rotulo}
        </Texto>
        {obrigatorio ? (
          <Texto variante="legenda" cor="primaria" peso="bold">
            {' *'}
          </Texto>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={valor ?? placeholder}
        accessibilityState={{ expanded: aberto }}
        onPress={() => setAberto((v) => !v)}
        style={[
          estilos.caixa,
          {
            backgroundColor: colors.surface,
            borderColor: corBorda,
            borderWidth: aberto || erro ? 2 : 1,
          },
        ]}
      >
        <Texto
          numberOfLines={1}
          style={{
            flex: 1,
            color: valor ? colors.text : colors.textDim,
            fontSize: fontSize.md,
          }}
        >
          {valor ?? placeholder}
        </Texto>
        <Seta aberta={aberto} cor={colors.textMuted} />
      </Pressable>

      {aberto ? (
        <View
          style={[
            estilos.painel,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Digite para buscar"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            style={[estilos.busca, { color: colors.text, borderColor: colors.border }]}
          />
          <ScrollView
            style={estilos.lista}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {filtradas.map((opcao) => (
              <Pressable
                key={opcao}
                accessibilityRole="button"
                accessibilityState={{ selected: opcao === valor }}
                onPress={() => selecionar(opcao)}
                style={({ pressed }) => [
                  estilos.item,
                  { backgroundColor: pressed ? colors.surfaceMuted : 'transparent' },
                ]}
              >
                <Texto variante="corpo" peso={opcao === valor ? 'bold' : 'regular'}>
                  {opcao}
                </Texto>
              </Pressable>
            ))}
            {filtradas.length === 0 && busca.trim() ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => selecionar(busca.trim())}
                style={estilos.item}
              >
                <Texto variante="legenda" cor="primaria">
                  {`Usar "${busca.trim()}" mesmo assim`}
                </Texto>
              </Pressable>
            ) : null}
            {filtradas.length === 0 && !busca.trim() ? (
              <View style={estilos.item}>
                <Texto variante="micro" cor="apagado">
                  Nenhuma opção cadastrada.
                </Texto>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      {erro ? (
        <Texto variante="micro" cor="perigo">
          {erro}
        </Texto>
      ) : dica ? (
        <Texto variante="micro" cor="apagado" peso="regular">
          {dica}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: spacing.xs },
  linhaRotulo: { flexDirection: 'row', alignItems: 'center' },
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  seta: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  painel: {
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  busca: {
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  lista: { maxHeight: 220 },
  item: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
});
