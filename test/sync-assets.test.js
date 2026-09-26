// I file copiati o generati da scripts/sync-assets.js devono essere allineati
// alla fonte: librerie = pacchetti npm dichiarati in package.json (quindi
// elencati nello SBOM), profili del portale remoto = domain-profile.js.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { LIBS, ROOT, PROFILI_PORTALE, libSource, libTargets, profiliPortaleSource } = require('../scripts/sync-assets');

for (const lib of LIBS) {
  test(`${lib.pkg}/${path.basename(lib.file)}: copie locali allineate a node_modules`, () => {
    const expected = fs.readFileSync(libSource(lib));
    for (const copy of libTargets(lib)) {
      assert.ok(
        fs.readFileSync(copy).equals(expected),
        `${path.relative(ROOT, copy)} diverso da node_modules/${lib.pkg}: eseguire npm run sync-assets`,
      );
    }
  });
}

test('profili del portale remoto allineati a domain-profile.js', () => {
  assert.equal(
    fs.readFileSync(PROFILI_PORTALE, 'utf8'),
    profiliPortaleSource(),
    'docs/profili.js non aggiornato: eseguire npm run sync-assets',
  );
});
