import AsyncStorage from '@react-native-async-storage/async-storage';

import { hasStoredAuthCookie } from '@/lib/auth-client';
import { ApiClientError, apiGet, apiPost } from '@/lib/sync/api-client';
import type { MobileDailyWorkReport, MobileShiftListResponse, MobileShiftMutationResponse } from '@/lib/sync/types';

const STORAGE_KEY = 'ecopest-operation-queue';
const MAX_ITEMS = 40;
const MAX_ATTEMPTS = 25;

export type ShiftQueuedOperation = {
  action: 'end' | 'start';
  attempts: number;
  createdAt: string;
  id: string;
  payload: { accuracyMeters?: number; lat: number; lng: number; notes?: string };
  type: 'shift';
};

export type DailyQueuedOperation = {
  attempts: number;
  createdAt: string;
  id: string;
  payload: {
    notes?: string;
    photos?: { name: string; type: string; uri: string }[];
    reportDate: string;
    stationIds: string[];
    summary: string;
  };
  type: 'daily_report';
};

export type QueuedOperation = DailyQueuedOperation | ShiftQueuedOperation;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPhotoAttachment(value: unknown): value is { name: string; type: string; uri: string } {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.uri === 'string' &&
    typeof value.name === 'string' &&
    typeof value.type === 'string'
  );
}

function isShiftQueuedOperation(value: unknown): value is ShiftQueuedOperation {
  if (!isRecord(value)) {
    return false;
  }

  if (value.type !== 'shift' || typeof value.id !== 'string' || typeof value.createdAt !== 'string') {
    return false;
  }

  if (value.action !== 'start' && value.action !== 'end') {
    return false;
  }

  if (typeof value.attempts !== 'number' || !isRecord(value.payload)) {
    return false;
  }

  const payload = value.payload;

  return (
    typeof payload.lat === 'number' &&
    typeof payload.lng === 'number' &&
    (payload.accuracyMeters === undefined || typeof payload.accuracyMeters === 'number') &&
    (payload.notes === undefined || typeof payload.notes === 'string')
  );
}

function isDailyQueuedOperation(value: unknown): value is DailyQueuedOperation {
  if (!isRecord(value)) {
    return false;
  }

  if (value.type !== 'daily_report' || typeof value.id !== 'string' || typeof value.createdAt !== 'string') {
    return false;
  }

  if (typeof value.attempts !== 'number' || !isRecord(value.payload)) {
    return false;
  }

  const payload = value.payload;

  if (
    typeof payload.reportDate !== 'string' ||
    typeof payload.summary !== 'string' ||
    !Array.isArray(payload.stationIds) ||
    !payload.stationIds.every((id): id is string => typeof id === 'string')
  ) {
    return false;
  }

  if (payload.notes !== undefined && typeof payload.notes !== 'string') {
    return false;
  }

  if (payload.photos !== undefined) {
    if (!Array.isArray(payload.photos) || !payload.photos.every(isPhotoAttachment)) {
      return false;
    }
  }

  return true;
}

function isQueuedOperation(value: unknown): value is QueuedOperation {
  return isShiftQueuedOperation(value) || isDailyQueuedOperation(value);
}

export function isNetworkFailure(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 0;
}

function shouldRetryHttp(error: ApiClientError): boolean {
  return error.status === 408 || error.status >= 500;
}

function classifyFailure(item: QueuedOperation, error: unknown): 'drop' | 'retry' {
  if (error instanceof ApiClientError) {
    if (item.type === 'shift') {
      if (item.action === 'start' && error.code === 'SHIFT_ALREADY_OPEN') {
        return 'drop';
      }

      if (item.action === 'end' && error.code === 'SHIFT_NOT_FOUND') {
        return 'drop';
      }
    }

    if (isNetworkFailure(error) || shouldRetryHttp(error)) {
      return 'retry';
    }

    return 'drop';
  }

  return 'retry';
}

async function getStoredQueue(): Promise<QueuedOperation[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isQueuedOperation);
  } catch {
    return [];
  }
}

async function setStoredQueue(items: QueuedOperation[]): Promise<void> {
  const sorted = [...items].sort(
    (first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  );

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sorted.slice(0, MAX_ITEMS)));
}

export async function getOperationQueue(): Promise<QueuedOperation[]> {
  return getStoredQueue();
}

export async function getPendingOperationsCount(): Promise<number> {
  const queue = await getStoredQueue();

  return queue.filter((item) => item.attempts < MAX_ATTEMPTS).length;
}

function createQueueId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function appendToQueue(item: QueuedOperation): Promise<void> {
  const queue = await getStoredQueue();

  await setStoredQueue([item, ...queue]);
}

