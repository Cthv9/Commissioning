const fs = require('fs');
const path = require('path');

// Crea la directory se non esiste
fs.mkdirSync('server-dist', { recursive: true });

// Copia i file frontend accanto a server.exe (necessario per express.static)
['index.html', 'manage.html', 'script.js', 'ui-common.js'].forEach(f => {
  fs.copyFileSync(f, path.join('server-dist', f));
  console.log(`Copied ${f}`);
});

// Rinomina per la convenzione Tauri (triple del target: x86_64-pc-windows-msvc)
const src = 'server-dist/server.exe';
const dest = 'server-dist/server-x86_64-pc-windows-msvc.exe';
if (fs.existsSync(src)) {
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  fs.renameSync(src, dest);
  console.log(`Renamed → ${dest}`);
} else {
  console.error(`ERRORE: ${src} non trovato. Esegui prima npm run pkg:server`);
  process.exit(1);
}
