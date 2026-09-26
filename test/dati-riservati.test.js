// Il repository è pubblico (serve a GitHub Pages): nei file non devono finire
// percorsi di rete aziendali, indirizzi email o nomi riservati.
//
// Le parole riservate (es. nome dell'azienda, dei server, dei clienti) NON sono
// scritte qui, altrimenti sarebbero pubbliche: si passano con la variabile
// d'ambiente PORTALE_TERMINI_RISERVATI (separate da virgola). In CI arriva dal
// secret del repository con lo stesso nome (vedi .github/workflows/test.yml).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// File di terze parti o generati: non scritti da noi.
const ESCLUSI = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)Cargo\.lock$/,
  /\.min\.(js|css)$/,
  /^docs\/vendor\//,
  /\.(png|ico|icns|jpg|jpeg|gif|webp|pdf|msix|exe|zip)$/i,
];

// Segnaposto usati negli esempi: \\Server\Share\Cartella
const HOST_UNC_AMMESSI = new Set(['server']);

const EMAIL_AMMESSE = [
  /\.(png|jpg|svg|ico)$/i, // nomi di file tipo icona@2x.png, non email
  /^noreply@anthropic\.com$/i,
  /@users\.noreply\.github\.com$/i,
  /@example\.(com|org)$/i,
];

function fileTracciati() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
    .filter((f) => !ESCLUSI.some((re) => re.test(f)))
    .filter((f) => fs.existsSync(path.join(ROOT, f)));
}

function trova(regex, onMatch) {
  const problemi = [];
  for (const file of fileTracciati()) {
    const righe = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n');
    righe.forEach((riga, i) => {
      for (const m of riga.matchAll(regex)) {
        const motivo = onMatch(m);
        if (motivo) problemi.push(`${file}:${i + 1}: ${motivo}`);
      }
    });
  }
  return problemi;
}

test('nessun percorso di rete (UNC) reale nei file', () => {
  // Percorso che inizia con due barre rovesciate (anche raddoppiate nelle
  // stringhe JavaScript); non conta "C:\\Cartella", che è un percorso locale.
  const problemi = trova(/(?<![A-Za-z0-9_:\\])\\{2,}([A-Za-z0-9_.$-]+)\\+/g, (m) => (
    // Il nome del server non va nel messaggio: i log della CI sono pubblici.
    HOST_UNC_AMMESSI.has(m[1].toLowerCase()) ? null : 'percorso di rete non consentito'
  ));
  assert.deepEqual(problemi, [], 'usare un segnaposto come \\\\Server\\Share');
});

test('nessun indirizzo email nei file', () => {
  const problemi = trova(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (m) => (
    EMAIL_AMMESSE.some((re) => re.test(m[0])) ? null : 'indirizzo email'
  ));
  assert.deepEqual(problemi, []);
});

test('nessuna parola riservata nei file (PORTALE_TERMINI_RISERVATI)', (t) => {
  const termini = String(process.env.PORTALE_TERMINI_RISERVATI || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (termini.length === 0) return t.skip('PORTALE_TERMINI_RISERVATI non impostata');
  const problemi = [];
  for (const file of fileTracciati()) {
    const testo = fs.readFileSync(path.join(ROOT, file), 'utf8').toLowerCase();
    termini.forEach((termine, n) => {
      // Nel messaggio il termine non compare: i log della CI sono pubblici.
      if (testo.includes(termine)) problemi.push(`${file}: contiene il termine riservato n. ${n + 1}`);
    });
  }
  assert.deepEqual(problemi, []);
});
