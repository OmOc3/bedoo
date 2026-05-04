import { create } from "zustand";
import { normalizeTrackerState, recalculateDerivedFields, type TrackerState } from "../shared/schema";

export type TabId = "swim-lane" | "task-board" | "agent-hub" | "calendar";

export interface TrackerFileInfo {
  path: string;
  exists: boolean;
  size: number;
  lastModified: string | null;
  watcherActive: boolean;
  readable: boolean;
}

interface AppState {
  tracker: TrackerState | null;
  loading: boolean;
  error: string | null;
  synced: boolean;
  activeTab: TabId;
  selectedMilestoneId: string | null;
  fileInfo: TrackerFileInfo | null;
  setActiveTab: (tab: TabId) => void;
  setSelectedMilestoneId: (id: string | null) => void;
  loadTracker: () => Promise<void>;
  setTrackerFromJson: (json: string) => void;
  updateTracker: (updater: (draft: TrackerState) => void) => void;
  refreshFileInfo: () => Promise<void>;
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;
let suppressExternalUntil = 0;

function cloneTracker(tracker: TrackerState): TrackerState {
  return normalizeTrackerState(JSON.parse(JSON.stringify(tracker)) as unknown);
}

export const useCommandCenterStore = create<AppState>((set, get) => ({
  tracker: null,
  loading: true,
  error: null,
  synced: false,
  activeTab: "swim-lane",
  selectedMilestoneId: null,
  fileInfo: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedMilestoneId: (id) => set({ selectedMilestoneId: id }),
  loadTracker: async () => {
    set({ loading: true, error: null });
    try {
      const json = await window.commandCenter.tracker.read();
      const tracker = normalizeTrackerState(JSON.parse(json) as unknown);
      const fileInfo = await window.commandCenter.tracker.getFileInfo();
      set({
        tracker,
        fileInfo,
        synced: true,
        loading: false,
        error: null,
        selectedMilestoneId: tracker.milestones[0]?.id ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, loading: false, synced: false });
    }
  },
  setTrackerFromJson: (json) => {
    if (Date.now() < suppressExternalUntil) return;
    try {
      const tracker = normalizeTrackerState(JSON.parse(json) as unknown);
      set((state) => ({
        tracker,
        synced: true,
        error: null,
        selectedMilestoneId: state.selectedMilestoneId ?? tracker.milestones[0]?.id ?? null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, synced: false });
    }
  },
  updateTracker: (updater) => {
    const current = get().tracker;
    if (!current) return;
    const expectedRevision = current._meta.revision;
    const next = recalculateDerivedFields(cloneTracker(current));
    updater(next);
    recalculateDerivedFields(next);
    set({ tracker: next, synced: false, error: null });

    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(async () => {
      try {
        suppressExternalUntil = Date.now() + 800;
        const response = await window.commandCenter.tracker.write(
          JSON.stringify(next, null, 2),
          expectedRevision,
        );
        if (!response.success) {
          const currentJson = response.current;
          if (currentJson) {
            const currentTracker = normalizeTrackerState(JSON.parse(currentJson) as unknown);
            set({
              tracker: currentTracker,
              error: response.error ?? "Tracker write failed.",
              synced: false,
            });
          } else {
            set({ error: response.error ?? "Tracker write failed.", synced: false });
          }
          return;
        }
        if (response.json) {
          const saved = normalizeTrackerState(JSON.parse(response.json) as unknown);
          set({ tracker: saved, synced: true, error: null });
        } else {
          set({ synced: true, error: null });
        }
        await get().refreshFileInfo();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set({ error: message, synced: false });
      }
    }, 350);
  },
  refreshFileInfo: async () => {
    try {
      const fileInfo = await window.commandCenter.tracker.getFileInfo();
      set({ fileInfo });
    } catch {
      set({ fileInfo: null });
    }
  },
}));
