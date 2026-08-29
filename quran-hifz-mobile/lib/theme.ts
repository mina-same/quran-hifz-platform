export type ThemeMode = 'light' | 'dark';

const base = {
  // Brand colours
  green:      '#1B5E20',
  greenDark:  '#154716',
  greenLight: '#2E7D32',
  gold:       '#C9952A',
  brown:      '#5D4037',

  // Surfaces (mode-independent)
  white:      '#FFFFFF',

  // Status (the saturated ink colours — same in both modes)
  red:      '#EF4444',
  blue:     '#3B82F6',
  amber:    '#F59E0B',

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

/**
 * Every colour that has to FLIP between modes lives in one of these two maps —
 * nothing mode-dependent belongs in `base`. That includes the pastel tints
 * (`greenPale`, `cream`, the `tone` map): a pastel is a *light-mode surface*,
 * and leaving it in `base` is what used to leave cards and sheets glowing white
 * in dark mode. A dark tint is a desaturated near-black wash with the LIGHT
 * hue moved onto the text, not the same pastel dimmed.
 */
const lightSurfaces = {
  bg:         '#F5F5F0',
  card:       '#FFFFFF',
  /** Recessed surface inside a card: table headers, chip rows, inset panels. */
  cardAlt:    '#F9FAFB',
  /** Field fill for TextInput/Select — deliberately NOT `card`, so an input reads as inset on a card. */
  inputBg:    '#FFFFFF',
  /** Scrim behind modals and sheets. */
  overlay:    'rgba(0,0,0,0.45)',
  text:       '#1A1A1A',
  textMuted:  '#6B7280',
  textLight:  'rgba(255,255,255,0.85)',
  textFaint:  'rgba(255,255,255,0.5)',
  border:         '#E5E7EB',
  dividerOnGreen: 'rgba(255,255,255,0.08)',

  /**
   * The brand green used as a FILL behind white text — an active chip, a primary
   * button, a card's header band. `green` (#1B5E20) is nearly black, so on a dark
   * surface a fill painted with it all but disappears; this token lifts to
   * greenLight there. Keep using `green` itself for a deliberately deep brand
   *background (the lock screen) and `greenLight` for green INK on dark.
   */
  greenAccent:  '#1B5E20',

  // Tints — soft washes used as backgrounds behind coloured content.
  cream:      '#F5F1E6',
  greenPale:  '#E8F5E9',
  goldPale:   '#FFF8E1',
  redPale:    '#FFF8F8',
  bluePale:   '#EFF6FF',
  amberPale:  '#FFFBEB',
  redBorder:  '#FCA5A5',

  /** Semantic bg/border/text triples shared by Badge, Alert and every status chip. */
  tone: {
    green: { bg: '#DCFCE7', border: '#86EFAC', text: '#166534' },
    gold:  { bg: '#FFF8E1', border: '#FCD34D', text: '#92400E' },
    red:   { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' },
    blue:  { bg: '#DBEAFE', border: '#93C5FD', text: '#1E40AF' },
    gray:  { bg: '#F3F4F6', border: '#E5E7EB', text: '#374151' },
  },
} as const;

const darkSurfaces = {
  bg:         '#101511',
  card:       '#1A211C',
  cardAlt:    '#222B24',
  inputBg:    '#141A16',
  overlay:    'rgba(0,0,0,0.65)',
  text:       '#F2F2F0',
  textMuted:  '#9CA3AF',
  textLight:  'rgba(255,255,255,0.85)',
  textFaint:  'rgba(255,255,255,0.5)',
  border:         '#2C362F',
  dividerOnGreen: 'rgba(255,255,255,0.08)',

  greenAccent:  '#2E7D32',

  cream:      '#1F241C',
  greenPale:  '#16291A',
  goldPale:   '#2A2214',
  redPale:    '#2A1A1A',
  bluePale:   '#161F2C',
  amberPale:  '#2A2214',
  redBorder:  '#7F3438',

  tone: {
    green: { bg: '#14301B', border: '#2F6B3C', text: '#86EFAC' },
    gold:  { bg: '#33280D', border: '#7A5E1B', text: '#FCD34D' },
    red:   { bg: '#3A1618', border: '#7F2F33', text: '#FCA5A5' },
    blue:  { bg: '#14243D', border: '#2C4E80', text: '#93C5FD' },
    gray:  { bg: '#232A25', border: '#39433C', text: '#D1D5DB' },
  },
} as const;

export function buildTheme(mode: ThemeMode) {
  return {
    ...base,
    ...(mode === 'dark' ? darkSurfaces : lightSurfaces),
  };
}

export type Theme = ReturnType<typeof buildTheme>;

/**
 * There is deliberately NO module-level `theme` export.
 *
 * A `const theme = buildTheme('light')` frozen at import time is what broke dark
 * mode across the app: a component that read it inside a module-scope
 * `StyleSheet.create({...})` baked the LIGHT surfaces into its styles once, at
 * first import, and no amount of toggling the mode could ever repaint it — which
 * is why cards, sheets and inputs stayed white in dark mode.
 *
 * Read colours through `useAppTheme()` instead, and build the sheet inside the
 * component so it rebuilds when the mode flips:
 *
 *   const theme = useAppTheme();
 *   const styles = useMemo(() => StyleSheet.create({ ... }), [theme]);
 *
 * Only mode-independent constants (`textStart` / `textEnd` below) may be imported
 * at module scope.
 */

/**
 * Text alignment under this app's forced RTL (`I18nManager.forceRTL(true)` in
 * app/_layout.tsx).
 *
 * React Native swaps left/right **text** alignment whenever the view's layout
 * direction is RTL — see `effectiveParagraphStyle` in
 * node_modules/react-native/Libraries/Text/RCTTextAttributes.mm, which turns
 * NSTextAlignmentRight into NSTextAlignmentLeft and vice versa. So on a <Text>,
 * `textAlign: 'right'` renders visually LEFT: the exact opposite of how it reads.
 * Leaving it off is no better — an unset alignment resolves visually left here too.
 *
 * Use these tokens on <Text> styles instead of a literal. components/ui/Text.tsx
 * already applies `textStart` to every <Text> in the app, so a style only needs
 * one of these when it wants something other than the default.
 *
 * <TextInput> does NOT get the swap (its alignment is applied to the native field
 * directly) — keep writing `textAlign: 'right'` there, as FormInput/FormTextarea do.
 */
export const textStart = 'left' as const;  // visually RIGHT — where an Arabic line starts
export const textEnd = 'right' as const;   // visually LEFT — where an Arabic line ends
