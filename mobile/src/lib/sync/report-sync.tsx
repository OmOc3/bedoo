// Draft sync queue and foreground sync bridge for mobile field reports.
import { AppState, type AppStateStatus } from 'react-native';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { hasStoredAuthCookie } from '@/lib/auth-client';
import { getQueuedDrafts, syncDraft, type DraftReport } from '@/lib/drafts';

interface SyncStatusState {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
}

interface SyncContextValue extends SyncStatusState {
  syncAllDrafts: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

async function syncPendingDrafts(drafts: DraftReport[]): Promise<void> {
  for (const draft of drafts) {
    await syncDraft(draft.id);
  }
}

function useSyncQueueController() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    const drafts = await getQueuedDrafts();
    setPendingCount(drafts.length);
  }, []);

  const syncAllDrafts = useCallback(async () => {
    const isAuthenticated = await hasStoredAuthCookie();

    if (!isAuthenticated) {
      await refreshPendingCount();
      return;
    }

    const drafts = await getQueuedDrafts();

    if (drafts.length === 0) {
      setPendingCount(0);
      return;
    }

    setIsSyncing(true);

    try {
      await syncPendingDrafts(drafts);
      setLastSyncedAt(new Date().toISOString());
    } finally {
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    void refreshPendingCount();
    void syncAllDrafts();
  }, [refreshPendingCount, syncAllDrafts]);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus): void {
      if (nextState === 'active') {
        void syncAllDrafts();
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [syncAllDrafts]);

  return { isSyncing, lastSyncedAt, pendingCount, syncAllDrafts };
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const value = useSyncQueueController();

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncStatus(): SyncStatusState {
  const value = useContext(SyncContext);

  if (!value) {
    throw new Error('useSyncStatus must be used inside SyncProvider');
  }

  return {
    isSyncing: value.isSyncing,
    lastSyncedAt: value.lastSyncedAt,
    pendingCount: value.pendingCount,
  };
}

export function useSyncActions() {
  const value = useContext(SyncContext);

  if (!value) {
    throw new Error('useSyncActions must be used inside SyncProvider');
  }

  return useMemo(
    () => ({
      syncAllDrafts: value.syncAllDrafts,
    }),
    [value.syncAllDrafts],
  );
}
