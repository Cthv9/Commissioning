# Commissiong - Improved UX pack

Modifiche incluse:
- Rimossa la menubar (File/Help) in Electron e impostati min size + show on ready.
- Home page (index.html) ora e' responsive e scrollabile se la finestra e' piccola (niente testi tagliati).
- Pagina Gestione (manage.html): barra in alto sempre visibile con:
  - pulsante "Nuovo commissioning"
  - campo ricerca live (filtra la tabella)
  - pulsante Aggiorna
  - record ordinati per ID decrescente (piu' recenti in alto)
 - \AppData\Roaming\portale-commissioning\backup

## Avvio
npm install --include=dev
npm run electron:dev

## Build
npm run dist
