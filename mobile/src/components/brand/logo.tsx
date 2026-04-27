import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Fonts } from '@/constants/theme';

export type LogoProps = {
  size?: number;
  theme: 'light' | 'dark';
  variant: 'mark' | 'full';
};

const palettes = {
  light: {
    accent: '#14b8a6',
    mark: '#0f766e',
    text: '#0f172a',
  },
  dark: {
    accent: '#5eead4',
    mark: '#2dd4bf',
    text: '#f8fafc',
  },
} as const;

function LogoMarkPaths({ accent, mark }: { accent: string; mark: string }) {
  return (
    <G>
      <Path
        d="M50 6C29.4 6 14 21.4 14 41.1c0 22.8 24.3 40.5 33 46.2a5.6 5.6 0 0 0 6 0c8.7-5.7 33-23.4 33-46.2C86 21.4 70.6 6 50 6Zm0 12c13.8 0 24 9.8 24 23.1 0 13.1-11.7 25.4-19.4 31.8a7.2 7.2 0 0 1-9.2 0C37.7 66.5 26 54.2 26 41.1 26 27.8 36.2 18 50 18Z"
        fill={mark}
      />
      <Path
        d="M28 60h14.1V42.6c0-5 3.4-8.2 7.9-8.2s7.9 3.2 7.9 8.2V60H72V42.6C72 30.4 62.8 22 50 22S28 30.4 28 42.6V60Zm18.1-15.2h7.8v8h-7.8v-8Z"
        fill={accent}
      />
    </G>
  );
}

export function Logo({ size = 48, theme, variant }: LogoProps) {
  const palette = palettes[theme];

  if (variant === 'mark') {
    return (
      <Svg accessibilityLabel="EcoPest" height={size} role="img" viewBox="0 0 100 100" width={size}>
        <LogoMarkPaths accent={palette.accent} mark={palette.mark} />
      </Svg>
    );
  }

  const width = size * 3.35;

  return (
    <Svg accessibilityLabel="EcoPest" height={size} role="img" viewBox="0 0 335 100" width={width}>
      <Rect fill="transparent" height="100" rx="24" width="335" />
      <G transform="translate(235 0)">
        <LogoMarkPaths accent={palette.accent} mark={palette.mark} />
      </G>
      <SvgText
        fill={palette.text}
        fontFamily={Fonts.sansHeavy}
        fontSize="42"
        fontWeight="800"
        textAnchor="end"
        x="220"
        y="48">
        إيكوبست
      </SvgText>
      <SvgText
        fill={palette.mark}
        fontFamily={Fonts.sansMedium}
        fontSize="18"
        fontWeight="700"
        letterSpacing="1.4"
        textAnchor="end"
        x="220"
        y="74">
        ECOPEST FIELD
      </SvgText>
    </Svg>
  );
}
