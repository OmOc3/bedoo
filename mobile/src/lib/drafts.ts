import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost } from '@/lib/sync/api-client';
import { StatusOptions } from '@/lib/sync/status-options';
import type { StatusOption } from '@/lib/sync/types';

export type ReportSyncStatus = 'draft' | 'failed' | 'queued' | 'submitted' | 'syncing';

export interface DraftReport {
  createdAt: string;
  id: string;
  notes: string;
  serverReportId?: string;
  stationId: string;
  stationLabel?: string;
  submittedAt?: string;
  syncStatus?: ReportSyncStatus;
  synced?: boolean;
  retryCount?: number;
  lastSyncedAt?: string;
  lastError?: string;
  status: StatusOption[];
}

const key = 'ecopest-report-drafts';
const maxStoredReports = 50;
const workingDraftPrefix = 'working-report-';

type DraftInput = Pick<DraftReport, 'notes' | 'stationId' | 'status'>;

interface MobileReportSyncResponse {
  duplicate: boolean;
  reportId: string;
  stationLabel: string;
  submittedAt: string;
}

function createReportId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getWorkingDraftId(stationId: string): string {
  return `${workingDraftPrefix}${encodeURIComponent(stationId.trim())}`;
}

function isReportSyncStatus(value: unknown): value is ReportSyncStatus {
  return value === 'draft' || value === 'failed' || value === 'queued' || value === 'submitted' || value === 'syncing';
}

function isDraftReport(value: unknown): value is DraftReport {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const draft = value as Record<string, unknown>;

  return (
    typeof draft.id === 'string' &&
    typeof draft.createdAt === 'string' &&
    typeof draft.stationId === 'string' &&
    typeof draft.notes === 'string' &&
    (draft.serverReportId === undefined || typeof draft.serverReportId === 'string') &&
    (draft.stationLabel === undefined || typeof draft.stationLabel === 'string') &&
    (draft.submittedAt === undefined || typeof draft.submittedAt === 'string') &&
    (draft.synced === undefined || typeof draft.synced === 'boolean') &&
    (draft.retryCount === undefined || typeof draft.retryCount === 'number') &&
    (draft.lastSyncedAt === undefined || typeof draft.lastSyncedAt === 'string') &&
    (draft.lastError === undefined || typeof draft.lastError === 'string') &&
    (draft.syncStatus === undefined || isReportSyncStatus(draft.syncStatus)) &&
    Array.isArray(draft.status) &&
    draft.status.every((item) => typeof item === 'string' && StatusOptions.some((option) => option.value === item))
  );
}

function sortReportsByNewest(reports: DraftReport[]): DraftReport[] {
  return [...reports].sort((first, second) => {
    const firstDate = first.submittedAt ?? first.createdAt;
    const secondDate = second.submittedAt ?? second.createdAt;

    return new Date(secondDate).getTime() - new Date(firstDate).getTime();
  });
}

async function getStoredReports(): Promise<DraftReport[]> {
  const raw = await AsyncStorage.getItem(key);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    return Array.isArray(parsed) ? sortReportsByNewest(parsed.filter(isDraftReport)) : [];
  } catch {
    return [];
  }
}

async function setStoredReports(reports: DraftReport[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(sortReportsByNewest(reports).slice(0, maxStoredReports)));
}

export async function getDrafts(): Promise<DraftReport[]> {
  const reports = await getStoredReports();

  return reports.filter((report) => report.syncStatus !== 'submitted' && !report.submittedAt);
}

export async function getQueuedDrafts(): Promise<DraftReport[]> {
  const reports = await getStoredReports();

  return reports.filter(
    (report) => (report.syncStatus === 'queued' || report.syncStatus === 'failed') && report.synced !== true,
  );
}

export async function getSyncQueueReports(): Promise<DraftReport[]> {
  const reports = await getStoredReports();

  return reports.filter(
    (report) =>
      (report.syncStatus === 'queued' || report.syncStatus === 'failed' || report.syncStatus === 'syncing') &&
      report.synced !== true,
  );
}

