# Informativa privacy e registro dei trattamenti — Portale Commissioning

## 1. Introduzione e ambito

### 1.1 Cos'è il software

Il Portale Commissioning è un'applicazione desktop per Windows (Tauri v2 con backend locale Express/Node.js) utilizzata internamente dall'azienda per registrare i record di commissioning (collaudo/messa in servizio) di barche (profilo "Navale") e, dopo il consolidamento descritto in questo documento, anche di macchine industriali (profilo "Industriale", che sostituisce il tool gemello `commissioning_ind`, ora deprecato). I dati inseriti dagli operatori vengono salvati in un file Excel (`Barche_Commissionate.xlsx` per il profilo Navale, `Commissioning_IND.xlsx` per il profilo Industriale) su una share di rete aziendale configurabile, con un backup locale in formato JSON/JSONL sul PC dell'operatore.

### 1.2 Nota sull'ambito normativo: il software non è soggetto a marcatura CE / Direttiva Macchine

Il Portale Commissioning è puro software gestionale per il tracciamento documentale delle attività di collaudo. Non controlla, non aziona e non è integrato come componente funzionale di alcun impianto o macchina, né ne governa la sicurezza funzionale. Di conseguenza il software, di per sé, **non rientra nell'ambito della Direttiva Macchine 2006/42/CE né del Regolamento Macchine (UE) 2023/1230** e non richiede marcatura CE. Questa nota non riguarda le macchine industriali oggetto dei record registrati (la cui eventuale conformità CE è disciplinata separatamente e non è oggetto del presente documento), ma unicamente lo strumento software stesso.

## 2. Ruoli e responsabilità

- **Titolare del trattamento**: l'azienda che installa, configura e utilizza il software (di seguito "l'Azienda"). L'Azienda determina finalità e mezzi del trattamento (es. quale share di rete usare, quali operatori hanno accesso al PC/alla cartella, per quanto tempo conservare i dati).
- **Responsabile del trattamento esterno**: nessuno. Il software elabora i dati esclusivamente in locale sul PC dell'operatore e su infrastruttura di rete interna all'Azienda (share aziendale); non vi è alcun trasferimento a fornitori cloud o servizi terzi esterni all'organizzazione, quindi non è necessario un contratto ex art. 28 GDPR con soggetti esterni.
- **Sviluppatore/fornitore del software**: fornisce lo strumento ma non ha accesso ai dati trattati dall'Azienda durante l'uso ordinario (nessuna telemetria, nessun invio dati a servizi esterni).

## 3. Dati personali trattati

### 3.1 Username di sistema operativo negli audit trail

Ogni record conserva, in un file di metadati separato dall'Excel (`meta.json` nella cartella di backup), i campi audit `CreatoDa` e `ModificatoDa`, che contengono lo **username del sistema operativo Windows** dell'operatore (rilevato lato server tramite `process.env.USERNAME`/`process.env.USER`), insieme ai relativi timestamp (`CreatoIl`, `ModificatoIl`). In caso di eliminazione di un record, lo username dell'operatore che ha effettuato l'operazione (`deletedBy`, rilevato tramite `os.userInfo().username`) e il timestamp vengono registrati in un log di tombstone (`tombstones.jsonl`), insieme a una copia del record eliminato, a fini di tracciabilità.

Lo username di sistema operativo è considerato dato personale in quanto, all'interno dell'organizzazione, consente di identificare univocamente la persona fisica che ha operato sul record.

### 3.2 Dati indiretti eventualmente presenti negli allegati caricati dagli operatori

Gli operatori possono caricare allegati (foto, documenti, report) collegati a un record. Il software non ne analizza il contenuto, ma tali file potrebbero contenere incidentalmente dati personali (es. persone visibili in foto, nomi in documenti) inseriti dall'utente stesso. La responsabilità del contenuto degli allegati è dell'operatore che li carica.

### 3.3 Nessun dato di categoria particolare (art. 9 GDPR)

Il software non è progettato per raccogliere, e per finalità ordinarie non tratta, dati relativi a salute, origine etnica, convinzioni religiose/politiche, orientamento sessuale o altre categorie particolari di dati ex art. 9 GDPR. I campi applicativi (Cantiere/Costruttore, Nome Barca/Macchina, Numero Scafo/Modello, Matricola, Tipo, Operatore) sono dati organizzativi/tecnici, salvo il nome dell'operatore che è un dato personale ordinario (identificativo).

## 4. Finalità e base giuridica

Le finalità del trattamento sono:

- tracciabilità operativa e qualità industriale (sapere chi ha creato/modificato/eliminato un record e quando), a supporto di controlli interni, audit e responsabilità documentale;
- gestione organizzativa delle attività di collaudo/commissioning.

Base giuridica: **legittimo interesse del Titolare** ex art. 6.1.f GDPR alla tracciabilità e alla qualità dei processi interni, e/o **adempimento di obblighi contrattuali/organizzativi interni** (es. procedure di qualità aziendali, rapporti di lavoro) ex art. 6.1.b/c GDPR, secondo quanto stabilito dalle politiche interne dell'Azienda. Non è richiesto il consenso dell'interessato, trattandosi di dati raccolti nell'ambito del rapporto di lavoro per finalità di tracciabilità organizzativa proporzionate.

