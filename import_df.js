/**
 * Importa un pacchetto .df (zip rinominato) esportato da una futura PWA esterna.
 *
 * Uso:
 *   npm run import:df -- "C:\Percorso\payload.df"
 *
 * Il file .df deve contenere:
 *   - record.json
 *   - allegati/ (opzionale)
 *
 * Nota: questo è uno scheletro "funzionante" lato file-system. Non apre Outlook e non invia mail.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function safeFilenamePart(s) {
  return String(s || '').replace(/[^a-zA-Z0-9-_]/g, '_');
}

function categoryFromTipo(tipo) {
  const t = String(tipo || '').toLowerCase();
  if (t.includes('claim')) return 'Claim';
  if (t.includes('avvi')) return 'Avviamento';
  if (t.includes('primo')) return 'Primo_Commissioning';
  if (t.includes('commission')) return 'Commissioning';
  return 'Altro';
}

function chooseSubfolderByExt(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  const media = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff', '.webp', '.heic',
    '.mp4', '.mov', '.m4v', '.avi', '.mkv', '.wmv', '.webm'
  ]);
  const mail = new Set(['.eml', '.msg']);
  const docs = new Set(['.pdf', '.doc', '.docx', '.txt', '.rtf']);
  const reports = new Set(['.xls', '.xlsx']);
  if (mail.has(ext)) return '05_Mail';
  if (media.has(ext)) return '02_Media';
  if (docs.has(ext)) return '01_Documenti';
  if (reports.has(ext)) return '03_Report';
  return '04_Altro';
}

function ensureStandardSubfolders(recordFolder) {
  for (const sf of ['01_Documenti', '02_Media', '03_Report', '04_Altro', '05_Mail']) {
    ensureDir(path.join(recordFolder, sf));
  }
}

function getBackupDir() {
  return process.env.PORTALE_BACKUP_DIR || path.join(os.homedir(), 'PortaleCommissioningBackup');
}

function getSettings() {
  const backupDir = getBackupDir();
  const settingsPath = path.join(backupDir, 'settings.json');
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return {};
  }
}

function getUploadsRootDir() {
  // stesso comportamento del server: se non c'è settings, usa PORTALE_UPLOADS_DIR o PORTALE_ROOT_DIR o fallback
  const settings = getSettings();
  if (settings.uploadsRootDir) return settings.uploadsRootDir;
  const uploadsDir = process.env.PORTALE_UPLOADS_DIR || process.env.PORTALE_ROOT_DIR || '';
  if (!uploadsDir) {
    console.error('[ERRORE] Imposta la variabile d\'ambiente PORTALE_ROOT_DIR prima di eseguire questo script.');
    process.exit(1);
  }
  return uploadsDir;
}

function unzipDfToTemp(dfPath) {
  const tmpBase = path.join(os.tmpdir(), `df_import_${Date.now()}`);
  ensureDir(tmpBase);

  // Expand-Archive preferisce estensione .zip: copiamo temporaneamente
  const tmpZip = path.join(tmpBase, 'payload.zip');
  fs.copyFileSync(dfPath, tmpZip);

  // PowerShell built-in su Windows
  const psCommand = `Expand-Archive -LiteralPath '${tmpZip.replace(/'/g, "''")}' -DestinationPath '${tmpBase.replace(/'/g, "''")}' -Force`;
  const encoded = Buffer.from(psCommand, 'utf16le').toString('base64');
  execFileSync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', encoded,
  ], { stdio: 'inherit' });

  return tmpBase;
}

function main() {
  const arg = process.argv.slice(2).find(a => !a.startsWith('--'));
  if (!arg) {
    console.error('Uso: node import_df.js "C:\\Percorso\\payload.df"');
    process.exit(1);
  }

  const dfPath = path.resolve(arg);
  if (!fs.existsSync(dfPath)) {
    console.error('File non trovato:', dfPath);
    process.exit(1);
  }

  const extracted = unzipDfToTemp(dfPath);

  try {
    const recordPath = path.join(extracted, 'record.json');

    if (!fs.existsSync(recordPath)) {
      console.error('record.json non trovato nel pacchetto .df');
      process.exit(1);
    }

    let record;
    try {
      record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
    } catch (e) {
      console.error('record.json non è un JSON valido:', e.message);
      process.exit(1);
    }

    const uploadsRoot = getUploadsRootDir();
    const cantiere = record.Cantiere || 'Senza_Cantiere';
    const nomeBarca = record['Nome Barca'] || 'Senza_Nome';
    const numeroScafo = record['Numero Scafo'] || 'Senza_Scafo';
    const cantiereFolder = safeFilenamePart(cantiere);
    const categoriaFolder = safeFilenamePart(categoryFromTipo(record.Tipo));
    const recordFolderName = safeFilenamePart(`${cantiere}_${nomeBarca}_${numeroScafo}`);
    const recordFolder = path.join(uploadsRoot, cantiereFolder, categoriaFolder, recordFolderName);

    ensureDir(recordFolder);
    ensureStandardSubfolders(recordFolder);

    const allegatiDir = path.join(extracted, 'allegati');
    if (fs.existsSync(allegatiDir)) {
      const files = fs.readdirSync(allegatiDir);
      for (const f of files) {
        const src = path.join(allegatiDir, f);
        if (!fs.statSync(src).isFile()) {
          console.warn('Skipped (non è un file):', f);
          continue;
        }

        const sub = chooseSubfolderByExt(f);
        const destDir = path.join(recordFolder, sub);
        ensureDir(destDir);

        let dest = path.join(destDir, f);
        if (fs.existsSync(dest)) {
          const ext = path.extname(f);
          const base = path.basename(f, ext);
          let k = 1;
          while (fs.existsSync(dest)) {
            dest = path.join(destDir, `${base} (${k})${ext}`);
            k++;
          }
        }

        fs.copyFileSync(src, dest);
      }
    }

    console.log('\nImport completato (solo filesystem):');
    console.log('Cartella:', recordFolder);
    console.log('Nota: lo scheletro CLI non scrive ancora su Excel. (Step successivo: import completo in app interna.)');
  } finally {
    try {
      fs.rmSync(extracted, { recursive: true, force: true });
    } catch (e) {
      console.warn('Impossibile eliminare cartella temporanea:', extracted, e.message);
    }
  }
}

main();
