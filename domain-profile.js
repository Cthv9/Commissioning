/**
 * Profili di dominio (navale / industriale).
 *
 * Le colonne fisiche dell'Excel restano identiche in entrambi i profili
 * (compatibilità con i dati esistenti): cambia solo l'etichettatura in UI
 * e alcune opzioni di configurazione (es. valori del campo "Tipo").
 */

// Fonte unica di verità per l'header Excel (deve corrispondere esattamente
// a BASE_HEADERS in server.js / rebuild_excel.js).
const BASE_EXCEL_HEADERS = [
  'ID',
  'Cantiere',
  'Nome Barca',
  'Numero Scafo',
  'Matricola',
  'Tipo',
  'Operatore',
  'Data e Ora Inserimento',
];

const PROFILES = {
  navale: {
    id: 'navale',
    appTitle: 'Portale Commissioning',
    labels: {
      entita: 'Cantiere',
      asset: 'Nome Barca',
      identificativo: 'Numero Scafo',
      matricola: 'Matricola',
      tipo: 'Tipo',
      operatore: 'Operatore',
    },
    tipoOptions: ['Avviamento', 'Commissioning', 'Primo Commissioning', 'Claim'],
    defaultExcelFileName: 'Barche_Commissionate.xlsx',
    defaultBackupDirName: 'PortaleCommissioningBackup',
    excelHeaders: BASE_EXCEL_HEADERS,
  },
  industriale: {
    id: 'industriale',
    appTitle: 'Portale Commissioning Industriale',
    labels: {
      entita: 'Costruttore',
      asset: 'Nome Macchina',
      identificativo: 'Modello Motore',
      matricola: 'Seriale Motore',
      tipo: 'Tipo',
      operatore: 'Operatore',
    },
    tipoOptions: ['Avviamento', 'Commissioning', 'Collaudo'],
    defaultExcelFileName: 'Commissioning_IND.xlsx',
    defaultBackupDirName: 'PortaleCommissioningBackup_Industriale',
    excelHeaders: BASE_EXCEL_HEADERS,
  },
};

function getProfile(id) {
  return PROFILES[id] || PROFILES.navale;
}

function listProfileIds() {
  return Object.keys(PROFILES);
}

module.exports = {
  PROFILES,
  BASE_EXCEL_HEADERS,
  getProfile,
  listProfileIds,
};