## 5. Modalità del trattamento

- L'elaborazione avviene **localmente sul PC dell'operatore**: il backend Express è vincolato all'indirizzo di loopback (`127.0.0.1`, porta 3000) e non è raggiungibile da altri host della rete.
- I dati "master" (file Excel e allegati) risiedono su una **share di rete aziendale interna**, con percorso configurabile dall'Azienda tramite il pannello impostazioni dell'app.
- Un backup locale (JSON/JSONL, snapshot, copie Excel rotanti, metadati audit) viene mantenuto sul PC dell'operatore nella cartella `Documenti\Portale Commissioning\backup`. Se l'Azienda ha attivato su OneDrive lo spostamento automatico delle cartelle note (Known Folder Move), questa cartella viene sincronizzata sul tenant Microsoft 365 aziendale: il trattamento resta nel perimetro dei servizi già contrattualizzati dall'Azienda, ma va considerato nel registro dei trattamenti aziendale.
- L'app è distribuita tramite il **Microsoft Store** (pacchetto MSIX) con visibilità limitata a un pubblico privato di account aziendali. Lo Store gestisce installazione e aggiornamenti; non riceve i dati applicativi. Partner Center richiede un URL di informativa privacy per la scheda dell'app: può essere indicato questo documento.
- **Non vi è alcun invio di dati a servizi cloud o a terze parti esterne all'Azienda**: il software non effettua chiamate di rete verso l'esterno per il trattamento dei dati applicativi.

## 6. Conservazione e retention

Le impostazioni dell'app (persistite in `settings.json` nella cartella di backup) rendono configurabili i seguenti periodi di conservazione, con valori di default:

| Parametro | Descrizione | Default |
|---|---|---|
| `maxExcelBackupCopies` | Numero massimo di copie storiche rotanti del file Excel conservate in locale | 50 |
| `tmpUploadsRetentionDays` | Giorni di conservazione dei file temporanei di upload prima della pulizia automatica | 2 |
| `auditRetentionMonths` | Mesi di conservazione prevista per l'audit trail (`meta.json`/tombstone) | 24 |

La pulizia dei file temporanei e delle copie Excel eccedenti avviene automaticamente a intervalli periodici (ogni 6 ore) tramite un processo di manutenzione lato server. La pulizia periodica dell'audit trail basata su `auditRetentionMonths` è pianificata ma non ancora implementata a livello di rimozione automatica dei metadati più vecchi del periodo configurato: allo stato attuale il parametro è configurabile ma la cancellazione effettiva dei metadati scaduti richiede intervento manuale (rimane un'attività di follow-up, si veda `TODO.md`). Il file Excel "master" sulla share di rete non viene mai eliminato automaticamente dal software: la sua conservazione a lungo termine è regolata dalle politiche documentali dell'Azienda (es. requisiti di qualità/tracciabilità collaudi).

## 7. Misure di sicurezza tecniche e organizzative

### 7.1 Binding del backend solo su localhost

Il server Express è avviato con `app.listen(3000, '127.0.0.1', ...)`: accetta connessioni solo dallo stesso PC (loopback IPv4/IPv6), impedendo l'accesso da altri dispositivi in rete.

Il server accetta inoltre solo richieste con intestazione `Host` pari a `127.0.0.1:3000` o `localhost:3000`. Questo blocca il *DNS rebinding*: un sito esterno che fa risolvere il proprio dominio in `127.0.0.1` diventerebbe "stessa origine" per il browser, ma le sue richieste portano il suo nome di dominio e vengono rifiutate.

### 7.2 Protezione anti-CSRF-locale sugli endpoint che modificano/eliminano dati

