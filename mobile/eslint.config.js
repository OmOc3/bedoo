const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['.expo/**', 'dist/**', 'node_modules/**'],
    settings: {
      'import/core-modules': ['@ecopest/shared', '@ecopest/shared/constants'],
    },
  },
]);
