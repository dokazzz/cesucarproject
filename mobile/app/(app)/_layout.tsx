import { useQuery } from '@tanstack/react-query';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { chaves } from '@/api/chaves';
import { naoLidas } from '@/api/client';
import { useSessao } from '@/session/session';
import { useTheme } from '@/theme/theme';
import { fontSize, fontWeight } from '@/theme/tokens';
import { CarIcon, CompassIcon, ProfileIcon, SearchIcon } from '@/ui/icons';

interface TabIconProps {
  /**
   * O `react-navigation` tipa isto como `ColorValue` (aceita `PlatformColor`
   * também), mas os ícones do set só entendem string — e é sempre string
   * mesmo, porque só passamos hex vindo de `theme/tokens`.
   */
  color: ColorValue;
}

function corDoIcone(color: ColorValue): string {
  return color as string;
}

export default function AppLayout() {
  const { user, carregando } = useSessao();
  const { colors } = useTheme();

  const { data: pendentes = 0 } = useQuery({
    queryKey: chaves.notificacoes.naoLidas,
    queryFn: naoLidas,
    enabled: Boolean(user),
    refetchInterval: 20_000,
  });

  if (carregando) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  const motorista = user.role === 'DRIVER' || user.role === 'ADMIN';

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: fontWeight.heavy },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }: TabIconProps) => (
            <CompassIcon size={22} color={corDoIcone(color)} />
          ),
          tabBarBadge: pendentes > 0 ? pendentes : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.onPrimary },
          // O badge é só um número colorido; sem isto o leitor de tela anuncia
          // "Início" e a pessoa não fica sabendo que há algo esperando.
          tabBarAccessibilityLabel:
            pendentes > 0
              ? `Início, ${pendentes} notificação${pendentes > 1 ? 'ões' : ''} não lida${pendentes > 1 ? 's' : ''}`
              : 'Início',
        }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Procurar',
          tabBarIcon: ({ color }: TabIconProps) => (
            <SearchIcon size={22} color={corDoIcone(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="oferecer"
        options={{
          title: 'Oferecer',
          // Passageiro não publica carona; a aba some até ele virar motorista.
          href: motorista ? '/(app)/oferecer' : null,
          tabBarIcon: ({ color }: TabIconProps) => (
            <CarIcon size={22} color={corDoIcone(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }: TabIconProps) => (
            <ProfileIcon size={22} color={corDoIcone(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
