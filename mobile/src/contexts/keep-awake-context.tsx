import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface KeepAwakeContextValue {
  keepAwakeEnabled: boolean;
  setKeepAwakeEnabled: (enabled: boolean) => void;
}

const KeepAwakeContext = createContext<KeepAwakeContextValue | null>(null);
const keepAwakeStorageKey = 'ecopest-keep-awake';
const keepAwakeTag = 'ecopest-field-app';

function deactivateActiveKeepAwake(): void {
  try {
    deactivateKeepAwake(keepAwakeTag);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('has not activated yet')) {
      return;
    }

    throw error;
  }
}

export function KeepAwakeProvider({ children }: { children: ReactNode }) {
  const [keepAwakeEnabled, setKeepAwakeEnabledState] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateKeepAwake(): Promise<void> {
      const storedValue = await AsyncStorage.getItem(keepAwakeStorageKey);

      if (isMounted) {
        setKeepAwakeEnabledState(storedValue === 'true');
      }
    }

    void hydrateKeepAwake();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!keepAwakeEnabled) {
      return;
    }

    let isCurrentEffect = true;
    let didActivate = false;

    async function activateKeepAwake(): Promise<void> {
      await activateKeepAwakeAsync(keepAwakeTag);
      didActivate = true;

      if (!isCurrentEffect) {
        deactivateActiveKeepAwake();
      }
    }

    void activateKeepAwake().catch(() => undefined);

    return () => {
      isCurrentEffect = false;

      if (didActivate) {
        deactivateActiveKeepAwake();
      }
    };
  }, [keepAwakeEnabled]);

  const setKeepAwakeEnabled = useCallback((enabled: boolean) => {
    setKeepAwakeEnabledState(enabled);
    void AsyncStorage.setItem(keepAwakeStorageKey, enabled ? 'true' : 'false');
  }, []);

  const value = useMemo<KeepAwakeContextValue>(
    () => ({ keepAwakeEnabled, setKeepAwakeEnabled }),
    [keepAwakeEnabled, setKeepAwakeEnabled],
  );

  return <KeepAwakeContext.Provider value={value}>{children}</KeepAwakeContext.Provider>;
}

export function useKeepAwakeMode() {
  const value = useContext(KeepAwakeContext);

  if (!value) {
    throw new Error('useKeepAwakeMode must be used inside KeepAwakeProvider');
  }

  return value;
}
