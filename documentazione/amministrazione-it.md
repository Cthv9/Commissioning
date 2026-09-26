# Installazione e amministrazione (IT)

## Installazione

Due modi, stesso programma:

- **Microsoft Store** (consigliato): l'app è visibile solo agli account aziendali autorizzati. Lo Store la aggiorna in automatico.
- **Setup da GitHub**: `Portale Commissioning_<versione>_x64-setup.exe` dalla pagina [Releases](https://github.com/Cthv9/Commissioning/releases). Gli aggiornamenti si installano a mano con il setup della versione nuova.

Requisiti: Windows 10 aggiornato o Windows 11 (serve WebView2, già presente; lo Store non lo installa).

## Profilo del reparto (Navale / Industriale)

C'è un solo programma per entrambi i reparti. Al primo avvio l'app chiede il reparto, con una schermata che non si chiude senza scegliere e che chiede conferma. Da quel momento la scelta è bloccata: nelle Impostazioni non c'è alcun selettore.

Il blocco è voluto. Il profilo decide quale file Excel l'app legge e scrive (`Barche_Commissionate.xlsx` o `Commissioning_IND.xlsx`), quindi un cambio accidentale sembrerebbe "far sparire" tutti i record.

La scelta non è nel setup perché dal Microsoft Store l'installazione è silenziosa: nessuna schermata del setup viene mostrata.

- **Preimpostare il profilo**, senza domanda al primo avvio: impostare sulla postazione la variabile d'ambiente di sistema `PORTALE_DOMAIN_PROFILE` a `navale` o `industriale`. Ha la precedenza sulla scelta salvata, quindi va usata solo su postazioni nuove o già coerenti.
- **Rifare la scelta**: chiudere l'app ed eliminare la chiave `domainProfile` da `settings.json` nella cartella dei backup (vedi sotto). Al riavvio la schermata ricompare.

## Dove stanno i dati

| Percorso | Contenuto |
|---|---|
| Cartella di rete configurata nell'app (icona ℹ️ → Impostazioni) | File Excel dei record e allegati, in sottocartelle per entità e categoria |
| `Documenti\Portale Commissioning\backup\` | Backup locali: storico JSONL, snapshot, metadati di audit, copie rotanti dell'Excel, `settings.json` |

I backup stanno nei Documenti e non in AppData perché, con il pacchetto del Microsoft Store, AppData viene cancellata quando si disinstalla l'app, e con essa lo storico delle modifiche.

Al primo avvio di una versione recente, i backup della vecchia cartella `%APPDATA%\Portale Commissioning\backup\` vengono copiati automaticamente, se la nuova cartella è vuota. La vecchia cartella non viene toccata.

Se i Documenti sono sincronizzati con OneDrive (spostamento delle cartelle note), anche i backup lo sono.

La conservazione dei backup (mesi di audit, copie dell'Excel, giorni dei file temporanei) si imposta in `settings.json`; dettagli nel [documento privacy](../docs/compliance/privacy-e-trattamento-dati.md).

## Migrazione da Commissioning_IND

Il repository `commissioning_ind` è deprecato: il profilo Industriale di quest'app ne fa le veci.

1. Installare il Portale Commissioning e al primo avvio scegliere **Industriale**.
2. Nelle Impostazioni indicare la stessa cartella di rete usata da `commissioning_ind`: l'Excel dei record industriali continua a essere letto e scritto lì. Le colonne sono identiche, non serve nessuna conversione.
3. Copiare i backup locali esistenti (richiede Node.js):

   ```bash
   node scripts/migrate-ind-to-unified.js --from <cartella-backup-IND> [--to <cartella-backup-portale>]
   ```

   Senza `--to` la destinazione è `Documenti\Portale Commissioning\backup`. Se i Documenti sono su OneDrive, indicare il percorso reale.

   Lo script si può ripetere senza creare duplicati e **non modifica il file Excel**: copia solo i backup locali (snapshot, metadati di audit, storico).
