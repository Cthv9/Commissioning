# TODO — Implementazioni future

## Portale Master (`index.html` / `script.js`)

- [x] **Drag & drop per caricamento file .df** — Abilitato su `manage.html`: overlay a tutto schermo quando si trascina un `.df`, avvia automaticamente il flusso preview → import.

## Portale Slave remoto (`slave.html`)

- [x] **Drag & drop per caricamento file** — Abilitato: gestisce sia `dataTransfer.items` (Outlook) sia `dataTransfer.files`, con handler `dragenter`/`dragleave` corretti e `dropEffect='copy'`.

## Follow-up da questo consolidamento

- [ ] Valutare rinomina profonda dei nomi di campo interni (oggi solo il layer di visualizzazione è parametrizzato per dominio, i nomi interni/colonne restano storici per compatibilità)
- [ ] Valutare upgrade `multer` 1.x → 2.x con test manuale upload dedicato
- [ ] Valutare redesign con token dedicato per l'endpoint `/local-file` (oggi mitigato dal guard anti-CSRF-locale condiviso)
- [ ] Rendere bloccante lo step `npm audit` in CI una volta verificato il rumore di falsi positivi
- [ ] Rigenerare `package-lock.json` con `npm install` da un ambiente con accesso di rete a `cdn.sheetjs.com` (non disponibile nell'ambiente in cui è stata preparata questa PR) e committarlo; a quel punto ripristinare `npm ci` nel workflow CI al posto di `npm install`
- [ ] Verificare su una macchina Windows reale che i due installer (Navale/Industriale) prodotti dalla CI si comportino correttamente: nome prodotto/identifier distinti, `PORTALE_DOMAIN_PROFILE` effettivamente "cotto" nel binario (controllare le etichette UI all'avvio senza alcuna variabile d'ambiente impostata manualmente), e che possano coesistere sulla stessa macchina se mai installati entrambi per test
