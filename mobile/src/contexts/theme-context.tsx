import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';
export type ThemePalette = (typeof Colors)[ResolvedTheme];

interface ThemeModeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  theme: ThemePalette;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);
const themeModeStorageKey = 'ecopest-theme-mode';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'system';
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let isMounted = true;

    async function hydrateMode(): Promise<void> {
      const storedMode = await AsyncStorage.getItem(themeModeStorageKey);

      if (isMounted && isThemeMode(storedMode)) {
        setModeState(storedMode);
      }
    }

    void hydrateMode();

    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    void AsyncStorage.setItem(themeModeStorageKey, nextMode);
  }, []);

  const resolvedTheme: ResolvedTheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const value = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      setMode,
      theme: Colors[resolvedTheme],
    }),
    [mode, resolvedTheme, setMode],
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const value = useContext(ThemeModeContext);

  if (!value) {
    throw new Error('useThemeMode must be used inside ThemeModeProvider');
  }

  return value;
}
