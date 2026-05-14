const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, spawn } = require('child_process');
const xlsx = require('xlsx');

/**
 * Percorso share (fonte ufficiale file + Excel)
 * Puoi sovrascriverlo con variabile ambiente PORTALE_ROOT_DIR se necessario.
 */
const excelRootDir = process.env.PORTALE_ROOT_DIR || '\\\\Fs\\FS\\MAR_SERVICE\\36-Commissioning';
const excelPath = path.join(excelRootDir, 'Barche_Commissionate.xlsx');

// Upload root di default: può essere diverso dall'Excel (configurabile)
const defaultUploadsRootDir = process.env.PORTALE_UPLOADS_DIR || excelRootDir;

/**
 * Backup locale (writable) - per default usa una cartella in home utente.
 * Quando l'app gira in Electron, electron-main.js passa PORTALE_BACKUP_DIR in AppData.
 */
const backupDir =
  process.env.PORTALE_BACKUP_DIR ||
  path.join(os.homedir(), 'PortaleCommissioningBackup');

const backupFiles = {
  jsonl: path.join(backupDir, 'records.jsonl'),
  snapshot: path.join(backupDir, 'records_latest.json'),
  meta: path.join(backupDir, 'meta.json'),
  tombstones: path.join(backupDir, 'tombstones.jsonl'),
  excelCopiesDir: path.join(backupDir, 'excel'),
};
// Impostazioni persistenti (writable) - es. destinazione caricamenti
const settingsPath = path.join(backupDir, 'settings.json');
let settingsCache = null;
let settingsMtimeMs = 0;

function getAppPkg() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  } catch {
    return { name: 'portale-commissioning', version: '0.0.0' };
  }
}
const appPkg = getAppPkg();

function loadSettings() {
  try {
    const st = fs.statSync(settingsPath);
    if (settingsCache && st.mtimeMs === settingsMtimeMs) return settingsCache;
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    settingsCache = data || {};
    settingsMtimeMs = st.mtimeMs;
    return settingsCache;
  } catch {
    settingsCache = settingsCache || {};
    return settingsCache;
  }
}

function saveSettings(partial) {
  const current = loadSettings();
  const next = { ...current, ...partial };

  // mantieni storico destinazioni per aprire cartelle vecchie
  const currentDir = current.uploadsRootDir || defaultUploadsRootDir;
  if (partial.uploadsRootDir && partial.uploadsRootDir !== currentDir) {
    const hist = Array.isArray(next.uploadsRootDirHistory) ? next.uploadsRootDirHistory : [];
    if (!hist.includes(currentDir)) hist.push(currentDir);
    next.uploadsRootDirHistory = hist.slice(-10); // max 10
  }

  ensureDir(backupDir);
  fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2), 'utf8');
  try {
    const st = fs.statSync(settingsPath);
    settingsMtimeMs = st.mtimeMs;
  } catch {}
  settingsCache = next;
  return next;
}

function getUploadsRootDir() {
  const s = loadSettings();
  return s.uploadsRootDir || defaultUploadsRootDir;
}

function getUploadsRootsToTry() {
  const s = loadSettings();
  const roots = [getUploadsRootDir()];
  const hist = Array.isArray(s.uploadsRootDirHistory) ? s.uploadsRootDirHistory : [];
  for (const h of hist) if (h && !roots.includes(h)) roots.push(h);
  return roots;
}


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

