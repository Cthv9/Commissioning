# TODO — Implementazioni future

## Portale Master (`index.html` / `script.js`)

- [x] **Drag & drop per caricamento file .df** — Abilitato su `manage.html`: overlay a tutto schermo quando si trascina un `.df`, avvia automaticamente il flusso preview → import.

## Portale Slave remoto (`slave.html`)

- [x] **Drag & drop per caricamento file** — Abilitato: gestisce sia `dataTransfer.items` (Outlook) sia `dataTransfer.files`, con handler `dragenter`/`dragleave` corretti e `dropEffect='copy'`.

## Follow-up da questo consolidamento

- [x] Rigenerare `package-lock.json` e ripristinare `npm ci` nel workflow CI
- [x] Rendere bloccante lo step `npm audit` in CI — `npm audit --omit=dev` riporta 0 vulnerabilità dopo adm-zip 0.6.1 + `npm audit fix` sulle transitive di express, quindi tolto `continue-on-error`
- [x] CI anche sulle PR (`pull_request` trigger in `build.yml`) e Dependabot raggruppato per ecosystem (1 PR/mese invece di una per pacchetto), per evitare regressioni tipo il disallineamento Tauri npm/cargo capitato con le PR #37–#43
- [x] Installer unico con scelta del profilo (Navale/Industriale) al primo avvio, poi bloccata; preset/reset per l'IT documentati nel README
- [x] Pacchetto MSIX per il Microsoft Store generato in CI (`scripts/build-msix.ps1`), con copia firmata di test; backup locali spostati da AppData ai Documenti con migrazione automatica
- [x] Archivio (`manage.html`) di nuovo funzionante: lo script si interrompeva al caricamento (`dfWirePageDfDrop` usata prima di caricare `ui-common.js`, dal PR #33) e modifica/eliminazione/apertura cartelle non inviavano il token anti-CSRF (dal PR #36); `POST /upload` ora protetto dal token come gli altri endpoint di scrittura

- [x] Test automatici in CI delle route HTTP e delle pagine (Chrome headless), su Windows e Linux; la build ripete i test delle route sul `server.exe` impacchettato
- [x] `express` 4 → 5.2 e `multer` 1 → 2.4, verificati dai test (Dependabot non esclude più le loro major)
- [x] `/local-file` limitato ai file appena trascinati, registrati dalla shell Tauri con un segreto che la pagina non conosce; controllo dell'Host contro il DNS rebinding
- [x] Release automatica: alzando `version` in `package.json` e facendo il merge su `main` la build crea tag e Release
- [x] Rinomina profonda dei nomi di campo interni: **valutata, non si fa**. I nomi storici (`Cantiere`, `Nome Barca`, `Numero Scafo`, `Matricola`) sono le colonne dei file Excel già sulle share e le chiavi di `record.json` nei pacchetti `.df` prodotti dal portale remoto, che resta in cache offline sui telefoni dei tecnici anche nelle versioni vecchie. Rinominarli richiederebbe una migrazione degli Excel e la compatibilità con entrambi i formati `.df`, in cambio di sola leggibilità del codice. Il layer di etichette per profilo (`domain-profile.js`) copre già la differenza per l'utente

### Ancora aperti

- [ ] Provare su Windows il pacchetto MSIX di test (artifact della build: `*-test.msix` + `*-test.cer`, istruzioni nel README): avvio del server, schermata di primo avvio, share di rete, drag&drop, backup in `Documenti\Portale Commissioning\backup` e copia automatica da una vecchia installazione (AppData)
- [ ] Microsoft Store (a cura del titolare dell'account): registrazione in Partner Center, nome riservato, variabili `MSIX_*` nel repository, primo invio con visibilità **Pubblico privato** — passi nel README, sezione "Distribuzione tramite Microsoft Store"

### Nota manutenzione

Gli upgrade di **minor** Tauri vanno fatti a mano, allineando nello stesso commit `@tauri-apps/api` + `@tauri-apps/cli` (npm) e il crate `tauri` (`cargo update -p tauri`): Dependabot è configurato per non proporli, perché li proporrebbe separati e la build fallirebbe (vedi `.github/dependabot.yml`).
