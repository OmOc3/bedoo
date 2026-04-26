export async function resolve(specifier, context, nextResolve) {
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
