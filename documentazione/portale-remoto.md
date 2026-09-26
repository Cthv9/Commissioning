# Portale remoto per i tecnici

Pagina web per chi lavora sul campo senza l'app. Il tecnico compila i dati del commissioning, allega foto e documenti e scarica un **pacchetto `.df`**. Lo invia al responsabile, che lo importa nell'app dall'Archivio (📥 **Importa .df**): il record viene creato con i suoi allegati, dopo un'anteprima in cui si possono correggere i valori.

## Dove si trova

È pubblicato con GitHub Pages dalla cartella `docs/` del repository, a ogni modifica su `main`. L'indirizzo predefinito è `https://cthv9.github.io/Commissioning/` (l'indirizzo effettivo è in *Settings > Pages* del repository).

Da telefono o PC si può **installare come app** (menu del browser → *Installa* / *Aggiungi a schermata Home*). Dopo la prima apertura funziona anche **senza connessione**. Quando la connessione c'è, si aggiorna da solo all'ultima versione.

## Reparto: Navale o Industriale

Il reparto cambia solo le etichette dei campi e i valori del campo Tipo. Il pacchetto `.df` ha lo stesso formato per entrambi i reparti.

- **Link per reparto**: `…/?profilo=navale` oppure `…/?profilo=industriale`. È il modo consigliato per distribuire il portale, anche come QR code: il tecnico non deve scegliere nulla.
- **Senza indicazione nel link**: alla prima apertura il portale chiede il reparto e lo ricorda su quel dispositivo. Si può cambiare dal link **cambia** in fondo alla pagina.

Le etichette e i valori vengono da `domain-profile.js`, la stessa fonte dell'app, tramite il file generato `docs/profili.js` (vedi [sviluppo](sviluppo.md#file-generati)).

## Il pacchetto `.df`

È un archivio ZIP con estensione `.df`:

```
record.json        dati del record
allegati/          file allegati dal tecnico
```

Le chiavi di `record.json` sono le colonne storiche dell'Excel (`Cantiere`, `Nome Barca`, `Numero Scafo`, `Matricola`, `Tipo`, `Operatore`, `Data e Ora Inserimento`), uguali per entrambi i reparti. Per questo un pacchetto si importa nell'app di qualunque reparto, anche se generato da una versione vecchia del portale rimasta in cache su un telefono.

## Privacy e sicurezza

Il portale non invia dati a nessun server. Il pacchetto viene creato nel browser e scaricato sul dispositivo; è il tecnico a inviarlo (email, chat aziendale…). La pagina carica solo file del proprio sito (nessuna libreria da CDN) e la sua Content-Security-Policy impedisce connessioni verso l'esterno.
