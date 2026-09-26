# Architettura

## Componenti

| Componente | Tecnologia | Ruolo |
|---|---|---|
| Shell desktop | Tauri v2 (Rust), `src-tauri/` | Finestra dell'app (WebView2), avvio e arresto del server, scelta cartelle, inoltro del drag&drop |
| Server | Express 5 (Node.js), `server.js`, impacchettato in `server.exe` con pkg | API, lettura e scrittura dell'Excel, allegati, backup, import `.df`; serve le pagine |
| Pagine | HTML + Bootstrap 5 + JavaScript, nella root | Home, Nuovo, Archivio, Dashboard |
| Grafici ed export | Chart.js, jsPDF + AutoTable | Dashboard e report PDF |
| Portale remoto | PWA statica in `docs/`, su GitHub Pages | Modulo per i tecnici sul campo che genera pacchetti `.df` (vedi [portale remoto](portale-remoto.md)) |
| Dati | Excel `.xlsx` su cartella di rete + backup JSON/JSONL locali | Fonte ufficiale e storico |

Tutte le librerie sono servite in locale, sia dall'app sia dal portale: nessun CDN.

## Come funziona

1. La shell Tauri genera un segreto, avvia `server.exe` passandogli la cartella dei backup e il segreto, attende che risponda su `127.0.0.1:3000` e apre la finestra su `http://127.0.0.1:3000/index.html`.
2. Le pagine chiamano le API del server. Le operazioni che scrivono richiedono un token che la pagina ottiene da `GET /app-token`.
3. Il server legge e scrive l'Excel del profilo sulla cartella di rete e salva gli allegati in sottocartelle per entità, categoria e record. Tiene inoltre un backup locale: storico JSONL, snapshot, metadati di audit (chi ha creato o modificato e quando), copie rotanti dell'Excel.
4. Drag&drop di file nella finestra: Tauri riceve i percorsi e la shell li registra sul server con il segreto. Poi li passa alla pagina, che legge i byte da `GET /local-file`, consentito solo per quei percorsi, una volta.

## Profili di dominio

`domain-profile.js` definisce i due profili, Navale e Industriale: titolo, etichette dei campi, valori del campo Tipo, nome del file Excel. Le **colonne dell'Excel sono le stesse** per entrambi (`Cantiere`, `Nome Barca`, `Numero Scafo`, `Matricola`, `Tipo`, `Operatore`…): cambia solo come vengono mostrate. I nomi interni sono rimasti quelli storici, perché sono le colonne degli Excel già esistenti e le chiavi dei pacchetti `.df` del portale remoto (valutazione in `TODO.md`).

Il profilo attivo si risolve così: variabile `PORTALE_DOMAIN_PROFILE`, altrimenti `settings.json`, altrimenti nessuno (schermata di scelta al primo avvio). Finché il profilo non è scelto, le route che scrivono rispondono 409.

## Sicurezza dell'app

- Server in ascolto solo su `127.0.0.1`, con controllo dell'intestazione `Host` (contro il DNS rebinding).
- Token anti-CSRF (`X-Portale-Client`) su tutte le route che scrivono.
- `/local-file` limitato ai file appena trascinati, autorizzati dalla shell con un segreto che la pagina non conosce.
- Content-Security-Policy: solo risorse locali, nessuna connessione esterna, niente iframe.
- JSON non attendibile (pacchetti `.df`) letto senza prototype pollution (`safe-json.js`); nomi file degli allegati ripuliti; estensioni ammesse in una lista chiusa.

Il quadro completo, con le misure sulla supply chain e la valutazione normativa, è in [sicurezza e CRA](sicurezza-e-cra.md) e nel [documento privacy](../docs/compliance/privacy-e-trattamento-dati.md).

## Struttura del repository

```
├── server.js, domain-profile.js, backup-migration.js, safe-json.js   server
├── index.html, nuovo.html, manage.html, dashboard.html               pagine dell'app
├── script.js, ui-common.js, i18n.js                                   logica delle pagine, testi IT/EN
├── *.min.js, bootstrap.min.css                                        librerie (locali)
├── rebuild_excel.js, import_df.js                                     utility da riga di comando
├── src-tauri/                                                         shell Tauri (Rust)
│   ├── src/main.rs                                                    avvio server, finestra, drag&drop
│   ├── tauri.conf.json, tauri.prod.conf.json                          configurazione (prod generata dalla build)
│   └── capabilities/, icons/
├── packaging/msix/                                                    manifest del pacchetto MSIX
├── scripts/                                                           build, MSIX, migrazione da commissioning_ind, sync dei file generati
├── docs/                                                              pubblicato su GitHub Pages
│   ├── index.html, sw.js, manifest.json, profili.js, vendor/, icons/  portale remoto (PWA)
│   └── compliance/                                                    documento privacy
├── documentazione/                                                    questa documentazione
├── test/                                                              test automatici
└── .github/                                                           workflow CI, Dependabot
```
