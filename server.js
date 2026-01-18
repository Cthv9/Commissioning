const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const rootDir = '\\\\Fs\\FS\\MAR_SERVICE\\36-Commissioning';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { cantiere, nomeBarca, numeroScafo } = req.body;
    const dirName = `${cantiere}_${nomeBarca}_${numeroScafo}`.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fullPath = path.join(rootDir, dirName);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const excelPath = path.join(rootDir, 'Barche_Commissionate.xlsx');

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

function readExcel() {
  if (!fs.existsSync(excelPath)) return [];
  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets['Matrice'];
  return xlsx.utils.sheet_to_json(sheet);
}

function writeExcel(data) {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet(data, {
    header: [
      'ID',
      'Cantiere',
      'Nome Barca',
      'Numero Scafo',
      'Matricola',
      'Tipo',
      'Operatore',
      'Data e Ora Inserimento',
    ],
  });
  xlsx.utils.book_append_sheet(workbook, sheet, 'Matrice');
  xlsx.writeFile(workbook, excelPath);
}

app.get('/records', (req, res) => {
  const data = readExcel();
  res.json(data);
});

app.post('/upload', upload.array('files[]'), (req, res) => {
  const { cantiere, nomeBarca, numeroScafo, matricola, tipo, operatore } = req.body;
  const data = readExcel();
  const newID = data.length > 0 ? Math.max(...data.map(record => record.ID)) + 1 : 1;

  const newRecord = {
    ID: newID,
    Cantiere: cantiere,
    'Nome Barca': nomeBarca,
    'Numero Scafo': numeroScafo,
    Matricola: matricola || '',
    Tipo: tipo,
    Operatore: operatore,
    'Data e Ora Inserimento': formatDate(new Date()),
  };

  data.push(newRecord);
  writeExcel(data);
  res.json({ message: 'Record aggiunto con successo', newRecord });
});

app.put('/records/:id', (req, res) => {
  const data = readExcel();
  const recordIndex = data.findIndex(record => record.ID == req.params.id);

  if (recordIndex === -1) {
    return res.status(404).json({ error: 'Record non trovato' });
  }

  const oldRecord = data[recordIndex];
  const newRecord = { ...oldRecord, ...req.body };

  const oldDir = `${oldRecord.Cantiere}_${oldRecord['Nome Barca']}_${oldRecord['Numero Scafo']}`.replace(/[^a-zA-Z0-9-_]/g, '_');
  const newDir = `${newRecord.Cantiere}_${newRecord['Nome Barca']}_${newRecord['Numero Scafo']}`.replace(/[^a-zA-Z0-9-_]/g, '_');
  const oldPath = path.join(rootDir, oldDir);
  const newPath = path.join(rootDir, newDir);

  if (oldDir !== newDir && fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
  }

  data[recordIndex] = newRecord;
  writeExcel(data);

  res.json({ message: 'Record aggiornato con successo', updatedRecord: newRecord });
});

app.delete('/records/:id', (req, res) => {
  let data = readExcel();
  const recordIndex = data.findIndex(record => record.ID == req.params.id);

  if (recordIndex === -1) {
    return res.status(404).json({ error: 'Record non trovato' });
  }

  const recordToDelete = data[recordIndex];
  const dirName = `${recordToDelete.Cantiere}_${recordToDelete['Nome Barca']}_${recordToDelete['Numero Scafo']}`.replace(/[^a-zA-Z0-9-_]/g, '_');
  const dirPath = path.join(rootDir, dirName);

  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }

  data.splice(recordIndex, 1);
  writeExcel(data);

  res.json({ message: 'Record e cartella eliminati con successo' });
});

app.use(express.static(__dirname));

app.listen(3000, () => {
  console.log('Server avviato sulla porta 3000 - http://commissioning.local:3000/ - http://localhost:3000/index.html');
});
