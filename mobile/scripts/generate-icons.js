#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const logoDir = path.join(rootDir, 'assets', 'logo');
const imageDir = path.join(rootDir, 'assets', 'images');

function run(command, args) {
  execFileSync(command, args, {
    stdio: 'inherit',
  });
}

function ensureMacTools() {
  if (process.platform !== 'darwin') {
    throw new Error('generate-icons.js currently requires macOS qlmanage and sips.');
  }
}

function rasterizeSvg(svgPath, size, outputPath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecopest-icon-'));
  run('qlmanage', ['-t', '-s', String(size), '-o', tempDir, svgPath]);

  const renderedPath = path.join(tempDir, `${path.basename(svgPath)}.png`);

  if (!fs.existsSync(renderedPath)) {
    throw new Error(`Unable to render ${svgPath}`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  run('sips', ['-s', 'format', 'png', '--resampleHeightWidth', String(size), String(size), renderedPath, '--out', outputPath]);
}

function main() {
  ensureMacTools();

  const logoMark = path.join(logoDir, 'logo-mark.svg');
  const logoLight = path.join(logoDir, 'logo-mark-on-light.svg');
  const logoSplash = path.join(logoDir, 'logo-mark-on-primary.svg');
  const logoBackground = path.join(logoDir, 'logo-background-primary.svg');
  const logoMono = path.join(logoDir, 'logo-mono.svg');

  rasterizeSvg(logoLight, 1024, path.join(imageDir, 'icon.png'));
  rasterizeSvg(logoMark, 1024, path.join(imageDir, 'adaptive-icon.png'));
  rasterizeSvg(logoSplash, 200, path.join(imageDir, 'splash-icon.png'));
  rasterizeSvg(logoLight, 48, path.join(imageDir, 'favicon.png'));
  rasterizeSvg(logoBackground, 1024, path.join(imageDir, 'android-icon-background.png'));
  rasterizeSvg(logoMark, 1024, path.join(imageDir, 'android-icon-foreground.png'));
  rasterizeSvg(logoMono, 1024, path.join(imageDir, 'android-icon-monochrome.png'));
}

main();
