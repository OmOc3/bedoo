const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");
const sharedPackageRoot = path.resolve(workspaceRoot, "packages", "shared");
const sharedPackageSource = path.resolve(sharedPackageRoot, "src");
const sharedPackageName = "@ecopest/shared";

const config = getDefaultConfig(projectRoot);
const upstreamResolveRequest = config.resolver.resolveRequest;

config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), sharedPackageRoot]));
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  [sharedPackageName]: sharedPackageSource,
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === sharedPackageName) {
    return {
      type: "sourceFile",
      filePath: path.resolve(sharedPackageSource, "index.ts"),
    };
  }

  if (moduleName.startsWith(`${sharedPackageName}/`)) {
    const sharedSubpath = moduleName.slice(sharedPackageName.length + 1);

    return context.resolveRequest(
      context,
      path.resolve(sharedPackageSource, sharedSubpath),
      platform,
    );
  }

  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
