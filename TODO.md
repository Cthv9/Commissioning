# TODO — Implementazioni future

## Portale Master (`index.html` / `script.js`)

- [x] **Drag & drop per caricamento file .df** — Abilitato su `manage.html`: overlay a tutto schermo quando si trascina un `.df`, avvia automaticamente il flusso preview → import.

## Portale remoto (`docs/`, GitHub Pages)

- [x] **Drag & drop per caricamento file** — gestisce sia `dataTransfer.items` (Outlook) sia `dataTransfer.files`, più incolla con Ctrl+V. Portato dalla vecchia copia interna `slave.html`, rimossa perché non raggiungibile dall'app.
- [x] Profilo Navale/Industriale (link `?profilo=` o scelta alla prima apertura), funzionamento offline reale e aggiornamento automatico della PWA installata.

## Follow-up da questo consolidamento

- [x] Rigenerare `package-lock.json` e ripristinare `npm ci` nel workflow CI
- [x] Rendere bloccante lo step `npm audit` in CI — `npm audit --omit=dev` riporta 0 vulnerabilità dopo adm-zip 0.6.1 + `npm audit fix` sulle transitive di express, quindi tolto `continue-on-error`
- [x] CI anche sulle PR (`pull_request` trigger in `build.yml`) e Dependabot raggruppato per ecosystem (1 PR/mese invece di una per pacchetto), per evitare regressioni tipo il disallineamento Tauri npm/cargo capitato con le PR #37–#43
- [x] Installer unico con scelta del profilo (Navale/Industriale) al primo avvio, poi bloccata; preset/reset per l'IT documentati in `documentazione/amministrazione-it.md`
- [x] Pacchetto MSIX per il Microsoft Store generato in CI (`scripts/build-msix.ps1`), con copia firmata di test; backup locali spostati da AppData ai Documenti con migrazione automatica
- [x] Archivio (`manage.html`) di nuovo funzionante: lo script si interrompeva al caricamento (`dfWirePageDfDrop` usata prima di caricare `ui-common.js`, dal PR #33) e modifica/eliminazione/apertura cartelle non inviavano il token anti-CSRF (dal PR #36); `POST /upload` ora protetto dal token come gli altri endpoint di scrittura
- [x] Test automatici in CI delle route HTTP e delle pagine (Chrome headless), su Windows e Linux; la build ripete i test delle route sul `server.exe` impacchettato
- [x] `express` 4 → 5.2 e `multer` 1 → 2.4, verificati dai test (Dependabot non esclude più le loro major)
- [x] `/local-file` limitato ai file appena trascinati, registrati dalla shell Tauri con un segreto che la pagina non conosce; controllo dell'Host contro il DNS rebinding
- [x] Release automatica: alzando `version` in `package.json` e facendo il merge su `main` la build crea tag e Release
- [x] Rinomina profonda dei nomi di campo interni: **valutata, non si fa**. I nomi storici (`Cantiere`, `Nome Barca`, `Numero Scafo`, `Matricola`) sono le colonne dei file Excel già sulle share e le chiavi di `record.json` nei pacchetti `.df` prodotti dal portale remoto, che resta in cache offline sui telefoni dei tecnici anche nelle versioni vecchie. Rinominarli richiederebbe una migrazione degli Excel e la compatibilità con entrambi i formati `.df`, in cambio di sola leggibilità del codice. Il layer di etichette per profilo (`domain-profile.js`) copre già la differenza per l'utente
- [x] Documentazione: README solo funzionale, parte tecnica in `documentazione/`
- [x] Supply chain: librerie locali invece del CDN, SBOM CycloneDX a ogni Release, CodeQL, `SECURITY.md`, Content-Security-Policy; valutazione CRA in `documentazione/sicurezza-e-cra.md`

### Ancora aperti (a cura del titolare)

- [ ] **Repository pubblico**: il codice è proprietario (`LICENSE`), ma la storia dei commit resta leggibile. Scegliere tra repository privato + GitHub Pro (Pages continua a funzionare) e repository privato + repository pubblico solo per il portale — dettagli in `documentazione/sicurezza-e-cra.md`, "Decisioni per il titolare"
- [ ] GitHub, *Settings > Emails* dell'account: attivare *Keep my email addresses private*, così i merge fatti dal sito non espongono l'email personale
- [ ] GitHub, *Settings > Secrets and variables > Actions*: creare il secret `PORTALE_TERMINI_RISERVATI` con le parole da non pubblicare mai (nome dell'azienda, server, clienti…, separate da virgola)
- [ ] GitHub, *Settings > Code security*: attivare *Private vulnerability reporting* (serve a `SECURITY.md`), verificare *Dependabot alerts* e *Secret scanning*
- [ ] Privacy (documento privacy § 11): voce nel registro dei trattamenti, informativa agli utenti e sezione sul sito aziendale per il Microsoft Store — modelli in `documentazione/modelli-privacy.md`
- [ ] Setup NSIS non firmato (avviso SmartScreen): certificato di firma del codice, oppure distribuzione solo tramite Store
- [ ] Distribuire ai tecnici i link del portale remoto per reparto (`?profilo=navale` / `?profilo=industriale`, anche come QR code)
- [ ] Provare su Windows il pacchetto MSIX di test (artifact della build: `*-test.msix` + `*-test.cer`, istruzioni in `documentazione/build-e-rilascio.md`): avvio del server, schermata di primo avvio, share di rete, drag&drop, backup in `Documenti\Portale Commissioning\backup` e copia automatica da una vecchia installazione (AppData)
- [ ] Microsoft Store (a cura del titolare dell'account): registrazione in Partner Center, nome riservato, variabili `MSIX_*` nel repository, primo invio con visibilità **Pubblico privato** — passi in `documentazione/build-e-rilascio.md`, sezione "Microsoft Store"

### Nota manutenzione

Gli upgrade di **minor** Tauri vanno fatti a mano, allineando nello stesso commit `@tauri-apps/api` + `@tauri-apps/cli` (npm) e il crate `tauri` (`cargo update -p tauri`): Dependabot è configurato per non proporli, perché li proporrebbe separati e la build fallirebbe (vedi `.github/dependabot.yml`).
