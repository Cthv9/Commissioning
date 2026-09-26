// Test delle route HTTP con il server vero avviato su cartelle temporanee:
// verificano che le funzioni rispondano, non solo che il codice si compili.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const AdmZip = require('adm-zip');
const { startServer } = require('./helpers/server');

const SHELL_SECRET = 'segreto-di-test-della-shell';
let srv;

before(async () => {
  srv = await startServer({ PORTALE_SHELL_SECRET: SHELL_SECRET });
});

after(async () => {
  if (srv) await srv.stop();
});

function api(pathname, { token = srv.token, headers = {}, ...opts } = {}) {
  const h = { ...headers };
  if (token) h['X-Portale-Client'] = token;
  return fetch(srv.base + pathname, { ...opts, headers: h });
}

function json(pathname, method, body, opts = {}) {
  return api(pathname, {
    ...opts,
    method,
    headers: { ...opts.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function uploadForm(fields, files) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  for (const f of files) fd.append('files[]', new Blob([f.content]), f.name);
  return fd;
}

const RECORD = {
  cantiere: 'ACME',
  nomeBarca: 'Pressa 1',
  numeroScafo: 'M-01',
  matricola: 'SN-123',
  tipo: 'Collaudo',
  operatore: 'Mario',
};

// Richiesta con un Host arbitrario (fetch non permette di cambiarlo).
function requestWithHost(host, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: srv.port, path: pathname, headers: { Host: host } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end();
  });
}

test('le pagine vengono servite, con le intestazioni di sicurezza', async () => {
  for (const page of ['/index.html', '/nuovo.html', '/manage.html', '/dashboard.html', '/ui-common.js', '/bootstrap.min.css']) {
    const res = await fetch(srv.base + page);
    assert.equal(res.status, 200, page);
  }
  const res = await fetch(srv.base + '/index.html');
  const csp = res.headers.get('content-security-policy');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.doesNotMatch(csp, /https:/, 'nessuna origine esterna ammessa');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});

test('Host estraneo rifiutato (DNS rebinding), localhost accettato', async () => {
  assert.equal(await requestWithHost('attacker.example:' + srv.port, '/app-token'), 403);
  assert.equal(await requestWithHost('attacker.example', '/index.html'), 403);
  assert.equal(await requestWithHost('localhost:' + srv.port, '/app-token'), 200);
});

test('primo avvio: profilo non scelto, scritture bloccate', async () => {
  const profile = await (await fetch(srv.base + '/domain-profile')).json();
  assert.equal(profile.configured, false);
  assert.deepEqual(profile.options.map((o) => o.id).sort(), ['industriale', 'navale']);

  const noToken = await api('/upload', { token: null, method: 'POST', body: uploadForm(RECORD, []) });
  assert.equal(noToken.status, 403);

  const noProfile = await api('/upload', { method: 'POST', body: uploadForm(RECORD, []) });
  assert.equal(noProfile.status, 409);
});

test('scelta del profilo: valida una volta sola', async () => {
  assert.equal((await json('/settings/domain-profile', 'POST', { domainProfile: 'industriale' }, { token: null })).status, 403);
  assert.equal((await json('/settings/domain-profile', 'POST', { domainProfile: 'spaziale' })).status, 400);

  const ok = await json('/settings/domain-profile', 'POST', { domainProfile: 'industriale' });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).id, 'industriale');

  assert.equal((await json('/settings/domain-profile', 'POST', { domainProfile: 'navale' })).status, 409);
  const profile = await (await fetch(srv.base + '/domain-profile')).json();
  assert.equal(profile.configured, true);
  assert.equal(profile.labels.entita, 'Costruttore');
});

let recordId;

test('upload: crea il record, l\'Excel del profilo e gli allegati', async () => {
  const res = await api('/upload', {
    method: 'POST',
    body: uploadForm(RECORD, [{ name: 'verbale collaudo.pdf', content: '%PDF-1.4 test' }]),
  });
  assert.equal(res.status, 200, await res.clone().text());
  const body = await res.json();
  recordId = body.newRecord.ID;
  assert.ok(recordId);
  assert.equal(body.newRecord.Cantiere, 'ACME');

  assert.ok(fs.existsSync(path.join(srv.dataDir, 'Commissioning_IND.xlsx')), 'Excel industriale creato');
  assert.ok(!fs.existsSync(path.join(srv.dataDir, 'Barche_Commissionate.xlsx')), 'nessun Excel navale');

  const saved = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(d, e.name));
      else saved.push(e.name);
    }
  })(srv.dataDir);
  assert.ok(saved.includes('verbale_collaudo.pdf'), `allegato salvato con nome sanificato: ${saved}`);
});