async function enqueueOperation(
  op:
    | { action: 'end' | 'start'; payload: ShiftQueuedOperation['payload']; type: 'shift' }
    | { payload: DailyQueuedOperation['payload']; type: 'daily_report' },
): Promise<void> {
  const base = {
    attempts: 0,
    createdAt: new Date().toISOString(),
    id: createQueueId(),
  };

  const item: QueuedOperation =
    op.type === 'shift'
      ? { ...base, action: op.action, payload: op.payload, type: 'shift' }
      : { ...base, payload: op.payload, type: 'daily_report' };

  await appendToQueue(item);
}

export async function enqueueShiftReplay(action: 'end' | 'start', payload: ShiftQueuedOperation['payload']): Promise<void> {
  await enqueueOperation({ action, payload, type: 'shift' });
}

export async function enqueueDailyReplay(payload: DailyQueuedOperation['payload']): Promise<void> {
  await enqueueOperation({ payload, type: 'daily_report' });
}

async function dispatchShift(item: ShiftQueuedOperation, fallbackMessage: string): Promise<void> {
  const body: Record<string, unknown> = {
    action: item.action,
    lat: item.payload.lat,
    lng: item.payload.lng,
  };

  if (item.payload.accuracyMeters !== undefined) {
    body.accuracyMeters = item.payload.accuracyMeters;
  }

  if (item.action === 'end' && item.payload.notes?.trim()) {
    body.notes = item.payload.notes.trim();
  }

  await apiPost<MobileShiftMutationResponse, Record<string, unknown>>('/api/mobile/shifts', body, {
    fallbackErrorMessage: fallbackMessage,
    networkErrorMessage: fallbackMessage,
  });
}

async function dispatchDaily(item: DailyQueuedOperation, fallbackMessage: string): Promise<void> {
  const { payload } = item;

  if (payload.photos && payload.photos.length > 0) {
    const formData = new FormData();

    formData.append('reportDate', payload.reportDate);
    formData.append('summary', payload.summary);
    formData.append('stationIds', JSON.stringify(payload.stationIds));

    if (payload.notes?.trim()) {
      formData.append('notes', payload.notes.trim());
    }

    for (const photo of payload.photos) {
      formData.append(
        'photos',
        {
          name: photo.name,
          type: photo.type,
          uri: photo.uri,
        } as unknown as Blob,
      );
    }

    await apiPost<MobileDailyWorkReport, FormData>('/api/mobile/daily-reports', formData, {
      fallbackErrorMessage: fallbackMessage,
      networkErrorMessage: fallbackMessage,
    });

    return;
  }

  await apiPost<MobileDailyWorkReport, { notes?: string; reportDate: string; stationIds: string[]; summary: string }>(
    '/api/mobile/daily-reports',
    {
      notes: payload.notes?.trim() || undefined,
      reportDate: payload.reportDate,
      stationIds: payload.stationIds,
      summary: payload.summary,
    },
    {
      fallbackErrorMessage: fallbackMessage,
      networkErrorMessage: fallbackMessage,
    },
  );
}

async function reconcileAfterDuplicateShiftStart(): Promise<void> {
  try {
    await apiGet<MobileShiftListResponse>('/api/mobile/shifts', {
      fallbackErrorMessage: 'sync',
      networkErrorMessage: 'sync',
    });
  } catch {
    // Best-effort reconcile after dropping duplicate start request.
  }
}

export async function processOperationQueue(fallbackMessage: string): Promise<void> {
  if (!(await hasStoredAuthCookie())) {
    return;
  }

  const queue = await getStoredQueue();

  if (queue.length === 0) {
    return;
  }

  const sorted = [...queue].sort(
    (first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  );

  const nextQueue: QueuedOperation[] = [];

  for (const item of sorted) {
    if (item.attempts >= MAX_ATTEMPTS) {
      continue;
    }

    try {
      if (item.type === 'shift') {
        await dispatchShift(item, fallbackMessage);
      } else {
        await dispatchDaily(item, fallbackMessage);
      }
    } catch (error: unknown) {
      const outcome = classifyFailure(item, error);

      if (outcome === 'drop') {
        if (
          error instanceof ApiClientError &&
          item.type === 'shift' &&
          item.action === 'start' &&
          error.code === 'SHIFT_ALREADY_OPEN'
        ) {
          await reconcileAfterDuplicateShiftStart();
        }

        continue;
      }

      nextQueue.push({ ...item, attempts: item.attempts + 1 });
    }
  }

  await setStoredQueue(nextQueue);
}
