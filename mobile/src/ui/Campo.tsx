import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { useTheme } from '@/theme/theme';
import { fontSize, radius, spacing } from '@/theme/tokens';
import { Texto } from './Texto';

interface Props {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  erro?: string | null;
  dica?: string;
  obrigatorio?: boolean;
  senha?: boolean;
  teclado?: KeyboardTypeOptions;
  maxLength?: number;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  autoComplete?: 'username' | 'password' | 'name' | 'tel' | 'off';
  multilinha?: boolean;
}

export function Campo({
  rotulo,
  valor,
  onChange,
  placeholder,
  erro,
  dica,
  obrigatorio = false,
  senha = false,
  teclado = 'default',
  maxLength,
  autoCapitalize = 'sentences',
  autoComplete = 'off',
  multilinha = false,
}: Props) {
  const { colors } = useTheme();
  const [focado, setFocado] = useState(false);
  const [revelada, setRevelada] = useState(false);

  const corBorda = erro ? colors.danger : focado ? colors.primary : colors.border;

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

      <View
        style={[
          estilos.caixa,
          {
            backgroundColor: colors.surface,
            borderColor: corBorda,
            borderWidth: focado || erro ? 2 : 1,
            // Compensa a borda mais grossa pro campo não "pular" ao focar.
            paddingHorizontal: focado || erro ? spacing.md - 1 : spacing.md,
            minHeight: multilinha ? 88 : 46,
          },
        ]}
      >
        <TextInput
          value={valor}
          onChangeText={onChange}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          secureTextEntry={senha && !revelada}
          keyboardType={teclado}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          multiline={multilinha}
          style={[estilos.input, { color: colors.text }]}
        />
        {senha ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revelada ? 'Ocultar senha' : 'Mostrar senha'}
            hitSlop={10}
            onPress={() => setRevelada((v) => !v)}
          >
            <Texto variante="micro" cor="primaria" peso="bold">
              {revelada ? 'Ocultar' : 'Mostrar'}
            </Texto>
          </Pressable>
        ) : null}
      </View>

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
  },
  input: { flex: 1, fontSize: fontSize.md, paddingVertical: spacing.md },
});
