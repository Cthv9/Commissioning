const fs = require('fs');
const path = require('path');

// Crea le directory se non esistono
fs.mkdirSync('server-dist', { recursive: true });
fs.mkdirSync('src-tauri/dist', { recursive: true });

// Rileva automaticamente tutti i file frontend nella root del progetto
const frontendFiles = fs.readdirSync('.')
  .filter(f => /\.(html|js|css)$/.test(f) && fs.statSync(f).isFile());

if (frontendFiles.length === 0) {
  console.error('ERRORE: nessun file frontend (.html/.js/.css) trovato nella root del progetto.');
  process.exit(1);
}

// Copia i file frontend accanto a server.exe (necessario per express.static in produzione)
let errors = 0;
frontendFiles.forEach(f => {
  try {
    fs.copyFileSync(f, path.join('server-dist', f));
    fs.copyFileSync(f, path.join('src-tauri/dist', f));
    console.log(`Copied ${f}`);
  } catch (e) {
    console.error(`ERRORE durante la copia di ${f}:`, e.message);
    errors++;
  }
});

if (errors > 0) {
  console.error(`${errors} file non copiati. Build sidecar fallito.`);
  process.exit(1);
}

// Copia server.exe in src-tauri/dist/ (richiesto da tauri.prod.conf.json resources)
const serverExe = 'server-dist/server.exe';
if (!fs.existsSync(serverExe)) {
  console.error(`ERRORE: ${serverExe} non trovato. Esegui prima npm run pkg:server`);
  process.exit(1);
}
fs.copyFileSync(serverExe, 'src-tauri/dist/server.exe');
console.log('Copied server.exe → src-tauri/dist/server.exe');

console.log('Build sidecar completato.');
