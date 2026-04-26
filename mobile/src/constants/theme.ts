/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0f172a',
    background: '#f8fafc',
    backgroundElement: '#ffffff',
    backgroundSelected: '#ccfbf1',
    border: '#e2e8f0',
    danger: '#dc2626',
    dangerSoft: '#fee2e2',
    primary: '#0f766e',
    primaryStrong: '#0d9488',
    success: '#16a34a',
    textSecondary: '#64748b',
    warning: '#d97706',
    warningSoft: '#fef3c7',
  },
  dark: {
    text: '#f8fafc',
    background: '#020617',
    backgroundElement: '#0f172a',
    backgroundSelected: '#134e4a',
    border: '#334155',
    danger: '#f87171',
    dangerSoft: '#450a0a',
    primary: '#14b8a6',
    primaryStrong: '#0f766e',
    success: '#22c55e',
    textSecondary: '#94a3b8',
    warning: '#f59e0b',
    warningSoft: '#451a03',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const Brand = {
  appName: 'Bedoo',
  appNameArabic: 'بيدو',
  appTitle: 'إدارة محطات الطعوم',
  tagline: 'تطبيق ميداني للفنيين والمشرفين',
} as const;

export const WebBaseUrl = process.env.EXPO_PUBLIC_BEDOO_WEB_BASE_URL ?? 'http://localhost:3010';