test('upload: tipo di file non consentito rifiutato', async () => {
  const res = await api('/upload', {
    method: 'POST',
    body: uploadForm(RECORD, [{ name: 'virus.exe', content: 'MZ' }]),
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Tipo file non consentito/);
});

test('records: lettura, modifica, protezioni', async () => {
  const records = await (await fetch(srv.base + '/records')).json();
  assert.equal(records.length, 1);
  assert.equal(records[0]['Nome Barca'], 'Pressa 1');

  assert.equal((await json(`/records/${recordId}`, 'PUT', { Operatore: 'Luigi' }, { token: null })).status, 403);
  assert.equal((await json('/records/99999', 'PUT', { Operatore: 'Luigi' })).status, 404);

  const upd = await json(`/records/${recordId}`, 'PUT', { Operatore: 'Luigi', ID: 'manomesso' });
  assert.equal(upd.status, 200);
  const after = await (await fetch(srv.base + '/records')).json();
  assert.equal(after[0].Operatore, 'Luigi');
  assert.equal(String(after[0].ID), String(recordId), 'l\'ID non è modificabile');

  // Senza corpo JSON (con Express 5 req.body è undefined): nessun errore 500.
  const empty = await api(`/records/${recordId}`, { method: 'PUT' });
  assert.equal(empty.status, 200);
});

test('import .df: anteprima e importazione, senza prototype pollution', async () => {
  const zip = new AdmZip();
  zip.addFile('record.json', Buffer.from(JSON.stringify({
    Cantiere: 'acme',
    'Nome Barca': 'Pressa 2',
    'Numero Scafo': 'M-02',
    Matricola: 'SN-456',
    Tipo: 'Avviamento',
    Operatore: 'Anna',
  })));
  zip.addFile('allegati/foto.jpg', Buffer.from('jpeg'));
  const dfBuffer = zip.toBuffer();

  const fd = new FormData();
  fd.append('dfFile', new Blob([dfBuffer]), 'pacchetto.df');
  const preview = await api('/preview-df', { method: 'POST', body: fd });
  assert.equal(preview.status, 200, await preview.clone().text());
  const pv = await preview.json();
  assert.equal(pv.recordData.Cantiere, 'ACME', 'normalizzato sul valore esistente');
  assert.equal(pv.filesCount, 1);

  const confirm = new FormData();
  confirm.append('tempFile', pv.tempFile);
  confirm.append('confirmedData', '{"Operatore":"Anna B","__proto__":{"inquinato":true}}');
  const imp = await api('/import-df', { method: 'POST', body: confirm });
  assert.equal(imp.status, 200, await imp.clone().text());
  assert.equal({}.inquinato, undefined);

  const records = await (await fetch(srv.base + '/records')).json();
  assert.equal(records.length, 2);
  const imported = records.find((r) => r['Nome Barca'] === 'Pressa 2');
  assert.equal(imported.Operatore, 'Anna B');

  const wrong = new FormData();
  wrong.append('dfFile', new Blob(['x']), 'pacchetto.zip');
  assert.equal((await api('/preview-df', { method: 'POST', body: wrong })).status, 400);
});

test('impostazioni, opzioni, ricostruzione Excel, annullamento import', async () => {
  const settings = await (await fetch(srv.base + '/settings')).json();
  assert.equal(settings.domainProfile, 'industriale');
  assert.equal(settings.version, require('../package.json').version);

  const options = await (await fetch(srv.base + '/options')).json();
  assert.deepEqual(options.cantieri, ['ACME']);

  assert.equal((await api('/admin/rebuild-excel', { token: null, method: 'POST' })).status, 403);
  const rebuild = await api('/admin/rebuild-excel', { method: 'POST' });
  assert.equal(rebuild.status, 200, await rebuild.clone().text());
  assert.equal((await rebuild.json()).rows, 2);

  const cancel = await json('/cancel-df-import', 'POST', { tempFile: '../../settings.json' });
  assert.equal(cancel.status, 200);
  assert.ok(fs.existsSync(path.join(srv.backupDir, 'settings.json')), 'nessun file fuori dalla cartella temporanea');

  assert.equal((await json('/settings/uploads-root', 'POST', { uploadsRootDir: '' })).status, 400);
  const root = await json('/settings/uploads-root', 'POST', { uploadsRootDir: srv.dataDir });
  assert.equal(root.status, 200);
  assert.equal((await root.json()).uploadsRootDir, srv.dataDir);
});

test('/local-file: solo file trascinati, registrati dalla shell, una volta', async () => {
  const file = path.join(srv.dir, 'trascinato.txt');
  fs.writeFileSync(file, 'contenuto');
  const url = '/local-file?path=' + encodeURIComponent(file);

  assert.equal((await api(url, { token: null })).status, 403, 'senza token della pagina');
  assert.equal((await api(url)).status, 403, 'file non trascinato');

  const register = (secret) => json('/internal/dropped-paths', 'POST', { paths: [file] }, {
    token: null,
    headers: { 'X-Portale-Shell': secret },
  });
  // La pagina conosce il proprio token ma non il segreto della shell.
  const asPage = await api('/internal/dropped-paths', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Portale-Shell': srv.token },
    body: JSON.stringify({ paths: [file] }),
  });
  assert.equal(asPage.status, 403);
  assert.equal((await register('sbagliato')).status, 403);
  assert.equal((await register(SHELL_SECRET)).status, 200);

  const first = await api(url);
  assert.equal(first.status, 200);
  assert.equal(await first.text(), 'contenuto');
  assert.equal((await api(url)).status, 403, 'il permesso vale una volta sola');
});

test('delete: elimina il record', async () => {
  assert.equal((await api(`/records/${recordId}`, { token: null, method: 'DELETE' })).status, 403);
  const del = await api(`/records/${recordId}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const records = await (await fetch(srv.base + '/records')).json();
  assert.equal(records.length, 1);
  assert.ok(!records.some((r) => String(r.ID) === String(recordId)));
});
