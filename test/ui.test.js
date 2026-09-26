// Test delle pagine in un browser headless (Chrome/Chromium già installato):
// primo avvio, nuovo record, modifica ed eliminazione dall'Archivio.
// È così che si vede un blocco come quello dell'Archivio (PR #33/#36), che la
// sola compilazione non rileva.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServer, startStaticServer, ROOT } = require('./helpers/server');

let chromium;
try {
  ({ chromium } = require('playwright-core'));
} catch {}

// Browser: PORTALE_TEST_CHROMIUM (percorso dell'eseguibile) oppure Chrome installato.
const executablePath = process.env.PORTALE_TEST_CHROMIUM || undefined;
const launchOptions = executablePath ? { executablePath } : { channel: 'chrome' };

let srv;
let browser;
let skipReason = false;

before(async () => {
  if (!chromium) {
    skipReason = 'playwright-core non installato';
  } else {
    try {
      browser = await chromium.launch(launchOptions);
    } catch (e) {
      skipReason = `browser non disponibile: ${e.message.split('\n')[0]}`;
    }
  }
  // In CI il test non può essere saltato in silenzio.
  if (skipReason && process.env.CI) throw new Error(skipReason);
  if (!skipReason) srv = await startServer();
});

after(async () => {
  if (browser) await browser.close();
  if (srv) await srv.stop();
});

async function newPage() {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Il popup può chiudersi da solo con la navigazione prima che venga accettato.
  page.on('dialog', (d) => d.accept().catch(() => {}));
  // Violazioni della Content-Security-Policy: arrivano solo come errori in console.
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy/i.test(m.text())) errors.push(m.text());
  });
  // Nessuna risorsa da internet: tutto deve arrivare dal server locale.
  page.on('request', (r) => {
    const url = r.url();
    if (/^https?:/.test(url) && !url.startsWith(srv.base)) errors.push(`richiesta esterna: ${url}`);
  });
  return { page, errors };
}

