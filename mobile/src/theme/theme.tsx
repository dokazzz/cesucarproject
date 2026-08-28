import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type Colors, type ThemeName } from './tokens';

interface ThemeValue {
  name: ThemeName;
  colors: Colors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // O site tem um botão de tema manual. No app seguimos o sistema operacional,
  // que é o que o usuário de celular espera; o toggle manual fica pro v1.1.
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const value = useMemo<ThemeValue>(
    () => ({
      name: isDark ? 'dark' : 'light',
      colors: isDark ? darkColors : lightColors,
      isDark,
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>.');
  return ctx;
}