Gli endpoint che creano, modificano o eliminano dati (incluso il caricamento di nuovi record e allegati, `POST /upload`, oltre alle impostazioni e all'endpoint di lettura file locale usato dal drag&drop) sono protetti da un middleware (`requireAppOrigin`) che richiede l'header `X-Portale-Client` con un token (`APP_TOKEN`) generato all'avvio del processo e recuperabile solo tramite `GET /app-token` dalla stessa applicazione. Non si tratta di un'autenticazione utente forte, ma di una misura che impedisce a una pagina web esterna eventualmente aperta nello stesso browser di invocare queste route in modo silenzioso (protezione da CSRF locale).

### 7.2-bis Lettura dei file trascinati (`/local-file`)

Il drag&drop nativo dell'app desktop legge i file dal disco tramite `/local-file`. L'endpoint serve **solo i file che l'utente ha appena trascinato nella finestra**: al momento del drop la shell Tauri comunica i percorsi al server, autorizzata da un segreto generato a ogni avvio che la pagina web non conosce. Ogni percorso è leggibile una sola volta ed entro due minuti. Anche una pagina compromessa non può quindi usare l'endpoint per leggere altri file del PC.

### 7.3 Libreria di elaborazione Excel aggiornata

La libreria di lettura/scrittura Excel (`xlsx`) è mantenuta a una versione aggiornata distribuita direttamente da SheetJS (attualmente 0.20.3, tramite tarball ufficiale), priva delle vulnerabilità note associate a versioni precedenti distribuite su npm.

### 7.4 Limiti noti e rischi residui accettati

- **Assenza di login e di ruoli utente distinti**: chiunque abbia accesso al PC e alla share di rete può usare l'app con i permessi del proprio utente Windows; non esiste un sistema di autenticazione applicativa separato né una gestione di ruoli (es. operatore vs. amministratore). L'identificazione dell'operatore si basa sullo username di sistema operativo.
- **Nessuna cifratura dei dati a riposo**: i file Excel, i backup JSON e gli allegati non sono cifrati; la protezione si basa sui permessi del filesystem e della share di rete aziendale.

Questi limiti sono considerati rischi residui accettati dal Titolare in ragione del contesto di utilizzo (rete aziendale interna, accesso già circoscritto al personale autorizzato tramite i permessi di rete/dominio Windows esistenti), e sono monitorati per eventuali interventi futuri.

## 8. Diritti degli interessati

Gli interessati (gli operatori i cui username compaiono negli audit trail) possono esercitare i diritti di accesso, rettifica e richiesta di limitazione previsti dagli artt. 15-18 GDPR. Il software non fornisce un'interfaccia self-service per l'esercizio di questi diritti: le richieste devono essere indirizzate al **Titolare del trattamento (funzione HR/IT interna dell'Azienda)**, che gestisce la richiesta a livello organizzativo (es. correzione manuale di un metadato errato, chiarimento sulle finalità di conservazione). Il presente documento non istituisce una procedura di richiesta gestita dal software stesso.

## 9. Registro dei trattamenti semplificato

| Trattamento | Finalità | Dati trattati | Base giuridica | Retention | Misure di sicurezza |
|---|---|---|---|---|---|
| Registrazione record di commissioning | Tracciamento documentale delle attività di collaudo/messa in servizio (navale e industriale) | Dati del record (asset, tipo, operatore); username dell'operatore che inserisce | Legittimo interesse (art. 6.1.f) / adempimento organizzativo interno | Conservazione del file Excel "master" secondo le politiche documentali dell'Azienda; nessuna cancellazione automatica | Backend solo su localhost; guard anti-CSRF-locale sugli endpoint di scrittura |
| Audit trail modifiche (creazione/modifica/eliminazione) | Tracciabilità di chi ha creato, modificato o eliminato un record e quando | Username OS (`CreatoDa`/`ModificatoDa`/`deletedBy`), timestamp | Legittimo interesse (art. 6.1.f) | `auditRetentionMonths` (default 24 mesi, pulizia automatica pianificata, non ancora attiva) | Metadati separati dall'Excel (`meta.json`); tombstone per le eliminazioni (`tombstones.jsonl`) |
| Backup e conservazione storica | Continuità operativa e recupero dati in caso di corruzione/perdita dell'Excel condiviso | Copia integrale dei record (inclusi i metadati audit) | Legittimo interesse (art. 6.1.f) | Copie Excel rotanti: `maxExcelBackupCopies` (default 50); file temporanei di upload: `tmpUploadsRetentionDays` (default 2 giorni) | Backup solo locale sul PC dell'operatore; nessun invio a servizi esterni |
| Import/migrazione da profilo Industriale (`commissioning_ind`) | Consolidamento dei backup storici del tool gemello deprecato nell'unico Portale Commissioning | Record storici e relativi metadati audit già presenti nei backup IND | Legittimo interesse (art. 6.1.f) / continuità documentale | Come sopra (copie Excel rotanti / audit trail) | Script di migrazione idempotente, non modifica l'Excel di origine; stesso guard anti-CSRF-locale una volta importati i dati nel portale unificato |

## 10. Riferimenti normativi

- Regolamento (UE) 2016/679 (GDPR)
- D.Lgs. 196/2003 e successive modifiche (Codice in materia di protezione dei dati personali, come aggiornato dal D.Lgs. 101/2018)

## 11. Storico revisioni del documento

| Versione | Data | Descrizione |
|---|---|---|
| 1.0 | 2026-09-24 | Prima redazione, contestuale al consolidamento navale/industriale |
| 1.1 | 2026-09-26 | Backup locali spostati nei Documenti; distribuzione tramite Microsoft Store (MSIX, pubblico privato); token anti-CSRF-locale esteso a `POST /upload` |
| 1.2 | 2026-09-26 | Controllo dell'intestazione Host (DNS rebinding); `/local-file` limitato ai file trascinati (rischio residuo chiuso); test automatici delle route e delle pagine in CI |

---

*Questo documento è una bozza tecnica redatta a supporto della conformità; richiede revisione e validazione da parte di una figura con competenza legale/DPO prima di essere considerato definitivo e vincolante per l'azienda.*
