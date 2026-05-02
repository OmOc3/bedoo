import { Image, type ImageSourcePropType } from 'react-native';

export type LogoProps = {
  layout?: 'horizontal' | 'stacked';
  size?: number;
  theme: 'light' | 'dark';
  variant: 'mark' | 'full';
};

const logoLockup = require('@/assets/logo/ecopest-lockup.png') as ImageSourcePropType;
const logoMark = require('@/assets/logo/ecopest-mark.png') as ImageSourcePropType;
const lockupRatio = 1826 / 1088;

export function Logo({ layout: _layout = 'horizontal', size = 48, theme: _theme, variant }: LogoProps) {
  const isMark = variant === 'mark';
  const height = size;
  const width = isMark ? size : Math.round(size * lockupRatio);

  return (
    <Image
      accessibilityLabel="EcoPest"
      accessible
      resizeMode="contain"
      source={isMark ? logoMark : logoLockup}
      style={{ height, width }}
    />
  );
}