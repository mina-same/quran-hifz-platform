import Svg, { Circle, Ellipse, Path, Rect, G, Defs, RadialGradient, Stop } from 'react-native-svg';

interface Props {
  size?: number;
  /** Base line/fill tone for the figure (should read well against the screen's background). */
  tint?: string;
  /** Accent tone for the crescent/star/book details. */
  accent?: string;
}

/**
 * Original flat-geometric illustration (no external asset) — a student seated cross-legged
 * reading an open Quran, with a crescent+star and floating page/dot accents. Designed to sit
 * on the login screen's dark green gradient, so shapes default to light/translucent tones.
 */
export default function QuranStudyIllustration({
  size = 220,
  tint = 'rgba(255,255,255,0.92)',
  accent = '#C9952A',
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220">
      <Defs>
        <RadialGradient id="blob" cx="50%" cy="42%" r="60%">
          <Stop offset="0%" stopColor={accent} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* soft backdrop glow */}
      <Circle cx="110" cy="95" r="98" fill="url(#blob)" />

      {/* floating crescent + star, top-left */}
      <Path
        d="M42 38a16 16 0 1 0 14 24 12 12 0 0 1-14-24Z"
        fill={accent}
        opacity={0.85}
      />
      <Path
        d="M74 30l2.4 5.4 5.6.6-4.2 3.9 1.2 5.6L74 42.6l-4.9 2.9 1.1-5.6-4.1-3.9 5.6-.6z"
        fill={tint}
        opacity={0.8}
      />

      {/* floating page, top-right */}
      <G opacity={0.85}>
        <Rect x="164" y="34" width="26" height="32" rx="3" fill="none" stroke={tint} strokeWidth={2.2} />
        <Path d="M170 44h14M170 51h14M170 58h9" stroke={tint} strokeWidth={2} strokeLinecap="round" />
      </G>

      {/* dotted accents */}
      <Circle cx="188" cy="110" r="3.5" fill={accent} opacity={0.7} />
      <Circle cx="30" cy="120" r="3" fill={tint} opacity={0.6} />
      <Circle cx="26" cy="150" r="2.2" fill={accent} opacity={0.6} />

      {/* ground shadow */}
      <Ellipse cx="110" cy="196" rx="58" ry="8" fill={tint} opacity={0.12} />

      {/* crossed legs */}
      <Path
        d="M62 188c8-14 24-20 48-20s40 6 48 20"
        fill="none"
        stroke={tint}
        strokeWidth={5}
        strokeLinecap="round"
      />

      {/* body / robe */}
      <Path
        d="M78 188c-4-30 6-56 32-56s36 26 32 56Z"
        fill={tint}
        opacity={0.95}
      />

      {/* open book on lap */}
      <G>
        <Path d="M110 150l-30 10v14l30-8Z" fill={accent} opacity={0.9} />
        <Path d="M110 150l30 10v14l-30-8Z" fill={accent} opacity={0.75} />
        <Path d="M80 160v14M140 160v14M110 150v16" stroke={tint} strokeWidth={1.4} opacity={0.6} />
      </G>

      {/* arms reaching to the book */}
      <Path
        d="M84 138c-8 8-12 16-12 24M136 138c8 8 12 16 12 24"
        fill="none"
        stroke={tint}
        strokeWidth={5}
        strokeLinecap="round"
      />

      {/* head + simple hair */}
      <Circle cx="110" cy="112" r="22" fill={tint} />
      <Path
        d="M88 108a22 22 0 0 1 44 0c0-4-2-9-6-9-4 6-30 6-32 0-4 0-6 5-6 9Z"
        fill={accent}
        opacity={0.9}
      />
    </Svg>
  );
}
