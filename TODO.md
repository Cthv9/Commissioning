# TODO — Implementazioni future

## Portale Master (`index.html` / `script.js`)

- [x] **Drag & drop per caricamento file .df** — Abilitato su `manage.html`: overlay a tutto schermo quando si trascina un `.df`, avvia automaticamente il flusso preview → import.

## Portale Slave remoto (`slave.html`)

- [x] **Drag & drop per caricamento file** — Abilitato: gestisce sia `dataTransfer.items` (Outlook) sia `dataTransfer.files`, con handler `dragenter`/`dragleave` corretti e `dropEffect='copy'`.

## Follow-up da questo consolidamento

- [x] Rigenerare `package-lock.json` e ripristinare `npm ci` nel workflow CI
- [x] Rendere bloccante lo step `npm audit` in CI — `npm audit --omit=dev` riporta 0 vulnerabilità dopo adm-zip 0.6.1 + `npm audit fix` sulle transitive di express, quindi tolto `continue-on-error`
- [x] CI anche sulle PR (`pull_request` trigger in `build.yml`) e Dependabot raggruppato per ecosystem (1 PR/mese invece di una per pacchetto), per evitare regressioni tipo il disallineamento Tauri npm/cargo capitato con le PR #37–#43

### Ancora aperti

- [ ] Valutare rinomina profonda dei nomi di campo interni (oggi solo il layer di visualizzazione è parametrizzato per dominio, i nomi interni/colonne restano storici per compatibilità)
- [ ] Valutare upgrade `multer` 1.x → 2.x con test manuale upload dedicato (Dependabot configurato per non riproporlo in automatico)
- [ ] Valutare upgrade `express` 4.x → 5.x con test manuale delle route (`res.status()` diventa più severo, nuova sintassi wildcard delle route via path-to-regexp, `body-parser` v2; la CI impacchetta il server ma non chiama le route HTTP, quindi non lo verifica — Dependabot configurato per non riproporlo in automatico, PR #46 chiusa per questo motivo)
- [ ] Valutare redesign con token dedicato per l'endpoint `/local-file` (oggi mitigato dal guard anti-CSRF-locale condiviso)
- [ ] Verificare su una macchina Windows reale che i due installer (Navale/Industriale) prodotti dalla CI si comportino correttamente: nome prodotto/identifier distinti, `PORTALE_DOMAIN_PROFILE` effettivamente "cotto" nel binario (controllare le etichette UI all'avvio senza alcuna variabile d'ambiente impostata manualmente), e che possano coesistere sulla stessa macchina se mai installati entrambi per test

### Nota manutenzione

Gli upgrade di **minor** Tauri vanno fatti a mano, allineando nello stesso commit `@tauri-apps/api` + `@tauri-apps/cli` (npm) e il crate `tauri` (`cargo update -p tauri`): Dependabot è configurato per non proporli, perché li proporrebbe separati e la build fallirebbe (vedi `.github/dependabot.yml`).
