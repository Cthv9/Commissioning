#!/usr/bin/env node
/**
 * Migra i file di backup del vecchio portale "industriale" (repo gemello)
 * nella cartella di backup del portale unificato.
 *
 * Uso:
 *   node scripts/migrate-ind-to-unified.js --from <cartellaBackupIND> [--to <cartellaBackup>] [--force] [--excel <path>]
 *
 * Senza --from, prova come default: ~/PortaleCommissioningIND_Backup
 * Senza --to, usa la cartella dell'app: ~/Documents/Portale Commissioning/backup
 * (con Documenti spostati su OneDrive indicare il percorso reale con --to).
 *
 * Copia (mai sovrascrive, a meno di --force) i file esistenti tra:
 *   records_latest.json, meta.json, records.jsonl, tombstones.jsonl
 *
 * Non modifica mai la cartella di origine, lo share di rete o l'Excel originale.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getProfile, BASE_EXCEL_HEADERS } = require('../domain-profile');

const FILES_TO_MIGRATE = ['records_latest.json', 'meta.json', 'records.jsonl', 'tombstones.jsonl'];

function parseArgs(argv) {
  const args = { from: null, to: null, force: false, excel: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--from') {
      args.from = argv[++i] || null;
    } else if (a === '--to') {
      args.to = argv[++i] || null;
    } else if (a === '--force') {
      args.force = true;
    } else if (a === '--excel') {
      args.excel = argv[++i] || null;
    }
  }
  return args;
}

function checkExcelHeader(excelPath) {
  let xlsx;
  try {
    xlsx = require('xlsx');
  } catch (e) {
    console.warn(`WARNING: impossibile caricare la libreria xlsx per verificare l'header (${e.message}). Salto la verifica.`);
    return;
  }

  try {
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames.includes('Matrice') ? 'Matrice' : workbook.SheetNames[0];
    if (!sheetName) {
      console.warn(`WARNING: nessun foglio trovato in ${excelPath}.`);
      return;
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const header = (rows && rows[0]) || [];
    const expected = BASE_EXCEL_HEADERS;
    const match = header.length === expected.length && header.every((h, i) => String(h).trim() === expected[i]);
    if (!match) {
      console.warn(
        `WARNING: l'header dell'Excel (${excelPath}) non corrisponde a quello atteso.\n` +
        `  Trovato:  [${header.join(', ')}]\n` +
        `  Atteso:   [${expected.join(', ')}]\n` +
        `  (non bloccante: la migrazione dei file di backup procede comunque)`
      );
    } else {
      console.log('Header Excel verificato: OK.');
    }
  } catch (e) {
    console.warn(`WARNING: impossibile leggere l'Excel per la verifica dell'header (${excelPath}): ${e.message}`);
  }
}

function copyFileSafe(srcPath, destPath, force) {
  if (!fs.existsSync(srcPath)) {
    return { status: 'skipped-missing' };
  }
  if (fs.existsSync(destPath) && !force) {
    return { status: 'skipped-exists' };
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  return { status: 'copied' };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const fromDir = args.from
    ? path.resolve(args.from)
    : path.join(os.homedir(), 'PortaleCommissioningIND_Backup');

  if (!fs.existsSync(fromDir) || !fs.statSync(fromDir).isDirectory()) {
    console.error(`[ERRORE] Cartella di origine non trovata: ${fromDir}`);
    process.exit(1);
  }

  const indProfile = getProfile('industriale');
  const destDir = args.to
    ? path.resolve(args.to)
    : path.join(os.homedir(), 'Documents', 'Portale Commissioning', 'backup');
  fs.mkdirSync(destDir, { recursive: true });

  console.log(`Origine:      ${fromDir}`);
  console.log(`Destinazione: ${destDir}`);
  console.log(`Force:        ${args.force ? 'sì' : 'no'}\n`);

  // Verifica opzionale dell'header dell'Excel (non bloccante).
  const excelPath = args.excel
    ? path.resolve(args.excel)
    : path.join(fromDir, indProfile.defaultExcelFileName);
  if (fs.existsSync(excelPath)) {
    checkExcelHeader(excelPath);
  } else if (args.excel) {
    console.warn(`WARNING: file Excel indicato non trovato: ${excelPath}`);
  }

  const results = [];
  for (const name of FILES_TO_MIGRATE) {
    const src = path.join(fromDir, name);
    const dest = path.join(destDir, name);
    const r = copyFileSafe(src, dest, args.force);
    results.push({ name, ...r });
  }

  console.log('\nRiepilogo:');
  let copied = 0, skippedMissing = 0, skippedExists = 0;
  for (const r of results) {
    console.log(`  ${r.name}: ${r.status}`);
    if (r.status === 'copied') copied++;
    else if (r.status === 'skipped-missing') skippedMissing++;
    else if (r.status === 'skipped-exists') skippedExists++;
  }

  console.log(
    `\nTotale: ${copied} copiati, ${skippedMissing} assenti (saltati), ` +
    `${skippedExists} già esistenti a destinazione (saltati, usare --force per sovrascrivere).`
  );
  console.log('\nNota: lo share di rete e l\'Excel originale non sono mai stati modificati da questo script.');
}

main();
