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

// Solo per ambienti senza accesso a cdn.jsdelivr.net: cartella `dist` di Bootstrap 5.
const bootstrapDir = process.env.PORTALE_TEST_BOOTSTRAP_DIR;

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
  if (bootstrapDir) {
    await page.route('https://cdn.jsdelivr.net/**', (route) => {
      const url = route.request().url();
      if (url.endsWith('bootstrap.bundle.min.js')) {
        return route.fulfill({ path: path.join(bootstrapDir, 'js/bootstrap.bundle.min.js'), contentType: 'application/javascript' });
      }
      if (url.endsWith('bootstrap.min.css')) {
        return route.fulfill({ path: path.join(bootstrapDir, 'css/bootstrap.min.css'), contentType: 'text/css' });
      }
      return route.fulfill({ status: 404, body: '' });
    });
  }
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

  await page.waitForTimeout(500);
  await page.locator('button[data-action="delete"]').first().click();
  await page.locator('#dfConfirmYesBtn').waitFor({ state: 'visible' });
  const delResp = page.waitForResponse((r) => r.request().method() === 'DELETE');
  await page.locator('#dfConfirmYesBtn').click();
  assert.equal((await delResp).status(), 200, 'DELETE /records/:id');

  // Dashboard: si apre senza errori.
  await page.goto(`${B}/dashboard.html`);
  await page.waitForLoadState('load');
  await page.waitForTimeout(500);

  assert.deepEqual(errors, [], 'nessun errore JavaScript nelle pagine');
});
