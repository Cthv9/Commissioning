# Portale Commissioning

App desktop Windows per la registrazione e gestione dei record di commissioning barche.

## Funzionalità

- Inserimento nuovi record di commissioning (Cantiere, Nome Barca, Scafo, Tipo, Operatore)
- Upload allegati con organizzazione automatica in sottocartelle per categoria
- Archivio ricercabile con paginazione, modifica ed eliminazione record
- Backup automatico in formato JSON + copie rotanti del file Excel
- Sincronizzazione con file Excel `Barche_Commissionate.xlsx` su share di rete
- Selezione cartella di destinazione upload tramite dialog nativa

## Stack tecnico

| Componente | Tecnologia |
|-----------|-----------|
| Shell desktop | **Tauri v2** (Rust) |
| Backend/API | **Express.js** (Node.js), impacchettato come sidecar con `pkg` |
| Frontend | HTML + Bootstrap 5 + Vanilla JS |
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
│   ├── tauri.conf.json     # Configurazione app (finestra, bundle, NSIS)
│   ├── capabilities/       # Permessi plugin Tauri
│   └── icons/              # Icone app (generate da npx tauri icon)
├── scripts/
│   └── build-sidecar.js    # Copia frontend + rinomina exe per Tauri
├── server.js               # Server Express (API + serve frontend)
├── index.html              # Pagina inserimento record
├── manage.html             # Pagina archivio/gestione
├── script.js               # Logica upload con progress
├── ui-common.js            # Componenti UI condivisi (modal info, impostazioni)
├── rebuild_excel.js        # Utility CLI: ricostruisce Excel dal backup
├── import_df.js            # Utility CLI: importa pacchetti .df
└── build/
    ├── icon.ico            # Icona sorgente
    └── installer.nsh       # Script NSIS legacy (riferimento)
```

## Percorsi dati

| Percorso | Contenuto |
|---------|-----------|
| `%APPDATA%\Portale Commissioning\backup\` | Backup JSON, snapshot, metadati |
| `\\Fs\FS\MAR_SERVICE\36-Commissioning\` | Share di rete (Excel + allegati) |

Il percorso della share di rete è configurabile tramite il pannello impostazioni nell'app (icona ℹ️).
