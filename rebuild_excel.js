const fs = require('fs');
const path = require('path');
const os = require('os');
const xlsx = require('xlsx');

const rootDir = process.env.PORTALE_ROOT_DIR || '';
if (!rootDir) {
  console.error('[ERRORE] Imposta la variabile d\'ambiente PORTALE_ROOT_DIR prima di eseguire questo script.');
  process.exit(1);
}
const excelPath = path.join(rootDir, 'Barche_Commissionate.xlsx');

const backupDir =
  process.env.PORTALE_BACKUP_DIR ||
  path.join(os.homedir(), 'PortaleCommissioningBackup');

const snapshotPath = path.join(backupDir, 'records_latest.json');

const BASE_HEADERS = [
  'ID',
  'Cantiere',
  'Nome Barca',
  'Numero Scafo',
  'Matricola',
  'Tipo',
  'Operatore',
  'Data e Ora Inserimento',
];

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function main() {
  if (!fs.existsSync(snapshotPath)) {
    console.error('Backup snapshot non trovato:', snapshotPath);
    process.exit(1);
  }

  let snapshot;
  try {
    snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  } catch (e) {
    console.error('Backup snapshot non è un JSON valido:', e.message);
    process.exit(1);
  }
  if (!Array.isArray(snapshot) || snapshot.length === 0) {
    console.error('Backup snapshot vuoto o non valido.');
    process.exit(1);
  }

  const baseRecords = snapshot.map(r => {
    const out = {};
    for (const h of BASE_HEADERS) out[h] = r[h] ?? '';
    return out;
  });

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(baseRecords, { header: BASE_HEADERS });
  xlsx.utils.book_append_sheet(wb, ws, 'Matrice');

  ensureDir(rootDir);
  xlsx.writeFile(wb, excelPath);

  console.log('OK: Excel ricostruito:', excelPath, 'righe:', baseRecords.length);
}

main();
