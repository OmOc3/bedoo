import Svg, { Circle, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';

export type LogoProps = {
  layout?: 'horizontal' | 'stacked';
  size?: number;
  theme: 'light' | 'dark';
  variant: 'mark' | 'full';
};

const palettes = {
  light: {
    eco: '#0f172a',
    leafDark: '#0b6b3b',
    leafLight: '#22c55e',
    pest: '#2f87d8',
    subtitle: '#475569',
    vein: '#dcfce7',
  },
  dark: {
    eco: '#f8fafc',
    leafDark: '#16a34a',
    leafLight: '#4ade80',
    pest: '#60a5fa',
    subtitle: '#dbeafe',
    vein: '#ecfccb',
  },
} as const;

function LogoMarkPaths({ leafDark, leafLight, vein }: { leafDark: string; leafLight: string; vein: string }) {
  return (
    <>
      <Path
        d="M66 122c-22-5-40-17-50-35C7 71 8 49 18 31c10-17 27-29 47-31-7 16-12 33-14 50-3 25 0 49 15 72Z"
        fill={leafDark}
      />
      <Path
        d="M70 122c-5-30-3-55 6-78 8-21 22-39 40-52 12 14 18 32 17 52-1 35-24 64-63 78Z"
        fill={leafLight}
      />
      <Path d="M46 27c-7 17-10 35-8 53 1 11 4 22 9 32" fill="none" stroke={vein} strokeLinecap="round" strokeWidth="5" />
      <G rotation="-18" originX="70" originY="60">
        <Ellipse cx="99" cy="41" fill="#ffffff" rx="10" ry="7" />
        <Ellipse cx="77" cy="53" fill="#ffffff" rx="18" ry="13" />
        <Ellipse cx="53" cy="63" fill="#ffffff" rx="13" ry="10" />
        <Circle cx="103" cy="40" fill={leafLight} r="2" />
        <Path
          d="M104 35c7-9 14-13 22-13M104 41c9-2 18-1 27 4"
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <Path
          d="M62 51 38 36M76 54 48 43M90 55 64 48M64 67 37 79M78 68 51 87M92 66 66 97"
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeWidth="4.5"
        />
      </G>
    </>
  );
}

export function Logo({ layout = 'horizontal', size = 48, theme, variant }: LogoProps) {
  const palette = palettes[theme];

  if (variant === 'mark') {
    return (
      <Svg accessibilityLabel="EcoPest" height={size} role="img" viewBox="0 0 140 140" width={size}>
        <LogoMarkPaths leafDark={palette.leafDark} leafLight={palette.leafLight} vein={palette.vein} />
      </Svg>
    );
  }

  if (layout === 'stacked') {
    const width = size * 0.92;

    return (
      <Svg accessibilityLabel="EcoPest Pest Control Team" height={size} role="img" viewBox="0 0 210 260" width={width}>
        <G transform="translate(35 0)">
          <LogoMarkPaths leafDark={palette.leafDark} leafLight={palette.leafLight} vein={palette.vein} />
        </G>
        <SvgText fill={palette.eco} fontFamily="Arial" fontSize="54" fontWeight="700" textAnchor="middle" x="84" y="168">
          eco
        </SvgText>
        <SvgText fill={palette.pest} fontFamily="Arial" fontSize="54" fontWeight="700" textAnchor="middle" x="150" y="168">
          pest
        </SvgText>
        <SvgText fill={palette.subtitle} fontFamily="Arial" fontSize="24" fontWeight="700" textAnchor="middle" x="105" y="210">
          Pest Control
        </SvgText>
        <SvgText fill={palette.subtitle} fontFamily="Arial" fontSize="24" fontWeight="700" textAnchor="middle" x="105" y="238">
          Team
        </SvgText>
      </Svg>
    );
  }

  const width = size * 2.8;

  return (
    <Svg accessibilityLabel="EcoPest Pest Control Team" height={size} role="img" viewBox="0 0 390 140" width={width}>
      <LogoMarkPaths leafDark={palette.leafDark} leafLight={palette.leafLight} vein={palette.vein} />
      <SvgText fill={palette.eco} fontFamily="Arial" fontSize="58" fontWeight="700" x="145" y="70">
        eco
      </SvgText>
      <SvgText fill={palette.pest} fontFamily="Arial" fontSize="58" fontWeight="700" x="232" y="70">
        pest
      </SvgText>
      <SvgText fill={palette.subtitle} fontFamily="Arial" fontSize="24" fontWeight="700" x="145" y="102">
        Pest Control Team
      </SvgText>
    </Svg>
  );
}
