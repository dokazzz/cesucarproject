import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { fontWeight } from '@/theme/tokens';
import { Texto } from './Texto';

export function Avatar({ iniciais, tamanho = 40 }: { iniciais: string; tamanho?: number }) {
  const { colors } = useTheme();

  return (
    <View
      // Decorativo: o nome da pessoa aparece em texto ao lado, então anunciar
      // "MC" antes dele só atrapalha.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        estilos.base,
        {
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          backgroundColor: colors.primary,
        },
      ]}
    >
      <Texto
        style={{
          color: colors.onPrimary,
          fontSize: tamanho * 0.36,
          fontWeight: fontWeight.heavy,
        }}
      >
        {iniciais}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