test('pagine: primo avvio, nuovo record, archivio', async (t) => {
  if (skipReason) return t.skip(skipReason);
  const { page, errors } = await newPage();
  const B = srv.base;

  // Primo avvio: schermata obbligatoria, non si chiude con Esc.
  await page.goto(`${B}/index.html`);
  const wizard = page.locator('#dfProfileWizard');
  await wizard.waitFor({ state: 'visible', timeout: 10000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  assert.ok(await wizard.isVisible(), 'la scelta del profilo non si chiude con Esc');

  await page.locator('#dfProfileWizardOptions button', { hasText: 'Industriale' }).click();
  await page.locator('#dfProfileWizardBack').click();
  assert.ok(await page.locator('#dfProfileWizardOptions').isVisible(), '"Indietro" torna alla scelta');
  await page.locator('#dfProfileWizardOptions button', { hasText: 'Industriale' }).click();
  await Promise.all([page.waitForNavigation(), page.locator('#dfProfileWizardOk').click()]);
  await page.waitForLoadState('load');
  assert.equal(await page.locator('#dfProfileWizard').count(), 0, 'dopo la conferma la schermata non ricompare');

  // Nuovo record con allegato (upload XHR con token).
  await page.goto(`${B}/nuovo.html`);
  await page.locator('[data-df-label="entita"]').first().waitFor();
  await page.waitForFunction(() => document.querySelector('[data-df-label="entita"]').textContent.includes('Costruttore'));
  await page.fill('#cantiere', 'ACME');
  await page.fill('#nomeBarca', 'Pressa 1');
  await page.fill('#numeroScafo', 'M-01');
  await page.fill('#operatore', 'Mario');
  await page.setInputFiles('#fileInput', { name: 'verbale.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
  const uploadResp = page.waitForResponse((r) => r.url().endsWith('/upload'));
  await page.locator('button[type="submit"]').click();
  assert.equal((await uploadResp).status(), 200, 'POST /upload');
  assert.ok(fs.existsSync(path.join(srv.dataDir, 'Commissioning_IND.xlsx')));

  // Archivio: modifica ed eliminazione.
  await page.goto(`${B}/manage.html`);
  const editBtn = page.locator('button[data-action="edit"]').first();
  await editBtn.waitFor({ timeout: 10000 });
  await editBtn.click();
  await page.locator('#editOperatore').waitFor({ state: 'visible' });
  await page.fill('#editOperatore', 'Luigi');
  const putResp = page.waitForResponse((r) => r.request().method() === 'PUT');
  await page.locator('#saveEditBtn').click();
  assert.equal((await putResp).status(), 200, 'PUT /records/:id');

  // Dashboard: grafici ed export PDF (jsPDF) con la Content-Security-Policy attiva.
  await page.goto(`${B}/dashboard.html`);
  await page.locator('#exportPdfBtn').waitFor();
  await page.waitForTimeout(500);
  const pdf = page.waitForEvent('download');
  await page.locator('#exportPdfBtn').click();
  assert.match((await pdf).suggestedFilename(), /\.pdf$/, 'export PDF');

  await page.goto(`${B}/manage.html`);
  await page.locator('button[data-action="delete"]').first().waitFor({ timeout: 10000 });
  await page.locator('button[data-action="delete"]').first().click();
  await page.locator('#dfConfirmYesBtn').waitFor({ state: 'visible' });
  const delResp = page.waitForResponse((r) => r.request().method() === 'DELETE');
  await page.locator('#dfConfirmYesBtn').click();
  assert.equal((await delResp).status(), 200, 'DELETE /records/:id');

  assert.deepEqual(errors, [], 'nessun errore JavaScript nelle pagine');
});

test('portale remoto (GitHub Pages): profilo, funzionamento offline, .df importabile nell\'app', async (t) => {
  if (skipReason) return t.skip(skipReason);
  const web = await startStaticServer(path.join(ROOT, 'docs'));
  t.after(() => web.stop());

  // Senza ?profilo= e senza scelta memorizzata: prima si sceglie il reparto.
  const fresh = await browser.newContext();
  const first = await fresh.newPage();
  await first.goto(`${web.base}/index.html`);
  await first.locator('#profileChooser').waitFor({ state: 'visible' });
  assert.ok(!(await first.locator('#portal').isVisible()), 'modulo nascosto finché non si sceglie il reparto');
  await first.locator('#profileOptions button', { hasText: 'Navale' }).click();
  assert.equal(await first.locator('[data-label="entita"]').innerText(), 'Cantiere');
  await fresh.close();

  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy/i.test(m.text())) errors.push(m.text());
  });
  page.on('request', (r) => {
    if (/^https?:/.test(r.url()) && !r.url().startsWith(web.base)) errors.push(`richiesta esterna: ${r.url()}`);
  });

  // Link per reparto (es. QR code): etichette e valori Tipo del profilo Industriale.
  await page.goto(`${web.base}/index.html?profilo=industriale`);
  assert.equal(await page.locator('[data-label="entita"]').innerText(), 'Costruttore');
  assert.equal(await page.locator('[data-label="asset"]').innerText(), 'Nome Macchina');
  assert.deepEqual(await page.locator('#tipo option').allInnerTexts(), ['Avviamento', 'Commissioning', 'Collaudo']);

  // Offline: dopo la prima visita il portale funziona senza rete (service worker).
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await ctx.setOffline(true);
  await page.reload();
  assert.equal(await page.locator('[data-label="entita"]').innerText(), 'Costruttore', 'profilo ricordato offline');

  await page.fill('#cantiere', 'ACME');
  await page.fill('#nomeBarca', 'Pressa 9');
  await page.fill('#numeroScafo', 'M-09');
  await page.selectOption('#tipo', 'Collaudo');
  await page.fill('#operatore', 'Tecnico');
  await page.setInputFiles('#fileInput', { name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('jpeg') });
  const download = page.waitForEvent('download');
  await page.locator('#generateBtn').click();
  const dfPath = path.join(srv.dir, (await download).suggestedFilename());
  await (await download).saveAs(dfPath);
  await ctx.close();

  // Il pacchetto generato offline si importa nell'app.
  const fd = new FormData();
  fd.append('dfFile', new Blob([fs.readFileSync(dfPath)]), path.basename(dfPath));
  const preview = await fetch(`${srv.base}/preview-df`, { method: 'POST', headers: { 'X-Portale-Client': srv.token }, body: fd });
  assert.equal(preview.status, 200, await preview.clone().text());
  const { recordData, filesCount } = await preview.json();
  assert.equal(recordData['Nome Barca'], 'Pressa 9');
  assert.equal(recordData.Tipo, 'Collaudo');
  assert.equal(filesCount, 1);

  assert.deepEqual(errors, [], 'nessun errore né risorsa esterna nel portale remoto');
});
