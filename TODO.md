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

### Ancora aperti

- [ ] Valutare rinomina profonda dei nomi di campo interni (oggi solo il layer di visualizzazione è parametrizzato per dominio, i nomi interni/colonne restano storici per compatibilità)
- [ ] Valutare upgrade `multer` 1.x → 2.x con test manuale upload dedicato (Dependabot configurato per non riproporlo in automatico)
- [ ] Valutare upgrade `express` 4.x → 5.x con test manuale delle route (`res.status()` diventa più severo, nuova sintassi wildcard delle route via path-to-regexp, `body-parser` v2; la CI impacchetta il server ma non chiama le route HTTP, quindi non lo verifica — Dependabot configurato per non riproporlo in automatico, PR #46 chiusa per questo motivo)
- [ ] Valutare redesign con token dedicato per l'endpoint `/local-file` (oggi mitigato dal guard anti-CSRF-locale condiviso)
- [ ] Provare su Windows il pacchetto MSIX di test (artifact della build: `*-test.msix` + `*-test.cer`, istruzioni nel README): avvio del server, schermata di primo avvio, share di rete, drag&drop, backup in `Documenti\Portale Commissioning\backup` e copia automatica da una vecchia installazione (AppData)
- [ ] Microsoft Store (a cura del titolare dell'account): registrazione in Partner Center, nome riservato, variabili `MSIX_*` nel repository, primo invio con visibilità **Pubblico privato** — passi nel README, sezione "Distribuzione tramite Microsoft Store"
- [ ] Aggiungere in CI un test automatico delle route HTTP e delle pagine (server avviato + browser headless): oggi la CI verifica che l'app si compili, non che le funzioni rispondano, ed è così che il blocco dell'Archivio è rimasto inosservato

### Nota manutenzione

Gli upgrade di **minor** Tauri vanno fatti a mano, allineando nello stesso commit `@tauri-apps/api` + `@tauri-apps/cli` (npm) e il crate `tauri` (`cargo update -p tauri`): Dependabot è configurato per non proporli, perché li proporrebbe separati e la build fallirebbe (vedi `.github/dependabot.yml`).