function cleanupBackupArtifacts() {
  try {
    // 1) Rimuovi vecchio CSV (non più usato)
    const legacyCsv = path.join(backupDir, 'records_latest.csv');
    if (fs.existsSync(legacyCsv)) {
      try { fs.unlinkSync(legacyCsv); } catch {}
    }

    // 2) Pulisci tmp_uploads (creati da versioni precedenti): elimina cartelle più vecchie di 2 giorni
    const tmpDir = path.join(backupDir, 'tmp_uploads');
    if (fs.existsSync(tmpDir)) {
      const now = Date.now();
      for (const name of fs.readdirSync(tmpDir)) {
        const p = path.join(tmpDir, name);
        try {
          const st = fs.statSync(p);
          const ageDays = (now - st.mtimeMs) / (1000 * 60 * 60 * 24);
          if (ageDays > 2) fs.rmSync(p, { recursive: true, force: true });
        } catch {}
      }
    }

    // 3) Retention dei backup Excel: tieni gli ultimi 15 file, cancella il resto
    const excelDir = path.join(backupDir, 'excel');
    if (fs.existsSync(excelDir)) {
      const files = fs.readdirSync(excelDir)
        .filter(f => /^Barche_Commissionate_.*\.xlsx$/i.test(f))
        .map(f => ({ f, p: path.join(excelDir, f), m: fs.statSync(path.join(excelDir, f)).mtimeMs }))
        .sort((a, b) => b.m - a.m);

      const keep = 15;
      for (const item of files.slice(keep)) {
        try { fs.unlinkSync(item.p); } catch {}
      }
    }
  } catch {}
}


function safeFilenamePart(s) {
  return String(s || '').replace(/[^a-zA-Z0-9-_]/g, '_');
}

function categoryFromTipo(tipo) {
  const t = String(tipo || '').toLowerCase();

  // mapping robusto: non dipende da stringhe esatte nel form
  if (t.includes('claim')) return 'Claim';
  if (t.includes('avvi')) return 'Avviamento';
  if (t.includes('primo')) return 'Primo_Commissioning';
  if (t.includes('commission')) return 'Commissioning';

  return 'Altro';
}

function getRecordFolder(recordLike) {
  const cantiereFolder = safeFilenamePart(recordLike.Cantiere || 'Senza_Cantiere');
  const categoriaFolder = safeFilenamePart(categoryFromTipo(recordLike.Tipo));

  const dirName = `${recordLike.Cantiere}_${recordLike['Nome Barca']}_${recordLike['Numero Scafo']}`;
  const recordFolderName = safeFilenamePart(dirName);

  return path.join(getUploadsRootDir(), cantiereFolder, categoriaFolder, recordFolderName);
}

function formatDate(date) {
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Intl.DateTimeFormat('it-IT', options).format(date);
}

