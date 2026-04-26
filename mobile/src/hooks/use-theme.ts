/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useThemeMode } from '@/contexts/theme-context';

export function useTheme() {
  return useThemeMode().theme;
}
