const fs = require('fs');
const path = require('path');

function hasEntries(dir) {
  try {
    return fs.readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

/**
 * Copia una tantum i backup dalla vecchia cartella alla nuova, solo se la
 * nuova è vuota o assente: non sovrascrive mai dati già presenti e lascia
 * intatta la cartella di origine.
 * Ritorna true se ha copiato qualcosa.
 */
function migrateLegacyBackupDir(legacyDir, newDir) {
  if (!legacyDir || !newDir) return false;
  if (path.resolve(legacyDir) === path.resolve(newDir)) return false;
  if (!hasEntries(legacyDir) || hasEntries(newDir)) return false;
  fs.mkdirSync(newDir, { recursive: true });
  fs.cpSync(legacyDir, newDir, { recursive: true, force: false, errorOnExist: false });
  return true;
}

module.exports = { migrateLegacyBackupDir };
