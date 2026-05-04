import { app, BrowserWindow, ipcMain } from "electron";
import chokidar, { type FSWatcher } from "chokidar";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTrackerState } from "../shared/schema.js";
import { getTrackerFileInfo, readTracker, writeTracker } from "../shared/tracker-file.js";
import { PROJECT_ROOT, TRACKER_FILE_PATH, TRACKER_PATH } from "./config.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const debugLogPath = path.resolve(currentDir, "../../command-center-debug.log");
let mainWindow: BrowserWindow | null = null;
let watcher: FSWatcher | null = null;
let watcherActive = false;
let lastLocalWriteAt = 0;

function getProcessResourcesPath(): string | null {
  const processWithResources = process as NodeJS.Process & { resourcesPath?: string };
  return typeof processWithResources.resourcesPath === "string"
    ? processWithResources.resourcesPath
    : null;
}

function resolveAppIconPath(): string | undefined {
  const resourcesPath = getProcessResourcesPath();
  const packagedIconPath = resourcesPath ? path.join(resourcesPath, "icon.ico") : null;
  if (packagedIconPath && fs.existsSync(packagedIconPath)) return packagedIconPath;

  const devIconPath = path.resolve(currentDir, "../../resources/icon.ico");
  return fs.existsSync(devIconPath) ? devIconPath : undefined;
}

function debugLog(message: string, data?: unknown): void {
  if (process.env.COMMAND_CENTER_DEBUG !== "1") return;
  const suffix = data === undefined ? "" : ` ${typeof data === "string" ? data : JSON.stringify(data)}`;
  fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] ${message}${suffix}\n`, "utf8");
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1420,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#f6f8fa",
    show: false,
    title: "EcoPest Command Center",
    icon: resolveAppIconPath(),
    webPreferences: {
      preload: path.join(currentDir, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    debugLog("renderer console", { level, message, line, sourceId });
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    debugLog("did-fail-load", { errorCode, errorDescription, validatedURL });
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    debugLog("render-process-gone", details);
  });
  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    debugLog("preload-error", { preloadPath, message: error.message, stack: error.stack });
  });
  mainWindow.webContents.on("did-finish-load", () => {
    debugLog("did-finish-load", mainWindow?.webContents.getURL());
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  if (process.env.ELECTRON_RENDERER_URL) {
    debugLog("loadURL", process.env.ELECTRON_RENDERER_URL);
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    const filePath = path.join(currentDir, "../renderer/index.html");
    debugLog("loadFile", filePath);
    void mainWindow.loadFile(filePath);
  }

  if (process.env.COMMAND_CENTER_DEBUG === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function readTrackerJson(): string {
  return `${JSON.stringify(readTracker(PROJECT_ROOT), null, 2)}\n`;
}

function startWatcher(): void {
  watcher = chokidar.watch(TRACKER_PATH, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 120,
      pollInterval: 50,
    },
  });
  watcherActive = true;

  watcher.on("change", () => {
    if (Date.now() - lastLocalWriteAt < 400) return;
    try {
      const json = readTrackerJson();
      mainWindow?.webContents.send("tracker:updated", json);
    } catch (error) {
      console.error("[command-center] tracker change ignored:", error);
    }
  });

  watcher.on("error", (error) => {
    watcherActive = false;
    console.error("[command-center] watcher error:", error);
  });
}

ipcMain.handle("tracker:read", () => {
  try {
    return readTrackerJson();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ error: message });
  }
});

ipcMain.handle("tracker:write", (_event, json: string, expectedRevision: number | null) => {
  try {
    const next = normalizeTrackerState(JSON.parse(json));
    const result = writeTracker(
      next,
      expectedRevision === null ? undefined : { expectedRevision },
      PROJECT_ROOT,
    );
    lastLocalWriteAt = Date.now();
    return {
      success: true,
      revision: result.revision,
      json: `${JSON.stringify(result.state, null, 2)}\n`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let current: string | null = null;
    try {
      current = readTrackerJson();
    } catch {
      current = null;
    }
    return { success: false, error: message, current };
  }
});

ipcMain.handle("tracker:path", () => TRACKER_FILE_PATH);

ipcMain.handle("tracker:fileInfo", () => {
  const info = getTrackerFileInfo(PROJECT_ROOT);
  return {
    ...info,
    watcherActive,
    readable: fs.existsSync(TRACKER_PATH),
  };
});

app.whenReady().then(() => {
  createWindow();
  startWatcher();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  watcherActive = false;
  void watcher?.close();
});
