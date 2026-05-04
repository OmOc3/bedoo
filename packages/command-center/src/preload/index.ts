import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("commandCenter", {
  platform: process.platform,
  tracker: {
    read: () => ipcRenderer.invoke("tracker:read") as Promise<string>,
    write: (json: string, expectedRevision: number | null) =>
      ipcRenderer.invoke("tracker:write", json, expectedRevision) as Promise<{
        success: boolean;
        revision?: number;
        json?: string;
        error?: string;
        current?: string | null;
      }>,
    getPath: () => ipcRenderer.invoke("tracker:path") as Promise<string>,
    getFileInfo: () =>
      ipcRenderer.invoke("tracker:fileInfo") as Promise<{
        path: string;
        exists: boolean;
        size: number;
        lastModified: string | null;
        watcherActive: boolean;
        readable: boolean;
      }>,
    onUpdated: (callback: (json: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, json: string): void => callback(json);
      ipcRenderer.on("tracker:updated", handler);
      return () => ipcRenderer.removeListener("tracker:updated", handler);
    },
  },
});
