// Test delle pagine in un browser headless (Chrome/Chromium già installato):
// primo avvio, nuovo record, modifica ed eliminazione dall'Archivio.
// È così che si vede un blocco come quello dell'Archivio (PR #33/#36), che la
// sola compilazione non rileva.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServer } = require('./helpers/server');

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
  page.on('dialog', (d) => d.accept());
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

  // Portale remoto servito dall'app: genera un pacchetto .df (JSZip).
  await page.goto(`${B}/slave.html`);
  await page.fill('#cantiere', 'ACME');
  await page.fill('#nomeBarca', 'Pressa 2');
  await page.fill('#numeroScafo', 'M-02');
  await page.fill('#operatore', 'Anna');
  await page.setInputFiles('#fileInput', { name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('jpeg') });
  const df = page.waitForEvent('download');
  await page.locator('#generateBtn').click();
  assert.match((await df).suggestedFilename(), /\.df$/, 'pacchetto .df');

  await page.goto(`${B}/manage.html`);
  await page.locator('button[data-action="delete"]').first().waitFor({ timeout: 10000 });
  await page.locator('button[data-action="delete"]').first().click();
  await page.locator('#dfConfirmYesBtn').waitFor({ state: 'visible' });
  const delResp = page.waitForResponse((r) => r.request().method() === 'DELETE');
  await page.locator('#dfConfirmYesBtn').click();
  assert.equal((await delResp).status(), 200, 'DELETE /records/:id');

  assert.deepEqual(errors, [], 'nessun errore JavaScript nelle pagine');
});
