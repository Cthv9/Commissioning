const fs = require('fs');
const path = require('path');

// Crea le directory se non esistono
fs.mkdirSync('server-dist', { recursive: true });
fs.mkdirSync('src-tauri/dist', { recursive: true });

// Copia i file frontend accanto a server.exe (necessario per express.static in produzione)
const frontendFiles = ['index.html', 'manage.html', 'script.js', 'ui-common.js'];
frontendFiles.forEach(f => {
  fs.copyFileSync(f, path.join('server-dist', f));
  // Copia anche in src-tauri/dist/ per i bundle resources di Tauri
  fs.copyFileSync(f, path.join('src-tauri/dist', f));
  console.log(`Copied ${f}`);
});

// Copia server.exe in src-tauri/dist/ (richiesto da tauri.prod.conf.json resources)
const serverExe = 'server-dist/server.exe';
if (!fs.existsSync(serverExe)) {
  console.error(`ERRORE: ${serverExe} non trovato. Esegui prima npm run pkg:server`);
  process.exit(1);
}
fs.copyFileSync(serverExe, 'src-tauri/dist/server.exe');
console.log('Copied server.exe → src-tauri/dist/server.exe');

console.log('Build sidecar completato.');
