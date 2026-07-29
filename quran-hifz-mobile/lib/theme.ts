export type ThemeMode = 'light' | 'dark';

const base = {
  // Brand colours
  green:      '#1B5E20',
  greenDark:  '#154716',
  greenLight: '#2E7D32',
  gold:       '#C9952A',
  goldPale:   '#FFF8E1',
  brown:      '#5D4037',
  cream:      '#F5F1E6',
  greenPale:  '#E8F5E9',

  // Surfaces (mode-independent)
  white:      '#FFFFFF',

  // Status
  red:      '#EF4444',
  redPale:  '#FFF8F8',
  redBorder:'#FCA5A5',
  blue:     '#3B82F6',
  bluePale: '#EFF6FF',
  amber:    '#F59E0B',
  amberPale:'#FFFBEB',

  // Shape
  radius:   12,
  radiusSm: 8,
  radiusFull: 999,

  // Spacing scale
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  pagePadding: 16,
  sidebarW:    260,

  // Typography scale (font sizes — kept separate from the `text` color token below)
  fontSize: {
    xs: 11,
    sm: 12,
    base: 13,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 28,
  },

  // Elevation
  shadow: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
  },

  // Font families
  fontCairo:      'Cairo_400Regular',
  fontCairoBold:  'Cairo_700Bold',
  fontAmiri:      'Amiri_400Regular',
  fontAmiriBold:  'Amiri_700Bold',
} as const;

const lightSurfaces = {
  bg:         '#F5F5F0',
  card:       '#FFFFFF',
  text:       '#1A1A1A',
  textMuted:  '#6B7280',
  textLight:  'rgba(255,255,255,0.85)',
  textFaint:  'rgba(255,255,255,0.5)',
  border:         '#E5E7EB',
  dividerOnGreen: 'rgba(255,255,255,0.08)',
} as const;

const darkSurfaces = {
  bg:         '#101511',
  card:       '#1A211C',
  text:       '#F2F2F0',
  textMuted:  '#9CA3AF',
  textLight:  'rgba(255,255,255,0.85)',
  textFaint:  'rgba(255,255,255,0.5)',
  border:         '#2C362F',
  dividerOnGreen: 'rgba(255,255,255,0.08)',
} as const;

export function buildTheme(mode: ThemeMode) {
  return {
    ...base,
    ...(mode === 'dark' ? darkSurfaces : lightSurfaces),
  };
}

export const theme = buildTheme('light');
export type Theme = typeof theme;
