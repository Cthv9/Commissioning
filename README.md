# Portale Commissioning

App desktop Windows per la registrazione e gestione dei record di commissioning barche.

## Funzionalità

- Inserimento nuovi record di commissioning (Cantiere, Nome Barca, Scafo, Tipo, Operatore)
- Upload allegati con organizzazione automatica in sottocartelle per categoria
- Archivio ricercabile con paginazione, modifica ed eliminazione record
- Filtri dinamici per cantiere, tipo e operatore + ordinamento per colonna nell'archivio
- Dashboard con KPI (totale record, questo mese, cantiere top) e grafici statistici (Chart.js)
- Portale remoto per tecnici: compila il modulo e genera un pacchetto `.df` da importare
- PWA installabile da browser per il portale remoto (`docs/`): funziona offline e si installa come app nativa
- Backup automatico in formato JSON + copie rotanti del file Excel
- Sincronizzazione con file Excel su share di rete configurabile
- Selezione cartella di destinazione upload tramite dialog nativa

## Stack tecnico

| Componente | Tecnologia |
|-----------|-----------|
| Shell desktop | **Tauri v2** (Rust) |
| Backend/API | **Express.js** (Node.js), impacchettato come sidecar con `pkg` |
| Frontend | HTML + Bootstrap 5 + Vanilla JS |
| Grafici | **Chart.js** (bundle locale) |
| Export | **jsPDF** + **jsPDF AutoTable** (bundle locale) |
| Dati | Excel (`.xlsx`) + backup JSONL |

## Profili di dominio

Il tool supporta due profili di dominio: **Navale** e **Industriale**. Il profilo determina la terminologia mostrata in UI (es. "Cantiere" → "Costruttore", "Nome Barca" → "Nome Macchina", "Numero Scafo" → "Modello Motore") e l'elenco di valori disponibili per il campo "Tipo", ma il formato dati sottostante (colonne dell'Excel, struttura dei record e dei metadati audit) resta identico tra i due profili, per garantire piena compatibilità dei dati esistenti.

**Il profilo è deciso a build-time, non è un'impostazione modificabile dall'app in esecuzione.** Ogni installer viene compilato con la variabile d'ambiente `PORTALE_DOMAIN_PROFILE` (`navale` o `industriale`, default `navale` se assente) impostata *prima* della build: Tauri la "cuoce" nel binario e la passa al server all'avvio (vedi `src-tauri/src/main.rs`). Non esiste alcun selettore in UI: è una scelta deliberata per evitare che un utente non esperto cambi profilo per errore mentre l'app è in uso (cambiare profilo cambia anche il nome del file Excel letto/scritto, e un cambio accidentale sembrerebbe "far perdere" tutti i record). La pipeline CI (`.github/workflows/build.yml`) produce già entrambi gli installer ad ogni release, uno per profilo.

Per compilare manualmente un installer per un profilo specifico:

```bash
PORTALE_DOMAIN_PROFILE=industriale npm run tauri:build
```

Il profilo Industriale riunisce in questo stesso tool le funzionalità già offerte dal repository gemello `commissioning_ind`, che viene deprecato a favore del portale unificato.

### Migrazione da Commissioning_IND

Per migrare da un'installazione esistente di `commissioning_ind` al Portale Commissioning unificato:

1. Installare la build **Industriale** del portale unificato (scaricabile dalla Release GitHub di questo repo).
2. Puntare la cartella dati/share di rete allo stesso percorso già in uso da `commissioning_ind`, così che l'Excel dei record industriali continui a essere letto/scritto nello stesso posto.
3. Eseguire lo script di migrazione per copiare i backup locali esistenti:

   ```bash
   node scripts/migrate-ind-to-unified.js --from <cartella-backup-IND>
   ```

   Lo script è **idempotente** (può essere eseguito più volte senza effetti duplicati) e **non modifica il file Excel**: agisce solo sui backup locali (snapshot JSON, metadati audit, copie storiche), lasciando l'Excel condiviso come unica fonte "master" già in uso.

## Prerequisiti di sviluppo

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) stable (`rustup target add x86_64-pc-windows-msvc`)
- [Tauri CLI](https://tauri.app/) (installato via npm)

## Setup

```bash
npm install
```

## Comandi principali

| Comando | Descrizione |
|--------|-----------|
| `npm run dev:server` | Avvia solo il server Express (accessibile su `http://127.0.0.1:3000`) |
| `npm run tauri:dev` | Avvia l'app in modalità sviluppo (Tauri + server) |
| `npm run tauri:build` | Build completa: pkg → sidecar → installer NSIS |
| `npm run rebuild:excel` | Ricostruisce il file Excel dal backup snapshot |
| `npm run import:df` | Importa un pacchetto `.df` (archivio allegati) |

## Build per la distribuzione

```bash
# 1. Genera le icone Tauri (solo la prima volta o se cambia l'icona)
npx tauri icon build/icon.ico

# 2. Build completa (pkg + sidecar + installer)
npm run tauri:build
```

L'installer NSIS viene generato in:
```
src-tauri/target/release/bundle/nsis/Portale Commissioning_3.0.0_x64-setup.exe
```

## Struttura del progetto

```
├── src-tauri/              # Progetto Rust/Tauri
│   ├── src/main.rs         # Logica principale: sidecar, finestra, comando select_directory
│   ├── Cargo.toml          # Dipendenze Rust
│   ├── tauri.conf.json     # Configurazione app sviluppo (finestra, bundle, NSIS)
│   ├── tauri.prod.conf.json# Configurazione app produzione (usata da tauri:build)
│   ├── capabilities/       # Permessi plugin Tauri
│   └── icons/              # Icone app (generate da npx tauri icon)
├── scripts/
│   ├── build-sidecar.js    # Copia frontend + rinomina exe per Tauri
│   └── tauri-wrapper.js    # Wrapper per CLI Tauri
├── docs/                   # PWA portale remoto (pubblicabile su GitHub Pages o server web)
│   ├── index.html          # App web installabile (service worker + manifest)
│   ├── manifest.json       # Manifest PWA
│   ├── sw.js               # Service worker (cache offline)
│   └── icons/              # Icone PWA (192×192, 512×512)
├── server.js               # Server Express (API + serve frontend)
├── index.html              # Landing page (home: Nuovo, Archivio, Dashboard)
├── nuovo.html              # Pagina inserimento nuovo record
├── manage.html             # Pagina archivio/gestione (filtri dinamici, ordinamento colonne)
├── dashboard.html          # Dashboard con KPI e grafici (Chart.js)
├── slave.html              # Portale remoto: genera pacchetti .df
├── script.js               # Logica upload con progress
├── ui-common.js            # Componenti UI condivisi (modal info, impostazioni)
├── chart.min.js            # Bundle Chart.js (locale)
├── jspdf.umd.min.js        # Bundle jsPDF (locale)
├── jspdf.plugin.autotable.min.js # Bundle jsPDF AutoTable (locale)
├── rebuild_excel.js        # Utility CLI: ricostruisce Excel dal backup
├── import_df.js            # Utility CLI: importa pacchetti .df
└── build/
    ├── icon.ico            # Icona sorgente
    ├── installer-hooks.nsh # Script hook NSIS (attivo)
    └── installer.nsh       # Script NSIS legacy (riferimento)
```

## Percorsi dati

| Percorso | Contenuto |
|---------|-----------|
| `%APPDATA%\Portale Commissioning\backup\` | Backup JSON, snapshot, metadati |
| *(share di rete configurabile)* | File Excel + allegati |

Il percorso della share di rete è configurabile tramite il pannello impostazioni nell'app (icona ℹ️).
