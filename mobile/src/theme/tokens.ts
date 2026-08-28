/**
 * Design tokens do uRoute — fonte única de verdade para cor, espaçamento,
 * raio, tipografia e sombra. Nenhum componente declara um hex, um `px` ou um
 * `fontWeight` solto: tudo referencia um destes tokens.
 *
 * Identidade: um único acento de marca (índigo) carrega toda ação primária,
 * estado ativo e destaque de preço — nada de duas cores de marca competindo
 * por atenção. Verde/âmbar/vermelho ficam reservados para estado semântico
 * (sucesso/pendente/erro), nunca decoração.
 */

export type ThemeName = 'light' | 'dark';

export interface Colors {
  // Superfícies, do fundo da tela ao elemento mais "elevado".
  bg: string;
  surfaceMuted: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  overlay: string;
  overlayBorder: string;

  // Texto.
  text: string;
  textMuted: string;
  textDim: string;
  onPrimary: string;

  // Marca — a única cor com peso de "ação principal".
  primary: string;
  primaryPressed: string;
  primarySoft: string;

  // Semântico.
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
}

export const lightColors: Colors = {
  bg: '#F7F8FA',
  surfaceMuted: '#EFF1F5',
  surface: '#FFFFFF',
  surfaceRaised: '#F4F6FA',
  border: '#E3E7EE',
  borderStrong: '#C7CEDA',
  overlay: 'rgba(16, 19, 26, 0.06)',
  overlayBorder: 'rgba(16, 19, 26, 0.10)',

  text: '#10131A',
  textMuted: '#5C6470',
  textDim: '#99A1AE',
  onPrimary: '#FFFFFF',

  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  primarySoft: 'rgba(79, 70, 229, 0.10)',

  success: '#12876B',
  successSoft: '#E3F6EF',
  warning: '#B45309',
  warningSoft: '#FDF1DF',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
};

export const darkColors: Colors = {
  bg: '#0A0E16',
  surfaceMuted: '#121826',
  surface: '#151C2C',
  surfaceRaised: '#1C2436',
  border: '#263049',
  borderStrong: '#37455F',
  overlay: 'rgba(255, 255, 255, 0.05)',
  overlayBorder: 'rgba(255, 255, 255, 0.09)',

  text: '#EEF1F8',
  textMuted: '#98A2B8',
  textDim: '#667089',
  onPrimary: '#FFFFFF',

  primary: '#6366F1',
  primaryPressed: '#4F46E5',
  primarySoft: 'rgba(99, 102, 241, 0.18)',

  success: '#34D399',
  successSoft: 'rgba(52, 211, 153, 0.16)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.16)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.18)',
};

/** Escala de espaçamento em passos de 4. Use `spacing.md`, nunca `16` solto. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
  display: 34,
} as const;

/** Pesos como string porque o RN exige `FontWeight`, não número solto. */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

/**
 * Sombra só existe no tema claro — no escuro a borda já separa a superfície
 * do fundo, e sombra escura em cima de fundo escuro só suja o visual.
 * `Cartao` e afins escolhem `shadow.sm` no claro e `'none'` no escuro.
 */
export const shadow = {
  sm: '0px 2px 8px rgba(15, 23, 42, 0.05)',
  md: '0px 8px 24px rgba(15, 23, 42, 0.10)',
} as const;
