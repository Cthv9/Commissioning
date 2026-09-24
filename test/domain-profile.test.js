const test = require('node:test');
const assert = require('node:assert');
const { PROFILES, getProfile, listProfileIds, BASE_EXCEL_HEADERS } = require('../domain-profile');

const REQUIRED_LABEL_KEYS = ['entita', 'asset', 'identificativo', 'matricola', 'tipo', 'operatore'];

test('entrambi i profili hanno tutte le chiavi richieste in labels', () => {
  for (const id of listProfileIds()) {
    const profile = PROFILES[id];
    for (const key of REQUIRED_LABEL_KEYS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(profile.labels, key),
        `Profilo "${id}" manca della chiave labels.${key}`
      );
      assert.ok(typeof profile.labels[key] === 'string' && profile.labels[key].length > 0);
    }
  }
});

test('industriale.tipoOptions contiene "Collaudo" e navale.tipoOptions non lo contiene', () => {
  assert.ok(PROFILES.industriale.tipoOptions.includes('Collaudo'));
  assert.ok(!PROFILES.navale.tipoOptions.includes('Collaudo'));
});

test('getProfile("sconosciuto") ritorna il profilo navale di default', () => {
  const p = getProfile('sconosciuto');
  assert.strictEqual(p.id, 'navale');
  assert.strictEqual(p, PROFILES.navale);
});

test('entrambi i profili usano la stessa costante condivisa per excelHeaders', () => {
  assert.deepStrictEqual(PROFILES.navale.excelHeaders, BASE_EXCEL_HEADERS);
  assert.deepStrictEqual(PROFILES.industriale.excelHeaders, BASE_EXCEL_HEADERS);
});
