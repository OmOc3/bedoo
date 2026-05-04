import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createEmptyTracker,
  normalizeTrackerState,
  nowIso,
  recalculateDerivedFields,
  type TrackerState,
} from "./schema.js";

export interface WriteTrackerOptions {
  expectedRevision?: number;
  incrementRevision?: boolean;
}

export interface WriteTrackerResult {
  state: TrackerState;
  revision: number;
}

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

interface ProjectRootResourceFile {
  projectRoot: string;
}

function isProjectRootResourceFile(value: unknown): value is ProjectRootResourceFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "projectRoot" in value &&
    typeof (value as { projectRoot?: unknown }).projectRoot === "string"
  );
}

function getProcessResourcesPath(): string | null {
  const processWithResources = process as NodeJS.Process & { resourcesPath?: string };
  return typeof processWithResources.resourcesPath === "string"
    ? processWithResources.resourcesPath
    : null;
}

function readProjectRootFromEnvFile(envPath: string): string | null {
  try {
    const text = fs.readFileSync(envPath, "utf8");
    const match = text.match(/^PROJECT_ROOT=(.+)$/m);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

function findAncestorProjectRoot(startPath: string): string | null {
  let current = path.resolve(startPath);
  while (true) {
    const agentsPath = path.join(current, "AGENTS.md");
    const gitPath = path.join(current, ".git");
    if (fs.existsSync(agentsPath) || fs.existsSync(gitPath)) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function readProjectRootFromPackagedResources(): string | null {
  const resourcesPath = getProcessResourcesPath();
  if (!resourcesPath) return null;

  try {
    const resourcePath = path.join(resourcesPath, "project-root.json");
    const parsed = JSON.parse(fs.readFileSync(resourcePath, "utf8")) as unknown;
    if (!isProjectRootResourceFile(parsed)) return null;
    return parsed.projectRoot.trim() || null;
  } catch {
    return null;
  }
}

export function resolveProjectRoot(): string {
  const envRoot = process.env.PROJECT_ROOT?.trim();
  if (envRoot) return path.normalize(path.resolve(envRoot));

  const packageEnvRoot = readProjectRootFromEnvFile(path.join(packageDir, ".env"));
  if (packageEnvRoot) return path.normalize(path.resolve(packageEnvRoot));

  const packagedRoot = readProjectRootFromPackagedResources();
  if (packagedRoot) return path.normalize(path.resolve(packagedRoot));

  const initCwd = process.env.INIT_CWD;
  const ancestor = findAncestorProjectRoot(initCwd ?? process.cwd());
  if (ancestor) return path.normalize(ancestor);

  throw new Error("PROJECT_ROOT is not set and no ancestor project root could be found");
}

export function getTrackerPath(projectRoot = resolveProjectRoot()): string {
  return path.join(projectRoot, "project-tracker.json");
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function ensureTrackerExists(projectRoot = resolveProjectRoot()): string {
  const trackerPath = getTrackerPath(projectRoot);
  if (!fs.existsSync(trackerPath)) {
    const initial = createEmptyTracker(path.basename(projectRoot));
    fs.writeFileSync(trackerPath, `${JSON.stringify(initial, null, 2)}\n`, "utf8");
  }
  return trackerPath;
}

export function readTracker(projectRoot = resolveProjectRoot()): TrackerState {
  const trackerPath = ensureTrackerExists(projectRoot);
  return normalizeTrackerState(readJsonFile(trackerPath));
}

function sleepSync(ms: number): void {
  const buffer = new SharedArrayBuffer(4);
  const array = new Int32Array(buffer);
  Atomics.wait(array, 0, 0, ms);
}

function acquireLock(lockPath: string): () => void {
  const startedAt = Date.now();
  while (true) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      fs.writeFileSync(fd, `${process.pid}\n${new Date().toISOString()}\n`, "utf8");
      fs.closeSync(fd);
      return () => {
        try {
          fs.rmSync(lockPath, { force: true });
        } catch {
          // Best effort cleanup.
        }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        const ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
        if (ageMs > 15_000) fs.rmSync(lockPath, { force: true });
      } catch {
        // Retry if another process removed it.
      }
      if (Date.now() - startedAt > 5_000) {
        throw new Error(`Timed out waiting for tracker lock: ${lockPath}`);
      }
      sleepSync(50);
    }
  }
}

function writeTrackerFile(trackerPath: string, state: TrackerState): void {
  const tmpPath = `${trackerPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, trackerPath);
}

function readCurrentOrInitial(trackerPath: string, projectRoot: string): TrackerState {
  if (!fs.existsSync(trackerPath)) return createEmptyTracker(path.basename(projectRoot));
  return normalizeTrackerState(readJsonFile(trackerPath));
}

export function writeTracker(
  state: TrackerState,
  options: WriteTrackerOptions = {},
  projectRoot = resolveProjectRoot(),
): WriteTrackerResult {
  const trackerPath = ensureTrackerExists(projectRoot);
  const lockPath = `${trackerPath}.lock`;
  const release = acquireLock(lockPath);
  try {
    const current = readCurrentOrInitial(trackerPath, projectRoot);
    if (
      options.expectedRevision !== undefined &&
      current._meta.revision !== options.expectedRevision
    ) {
      throw new Error(
        `Tracker revision conflict. Current revision is ${current._meta.revision}, expected ${options.expectedRevision}.`,
      );
    }

    const next = recalculateDerivedFields(state);
    if (options.incrementRevision !== false) {
      next._meta.revision = current._meta.revision + 1;
    }
    next._meta.updated_at = nowIso();
    writeTrackerFile(trackerPath, next);
    return { state: next, revision: next._meta.revision };
  } finally {
    release();
  }
}

export function mutateTracker(
  mutator: (state: TrackerState) => void,
  options: WriteTrackerOptions = {},
  projectRoot = resolveProjectRoot(),
): WriteTrackerResult {
  const trackerPath = ensureTrackerExists(projectRoot);
  const lockPath = `${trackerPath}.lock`;
  const release = acquireLock(lockPath);
  try {
    const state = readCurrentOrInitial(trackerPath, projectRoot);
    if (
      options.expectedRevision !== undefined &&
      state._meta.revision !== options.expectedRevision
    ) {
      throw new Error(
        `Tracker revision conflict. Current revision is ${state._meta.revision}, expected ${options.expectedRevision}.`,
      );
    }
    mutator(state);
    const next = recalculateDerivedFields(state);
    if (options.incrementRevision !== false) next._meta.revision += 1;
    next._meta.updated_at = nowIso();
    writeTrackerFile(trackerPath, next);
    return { state: next, revision: next._meta.revision };
  } finally {
    release();
  }
}

export function getTrackerFileInfo(projectRoot = resolveProjectRoot()): {
  path: string;
  exists: boolean;
  size: number;
  lastModified: string | null;
} {
  const trackerPath = getTrackerPath(projectRoot);
  if (!fs.existsSync(trackerPath)) {
    return { path: trackerPath, exists: false, size: 0, lastModified: null };
  }
  const stat = fs.statSync(trackerPath);
  return {
    path: trackerPath,
    exists: true,
    size: stat.size,
    lastModified: stat.mtime.toISOString(),
  };
}
