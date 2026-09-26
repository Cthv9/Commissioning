# Build e rilascio

## Cosa fa la CI (GitHub Actions)

| Workflow | Quando | Cosa fa |
|---|---|---|
| **Build** (`build.yml`) | ogni PR e push su `main`; tag `v*` | Su Windows: `npm audit` (bloccante sulle vulnerabilità alte), `server.exe` con pkg, setup NSIS, test delle route sul `server.exe` impacchettato, SBOM, pacchetto MSIX; su `main`, Release automatica |
| **Test** (`test.yml`) | ogni PR e push su `main` | `npm test` su Windows e Linux (unità, route HTTP, pagine in Chrome headless) |
| **CodeQL** (`codeql.yml`) | ogni PR e push su `main`, e ogni lunedì | Analisi statica di sicurezza del codice JavaScript e dei workflow; risultati in *Security > Code scanning* |
| **Dependabot** (`dependabot.yml`) | una volta al mese | Una PR raggruppata per npm e una per Cargo |

Ogni build carica un artifact `portale-commissioning-<pr o ramo>` con setup, pacchetti MSIX (Store e test) e SBOM.

## Rilasciare una versione

1. Alzare `version` in `package.json`, `src-tauri/tauri.conf.json` e `src-tauri/Cargo.toml`, e aggiornare i lockfile (`npm version <x.y.z> --no-git-tag-version` e `cargo update -p portale-commissioning`).
2. Fare il merge su `main`.

Se la versione non ha ancora il suo tag, la build su `main` crea il tag `v<versione>` e la GitHub Release con:

- `Portale Commissioning_<versione>_x64-setup.exe`: setup per l'installazione diretta;
- `PortaleCommissioning_<versione>.0_x64-store.msix`: pacchetto da caricare nel Microsoft Store;
- `portale-commissioning-npm.cdx.json` e `portale-commissioning-tauri.cdx.json`: SBOM in formato CycloneDX (vedi [sicurezza e CRA](sicurezza-e-cra.md)).

Anche un tag `v*` pushato a mano crea la Release.

## Build in locale (Windows)

```bash
npx tauri icon build/icon.ico   # solo se cambia l'icona
npm run tauri:build
```

Il setup viene creato in `src-tauri/target/release/bundle/nsis/`. Il pacchetto MSIX si crea dopo, con il Windows SDK installato:

```powershell
./scripts/build-msix.ps1   # crea msix-out/*-store.msix, *-test.msix e *-test.cer
```

## Microsoft Store

L'app si pubblica come pacchetto **MSIX**. Lo firma il Microsoft Store al caricamento, quindi non serve comprare un certificato, e lo Store aggiorna l'app in automatico. La visibilità è limitata a un **pubblico privato** di account aziendali.

Passi una tantum, da fare con l'account del titolare:

1. Registrarsi come sviluppatore su [Partner Center](https://partner.microsoft.com/dashboard) con un account aziendale e **riservare il nome** dell'app.
2. In *Gestione prodotto > Identità prodotto* copiare `Package/Identity/Name`, `Package/Identity/Publisher` e `Package/Properties/PublisherDisplayName`.
3. Nel repository GitHub, in *Settings > Secrets and variables > Actions > Variables*, creare `MSIX_IDENTITY_NAME`, `MSIX_PUBLISHER` e `MSIX_PUBLISHER_DISPLAY_NAME` con quei valori, e `MSIX_DISPLAY_NAME` con il nome riservato. Senza queste variabili la CI crea il pacchetto con valori di test: vanno bene per provarlo, ma lo Store non li accetta.
4. Rilasciare una versione (sopra) e scaricare `*-store.msix` dalla Release. Lo Store vuole una versione più alta a ogni invio.
5. In Partner Center creare l'invio:
   - caricare il `.msix` in *Pacchetti*;
   - in *Prezzi e disponibilità > Visibilità* scegliere **Pubblico privato**, indicando email o gruppi aziendali autorizzati;
   - come *URL informativa sulla privacy* indicare la pagina del [documento privacy](../docs/compliance/privacy-e-trattamento-dati.md) pubblicata su GitHub Pages (`…/compliance/privacy-e-trattamento-dati.html`) o una sua copia sul sito aziendale.

**Provare il pacchetto prima dell'invio**:

1. Dagli artifact della build scaricare `*-test.msix` e `*-test.cer`.
2. Aprire il `.cer` con doppio clic, *Installa certificato*, e metterlo in *Computer locale > Persone attendibili*.
3. Aprire il `.msix` per installarlo.

Il certificato di test cambia a ogni build.
