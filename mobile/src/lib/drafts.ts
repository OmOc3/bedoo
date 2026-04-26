import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DraftReport {
  createdAt: string;
  id: string;
  notes: string;
  stationId: string;
  status: string[];
}

const key = 'bedoo-report-drafts';

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
    Array.isArray(draft.status) &&
    draft.status.every((item) => typeof item === 'string')
  );
}

export async function getDrafts(): Promise<DraftReport[]> {
  const raw = await AsyncStorage.getItem(key);

  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;

  return Array.isArray(parsed) ? parsed.filter(isDraftReport) : [];
}

export async function saveDraft(draft: Omit<DraftReport, 'createdAt' | 'id'>): Promise<DraftReport> {
  const drafts = await getDrafts();
  const savedDraft: DraftReport = {
    ...draft,
    createdAt: new Date().toISOString(),
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };

  await AsyncStorage.setItem(key, JSON.stringify([savedDraft, ...drafts].slice(0, 25)));

  return savedDraft;
}

export async function deleteDraft(id: string): Promise<void> {
  const drafts = await getDrafts();

  await AsyncStorage.setItem(key, JSON.stringify(drafts.filter((draft) => draft.id !== id)));
}
