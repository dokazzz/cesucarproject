import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSessao } from '@/session/session';
import { useTheme } from '@/theme/theme';

/**
 * Porteiro do app: decide entre login e dashboard assim que a sessão salva
 * termina de ser lida do cofre.
 */
export default function Entrada() {
  const { user, carregando } = useSessao();
  const { colors } = useTheme();

  if (carregando) {
    return (
      <View style={[estilos.centro, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <Redirect href={user ? '/(app)/inicio' : '/(auth)/login'} />;
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
