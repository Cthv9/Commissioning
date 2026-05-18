(function () {
  'use strict';

  const LS_KEY = 'df.lang';
  const DEFAULT_LANG = 'it';
  const LANGS = ['it', 'en'];

  const dict = {
    it: {
      // ── Comune ─────────────────────────────────────────────
      'common.home': '← Home',
      'common.new': 'Nuovo',
      'common.archive': 'Archivio',
      'common.dashboard': 'Dashboard',
      'common.close': 'Chiudi',
      'common.save': 'Salva',
      'common.cancel': 'Annulla',
      'common.yes': 'Sì',
      'common.no': 'No',
      'common.loading': 'Caricamento...',

      // ── Index ──────────────────────────────────────────────
      'index.brand': 'Portale Commissioning',
      'index.title': 'Portale Commissioning',
      'index.subtitle': "Seleziona un'operazione per iniziare",
      'index.new.title': 'Nuovo Commissioning',
      'index.new.desc': 'Registra un nuovo intervento e carica i file allegati',
      'index.archive.title': 'Archivio',
      'index.archive.desc': 'Cerca, modifica ed esporta i commissioning registrati',
      'index.dashboard.title': 'Dashboard',
      'index.dashboard.desc': 'Statistiche, grafici e Top 10 cantieri',

      // ── Modale Info ────────────────────────────────────────
      'info.button.settings': 'Impostazioni',
      'info.button.info': 'Info',
      'info.title.settings': 'Impostazioni',
      'info.title.info': 'Info',
      'info.description': 'Il portale consente di registrare i <strong>commissioning</strong> e archiviare i relativi allegati, salvando i dati in un file Excel e organizzando automaticamente le cartelle.',
      'info.version': 'Versione',
      'info.lang.label': 'Lingua / Language',
      'info.dest.title': 'Destinazione caricamenti',
      'info.dest.placeholder': 'Es. \\\\Server\\Share\\Cartella',
      'info.dest.choose': 'Scegli…',
      'info.dest.help': 'Cartella base dove vengono create le sottocartelle dei commissioning.',
      'info.madeWith': 'Made with ❤️ by DF',

      // ── Settings / Errori comuni (ui-common.js) ───────────
      'error.settings.load': 'Impossibile leggere impostazioni',
      'error.settings.save': 'Errore salvataggio impostazioni',
      'error.settings.saveGeneric': 'Errore salvataggio.',
      'error.folder.tauriOnly': "Selezione cartella non disponibile fuori dall'app Tauri.",
      'error.folder.openPicker': 'Impossibile aprire il selettore cartelle. Riprova o inserisci il percorso manualmente.',
      'error.dest.invalid': 'Inserisci una destinazione valida.',

      // ── Modale conferma ────────────────────────────────────
      'delete.title': 'Elimina record',
      'delete.message': 'Questa azione è <strong>irreversibile</strong>. Vuoi davvero eliminare questo record?',

      // ── Pagina Archivio (manage.html) ─────────────────────
      'manage.brand': 'Archivio',
      'manage.title': 'Archivio Commissioning',
      'manage.searchPlaceholder': 'Cerca (cantiere, barca, scafo, operatore...)',
      'manage.pageSize.25': '25 / pagina',
      'manage.pageSize.50': '50 / pagina',
      'manage.pageSize.100': '100 / pagina',
      'manage.refresh': 'Aggiorna',
      'manage.exportCsv.title': 'Esporta CSV (dati filtrati)',
      'manage.exportPdf.title': 'Esporta PDF (dati filtrati)',
      'manage.importDf.title': 'Importa pacchetto .df dal portale remoto',
      'manage.importDf.label': '📥 Importa .df',
      'manage.importDf.loading': 'Importazione…',
      'manage.filter.allCantieri': 'Tutti i cantieri',
      'manage.filter.allTipi': 'Tutti i tipi',
      'manage.filter.allOperatori': 'Tutti gli operatori',
      'manage.filter.dateFromTitle': 'Data inserimento da',
      'manage.filter.dateToTitle': 'Data inserimento a',
      'manage.filter.reset': '✕ Azzera filtri',
      'manage.col.id': 'ID',
      'manage.col.cantiere': 'Cantiere',
      'manage.col.nomeBarca': 'Nome Barca',
      'manage.col.numeroScafo': 'Numero Scafo',
      'manage.col.matricola': 'Matricola',
      'manage.col.tipo': 'Tipo',
      'manage.col.operatore': 'Operatore',
      'manage.col.dataInserimento': 'Data Inserimento',
      'manage.col.azioni': 'Azioni',
      'manage.action.view': 'Visualizza cartella',
      'manage.action.edit': 'Modifica',
      'manage.action.delete': 'Elimina',
      'manage.empty': 'Nessun record',
      'manage.showing': 'Mostrando {start}–{end} di {total}',
      'manage.totalFiltered': 'Totale record: {all} • Filtrati: {filtered}',
      'manage.loading': 'Caricamento record...',
      'manage.error.load': 'Errore caricamento record (HTTP {status})',
      'manage.error.network': 'Errore di rete durante il caricamento dei record.',
      'manage.error.folder': 'Impossibile aprire la cartella.',
      'manage.error.folderNet': 'Errore di rete durante apertura cartella.',
      'manage.error.delete': 'Errore durante eliminazione (HTTP {status})',
      'manage.error.deleteNet': 'Errore di rete durante eliminazione.',
      'manage.export.empty': 'Nessun record da esportare.',
      'manage.export.csvOk': '✓ CSV esportato: <strong>{filename}</strong>',
      'manage.export.pdfOk': '✓ PDF esportato: <strong>{filename}</strong>',
      'manage.export.pdfTitle': 'Archivio Commissioning',
      'manage.export.pdfMeta': 'Esportato il {now}{filter}  |  {count} record',
      'manage.export.pdfFilterPart': '  |  Filtro: "{q}"',
      'manage.export.pdfCol.numeroScafoShort': 'N. Scafo',
      'manage.import.error': 'Errore importazione',
      'manage.import.errorPrefix': 'Errore: ',
      'manage.import.ok': 'Importato: <strong>{label}</strong>{notes}',
      'manage.import.filesNote': '{n} file allegati',
      'manage.paginationAria': 'Paginazione',

      // ── Modale modifica record ─────────────────────────────
      'edit.title': 'Modifica commissioning',
      'edit.label.id': 'ID',
      'edit.label.dataInserimento': 'Data inserimento',
      'edit.label.cantiere': 'Cantiere',
      'edit.label.nomeBarca': 'Nome barca',
      'edit.label.numeroScafo': 'Numero scafo',
      'edit.label.matricola': 'Matricola',
      'edit.label.tipo': 'Tipo',
      'edit.label.operatore': 'Operatore',
      'edit.audit.title': 'Info (audit)',
      'edit.audit.createdBy': 'Creato da',
      'edit.audit.createdOn': 'Creato il',
      'edit.audit.modifiedBy': 'Modificato da',
      'edit.audit.modifiedOn': 'Modificato il',
      'edit.saved': 'Salvato!',
      'edit.error.save': 'Errore durante il salvataggio',

      // ── Pagina Nuovo Commissioning ────────────────────────
      'nuovo.brand': 'Nuovo Commissioning',
      'nuovo.title.tab': 'Nuovo Commissioning | Portale Commissioning',
      'nuovo.heading': 'Inserisci nuovo commissioning',
      'nuovo.label.cantiere': 'Cantiere Costruttore',
      'nuovo.label.suggest': 'Suggerimenti automatici (riduce refusi)',
      'nuovo.label.nomeBarca': 'Nome Barca',
      'nuovo.label.numeroScafo': 'Numero Scafo',
      'nuovo.label.matricola': 'Matricola',
      'nuovo.label.tipo': 'Tipo',
      'nuovo.tipo.avviamento': 'Avviamento',
      'nuovo.tipo.commissioning': 'Commissioning',
      'nuovo.label.operatore': 'Operatore',
      'nuovo.label.files': 'Carica file',
      'nuovo.submit': 'Invia',
      'nuovo.reset': 'Reset',
      'nuovo.error.noFile': 'Seleziona almeno un file.',
      'nuovo.norm.cantiere': 'Cantiere corretto: "{from}" → "{to}"',
      'nuovo.norm.operatore': 'Operatore corretto: "{from}" → "{to}"',
      'nuovo.success.upload': 'File caricati con successo!',
      'nuovo.success.completed': 'Caricamento completato!',
      'nuovo.error.upload': 'Errore nel caricamento dei file.',
      'nuovo.error.network': 'Errore di rete.',
      'nuovo.error.unexpected': 'Errore imprevisto.',

      // ── Pagina Dashboard ──────────────────────────────────
      'dash.title.tab': 'Dashboard | Commissioning',
      'dash.brand': 'Dashboard',
      'dash.period.all': 'Tutto',
      'dash.period.30': '30 gg',
      'dash.period.90': '90 gg',
      'dash.period.year': 'Anno',
      'dash.period.allLabel': 'tutti i record',
      'dash.period.30Label': 'ultimi 30 giorni',
      'dash.period.90Label': 'ultimi 90 giorni',
      'dash.period.yearLabel': 'anno corrente',
      'dash.export.btn': 'PDF',
      'dash.kpi.total': 'Totale record',
      'dash.kpi.thisMonth': 'Questo mese',
      'dash.kpi.topCantiere': 'Cantiere top',
      'dash.kpi.topOperatore': 'Operatore top',
      'dash.kpi.recordCount': '{n} record',
      'dash.chart.cantiere': 'Record per Cantiere',
      'dash.chart.tipo': 'Distribuzione per Tipo',
      'dash.chart.trend': 'Andamento mensile inserimenti',
      'dash.chart.operatore': 'Record per Operatore',
      'dash.chart.records': 'Record',
      'dash.chart.insertions': 'Inserimenti',
      'dash.chart.type': 'Tipo',
      'dash.top.title': 'Top 10 Cantieri',
      'dash.top.col.num': '#',
      'dash.top.col.cantiere': 'Cantiere',
      'dash.top.col.record': 'Record',
      'dash.top.col.pct': '% sul totale',
      'dash.top.col.last': 'Ultimo inserimento',
      'dash.noData': 'Nessun dato',
      'dash.notSpecified': '(non specificato)',
      'dash.error.load': 'Errore caricamento dati: {msg}',
      'dash.error.pdfLib': 'Libreria PDF non disponibile (jspdf.umd.min.js mancante).',
      'dash.error.pdf': 'Errore esportazione PDF: {msg}',
      'dash.export.pdfTitle': 'Dashboard Commissioning',
      'dash.export.pdfMeta': 'Esportato il {now} — {count} record',
      'dash.export.pdfOk': '✓ PDF esportato: {filename}',
      'dash.export.pdf.chartCantiere': 'Per Cantiere',
      'dash.export.pdf.chartTipo': 'Per Tipo',
      'dash.export.pdf.chartTrend': 'Andamento mensile',
      'dash.export.pdf.chartOperatore': 'Per Operatore',
      'dash.status': '{shown} record mostrati ({label}) su {all} totali',
    },

    en: {
      // ── Common ─────────────────────────────────────────────
      'common.home': '← Home',
      'common.new': 'New',
      'common.archive': 'Archive',
      'common.dashboard': 'Dashboard',
      'common.close': 'Close',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.loading': 'Loading...',

      // ── Index ──────────────────────────────────────────────
      'index.brand': 'Commissioning Portal',
      'index.title': 'Commissioning Portal',
      'index.subtitle': 'Select an operation to begin',
      'index.new.title': 'New Commissioning',
      'index.new.desc': 'Register a new intervention and upload the attachments',
      'index.archive.title': 'Archive',
      'index.archive.desc': 'Search, edit and export the registered commissionings',
      'index.dashboard.title': 'Dashboard',
      'index.dashboard.desc': 'Statistics, charts and Top 10 shipyards',

      // ── Info modal ─────────────────────────────────────────
      'info.button.settings': 'Settings',
      'info.button.info': 'Info',
      'info.title.settings': 'Settings',
      'info.title.info': 'Info',
      'info.description': 'The portal lets you register <strong>commissionings</strong> and archive the related attachments, saving the data in an Excel file and automatically organizing the folders.',
      'info.version': 'Version',
      'info.lang.label': 'Language / Lingua',
      'info.dest.title': 'Uploads destination',
      'info.dest.placeholder': 'E.g. \\\\Server\\Share\\Folder',
      'info.dest.choose': 'Choose…',
      'info.dest.help': 'Base folder where the commissioning subfolders are created.',
      'info.madeWith': 'Made with ❤️ by DF',

      // ── Settings / Common errors ───────────────────────────
      'error.settings.load': 'Cannot read settings',
      'error.settings.save': 'Settings save error',
      'error.settings.saveGeneric': 'Save error.',
      'error.folder.tauriOnly': 'Folder selection is not available outside the Tauri app.',
      'error.folder.openPicker': 'Cannot open the folder picker. Retry or enter the path manually.',
      'error.dest.invalid': 'Enter a valid destination.',

      // ── Confirm modal ──────────────────────────────────────
      'delete.title': 'Delete record',
      'delete.message': 'This action is <strong>irreversible</strong>. Do you really want to delete this record?',

      // ── Archive page (manage.html) ─────────────────────────
      'manage.brand': 'Archive',
      'manage.title': 'Commissioning Archive',
      'manage.searchPlaceholder': 'Search (shipyard, boat, hull, operator...)',
      'manage.pageSize.25': '25 / page',
      'manage.pageSize.50': '50 / page',
      'manage.pageSize.100': '100 / page',
      'manage.refresh': 'Refresh',
      'manage.exportCsv.title': 'Export CSV (filtered data)',
      'manage.exportPdf.title': 'Export PDF (filtered data)',
      'manage.importDf.title': 'Import .df package from remote portal',
      'manage.importDf.label': '📥 Import .df',
      'manage.importDf.loading': 'Importing…',
      'manage.filter.allCantieri': 'All shipyards',
      'manage.filter.allTipi': 'All types',
      'manage.filter.allOperatori': 'All operators',
      'manage.filter.dateFromTitle': 'Insertion date from',
      'manage.filter.dateToTitle': 'Insertion date to',
      'manage.filter.reset': '✕ Reset filters',
      'manage.col.id': 'ID',
      'manage.col.cantiere': 'Shipyard',
      'manage.col.nomeBarca': 'Boat Name',
      'manage.col.numeroScafo': 'Hull Number',
      'manage.col.matricola': 'Serial No.',
      'manage.col.tipo': 'Type',
      'manage.col.operatore': 'Operator',
      'manage.col.dataInserimento': 'Insertion Date',
      'manage.col.azioni': 'Actions',
      'manage.action.view': 'Open folder',
      'manage.action.edit': 'Edit',
      'manage.action.delete': 'Delete',
      'manage.empty': 'No records',
      'manage.showing': 'Showing {start}–{end} of {total}',
      'manage.totalFiltered': 'Total records: {all} • Filtered: {filtered}',
      'manage.loading': 'Loading records...',
      'manage.error.load': 'Records load error (HTTP {status})',
      'manage.error.network': 'Network error while loading records.',
      'manage.error.folder': 'Cannot open the folder.',
      'manage.error.folderNet': 'Network error while opening folder.',
      'manage.error.delete': 'Delete error (HTTP {status})',
      'manage.error.deleteNet': 'Network error during delete.',
      'manage.export.empty': 'No records to export.',
      'manage.export.csvOk': '✓ CSV exported: <strong>{filename}</strong>',
      'manage.export.pdfOk': '✓ PDF exported: <strong>{filename}</strong>',
      'manage.export.pdfTitle': 'Commissioning Archive',
      'manage.export.pdfMeta': 'Exported on {now}{filter}  |  {count} records',
      'manage.export.pdfFilterPart': '  |  Filter: "{q}"',
      'manage.export.pdfCol.numeroScafoShort': 'Hull No.',
      'manage.import.error': 'Import error',
      'manage.import.errorPrefix': 'Error: ',
      'manage.import.ok': 'Imported: <strong>{label}</strong>{notes}',
      'manage.import.filesNote': '{n} attached files',
      'manage.paginationAria': 'Pagination',

      // ── Edit record modal ──────────────────────────────────
      'edit.title': 'Edit commissioning',
      'edit.label.id': 'ID',
      'edit.label.dataInserimento': 'Insertion date',
      'edit.label.cantiere': 'Shipyard',
      'edit.label.nomeBarca': 'Boat name',
      'edit.label.numeroScafo': 'Hull number',
      'edit.label.matricola': 'Serial no.',
      'edit.label.tipo': 'Type',
      'edit.label.operatore': 'Operator',
      'edit.audit.title': 'Info (audit)',
      'edit.audit.createdBy': 'Created by',
      'edit.audit.createdOn': 'Created on',
      'edit.audit.modifiedBy': 'Modified by',
      'edit.audit.modifiedOn': 'Modified on',
      'edit.saved': 'Saved!',
      'edit.error.save': 'Save error',

      // ── New Commissioning page ─────────────────────────────
      'nuovo.brand': 'New Commissioning',
      'nuovo.title.tab': 'New Commissioning | Commissioning Portal',
      'nuovo.heading': 'Insert new commissioning',
      'nuovo.label.cantiere': 'Builder Shipyard',
      'nuovo.label.suggest': 'Automatic suggestions (reduces typos)',
      'nuovo.label.nomeBarca': 'Boat Name',
      'nuovo.label.numeroScafo': 'Hull Number',
      'nuovo.label.matricola': 'Serial No.',
      'nuovo.label.tipo': 'Type',
      'nuovo.tipo.avviamento': 'Startup',
      'nuovo.tipo.commissioning': 'Commissioning',
      'nuovo.label.operatore': 'Operator',
      'nuovo.label.files': 'Upload files',
      'nuovo.submit': 'Submit',
      'nuovo.reset': 'Reset',
      'nuovo.error.noFile': 'Select at least one file.',
      'nuovo.norm.cantiere': 'Shipyard corrected: "{from}" → "{to}"',
      'nuovo.norm.operatore': 'Operator corrected: "{from}" → "{to}"',
      'nuovo.success.upload': 'Files uploaded successfully!',
      'nuovo.success.completed': 'Upload completed!',
      'nuovo.error.upload': 'Error while uploading files.',
      'nuovo.error.network': 'Network error.',
      'nuovo.error.unexpected': 'Unexpected error.',

      // ── Dashboard page ─────────────────────────────────────
      'dash.title.tab': 'Dashboard | Commissioning',
      'dash.brand': 'Dashboard',
      'dash.period.all': 'All',
      'dash.period.30': '30 d',
      'dash.period.90': '90 d',
      'dash.period.year': 'Year',
      'dash.period.allLabel': 'all records',
      'dash.period.30Label': 'last 30 days',
      'dash.period.90Label': 'last 90 days',
      'dash.period.yearLabel': 'current year',
      'dash.export.btn': 'PDF',
      'dash.kpi.total': 'Total records',
      'dash.kpi.thisMonth': 'This month',
      'dash.kpi.topCantiere': 'Top shipyard',
      'dash.kpi.topOperatore': 'Top operator',
      'dash.kpi.recordCount': '{n} records',
      'dash.chart.cantiere': 'Records by Shipyard',
      'dash.chart.tipo': 'Distribution by Type',
      'dash.chart.trend': 'Monthly insertion trend',
      'dash.chart.operatore': 'Records by Operator',
      'dash.chart.records': 'Records',
      'dash.chart.insertions': 'Insertions',
      'dash.chart.type': 'Type',
      'dash.top.title': 'Top 10 Shipyards',
      'dash.top.col.num': '#',
      'dash.top.col.cantiere': 'Shipyard',
      'dash.top.col.record': 'Records',
      'dash.top.col.pct': '% of total',
      'dash.top.col.last': 'Last insertion',
      'dash.noData': 'No data',
      'dash.notSpecified': '(not specified)',
      'dash.error.load': 'Data load error: {msg}',
      'dash.error.pdfLib': 'PDF library not available (jspdf.umd.min.js missing).',
      'dash.error.pdf': 'PDF export error: {msg}',
      'dash.export.pdfTitle': 'Commissioning Dashboard',
      'dash.export.pdfMeta': 'Exported on {now} — {count} records',
      'dash.export.pdfOk': '✓ PDF exported: {filename}',
      'dash.export.pdf.chartCantiere': 'By Shipyard',
      'dash.export.pdf.chartTipo': 'By Type',
      'dash.export.pdf.chartTrend': 'Monthly trend',
      'dash.export.pdf.chartOperatore': 'By Operator',
      'dash.status': '{shown} records shown ({label}) of {all} total',
    },
  };

  function getLang() {
    try {
      const v = localStorage.getItem(LS_KEY);
      if (v && LANGS.includes(v)) return v;
    } catch {}
    return DEFAULT_LANG;
  }

  function setLang(lang) {
    if (!LANGS.includes(lang)) return;
    try { localStorage.setItem(LS_KEY, lang); } catch {}
    document.documentElement.setAttribute('lang', lang);
    applyTranslations();
    window.dispatchEvent(new CustomEvent('df:langchange', { detail: { lang } }));
  }

  function format(str, params) {
    if (!params) return str;
    return String(str).replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : '{' + k + '}'));
  }

  function t(key, params) {
    const lang = getLang();
    const table = dict[lang] || dict[DEFAULT_LANG];
    let val = table[key];
    if (val === undefined) val = dict[DEFAULT_LANG][key];
    if (val === undefined) return key;
    return format(val, params);
  }

  function applyTranslations(root) {
    const scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      el.textContent = t(key);
    });

    scope.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (!key) return;
      el.innerHTML = t(key);
    });

    scope.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const spec = el.getAttribute('data-i18n-attr');
      if (!spec) return;
      spec.split(',').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s && s.trim());
        if (!attr || !key) return;
        el.setAttribute(attr, t(key));
      });
    });
  }

  window.DF_I18N = {
    LANGS,
    DEFAULT_LANG,
    getLang,
    setLang,
    t,
    applyTranslations,
  };

  document.documentElement.setAttribute('lang', getLang());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyTranslations());
  } else {
    applyTranslations();
  }
})();
