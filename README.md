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

**Il profilo si sceglie una sola volta, al primo avvio.** C'è un unico installer per entrambi i reparti: al primo avvio l'app mostra una schermata obbligatoria (non si chiude senza scegliere) con i due profili e chiede conferma. Da quel momento la scelta è bloccata e non esiste alcun selettore nelle Impostazioni. Cambiare profilo cambia anche il file Excel letto e scritto, quindi un cambio accidentale sembrerebbe "far perdere" tutti i record. La scelta non avviene nel setup perché dal Microsoft Store l'installazione è silenziosa e nessuna schermata del setup viene mostrata.

Per l'IT:

- **Preimpostare il profilo** (niente domanda al primo avvio): impostare la variabile d'ambiente di sistema `PORTALE_DOMAIN_PROFILE` a `navale` o `industriale` sulla postazione. Ha la precedenza sulla scelta salvata, quindi va usata solo su postazioni nuove o già coerenti.
- **Rifare la scelta**: chiudere l'app ed eliminare la chiave `domainProfile` da `settings.json` nella cartella di backup (vedi [Percorsi dati](#percorsi-dati)). Al riavvio la schermata ricompare.

Il profilo Industriale riunisce in questo stesso tool le funzionalità già offerte dal repository gemello `commissioning_ind`, che viene deprecato a favore del portale unificato.

### Migrazione da Commissioning_IND

Per migrare da un'installazione esistente di `commissioning_ind` al Portale Commissioning unificato:

1. Installare il portale unificato (dal Microsoft Store o dal setup della Release GitHub) e al primo avvio scegliere **Industriale**.
2. Puntare la cartella dati/share di rete allo stesso percorso già in uso da `commissioning_ind`, così che l'Excel dei record industriali continui a essere letto/scritto nello stesso posto.
3. Eseguire lo script di migrazione (richiede Node.js) per copiare i backup locali esistenti nella cartella di backup del portale unificato:

   ```bash
   node scripts/migrate-ind-to-unified.js --from <cartella-backup-IND> [--to <cartella-backup-portale>]
   ```

   Senza `--to` la destinazione è `Documenti\Portale Commissioning\backup` nel profilo utente; se i Documenti sono spostati su OneDrive, indicare il percorso reale.

   Lo script è **idempotente** (può essere eseguito più volte senza effetti duplicati) e **non modifica il file Excel**: agisce solo sui backup locali (snapshot JSON, metadati audit, copie storiche), lasciando l'Excel condiviso come unica fonte "master" già in uso.

## Prerequisiti di sviluppo

- [Node.js](https://nodejs.org/) 22+ (richiesto da `@yao-pkg/pkg`)
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
src-tauri/target/release/bundle/nsis/Portale Commissioning_<versione>_x64-setup.exe
```

Il pacchetto MSIX per il Microsoft Store si crea dopo la build, su Windows con il Windows SDK:

```powershell
./scripts/build-msix.ps1   # crea msix-out/*-store.msix, *-test.msix e *-test.cer
```

In CI (`.github/workflows/build.yml`) la build parte su ogni PR e push su `main`. Sui tag `v*` la GitHub Release contiene il setup NSIS e il pacchetto `*-store.msix`.

## Distribuzione tramite Microsoft Store

L'app viene pubblicata come pacchetto **MSIX**: lo firma il Microsoft Store al caricamento (nessun certificato da acquistare) e lo Store aggiorna l'app in automatico. È visibile solo a un **pubblico privato** (account aziendali indicati in Partner Center).

Passi una tantum (solo il titolare dell'account può farli):

1. Registrarsi come sviluppatore su [Partner Center](https://partner.microsoft.com/dashboard) (account aziendale) e **riservare il nome** dell'app.
2. In *Gestione prodotto > Identità prodotto* copiare `Package/Identity/Name`, `Package/Identity/Publisher` e `Package/Properties/PublisherDisplayName`.
3. Nel repository GitHub (*Settings > Secrets and variables > Actions > Variables*) creare le variabili `MSIX_IDENTITY_NAME`, `MSIX_PUBLISHER`, `MSIX_PUBLISHER_DISPLAY_NAME` con quei valori, e `MSIX_DISPLAY_NAME` con il nome riservato. Senza queste variabili la CI crea il pacchetto con valori di test, validi per provarlo ma non accettati dallo Store.
4. Aumentare `version` in `package.json` (lo Store richiede una versione più alta a ogni invio), creare e pushare il tag `v<versione>`, e scaricare `*-store.msix` dalla Release.
5. In Partner Center creare l'invio: caricare il `.msix` in *Pacchetti*, e in *Prezzi e disponibilità > Visibilità* scegliere **Pubblico privato**, indicando email o gruppi aziendali autorizzati.
6. Nella scheda dell'app, come *URL informativa sulla privacy*, indicare il link al documento [`docs/compliance/privacy-e-trattamento-dati.md`](docs/compliance/privacy-e-trattamento-dati.md) su GitHub (o la sua copia sul sito aziendale). Partner Center lo richiede per le app che trattano dati personali, qui lo username di Windows negli audit trail.

**Provare il pacchetto prima dell'invio**: dagli artifact della build scaricare `*-test.msix` e `*-test.cer`. Importare il `.cer` in *Computer locale > Persone attendibili* (doppio clic sul file, *Installa certificato*), poi aprire il `.msix` per installarlo. Il certificato di test cambia a ogni build.

Lo Store non installa WebView2: l'app usa quello già presente in Windows 11 e nei Windows 10 aggiornati.

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
| `Documenti\Portale Commissioning\backup\` | Backup JSON, snapshot, metadati audit, `settings.json` |
| *(share di rete configurabile)* | File Excel + allegati |

Il percorso della share di rete è configurabile tramite il pannello impostazioni nell'app (icona ℹ️).

I backup stanno nei Documenti e non in AppData perché, con il pacchetto MSIX, AppData viene cancellata alla disinstallazione, e con essa l'audit trail. Al primo avvio della nuova versione i backup presenti nella vecchia cartella `%APPDATA%\Portale Commissioning\backup\` vengono copiati automaticamente, se la nuova cartella è vuota. La vecchia cartella non viene toccata.
