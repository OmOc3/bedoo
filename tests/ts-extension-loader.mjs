import { existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

const sharedPackageRoot = resolvePath("packages/shared/src");
const appRoot = resolvePath(".");

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@ecopest/shared") {
    return nextResolve(pathToFileURL(resolvePath(sharedPackageRoot, "index.ts")).href, context);
  }

  if (specifier.startsWith("@ecopest/shared/")) {
    const sharedPath = specifier.slice("@ecopest/shared/".length);
    const targetPath = /\.[cm]?[jt]sx?$/.test(sharedPath) ? sharedPath : `${sharedPath}.ts`;

    return nextResolve(pathToFileURL(resolvePath(sharedPackageRoot, targetPath)).href, context);
  }

  if (specifier.startsWith("@/")) {
    const appPath = specifier.slice("@/".length);
    const candidates = /\.[cm]?[jt]sx?$/.test(appPath)
      ? [appPath]
      : [`${appPath}.ts`, `${appPath}.tsx`, `${appPath}/index.ts`, `${appPath}/index.tsx`];
    const targetPath = candidates.find((candidate) => existsSync(resolvePath(appRoot, candidate))) ?? candidates[0];

    return nextResolve(pathToFileURL(resolvePath(appRoot, targetPath)).href, context);
  }

  if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try {
      return await nextResolve(specifier, context);
    } catch (error) {
      if (error?.code === "ERR_MODULE_NOT_FOUND") {
        return nextResolve(`${specifier}.ts`, context);
      }

      throw error;
    }
  }

  return nextResolve(specifier, context);
}
