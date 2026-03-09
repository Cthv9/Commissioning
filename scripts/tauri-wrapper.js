#!/usr/bin/env node
// Wrapper per il CLI Tauri:
// - "build" → esegue la pipeline completa (pkg + sidecar + tauri build --config prod)
// - tutto il resto → passa direttamente a tauri

const { execSync, spawn } = require('child_process');
const args = process.argv.slice(2);

if (args[0] === 'build') {
  try {
    execSync('npm run tauri:build', { stdio: 'inherit', shell: true });
  } catch {
    process.exit(1);
  }
} else {
  const child = spawn('tauri', args, { stdio: 'inherit', shell: true });
  child.on('exit', code => process.exit(code ?? 0));
}
