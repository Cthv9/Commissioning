const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveDomainProfileId } = require('../domain-profile');
const { migrateLegacyBackupDir } = require('../backup-migration');

test('profilo non scelto: id null', () => {
  assert.deepStrictEqual(resolveDomainProfileId({}), { id: null, source: null });
  assert.deepStrictEqual(resolveDomainProfileId({ settingsValue: 'boh' }), { id: null, source: null });
});

test('profilo scelto al primo avvio (settings)', () => {
  assert.deepStrictEqual(
    resolveDomainProfileId({ settingsValue: 'industriale' }),
    { id: 'industriale', source: 'settings' },
  );
});

test('il preset IT (env) ha la precedenza sulla scelta salvata', () => {
  assert.deepStrictEqual(
    resolveDomainProfileId({ envValue: ' Navale ', settingsValue: 'industriale' }),
    { id: 'navale', source: 'env' },
  );
});

test('un preset env non valido non blocca la scelta salvata', () => {
  assert.deepStrictEqual(
    resolveDomainProfileId({ envValue: 'xyz', settingsValue: 'industriale' }),
    { id: 'industriale', source: 'settings' },
  );
});

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'df-mig-'));
}

test('migrazione: copia i backup se la nuova cartella è assente', () => {
  const legacy = tmp();
  fs.writeFileSync(path.join(legacy, 'meta.json'), '{"1":{"CreatoDa":"mario"}}');
  fs.mkdirSync(path.join(legacy, 'excel'));
  fs.writeFileSync(path.join(legacy, 'excel', 'copia.xlsx'), 'x');
  const target = path.join(tmp(), 'nuova');

  assert.strictEqual(migrateLegacyBackupDir(legacy, target), true);
  assert.strictEqual(fs.readFileSync(path.join(target, 'meta.json'), 'utf8'), '{"1":{"CreatoDa":"mario"}}');
  assert.ok(fs.existsSync(path.join(target, 'excel', 'copia.xlsx')));
  assert.ok(fs.existsSync(path.join(legacy, 'meta.json')), 'la cartella di origine resta intatta');
});

test('migrazione: non tocca una cartella nuova che contiene già dati', () => {
  const legacy = tmp();
  fs.writeFileSync(path.join(legacy, 'meta.json'), 'vecchio');
  const target = tmp();
  fs.writeFileSync(path.join(target, 'meta.json'), 'nuovo');

  assert.strictEqual(migrateLegacyBackupDir(legacy, target), false);
  assert.strictEqual(fs.readFileSync(path.join(target, 'meta.json'), 'utf8'), 'nuovo');
});

test('migrazione: nessuna azione senza cartella di origine', () => {
  const target = path.join(tmp(), 'nuova');
  assert.strictEqual(migrateLegacyBackupDir(undefined, target), false);
  assert.strictEqual(migrateLegacyBackupDir(path.join(tmp(), 'inesistente'), target), false);
  assert.ok(!fs.existsSync(target));
});