export async function getSubmittedReports(): Promise<DraftReport[]> {
  const reports = await getStoredReports();

  return reports.filter((report) => report.syncStatus === 'submitted' || Boolean(report.submittedAt));
}

export async function saveDraft(draft: Omit<DraftReport, 'createdAt' | 'id'>): Promise<DraftReport> {
  const reports = await getStoredReports();
  const savedDraft: DraftReport = {
    ...draft,
    createdAt: new Date().toISOString(),
    id: createReportId(),
    syncStatus: draft.syncStatus ?? 'draft',
    synced: draft.synced ?? false,
    retryCount: draft.retryCount ?? 0,
  };

  await setStoredReports([savedDraft, ...reports]);

  return savedDraft;
}

export async function getWorkingDraft(stationId: string): Promise<DraftReport | null> {
  const reports = await getStoredReports();
  const draft = reports.find((report) => report.id === getWorkingDraftId(stationId));

  return draft ?? null;
}

export async function upsertWorkingDraft(report: DraftInput): Promise<DraftReport> {
  const reports = await getStoredReports();
  const id = getWorkingDraftId(report.stationId);
  const existingDraft = reports.find((draft) => draft.id === id);
  const now = new Date().toISOString();
  const nextDraft: DraftReport = {
    ...existingDraft,
    ...report,
    createdAt: existingDraft?.createdAt ?? now,
    id,
    lastError: undefined,
    retryCount: existingDraft?.retryCount ?? 0,
    syncStatus: 'draft',
    synced: false,
  };

  await setStoredReports([nextDraft, ...reports.filter((draft) => draft.id !== id)]);

  return nextDraft;
}

export async function clearWorkingDraft(stationId: string): Promise<void> {
  const reports = await getStoredReports();
  const id = getWorkingDraftId(stationId);

  await setStoredReports(reports.filter((draft) => draft.id !== id));
}

export async function saveSubmittedReport(
  report: Omit<DraftReport, 'createdAt' | 'id' | 'submittedAt' | 'syncStatus'>,
): Promise<DraftReport> {
  const reports = await getStoredReports();
  const timestamp = new Date().toISOString();
  const submittedReport: DraftReport = {
    ...report,
    createdAt: timestamp,
    id: createReportId(),
    submittedAt: timestamp,
    syncStatus: 'queued',
    synced: false,
    retryCount: report.retryCount ?? 0,
  };

  await setStoredReports([submittedReport, ...reports]);

  return submittedReport;
}

export async function deleteDraft(id: string): Promise<void> {
  const reports = await getStoredReports();

  await setStoredReports(reports.filter((draft) => draft.id !== id));
}

export async function syncDraft(draftId: string): Promise<void> {
  const reports = await getStoredReports();
  const target = reports.find((draft) => draft.id === draftId);

  if (!target) {
    return;
  }

  if (target.syncStatus !== 'queued' && target.syncStatus !== 'failed') {
    return;
  }

  await setStoredReports(
    reports.map((draft) =>
      draft.id === draftId
        ? {
            ...draft,
            lastError: undefined,
            syncStatus: 'syncing',
          }
        : draft,
    ),
  );

  try {
    const result = await apiPost<MobileReportSyncResponse, Record<string, unknown>>('/api/mobile/reports/sync', {
      clientReportId: target.id,
      stationId: target.stationId,
      status: target.status,
      ...(target.notes.trim().length > 0 ? { notes: target.notes.trim() } : {}),
    });
    const nextReports = await getStoredReports();

    await setStoredReports(
      nextReports.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              lastError: undefined,
              lastSyncedAt: result.submittedAt,
              retryCount: draft.retryCount ?? 0,
              serverReportId: result.reportId,
              stationLabel: result.stationLabel,
              submittedAt: result.submittedAt,
              synced: true,
              syncStatus: 'submitted',
            }
          : draft,
      ),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'تعذر مزامنة المسودة الآن.';
    const nextReports = await getStoredReports();

    await setStoredReports(
      nextReports.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              lastError: message,
              retryCount: (draft.retryCount ?? 0) + 1,
              synced: false,
              syncStatus: 'failed',
            }
          : draft,
      ),
    );
  }
}