function loadMeta() {
  try {
    if (!fs.existsSync(backupFiles.meta)) return {};
    const raw = fs.readFileSync(backupFiles.meta, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveMeta(meta) {
  ensureDir(backupDir);
  fs.writeFileSync(backupFiles.meta, JSON.stringify(meta, null, 2), 'utf-8');
}

function attachMeta(records) {
  const meta = loadMeta();
  return records.map(r => {
    const m = meta[String(r.ID)] || {};
    return { ...r, ...m };
  });
}

function readSnapshot() {
  try {
    if (!fs.existsSync(backupFiles.snapshot)) return [];
    return JSON.parse(fs.readFileSync(backupFiles.snapshot, 'utf-8'));
  } catch {
    return [];
  }
}

function readExcel() {
  // Se l'Excel manca, ripiega sul backup snapshot (così la UI rimane funzionante).
  if (!fs.existsSync(excelPath)) {
    return readSnapshot();
  }
  try {
    const workbook = xlsx.readFile(excelPath);
    const sheet = workbook.Sheets['Matrice'];
    if (!sheet) {
      console.error('Foglio "Matrice" non trovato nel file Excel. Uso backup snapshot.');
      return readSnapshot();
    }
    const rows = xlsx.utils.sheet_to_json(sheet);
    return attachMeta(rows);
  } catch (e) {
    console.error('Errore lettura Excel, uso snapshot:', e.message);
    return readSnapshot();
  }
}

function writeExcel(baseRecords) {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet(baseRecords, { header: BASE_HEADERS });
  xlsx.utils.book_append_sheet(workbook, sheet, 'Matrice');
  ensureDir(excelRootDir);
  xlsx.writeFile(workbook, excelPath);
}


function appendJsonl(entry) {
  ensureDir(backupDir);
  fs.appendFileSync(backupFiles.jsonl, JSON.stringify(entry) + '\n', 'utf-8');
}

function rotateExcelCopies(maxKeep = 50) {
  try {
    ensureDir(backupFiles.excelCopiesDir);
    const files = fs.readdirSync(backupFiles.excelCopiesDir)
      .filter(f => f.toLowerCase().endsWith('.xlsx'))
      .map(f => ({ f, t: fs.statSync(path.join(backupFiles.excelCopiesDir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);

    for (const item of files.slice(maxKeep)) {
      fs.unlinkSync(path.join(backupFiles.excelCopiesDir, item.f));
    }
  } catch {
    // no-op
  }
}

function persistBackup(action, recordOrInfo, fullRecords) {
  const ts = new Date().toISOString();
  appendJsonl({ ts, action, data: recordOrInfo });
  if (action === 'delete') {
    try { fs.appendFileSync(backupFiles.tombstones, JSON.stringify({ ts, action, data: recordOrInfo }) + '\n', 'utf-8'); } catch {}
  }

  ensureDir(backupDir);
  const tmpSnapshot = backupFiles.snapshot + '.tmp';
  fs.writeFileSync(tmpSnapshot, JSON.stringify(fullRecords, null, 2), 'utf-8');
  fs.renameSync(tmpSnapshot, backupFiles.snapshot);

  // Copia Excel per sicurezza (se esiste)
  try {
    if (fs.existsSync(excelPath)) {
      ensureDir(backupFiles.excelCopiesDir);
      const stamp = ts.replace(/[:.]/g, '-');
      const dest = path.join(backupFiles.excelCopiesDir, `Barche_Commissionate_${stamp}.xlsx`);
      fs.copyFileSync(excelPath, dest);
      rotateExcelCopies(50);
    }
  } catch {
    // no-op
  }
}

/**
 * Normalizzazione leggera (anti refusi): tenta di mappare valori "simili" a quelli già esistenti.
 * Applica solo se trova UNA corrispondenza molto probabile (distanza <= 2).
 */
function normalizeValue(input, existingValues) {
  const raw = String(input || '').trim().replace(/\s+/g, ' ');
  if (!raw) return raw;

  const existing = Array.from(existingValues || []).filter(Boolean);
  const exact = existing.find(v => v.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;

  const lev = (a, b) => {
    a = a.toLowerCase(); b = b.toLowerCase();
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  };

  let best = null;
  for (const v of existing) {
    if (Math.abs(v.length - raw.length) > 2) continue;
    const d = lev(raw, v);
    if (best === null || d < best.d) best = { v, d };
  }

  if (best && best.d <= 2 && raw.length >= 4) return best.v;
  return raw;
}

function ensureStandardSubfolders(recordFolder) {
  const subfolders = ['01_Documenti', '02_Media', '03_Report', '04_Altro', '05_Mail'];
  for (const sf of subfolders) ensureDir(path.join(recordFolder, sf));
}

function chooseSubfolderByExt(filename) {
  const ext = path.extname(filename || '').toLowerCase();

  const media = new Set([
    // immagini
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff', '.webp', '.heic',
    // video
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


function openInExplorer(targetPath) {
  const p = String(targetPath || '').trim();
  if (!p) return Promise.reject(new Error('Percorso non valido.'));

  const platform = process.platform;

  // Su Windows, explorer.exe a volte restituisce errore anche se apre la cartella.
  // Usiamo spawn detached e consideriamo successo se il processo viene avviato.
  if (platform === 'win32') {
    return new Promise((resolve, reject) => {
      try {
        const child = spawn('explorer.exe', [p], { detached: true, stdio: 'ignore' });
        child.unref();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  const cmd = platform === 'darwin' ? 'open' : 'xdg-open';
  return new Promise((resolve, reject) => {
    execFile(cmd, [p], (err) => (err ? reject(err) : resolve()));
  });
}

// Multer storage con sottocartelle automatiche
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Normalizza i campi PRIMA di calcolare la cartella allegati
    // (altrimenti rischi di creare una cartella con il valore "sporco" e salvare Excel con quello corretto)
    if (!req._dfNormalized) {
      try {
        const baseRecords = readExcel();
        const existingCantieri = new Set(baseRecords.map(r => r.Cantiere));
        const existingOperatori = new Set(baseRecords.map(r => r.Operatore));
        const existingTipi = new Set(baseRecords.map(r => r.Tipo));

        const origC = req.body.cantiere;
        const origO = req.body.operatore;
        const origT = req.body.tipo;

        const normC = normalizeValue(origC, existingCantieri);
        const normO = normalizeValue(origO, existingOperatori);
        const normT = normalizeValue(origT, existingTipi);

        req._dfCorrections = {
          cantiere: (origC && normC && String(origC).trim() !== String(normC).trim()) ? { from: origC, to: normC } : null,
          operatore: (origO && normO && String(origO).trim() !== String(normO).trim()) ? { from: origO, to: normO } : null,
          tipo: (origT && normT && String(origT).trim() !== String(normT).trim()) ? { from: origT, to: normT } : null,
        };

        req.body.cantiere = normC;
        req.body.operatore = normO;
        req.body.tipo = normT;

        req._dfNormalized = true;
      } catch (e) {
        // se fallisce la normalizzazione, prosegui senza bloccare l'upload
        req._dfNormalized = true;
      }
    }

    const { cantiere, nomeBarca, numeroScafo } = req.body;
    const recordFolder = getRecordFolder({ Cantiere: cantiere, Tipo: req.body.tipo, 'Nome Barca': nomeBarca, 'Numero Scafo': numeroScafo });

    ensureDir(recordFolder);
    ensureStandardSubfolders(recordFolder);

    const sub = chooseSubfolderByExt(file.originalname);
    const fullPath = path.join(recordFolder, sub);
    ensureDir(fullPath);

    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^\w.\-]/g, '_');
    cb(null, safe || 'file');
  }
});

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff', '.webp', '.heic',
  '.mp4', '.mov', '.m4v', '.avi', '.mkv', '.wmv', '.webm',
  '.eml', '.msg',
  '.pdf', '.doc', '.docx', '.txt', '.rtf',
  '.xls', '.xlsx',
  '.zip',
]);

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB per file
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo file non consentito: ${ext}`));
    }
  },
});
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/**
 * OPTIONS per dropdown/suggerimenti (cantiere, operatore, tipo).
 */
app.get('/options', (req, res) => {
  const data = readExcel();
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean).map(s => String(s).trim()))).sort((a, b) => a.localeCompare(b));
  res.json({
    cantieri: uniq(data.map(r => r.Cantiere)),
    operatori: uniq(data.map(r => r.Operatore)),
    tipi: uniq(data.map(r => r.Tipo)),
  });
});

/**
 * Impostazioni (UI)
 */
app.get('/settings', (req, res) => {
  res.json({
    appName: appPkg.name,
    version: appPkg.version,
    excelRootDir,
    uploadsRootDir: getUploadsRootDir(),
    backupDir,
  });
});

app.post('/settings/uploads-root', (req, res) => {
  const dir = (req.body && req.body.uploadsRootDir) ? String(req.body.uploadsRootDir).trim() : '';
  if (!dir) return res.status(400).json({ error: 'Destinazione non valida.' });

  const next = saveSettings({ uploadsRootDir: dir });
  res.json({ uploadsRootDir: next.uploadsRootDir });
});

/**
 * Records (con meta allegata se presente)
 */
app.get('/records', (req, res) => {
  res.json(readExcel());
});

/**
 * Upload + inserimento record Excel + backup
 */
app.post('/upload', upload.array('files[]'), (req, res) => {
  const { cantiere, nomeBarca, numeroScafo, matricola, tipo, operatore } = req.body;

  const dataWithMeta = readExcel();
  // baseRecords sono quelli che finiscono in Excel (senza campi meta)
  const baseRecords = dataWithMeta.map(r => {
    const out = {};
    for (const h of BASE_HEADERS) out[h] = r[h] ?? '';
    return out;
  });

  // cantiere/operatore/tipo già normalizzati dal middleware multer (destination callback)
  const newID = baseRecords.length > 0
    ? baseRecords.reduce((max, r) => Math.max(max, Number(r.ID) || 0), 0) + 1
    : 1;

  const newBaseRecord = {
    ID: newID,
    Cantiere: String(cantiere || '').trim(),
    'Nome Barca': String(nomeBarca || '').trim(),
    'Numero Scafo': String(numeroScafo || '').trim(),
    Matricola: matricola ? String(matricola).trim() : '',
    Tipo: String(tipo || '').trim(),
    Operatore: String(operatore || '').trim(),
    'Data e Ora Inserimento': formatDate(new Date()),
  };

  baseRecords.push(newBaseRecord);
  try {
    writeExcel(baseRecords);
  } catch (e) {
    baseRecords.pop();
    return res.status(500).json({ error: 'Impossibile scrivere Excel. Chiudere il file se aperto in un altro programma.' });
  }

  // Meta “non pubblica”
  const username = process.env.USERNAME || process.env.USER || 'unknown';
  const meta = loadMeta();
  meta[String(newID)] = {
    CreatoDa: username,
    CreatoIl: new Date().toISOString(),
    ModificatoDa: '',
    ModificatoIl: '',
  };
  saveMeta(meta);

  const fullRecords = attachMeta(baseRecords);
  persistBackup('create', { record: newBaseRecord, files: (req.files || []).map(f => f.path) }, fullRecords);

  res.json({
    message: 'Record aggiunto con successo',
    newRecord: fullRecords.find(r => String(r.ID) === String(newID)) || newBaseRecord,
    normalization: req._dfCorrections || { cantiere: null, operatore: null, tipo: null },
  });
});

/**
 * Update record + eventuale rename cartella + backup
 */
app.put('/records/:id', (req, res) => {
  const dataWithMeta = readExcel();
  const baseRecords = dataWithMeta.map(r => {
    const out = {};
    for (const h of BASE_HEADERS) out[h] = r[h] ?? '';
    return out;
  });

  const recordIndex = baseRecords.findIndex(record => String(record.ID) === String(req.params.id));
  if (recordIndex === -1) return res.status(404).json({ error: 'Record non trovato' });

  const oldRecord = baseRecords[recordIndex];

  // Applica solo i campi modificabili — impedisce che req.body sovrascriva ID o Data
  const EDITABLE_FIELDS = ['Cantiere', 'Nome Barca', 'Numero Scafo', 'Matricola', 'Tipo', 'Operatore'];
  const updated = { ...oldRecord };
  for (const key of EDITABLE_FIELDS) {
    if (key in req.body) updated[key] = String(req.body[key] ?? '').trim();
  }

  // Normalizza cantiere/operatore/tipo in base a valori esistenti
  const existingCantieri = new Set(baseRecords.map(r => r.Cantiere));
  const existingOperatori = new Set(baseRecords.map(r => r.Operatore));
  const existingTipi = new Set(baseRecords.map(r => r.Tipo));

  updated.Cantiere = normalizeValue(updated.Cantiere, existingCantieri);
  updated.Operatore = normalizeValue(updated.Operatore, existingOperatori);
  updated.Tipo = normalizeValue(updated.Tipo, existingTipi);

  // Se cambiano i campi di naming, rinomina la cartella
  const oldPath = getRecordFolder(oldRecord);
  const newPath = getRecordFolder(updated);

  let folderRenamed = false;
  if (oldPath !== newPath && fs.existsSync(oldPath)) {
    ensureDir(path.dirname(newPath));
    if (!fs.existsSync(newPath)) {
      fs.renameSync(oldPath, newPath);
      folderRenamed = true;
    } else {
      console.warn(`Rename cartella skipped: la destinazione esiste già (${newPath}). I file restano in ${oldPath}.`);
    }
  }

  baseRecords[recordIndex] = updated;
  try {
    writeExcel(baseRecords);
  } catch (e) {
    if (folderRenamed) {
      try { fs.renameSync(newPath, oldPath); } catch {}
    }
    return res.status(500).json({ error: 'Impossibile scrivere Excel. Chiudere il file se aperto in un altro programma.' });
  }

  const username = process.env.USERNAME || process.env.USER || 'unknown';
  const meta = loadMeta();
  const idKey = String(updated.ID);
  meta[idKey] = {
    ...(meta[idKey] || {}),
    ModificatoDa: username,
    ModificatoIl: new Date().toISOString(),
  };
  saveMeta(meta);

  const fullRecords = attachMeta(baseRecords);
  persistBackup('update', { id: updated.ID, patch: req.body }, fullRecords);

  res.json({ message: 'Record aggiornato con successo', updatedRecord: fullRecords[recordIndex] });
});

/**
 * Delete record + elimina cartella + backup
 */
app.delete('/records/:id', (req, res) => {
  const dataWithMeta = readExcel();
  const baseRecords = dataWithMeta.map(r => {
    const out = {};
    for (const h of BASE_HEADERS) out[h] = r[h] ?? '';
    return out;
  });

  const recordIndex = baseRecords.findIndex(record => String(record.ID) === String(req.params.id));
  if (recordIndex === -1) return res.status(404).json({ error: 'Record non trovato' });

  const recordToDelete = baseRecords[recordIndex];
  const recordFullBeforeDelete = dataWithMeta.find(r => String(r.ID) === String(req.params.id)) || recordToDelete;

  const roots = getUploadsRootsToTry();

  const cantiereFolder = safeFilenamePart(recordToDelete.Cantiere || 'Senza_Cantiere');
  const categoriaFolder = safeFilenamePart(categoryFromTipo(recordToDelete.Tipo));
  const recordFolderName = safeFilenamePart(`${recordToDelete.Cantiere}_${recordToDelete['Nome Barca']}_${recordToDelete['Numero Scafo']}`);

  // prova a cancellare la cartella (nuova o legacy) su root attuale + eventuali root storiche
  for (const root of roots) {
    const pNew = path.join(root, cantiereFolder, categoriaFolder, recordFolderName);
    const pOld = path.join(root, recordFolderName);

    if (fs.existsSync(pNew)) {
      fs.rmSync(pNew, { recursive: true, force: true });

      // se categoria/cantiere diventano vuote, prova a rimuoverle (best effort)
      try {
        const catDir = path.join(root, cantiereFolder, categoriaFolder);
        const cantDir = path.join(root, cantiereFolder);
        if (fs.existsSync(catDir) && fs.readdirSync(catDir).length === 0) fs.rmdirSync(catDir);
        if (fs.existsSync(cantDir) && fs.readdirSync(cantDir).length === 0) fs.rmdirSync(cantDir);
      } catch {}
    }

    if (fs.existsSync(pOld)) {
      fs.rmSync(pOld, { recursive: true, force: true });
    }
  }

  baseRecords.splice(recordIndex, 1);
  try {
    writeExcel(baseRecords);
  } catch (e) {
    return res.status(500).json({ error: 'Impossibile scrivere Excel. Chiudere il file se aperto in un altro programma.' });
  }

  // meta: rimuovo la voce per non lasciare orfani
  const meta = loadMeta();
  delete meta[String(req.params.id)];
  saveMeta(meta);

  const fullRecords = attachMeta(baseRecords);
  // salva tombstone completo (record snapshot + quando/chi)
  const deletedAt = new Date().toISOString();
  const deletedBy = (() => { try { return os.userInfo().username; } catch { return 'unknown'; } })();

  persistBackup('delete', { id: Number(req.params.id), record: recordFullBeforeDelete, deletedAt, deletedBy }, fullRecords);

  res.json({ message: 'Record e cartella eliminati con successo' });
});

/**
 * Apri cartella allegati in Esplora risorse (Windows).
 */
app.post('/records/:id/open-folder', (req, res) => {
  const id = Number(req.params.id);
  const record = readExcel().find(r => Number(r.ID) === id);
  if (!record) return res.status(404).json({ error: 'Record non trovato.' });

  const roots = getUploadsRootsToTry();

  // Nuova struttura: <root>\<Cantiere>\<Categoria>\<Cantiere_NomeBarca_Scafo>
  const cantiereFolder = safeFilenamePart(record.Cantiere || 'Senza_Cantiere');
  const categoriaFolder = safeFilenamePart(categoryFromTipo(record.Tipo));
  const recordFolderName = safeFilenamePart(`${record.Cantiere}_${record['Nome Barca']}_${record['Numero Scafo']}`);

  let found = null;

  for (const root of roots) {
    const pNew = path.join(root, cantiereFolder, categoriaFolder, recordFolderName);
    if (fs.existsSync(pNew)) { found = pNew; break; }

    // Vecchia struttura (fallback storico): <root>\<Cantiere_NomeBarca_Scafo>
    const pOld = path.join(root, recordFolderName);
    if (fs.existsSync(pOld)) { found = pOld; break; }
  }

  // Se non esiste ancora (record senza allegati), crea e apri la cartella nella root attuale
  const expected = path.join(getUploadsRootDir(), cantiereFolder, categoriaFolder, recordFolderName);
  const folderToOpen = found || expected;

  try {
    ensureDir(folderToOpen);
    ensureStandardSubfolders(folderToOpen);
  } catch (e) {
    // non bloccare l'apertura, ma segnala
  }

  openInExplorer(folderToOpen)
    .then(() => res.json({ ok: true, path: folderToOpen }))
    .catch(err => res.status(500).json({ error: 'Errore durante l\'apertura della cartella', details: String(err.message || err) }));
});

/**
 * Ricostruisci Excel dal backup (snapshot).
 * ATTENZIONE: sovrascrive Barche_Commissionate.xlsx
 */
let rebuildingExcel = false;
app.post('/admin/rebuild-excel', (req, res) => {
  if (rebuildingExcel) {
    return res.status(409).json({ error: 'Ricostruzione già in corso, attendere.' });
  }
  rebuildingExcel = true;
  try {
    const snapshot = readSnapshot();
    if (!snapshot || snapshot.length === 0) {
      return res.status(400).json({ error: 'Backup snapshot non disponibile o vuoto' });
    }

    const baseRecords = snapshot.map(r => {
      const out = {};
      for (const h of BASE_HEADERS) out[h] = r[h] ?? '';
      return out;
    });

    writeExcel(baseRecords);
    res.json({ ok: true, message: 'Excel ricostruito dal backup', rows: baseRecords.length });
  } finally {
    rebuildingExcel = false;
  }
});

const staticDir = process.pkg ? path.dirname(process.execPath) : __dirname;
app.use(express.static(staticDir));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || (err && err.message && err.message.startsWith('Tipo file'))) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Errore interno del server' });
});

app.listen(3000, '127.0.0.1', () => {
  console.log('Server avviato su http://127.0.0.1:3000/index.html');
  cleanupBackupArtifacts();
  setInterval(cleanupBackupArtifacts, 6 * 60 * 60 * 1000); // ogni 6 ore
});
