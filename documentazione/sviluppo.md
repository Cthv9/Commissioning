# Sviluppo

## Prerequisiti

- [Node.js](https://nodejs.org/) 22 o successivo (richiesto da `@yao-pkg/pkg`)
- [Rust](https://rustup.rs/) stable, con `rustup target add x86_64-pc-windows-msvc` per la build Windows
- La CLI di Tauri si installa con le dipendenze npm

```bash
npm install
```

## Comandi

| Comando | Descrizione |
|---|---|
| `npm run dev:server` | Solo il server, su `http://127.0.0.1:3000` |
| `npm run tauri:dev` | App in sviluppo (finestra Tauri + server) |
| `npm run tauri:build` | Build completa: `server.exe` con pkg → sidecar → setup NSIS (vedi [build e rilascio](build-e-rilascio.md)) |
| `npm test` | Test automatici (vedi sotto) |
| `npm run sync-assets` | Aggiorna i file generati (vedi sotto) |
| `npm run rebuild:excel` | Ricostruisce il file Excel dallo snapshot di backup |
| `npm run import:df` | Importa un pacchetto `.df` da riga di comando |

## Test

`npm test` esegue tutti i file `test/*.test.js` con il test runner di Node:

- **unità**: profili, migrazione dei backup, parsing sicuro del JSON, allineamento dei file generati;
- **dati riservati** (`dati-riservati.test.js`): il repository è pubblico, quindi nei file non devono comparire percorsi di rete, indirizzi email o le parole riservate elencate nella variabile `PORTALE_TERMINI_RISERVATI` (in CI arriva dall'omonimo secret del repository). Nei file usare solo segnaposto, per esempio `\\Server\Share`;
- **route HTTP** (`http-routes.test.js`): avvia il server vero su una porta libera e su cartelle temporanee, poi prova upload, archivio, import `.df`, impostazioni e protezioni (token, Host, `/local-file`, intestazioni di sicurezza);
- **pagine** (`ui.test.js`): Chrome headless tramite `playwright-core`. Prova il primo avvio, il nuovo record, l'Archivio, la dashboard con l'export PDF, e il portale remoto, anche offline, col pacchetto generato importato nell'app. Fallisce anche per errori JavaScript, violazioni della Content-Security-Policy e richieste verso internet.

Il test delle pagine usa Google Chrome installato; in alternativa `PORTALE_TEST_CHROMIUM=<percorso di chrome o chromium>`. Senza browser il test viene saltato in locale, ma mai in CI.

Con `PORTALE_TEST_SERVER_EXE=server-dist/server.exe` i test delle route girano sul server impacchettato invece che su `server.js`: la build Windows in CI lo fa a ogni esecuzione.

## File generati

Alcuni file esistono in più posti e vanno tenuti allineati con `npm run sync-assets`:

| File | Fonte |
|---|---|
| `bootstrap.min.css`, `bootstrap.bundle.min.js` (app) e `docs/vendor/*` (portale remoto) | pacchetti npm `bootstrap` e `jszip`, versioni fisse in `package.json` |
| `docs/profili.js` (etichette del portale remoto) | `domain-profile.js` |

Le librerie sono servite in locale e non da un CDN: l'app funziona senza internet e nessun codice di terzi viene scaricato a ogni avvio. `test/sync-assets.test.js` fallisce se un file non è allineato alla sua fonte. Per aggiornare una libreria: cambiare versione in `package.json`, poi `npm install` e `npm run sync-assets`.

## Variabili d'ambiente del server

| Variabile | Uso |
|---|---|
| `PORTALE_DOMAIN_PROFILE` | `navale` / `industriale`: preimposta il profilo (vedi [amministrazione](amministrazione-it.md)) |
| `PORTALE_ROOT_DIR`, `PORTALE_UPLOADS_DIR` | cartella di rete predefinita per Excel e allegati (sovrascritta dalle Impostazioni) |
| `PORTALE_BACKUP_DIR` | cartella dei backup locali; la shell Tauri la imposta sui Documenti |
| `PORTALE_LEGACY_BACKUP_DIR` | vecchia cartella dei backup da cui copiare una volta sola |
| `PORTALE_SHELL_SECRET` | segreto condiviso tra shell Tauri e server per `/local-file`; generato dalla shell a ogni avvio |
| `PORTALE_PORT` | porta del server (predefinita 3000, la shell la attende lì); usata dai test |

## Aggiornare le dipendenze

Dependabot apre una PR al mese per npm e una per Cargo. Le verificano i workflow Test e Build prima del merge.

Fanno eccezione le **minor di Tauri**, da fare a mano. Vanno allineati nello stesso commit `@tauri-apps/api` e `@tauri-apps/cli` (npm) e il crate `tauri` (`cargo update -p tauri`). Tauri rifiuta di compilare se i due lati hanno minor diverse, e Dependabot li proporrebbe separati (vedi `.github/dependabot.yml`).
