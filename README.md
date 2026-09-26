# Portale Commissioning

App per Windows che registra e archivia le attività di commissioning (avviamenti, collaudi, commissioning, claim) con i relativi documenti, per il reparto **Navale** (barche) e per il reparto **Industriale** (macchine).

## Cosa fa

- **Nuovo record**: si inseriscono i dati dell'attività (entità, asset, identificativo, matricola, tipo, operatore) e si allegano foto, video, email e documenti. Gli allegati vengono ordinati da soli in cartelle per entità, categoria e record, sulla cartella di rete aziendale.
- **Archivio**: ricerca, filtri per entità, tipo e operatore, ordinamento, modifica ed eliminazione dei record, apertura della cartella degli allegati.
- **Dashboard**: indicatori (totale, record del mese, entità più attiva), grafici ed export in PDF.
- **Portale remoto per i tecnici**: una pagina web, installabile anche sul telefono e usabile offline, con cui chi è sul campo prepara un pacchetto `.df` con dati e allegati. In ufficio il pacchetto si importa nell'Archivio.
- **Excel sempre aggiornato**: i record stanno in un file Excel sulla cartella di rete, leggibile anche senza l'app.
- **Backup e storico**: backup locale automatico, copie dell'Excel, registro di chi ha creato o modificato ogni record.
- Interfaccia in **italiano e inglese**.

## Reparti

C'è un solo programma per entrambi i reparti. **Al primo avvio** l'app chiede se si lavora per il reparto Navale o Industriale; la scelta poi resta fissa. Il reparto decide le etichette (per esempio *Cantiere / Nome Barca / Numero Scafo* oppure *Costruttore / Nome Macchina / Modello Motore*), i valori del campo Tipo e il file Excel in cui vengono salvati i record.

## Come si ottiene

- **Microsoft Store**: visibile agli account aziendali autorizzati, si aggiorna da solo.
- **Setup** dalla pagina [Releases](https://github.com/Cthv9/Commissioning/releases).

Il portale remoto è pubblicato su GitHub Pages; il link per reparto è in [documentazione/portale-remoto.md](documentazione/portale-remoto.md).

## Documentazione

| Documento | Per chi |
|---|---|
| [Installazione e amministrazione](documentazione/amministrazione-it.md) | IT: installazione, reparto preimpostato o da rifare, percorsi dei dati, migrazione da Commissioning_IND |
| [Portale remoto](documentazione/portale-remoto.md) | Responsabili e tecnici: indirizzo, link per reparto, uso offline, pacchetto `.df` |
| [Architettura](documentazione/architettura.md) | Sviluppo: componenti, funzionamento, sicurezza dell'app, struttura del repository |
| [Sviluppo](documentazione/sviluppo.md) | Sviluppo: prerequisiti, comandi, test, file generati, variabili d'ambiente |
| [Build e rilascio](documentazione/build-e-rilascio.md) | Sviluppo: CI, rilascio di una versione, Microsoft Store |
| [Sicurezza e Cyber Resilience Act](documentazione/sicurezza-e-cra.md) | Titolare e compliance: norme applicabili, misure in atto, decisioni aperte |
| [Privacy e trattamento dati](docs/compliance/privacy-e-trattamento-dati.md) | Titolare e compliance: informativa e registro dei trattamenti |
| [Segnalare una vulnerabilità](SECURITY.md) | Chiunque |
| [TODO](TODO.md) | Attività aperte |
