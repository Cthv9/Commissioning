# TODO — Implementazioni future

## Portale Master (`index.html` / `script.js`)

- [x] **Drag & drop per caricamento file .df** — Abilitato su `manage.html`: overlay a tutto schermo quando si trascina un `.df`, avvia automaticamente il flusso preview → import.

## Portale Slave remoto (`slave.html`)

- [x] **Drag & drop per caricamento file** — Abilitato: gestisce sia `dataTransfer.items` (Outlook) sia `dataTransfer.files`, con handler `dragenter`/`dragleave` corretti e `dropEffect='copy'`.
