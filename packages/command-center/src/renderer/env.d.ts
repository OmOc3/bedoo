export {};

declare global {
  interface Window {
    commandCenter: {
      platform: string;
      tracker: {
        read(): Promise<string>;
        write(
          json: string,
          expectedRevision: number | null,
        ): Promise<{
          success: boolean;
          revision?: number;
          json?: string;
          error?: string;
          current?: string | null;
        }>;
        getPath(): Promise<string>;
        getFileInfo(): Promise<{
          path: string;
          exists: boolean;
          size: number;
          lastModified: string | null;
          watcherActive: boolean;
          readable: boolean;
        }>;
        onUpdated(callback: (json: string) => void): () => void;
      };
    };
  }
}
