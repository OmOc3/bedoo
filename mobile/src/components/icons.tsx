import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

export type EcoPestIconName =
  | 'alert-circle'
  | 'arrow-left'
  | 'arrow-right'
  | 'camera'
  | 'check'
  | 'check-circle'
  | 'check-cloud'
  | 'clipboard-check'
  | 'dashboard'
  | 'edit'
  | 'file-check'
  | 'file-text'
  | 'flashlight'
  | 'globe'
  | 'home'
  | 'key'
  | 'link'
  | 'login'
  | 'logout'
  | 'mail'
  | 'map-pin'
  | 'menu'
  | 'moon'
  | 'qr-code'
  | 'radio-tower'
  | 'search'
  | 'send'
  | 'settings'
  | 'shield'
  | 'sliders'
  | 'sun'
  | 'target'
  | 'trash'
  | 'type'
  | 'user';

interface EcoPestIconProps {
  color?: string;
  name: EcoPestIconName;
  size?: number;
  strokeWidth?: number;
}

export function EcoPestIcon({ color, name, size = 24, strokeWidth = 2.2 }: EcoPestIconProps) {
  const theme = useTheme();
  const iconColor = color ?? theme.text;
  const common = {
    fill: 'none',
    stroke: iconColor,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth,
  };

  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      {name === 'alert-circle' ? (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Line x1="12" x2="12" y1="7" y2="12.5" {...common} />
          <Line x1="12" x2="12.01" y1="16.5" y2="16.5" {...common} />
        </>
      ) : null}
      {name === 'arrow-left' ? (
        <>
          <Line x1="19" x2="5" y1="12" y2="12" {...common} />
          <Polyline points="12 5 5 12 12 19" {...common} />
        </>
      ) : null}
      {name === 'arrow-right' ? (
        <>
          <Line x1="5" x2="19" y1="12" y2="12" {...common} />
          <Polyline points="12 5 19 12 12 19" {...common} />
        </>
      ) : null}
      {name === 'camera' ? (
        <>
          <Path d="M6 8h2.2L10 5.8h4L15.8 8H18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" {...common} />
          <Circle cx="12" cy="13.5" r="3.2" {...common} />
          <Line x1="18" x2="18.01" y1="10.5" y2="10.5" {...common} />
        </>
      ) : null}
      {name === 'check' ? <Polyline points="5 12.5 9.5 17 19 7" {...common} /> : null}
      {name === 'check-circle' ? (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Polyline points="7.5 12.5 10.5 15.5 17 8.5" {...common} />
        </>
      ) : null}
      {name === 'check-cloud' ? (
        <>
          <Path d="M7.5 18.5H17a4 4 0 0 0 .7-7.9 6 6 0 0 0-11.4 1.7A3.2 3.2 0 0 0 7.5 18.5Z" {...common} />
          <Polyline points="9 14 11.1 16.1 15.5 11.5" {...common} />
        </>
      ) : null}
      {name === 'clipboard-check' ? (
        <>
          <Path d="M9 4h6l1 2h2v14H6V6h2l1-2Z" {...common} />
          <Path d="M9 4h6v3H9Z" {...common} />
          <Polyline points="8.5 13 11 15.5 16 10.5" {...common} />
        </>
      ) : null}
      {name === 'dashboard' ? (
        <>
          <Rect height="6" rx="1.2" width="6" x="4" y="4" {...common} />
          <Rect height="6" rx="1.2" width="6" x="14" y="4" {...common} />
          <Rect height="6" rx="1.2" width="6" x="4" y="14" {...common} />
          <Rect height="6" rx="1.2" width="6" x="14" y="14" {...common} />
        </>
      ) : null}
      {name === 'edit' ? (
        <>
          <Path d="M4 20h4.8L19 9.8 14.2 5 4 15.2V20Z" {...common} />
          <Line x1="12.8" x2="17.6" y1="6.4" y2="11.2" {...common} />
        </>
      ) : null}
      {name === 'file-check' ? (
        <>
          <Path d="M7 3h7l4 4v14H7V3Z" {...common} />
          <Path d="M14 3v5h5" {...common} />
          <Polyline points="9 14 11 16 15.5 11.5" {...common} />
        </>
      ) : null}
      {name === 'file-text' ? (
        <>
          <Path d="M7 3h7l4 4v14H7V3Z" {...common} />
          <Path d="M14 3v5h5" {...common} />
          <Line x1="9.5" x2="15" y1="12" y2="12" {...common} />
          <Line x1="9.5" x2="15" y1="16" y2="16" {...common} />
        </>
      ) : null}
      {name === 'flashlight' ? (
        <>
          <Path d="M9 3h6v5l-2 3v10h-2V11L9 8V3Z" {...common} />
          <Line x1="9" x2="15" y1="8" y2="8" {...common} />
          <Line x1="12" x2="12" y1="14.5" y2="14.51" {...common} />
        </>
      ) : null}
      {name === 'globe' ? (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M3 12h18" {...common} />
          <Path d="M12 3a13 13 0 0 1 0 18" {...common} />
          <Path d="M12 3a13 13 0 0 0 0 18" {...common} />
        </>
      ) : null}
      {name === 'home' ? (
        <>
          <Path d="M4 11.5 12 5l8 6.5" {...common} />
          <Path d="M6.5 10.5V20h11v-9.5" {...common} />
          <Path d="M10 20v-5h4v5" {...common} />
        </>
      ) : null}
      {name === 'key' ? (
        <>
          <Circle cx="8" cy="12" r="3.5" {...common} />
          <Path d="M11.5 12H21" {...common} />
          <Path d="M17 12v3" {...common} />
          <Path d="M20 12v2" {...common} />
        </>
      ) : null}
      {name === 'link' ? (
        <>
          <Path d="M10.5 7.5 12 6a4 4 0 0 1 5.7 5.7l-2 2a4 4 0 0 1-5.7 0" {...common} />
          <Path d="M13.5 16.5 12 18a4 4 0 0 1-5.7-5.7l2-2a4 4 0 0 1 5.7 0" {...common} />
        </>
      ) : null}
      {name === 'login' ? (
        <>
          <Path d="M13 5h5v14h-5" {...common} />
          <Path d="M4 12h10" {...common} />
          <Polyline points="10 8 14 12 10 16" {...common} />
        </>
      ) : null}
      {name === 'logout' ? (
        <>
          <Path d="M11 5H6v14h5" {...common} />
          <Path d="M10 12h10" {...common} />
          <Polyline points="16 8 20 12 16 16" {...common} />
        </>
      ) : null}
      {name === 'mail' ? (
        <>
          <Rect height="14" rx="2" width="18" x="3" y="5" {...common} />
          <Path d="m4 7 8 6 8-6" {...common} />
        </>
      ) : null}
      {name === 'map-pin' ? (
        <>
          <Path d="M12 21s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12Z" {...common} />
          <Circle cx="12" cy="9" r="2.2" {...common} />
        </>
      ) : null}
      {name === 'menu' ? (
        <>
          <Line x1="4" x2="20" y1="7" y2="7" {...common} />
          <Line x1="4" x2="20" y1="12" y2="12" {...common} />
          <Line x1="4" x2="20" y1="17" y2="17" {...common} />
        </>
      ) : null}
      {name === 'moon' ? <Path d="M20 15.2A8 8 0 0 1 8.8 4 7 7 0 1 0 20 15.2Z" {...common} /> : null}
      {name === 'qr-code' ? (
        <>
          <Path d="M4 8V4h4" {...common} />
          <Path d="M16 4h4v4" {...common} />
          <Path d="M20 16v4h-4" {...common} />
          <Path d="M8 20H4v-4" {...common} />
          <Rect height="3" width="3" x="7" y="7" {...common} />
          <Rect height="3" width="3" x="14" y="7" {...common} />
          <Rect height="3" width="3" x="7" y="14" {...common} />
          <Path d="M14 14h2v2h2v3" {...common} />
        </>
      ) : null}
      {name === 'radio-tower' ? (
        <>
          <Path d="M12 21V9" {...common} />
          <Path d="M9 21h6" {...common} />
          <Path d="m9.5 14.5 2.5-5 2.5 5" {...common} />
          <Path d="M7 6.5a7 7 0 0 1 10 0" {...common} />
          <Path d="M4.5 4a10.5 10.5 0 0 1 15 0" {...common} />
        </>
      ) : null}
      {name === 'search' ? (
        <>
          <Circle cx="10.5" cy="10.5" r="6.5" {...common} />
          <Line x1="15.5" x2="21" y1="15.5" y2="21" {...common} />
        </>
      ) : null}
      {name === 'send' ? (
        <>
          <Path d="m3 11 18-8-8 18-2-7-8-3Z" {...common} />
          <Path d="m11 14 4-5" {...common} />
        </>
      ) : null}
      {name === 'settings' ? (
        <>
          <Circle cx="12" cy="12" r="3.2" {...common} />
          <Path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1" {...common} />
        </>
      ) : null}
      {name === 'shield' ? <Path d="M12 3 19 6v5.4c0 4.3-2.8 7.5-7 9.6-4.2-2.1-7-5.3-7-9.6V6l7-3Z" {...common} /> : null}
      {name === 'sliders' ? (
        <>
          <Line x1="4" x2="20" y1="6" y2="6" {...common} />
          <Line x1="4" x2="20" y1="12" y2="12" {...common} />
          <Line x1="4" x2="20" y1="18" y2="18" {...common} />
          <Circle cx="9" cy="6" r="2" {...common} />
          <Circle cx="15" cy="12" r="2" {...common} />
          <Circle cx="7" cy="18" r="2" {...common} />
        </>
      ) : null}
      {name === 'sun' ? (
        <>
          <Circle cx="12" cy="12" r="3.5" {...common} />
          <Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" {...common} />
        </>
      ) : null}
      {name === 'target' ? (
        <>
          <Circle cx="12" cy="12" r="8" {...common} />
          <Circle cx="12" cy="12" r="3.5" {...common} />
          <Path d="M12 2v4M22 12h-4M12 22v-4M2 12h4" {...common} />
        </>
      ) : null}
      {name === 'trash' ? (
        <>
          <Path d="M5 7h14" {...common} />
          <Path d="M9 7V5h6v2" {...common} />
          <Path d="M7 7l1 13h8l1-13" {...common} />
        </>
      ) : null}
      {name === 'type' ? (
        <>
          <Path d="M5 5h14" {...common} />
          <Path d="M12 5v14" {...common} />
          <Path d="M8 19h8" {...common} />
        </>
      ) : null}
      {name === 'user' ? (
        <>
          <Circle cx="12" cy="8" r="4" {...common} />
          <Path d="M5 21a7 7 0 0 1 14 0" {...common} />
        </>
      ) : null}
    </Svg>
  );
}
