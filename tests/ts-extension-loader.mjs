import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

const sharedPackageRoot = resolvePath("packages/shared/src");

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@ecopest/shared") {
    return nextResolve(pathToFileURL(resolvePath(sharedPackageRoot, "index.ts")).href, context);
  }

  if (specifier.startsWith("@ecopest/shared/")) {
    const sharedPath = specifier.slice("@ecopest/shared/".length);
    const targetPath = /\.[cm]?[jt]sx?$/.test(sharedPath) ? sharedPath : `${sharedPath}.ts`;

    return nextResolve(pathToFileURL(resolvePath(sharedPackageRoot, targetPath)).href, context);
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
