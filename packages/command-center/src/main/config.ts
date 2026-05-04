import { ensureTrackerExists, getTrackerPath, resolveProjectRoot } from "../shared/tracker-file.js";

export const PROJECT_ROOT = resolveProjectRoot();
export const TRACKER_PATH = ensureTrackerExists(PROJECT_ROOT);
export const TRACKER_FILE_PATH = getTrackerPath(PROJECT_ROOT);
