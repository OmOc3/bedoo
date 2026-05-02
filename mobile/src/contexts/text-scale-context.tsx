import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface TextScaleContextValue {
  largeTextEnabled: boolean;
  setLargeTextEnabled: (enabled: boolean) => void;
  textScale: number;
}

const TextScaleContext = createContext<TextScaleContextValue | null>(null);
const textScaleStorageKey = 'ecopest-large-text';

export function TextScaleProvider({ children }: { children: ReactNode }) {
  const [largeTextEnabled, setLargeTextEnabledState] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateTextScale(): Promise<void> {
      const storedValue = await AsyncStorage.getItem(textScaleStorageKey);

      if (isMounted) {
        setLargeTextEnabledState(storedValue === 'true');
      }
    }

    void hydrateTextScale();

    return () => {
      isMounted = false;
    };
  }, []);

  const setLargeTextEnabled = useCallback((enabled: boolean) => {
    setLargeTextEnabledState(enabled);
    void AsyncStorage.setItem(textScaleStorageKey, enabled ? 'true' : 'false');
  }, []);

  const value = useMemo<TextScaleContextValue>(
    () => ({
      largeTextEnabled,
      setLargeTextEnabled,
      textScale: largeTextEnabled ? 1.2 : 1,
    }),
    [largeTextEnabled, setLargeTextEnabled],
  );

  return <TextScaleContext.Provider value={value}>{children}</TextScaleContext.Provider>;
}

export function useTextScale() {
  const value = useContext(TextScaleContext);

  if (!value) {
    throw new Error('useTextScale must be used inside TextScaleProvider');
  }

  return value;
}