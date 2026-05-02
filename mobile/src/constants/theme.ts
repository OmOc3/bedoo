/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#17181f',
    background: '#f5f8fb',
    backgroundElement: '#fffbfd',
    backgroundSelected: '#ccfbf1',
    accent: '#0f766e',
    border: '#dfe7f0',
    danger: '#dc2626',
    dangerSoft: '#fee2e2',
    dangerStrong: '#dc2626',
    info: '#2563eb',
    infoSoft: '#e0f2fe',
    onPrimary: '#fffbfd',
    primary: '#0f766e',
    primaryLight: '#14b8a6',
    primarySoft: '#ccfbf1',
    primaryStrong: '#0f766e',
    surfaceCard: '#fffbfd',
    surfaceCardDark: '#1e293b',
    success: '#16a34a',
    successSoft: '#dcfce7',
    successStrong: '#16a34a',
    textSecondary: '#6b7280',
    warning: '#d97706',
    warningSoft: '#fef3c7',
    warningStrong: '#d97706',
  },
  dark: {
    text: '#f8fafc',
    background: '#020617',
    backgroundElement: '#0f172a',
    backgroundSelected: '#134e4a',
    accent: '#38bdf8',
    border: '#334155',
    danger: '#f87171',
    dangerSoft: '#450a0a',
    dangerStrong: '#dc2626',
    info: '#38bdf8',
    infoSoft: '#082f49',
    onPrimary: '#042f2e',
    primary: '#14b8a6',
    primaryLight: '#5eead4',
    primarySoft: '#134e4a',
    primaryStrong: '#0f766e',
    surfaceCard: '#1e293b',
    surfaceCardDark: '#1e293b',
    success: '#22c55e',
    successSoft: '#052e16',
    successStrong: '#16a34a',
    textSecondary: '#94a3b8',
    warning: '#f59e0b',
    warningSoft: '#451a03',
    warningStrong: '#d97706',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Tajawal',
    sansMedium: 'Tajawal-Medium',
    sansBold: 'Tajawal-Bold',
    sansHeavy: 'Tajawal-ExtraBold',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Tajawal',
    sansMedium: 'Tajawal-Medium',
    sansBold: 'Tajawal-Bold',
    sansHeavy: 'Tajawal-ExtraBold',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'Tajawal, var(--font-display)',
    sansMedium: 'Tajawal, var(--font-display)',
    sansBold: 'Tajawal, var(--font-display)',
    sansHeavy: 'Tajawal, var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Typography = {
  fontFamily: 'Tajawal',
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 18,
    lg: 20,
    xl: 24,
    xxl: 30,
    display: 36,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    bold: '700',
    heavy: '700',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const TouchTarget = 52;

export const Shadow = {
  sm: {
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.10)',
  },
  md: {
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)',
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 104, android: 92, default: 0 }) ?? 0;
export const MaxContentWidth = 800;

export const Brand = {
  appName: 'EcoPest',
  appNameArabic: 'إيكوبست',
  appTitle: 'إدارة محطات الطعوم',
  tagline: 'تشغيل ميداني واضح لمحطات الطعوم وفرق الفحص',
  taglineEnglish: 'Clear field operations for bait stations and inspection teams',
  companyName: 'EcoPest Ltd.',
  companyNameArabic: 'إيكوبست المحدودة',
  foundedYear: 2025,
  copyrightYear: () => new Date().getFullYear(),
  scheme: 'ecopest',
  slug: 'ecopest',
} as const;

export const WebBaseUrl = process.env.EXPO_PUBLIC_ECOPEST_WEB_BASE_URL || 'http://localhost:3000';
