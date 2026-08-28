import { Redirect, Stack } from 'expo-router';

import { useSessao } from '@/session/session';

/** Quem já está logado não vê login nem cadastro. */
export default function AuthLayout() {
  const { user, carregando } = useSessao();

  if (carregando) return null;
  if (user) return <Redirect href="/(app)/inicio" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
