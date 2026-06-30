export const theme = {
  // Brand colours
  green:      '#1B5E20',
  greenDark:  '#154716',
  greenLight: '#2E7D32',
  gold:       '#C9952A',
  goldPale:   '#FFF8E1',
  brown:      '#5D4037',

  // Surfaces
  white:      '#FFFFFF',
  bg:         '#F5F5F0',
  card:       '#FFFFFF',

  // Text
  text:       '#1A1A1A',
  textMuted:  '#6B7280',
  textLight:  'rgba(255,255,255,0.85)',
  textFaint:  'rgba(255,255,255,0.5)',

  // Borders / dividers
  border:        '#E5E7EB',
  dividerOnGreen:'rgba(255,255,255,0.08)',

  // Status
  red:      '#EF4444',
  redPale:  '#FFF8F8',
  redBorder:'#FCA5A5',
  blue:     '#3B82F6',
  bluePale: '#EFF6FF',

  // Shape
  radius:   12,
  radiusSm: 8,
  radiusFull: 999,

  // Spacing
  pagePadding: 16,
  sidebarW:    260,

  // Font families
  fontCairo:      'Cairo_400Regular',
  fontCairoBold:  'Cairo_700Bold',
  fontAmiri:      'Amiri_400Regular',
  fontAmiriBold:  'Amiri_700Bold',
} as const;

export type Theme = typeof theme;
