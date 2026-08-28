import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from '@/session/session';
import { ThemeProvider, useTheme } from '@/theme/theme';
import { LimiteDeErro } from '@/ui';

/**
 * Avisa o React Query quando o app sai e volta da frente.
 *
 * Sem isto o app é considerado sempre em foco, e o `refetchInterval` do mapa
 * continua perguntando a posição de 8 em 8 segundos com o celular no bolso e
 * a tela apagada. Bateria e plano de dados do passageiro indo embora pra
 * atualizar uma tela que ninguém está olhando.
 *
 * O `refetchIntervalInBackground` do React Query já é `false` por padrão, mas
 * ele só funciona se alguém disser o que é "background". Na web o navegador
 * conta sozinho; no React Native quem conta é o `AppState`, e essa ligação
 * não vem pronta.
 */
function usePausaEmSegundoPlano() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const inscricao = AppState.addEventListener('change', (estado) => {
      focusManager.setFocused(estado === 'active');
    });
    return () => inscricao.remove();
  }, []);
}

function Navegacao() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen
          name="carona/[id]"
          options={{ presentation: 'modal', title: 'Detalhes da carona' }}
        />
        <Stack.Screen name="notificacoes" options={{ title: 'Notificações' }} />
        <Stack.Screen name="verificacao" options={{ title: 'Verificação de aluno' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  usePausaEmSegundoPlano();

  // O cliente vive num `useState` pra não ser recriado a cada render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 15_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LimiteDeErro>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <SessionProvider>
                <Navegacao />
              </SessionProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </LimiteDeErro>
    </GestureHandlerRootView>
  );
}
