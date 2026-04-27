import { useEffect, useState } from 'react';

import { ApiClientError, apiGet } from '@/lib/sync/api-client';
import type { MobileAppUser } from '@/lib/sync/types';

interface TeamUsersState {
  error: null | string;
  loading: boolean;
  users: MobileAppUser[];
}

function createdAtTime(user: MobileAppUser): number {
  if (!user.createdAt) {
    return 0;
  }

  const value = new Date(user.createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
}

export function useTeamUsers(): TeamUsersState {
  const [users, setUsers] = useState<MobileAppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadUsers(): Promise<void> {
      setLoading(true);

      try {
        const data = await apiGet<MobileAppUser[]>('/api/mobile/users');
        if (isMounted) {
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
        if (isMounted) {
          setUsers([]);
          if (loadError instanceof ApiClientError && loadError.status === 404) {
            setError('خادم الـ API الحالي لا يدعم مسار الفريق. تأكد أنك متصل بنفس خادم EcoPest المحدث.');
          } else {
            setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل قائمة الفريق.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadUsers();
    const interval = setInterval(() => {
      void loadUsers();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { error, loading, users };
}
