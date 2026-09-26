// Genera/copia i file che esistono in più posti, così restano allineati:
// - librerie del frontend da node_modules nell'app (root) e nel portale
//   remoto (docs/vendor): le pagine le caricano in locale, mai da un CDN;
// - docs/profili.js, i profili del portale remoto, da domain-profile.js.
// Uso: `npm run sync-assets` dopo aver cambiato versione di una libreria in
// package.json (e `npm install`) o un profilo in domain-profile.js.
// test/sync-assets.test.js fallisce se i file non sono allineati.
const fs = require('fs');
const path = require('path');
const { PROFILES } = require('../domain-profile');

const ROOT = path.join(__dirname, '..');

// dest: cartelle (relative alla root) in cui serve il file.
const LIBS = [
  { pkg: 'bootstrap', file: 'dist/css/bootstrap.min.css', dest: ['.', 'docs/vendor'] },
  { pkg: 'bootstrap', file: 'dist/js/bootstrap.bundle.min.js', dest: ['.', 'docs/vendor'] },
  { pkg: 'jszip', file: 'dist/jszip.min.js', dest: ['docs/vendor'] },
];

const PROFILI_PORTALE = path.join(ROOT, 'docs', 'profili.js');

function libSource(lib) {
  return path.join(ROOT, 'node_modules', lib.pkg, lib.file);
}

function libTargets(lib) {
  return lib.dest.map((dir) => path.join(ROOT, dir, path.basename(lib.file)));
}

// Solo ciò che serve al portale: etichette e valori del campo Tipo.
function profiliPortaleSource() {
  const profili = {};
  for (const [id, p] of Object.entries(PROFILES)) {
    profili[id] = { id, appTitle: p.appTitle, labels: p.labels, tipoOptions: p.tipoOptions };
  }
  return '// Generato da scripts/sync-assets.js a partire da domain-profile.js: non modificare a mano.\n'
    + `window.DF_PROFILI = ${JSON.stringify(profili, null, 2)};\n`;
}

function sync() {
  for (const lib of LIBS) {
    for (const dest of libTargets(lib)) {
      fs.copyFileSync(libSource(lib), dest);
      console.log(`${lib.pkg}/${lib.file} -> ${path.relative(ROOT, dest)}`);
    }
  }
  fs.writeFileSync(PROFILI_PORTALE, profiliPortaleSource());
  console.log(`domain-profile.js -> ${path.relative(ROOT, PROFILI_PORTALE)}`);
}

if (require.main === module) sync();

module.exports = { LIBS, ROOT, PROFILI_PORTALE, libSource, libTargets, profiliPortaleSource };
