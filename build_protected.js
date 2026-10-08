const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Step 1: Preparing Clean Build Folder ---');
const distDir = path.join(__dirname, 'dist_protected');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy all files from uxp_plugin
function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(path.join(__dirname, 'uxp_plugin'), distDir);
console.log('Files copied to dist_protected.');

console.log('--- Step 2: Obfuscating JavaScript Files ---');
function getAllJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllJsFiles(fullPath));
    } else if (file.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const jsFiles = getAllJsFiles(distDir);
for (const file of jsFiles) {
  console.log(`Obfuscating: ${path.relative(distDir, file)}`);
  try {
    execSync(`npx javascript-obfuscator "${file}" --output "${file}" --compact true --control-flow-flattening true --control-flow-flattening-threshold 0.75 --dead-code-injection false --numbers-to-expressions true --simplify true --string-array true --string-array-threshold 0.8 --split-strings true`, {
      stdio: 'inherit'
    });
  } catch (err) {
    console.error(`Failed to obfuscate ${file}:`, err.message);
  }
}

console.log('--- Step 3: Packaging Protected .ccx & Distribution ---');
const installerDir = path.join(__dirname, 'E-Commerce-Ready-Edit-Installer');
if (!fs.existsSync(installerDir)) fs.mkdirSync(installerDir, { recursive: true });

// Remove open uxp-plugin folder if it exists in installerDir
const unzippedPluginDir = path.join(installerDir, 'uxp-plugin');
if (fs.existsSync(unzippedPluginDir)) {
  fs.rmSync(unzippedPluginDir, { recursive: true, force: true });
  console.log('Removed raw source folder uxp-plugin from installer.');
}

// Create ccx from dist_protected
const ccxPath = path.join(installerDir, 'E-Commerce-Ready-Edit.ccx');
const zipTemp = path.join(installerDir, 'temp.zip');
if (fs.existsSync(ccxPath)) fs.unlinkSync(ccxPath);
if (fs.existsSync(zipTemp)) fs.unlinkSync(zipTemp);

execSync(`powershell -Command "Compress-Archive -Path 'dist_protected\\*' -DestinationPath '${zipTemp}' -Force; Move-Item '${zipTemp}' '${ccxPath}' -Force"`);
console.log('Protected .ccx generated successfully!');

console.log('--- Build Finished! ---');
