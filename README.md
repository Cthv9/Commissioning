# Portale Commissioning

App desktop Windows per la registrazione e gestione dei record di commissioning barche.

## Funzionalità

- Inserimento nuovi record di commissioning (Cantiere, Nome Barca, Scafo, Tipo, Operatore)
- Upload allegati con organizzazione automatica in sottocartelle per categoria
- Archivio ricercabile con paginazione, modifica ed eliminazione record
- Filtri dinamici per cantiere, tipo e operatore + ordinamento per colonna nell'archivio
- Dashboard con KPI (totale record, questo mese, cantiere top) e grafici statistici (Chart.js)
- Portale slave (sola lettura) per tecnici: compila il modulo e genera un pacchetto `.df` da importare
- PWA installabile da browser per il portale slave (`docs/`): funziona offline e si installa come app nativa
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
src-tauri/target/release/bundle/nsis/Portale Commissioning_2.0.0_x64-setup.exe
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
├── docs/                   # PWA portale slave (pubblicabile su GitHub Pages o server web)
│   ├── index.html          # App web installabile (service worker + manifest)
│   ├── manifest.json       # Manifest PWA
│   ├── sw.js               # Service worker (cache offline)
│   └── icons/              # Icone PWA (192×192, 512×512)
├── server.js               # Server Express (API + serve frontend)
├── index.html              # Landing page (home: Nuovo, Archivio, Dashboard)
├── nuovo.html              # Pagina inserimento nuovo record
├── manage.html             # Pagina archivio/gestione (filtri dinamici, ordinamento colonne)
├── dashboard.html          # Dashboard con KPI e grafici (Chart.js)
├── slave.html              # Portale remoto sola lettura: genera pacchetti .df
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
