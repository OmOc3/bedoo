import * as Network from 'expo-network';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadow, Spacing, TouchTarget } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { warningHaptic } from '@/lib/haptics';
import { useSyncActions } from '@/lib/sync/report-sync';

interface OnlineStateContextValue {
  isOnline: boolean;
}

const OnlineStateContext = createContext<OnlineStateContextValue | null>(null);

function isReachable(state: Network.NetworkState): boolean {
  if (state.isConnected === false) {
    return false;
  }

  return state.isInternetReachable !== false;
}

export function OnlineStateProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const previousOnlineState = useRef(true);
  const { syncAllDrafts } = useSyncActions();

  useEffect(() => {
    let isMounted = true;

    async function hydrateNetworkState(): Promise<void> {
      const state = await Network.getNetworkStateAsync();

      if (isMounted) {
        setIsOnline(isReachable(state));
      }
    }

    void hydrateNetworkState();

    const subscription = Network.addNetworkStateListener((state) => {
      setIsOnline(isReachable(state));
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!previousOnlineState.current && isOnline) {
      void syncAllDrafts();
    }

    if (previousOnlineState.current && !isOnline) {
      void warningHaptic();
    }

    previousOnlineState.current = isOnline;
  }, [isOnline, syncAllDrafts]);

  const value = useMemo<OnlineStateContextValue>(() => ({ isOnline }), [isOnline]);

  return <OnlineStateContext.Provider value={value}>{children}</OnlineStateContext.Provider>;
}

export function useOnlineState(): OnlineStateContextValue {
  const value = useContext(OnlineStateContext);

  if (!value) {
    throw new Error('useOnlineState must be used inside OnlineStateProvider');
  }

  return value;
}

export function OfflineBanner() {
  const { isOnline } = useOnlineState();
  const theme = useTheme();
  const { strings } = useLanguage();
  const translateY = useRef(new Animated.Value(-96)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      damping: 18,
      mass: 0.9,
      stiffness: 160,
      toValue: isOnline ? -96 : 0,
      useNativeDriver: true,
    }).start();
  }, [isOnline, translateY]);

  return (
    <Animated.View
      pointerEvents={isOnline ? 'none' : 'auto'}
      style={[
        styles.banner,
        Shadow.md,
        {
          backgroundColor: theme.surfaceCard,
          borderColor: theme.warningStrong,
          transform: [{ translateY }],
        },
      ]}>
      <View style={[styles.dot, { backgroundColor: theme.warningStrong }]} />
      <ThemedText type="smallBold" style={styles.text}>
        {strings.offline.banner}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    left: Spacing.md,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.md,
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.lg,
    zIndex: 40,
  },
  dot: {
    borderRadius: Radius.full,
    height: 10,
    width: 10,
  },
  text: {
    flex: 1,
  },
});
