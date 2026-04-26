// Station lookup hook for mobile screens.
import { useEffect, useState } from 'react';

import type { Station } from '@/lib/sync/types';
import { apiGet } from '@/lib/sync/api-client';

interface StationState {
  error: string | null;
  loading: boolean;
  station: Station | null;
}

export function useStation(stationId: string): StationState {
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStation(): Promise<void> {
      if (!stationId) {
        if (isMounted) {
          setStation(null);
          setLoading(false);
          setError(null);
        }

        return;
      }

      setLoading(true);

      try {
        const nextStation = await apiGet<Station>(`/api/mobile/stations/${encodeURIComponent(stationId)}`);

        if (isMounted) {
          setStation(nextStation);
          setError(null);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setStation(null);
          setError(error instanceof Error ? error.message : 'تعذر تحميل بيانات المحطة.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadStation();

    const interval = setInterval(() => {
      void loadStation();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [stationId]);

  return { error, loading, station };
}
