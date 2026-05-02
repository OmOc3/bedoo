import { useCallback, useEffect, useState } from 'react';

import { ApiClientError, apiGet } from '@/lib/sync/api-client';
import type { MobileAppUser } from '@/lib/sync/types';

interface TeamUsersState {
  error: null | string;
  loading: boolean;
  refresh: () => Promise<void>;
  users: MobileAppUser[];
}

interface TeamUsersMessages {
  genericLoadError: string;
  unsupportedApi: string;
}

function createdAtTime(user: MobileAppUser): number {
  if (!user.createdAt) {
    return 0;
  }

  const value = new Date(user.createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
}

export function useTeamUsers(
  messages: TeamUsersMessages = {
    genericLoadError: 'Could not load the team list.',
    unsupportedApi: 'The current API server does not support the team route. Make sure this app is connected to the updated EcoPest server.',
  },
): TeamUsersState {
  const [users, setUsers] = useState<MobileAppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);

  const loadUsers = useCallback(async (shouldUpdate: () => boolean = () => true): Promise<void> => {
    if (shouldUpdate()) {
      setLoading(true);
    }

    try {
      const data = await apiGet<MobileAppUser[]>('/api/mobile/users', {
        authRequiredMessage: messages.genericLoadError,
        fallbackErrorMessage: messages.genericLoadError,
        networkErrorMessage: messages.genericLoadError,
      });
      if (shouldUpdate()) {
        setUsers(
          [...data].sort((first, second) => {
            if (first.isActive !== second.isActive) {
              return first.isActive ? -1 : 1;
            }

            const byDate = createdAtTime(second) - createdAtTime(first);
            if (byDate !== 0) {
              return byDate;
            }

            return first.displayName.localeCompare(second.displayName);
          }),
        );
        setError(null);
      }
    } catch (loadError: unknown) {
      if (shouldUpdate()) {
        setUsers([]);
        if (loadError instanceof ApiClientError && loadError.status === 404) {
          setError(messages.unsupportedApi);
        } else {
          setError(loadError instanceof Error ? loadError.message : messages.genericLoadError);
        }
      }
    } finally {
      if (shouldUpdate()) {
        setLoading(false);
      }
    }
  }, [messages.genericLoadError, messages.unsupportedApi]);

  useEffect(() => {
    let isMounted = true;

    async function loadIfMounted(): Promise<void> {
      await loadUsers(() => isMounted);
    }

    void loadIfMounted();
    const interval = setInterval(() => {
      void loadUsers(() => isMounted);
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadUsers]);

  return { error, loading, refresh: loadUsers, users };
}
