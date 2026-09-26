# Sicurezza informatica e Cyber Resilience Act

> Valutazione tecnica preparata con lo sviluppo del software, aggiornata al 26/09/2026. **Non è un parere legale**: le conclusioni sull'applicabilità delle norme vanno confermate da chi ha competenza legale in azienda, soprattutto se cambia il modo in cui il software viene distribuito.

## In sintesi

- **CRA**: con l'uso attuale (strumento interno, distribuito solo ad account aziendali) il software, secondo questa lettura, **non rientra** nel Cyber Resilience Act. Rientrerebbe se venisse fornito ad altre aziende o a clienti nell'ambito dell'attività commerciale, anche gratis.
- Le misure principali che il CRA chiede ai prodotti che vi rientrano sono comunque **già adottate come buona pratica**: SBOM a ogni rilascio, gestione delle vulnerabilità, aggiornamenti automatici, sicurezza di default. Se lo scenario cambia, il lavoro rimanente è soprattutto documentale.
- Restano **decisioni per il titolare** (sezione in fondo): licenza del codice su repository pubblico, alcune impostazioni di GitHub, firma del setup.

## Quadro normativo

### Cyber Resilience Act — Regolamento (UE) 2024/2847

Si applica ai *prodotti con elementi digitali* **messi a disposizione sul mercato** dell'Unione, cioè forniti ad altri per la distribuzione o l'uso nell'ambito di un'attività commerciale, a pagamento o gratuitamente.

| Scadenza | Obbligo |
|---|---|
| 10/12/2024 | Entrata in vigore |
| 11/09/2026 | Segnalazione ad ENISA/CSIRT delle vulnerabilità sfruttate attivamente e degli incidenti gravi (art. 14) |
| 11/12/2027 | Tutti gli altri obblighi: requisiti essenziali (allegato I), valutazione di conformità, marcatura CE, documentazione tecnica, SBOM, periodo di supporto |

**Applicazione a questo software**

- *App desktop*: sviluppata e usata all'interno dell'azienda, distribuita tramite Microsoft Store solo ad account aziendali (pubblico privato). Un software usato da chi lo produce non è "messo a disposizione sul mercato": **fuori ambito**.
- *Portale remoto* (`docs/`, GitHub Pages): pagina pubblica, gratuita, senza account, usata dai tecnici per preparare i pacchetti da inviare all'azienda. Se lo usano solo i tecnici dell'azienda resta uno strumento interno. Se lo usano tecnici di **altre aziende** (partner, cantieri, costruttori), va valutato con il consulente legale.
- *Rientrerebbe* se l'app o il portale venissero forniti a clienti o ad altre aziende come parte dell'offerta commerciale, anche gratuitamente: vendita, servizio incluso, app data ai concessionari…

Se rientrasse, sarebbe un prodotto di categoria "default": non compare negli allegati III/IV, quindi basta l'autovalutazione (modulo A). La checklist in fondo elenca cosa mancherebbe.

### Altre norme

| Norma | Applicabilità |
|---|---|
| **NIS2** — Direttiva (UE) 2022/2555, D.Lgs. 138/2024 | Riguarda l'**azienda**, se è soggetto essenziale o importante per settore e dimensione, non il singolo software. In quel caso l'app è uno degli asset da gestire: inventario, aggiornamenti, fornitori. SBOM, Dependabot e rilasci tracciati aiutano a documentarlo. |
| **GDPR** — Reg. (UE) 2016/679, D.Lgs. 196/2003 | Si applica: dati trattati, basi giuridiche e misure nel [documento privacy](../docs/compliance/privacy-e-trattamento-dati.md). |
| **Regolamento Macchine** — Reg. (UE) 2023/1230 | Non si applica: software gestionale, non componente di sicurezza di macchine (documento privacy, § 1.2). |
| **AI Act** — Reg. (UE) 2024/1689 | Non si applica: nessun sistema di intelligenza artificiale. |
| **Accessibilità** — Dir. (UE) 2019/882, D.Lgs. 82/2022 | Non si applica: riguarda prodotti e servizi per i consumatori; questo è uno strumento interno. |

## Misure in atto

Confronto con i requisiti essenziali del CRA (allegato I), adottati come buona pratica.

| Requisito | Misura |
|---|---|
| Nessuna vulnerabilità nota sfruttabile al rilascio | `npm audit` bloccante in CI sulle vulnerabilità alte; Dependabot mensile (npm e Cargo) e avvisi di sicurezza; analisi statica **CodeQL** su ogni PR e ogni settimana |
| Sicuro per impostazione predefinita | Server raggiungibile solo dal PC stesso (`127.0.0.1`), controllo dell'Host, token su tutte le scritture; nessuna porta aperta in rete |
| Riservatezza e integrità dei dati | `/local-file` solo per i file trascinati; JSON non attendibile letto senza prototype pollution; nomi file ripuliti ed estensioni ammesse in lista chiusa; Content-Security-Policy |
| Minimizzazione dei dati | Unico dato personale: lo username di Windows negli audit trail (documento privacy) |
| Superficie d'attacco ridotta | Nessuna libreria caricata da CDN: tutto il codice è nel pacchetto; nessuna connessione verso internet; rimossa una pagina interna non più usata |
| Aggiornamenti di sicurezza | Microsoft Store: aggiornamento automatico; Release automatica a ogni nuova versione; il portale remoto si aggiorna da solo quando c'è connessione |
| SBOM | CycloneDX (npm e Rust) generato dalla build e allegato a ogni Release |
| Gestione delle vulnerabilità | [SECURITY.md](../SECURITY.md): segnalazione privata, tempi di risposta, pubblicazione dopo la correzione |
| Verifica | Test automatici delle funzioni e delle pagine a ogni modifica, anche sul `server.exe` distribuito |

## Decisioni per il titolare

1. **Licenza del codice.** Il repository è **pubblico** e `package.json` dichiara la licenza **ISC**, il valore predefinito di npm. Con ISC chiunque può copiare e riusare il codice. Le strade sono due:
   - codice aziendale riservato: licenza `UNLICENSED` con nota di copyright, e valutare di rendere privato il repository (GitHub Pages da repository privato richiede un piano a pagamento);
   - codice volutamente open source: aggiungere un file `LICENSE` esplicito.
2. **Impostazioni GitHub** (*Settings > Code security*):
   - attivare **Private vulnerability reporting**, necessario per la procedura di `SECURITY.md`;
   - verificare che **Dependabot alerts** e **Secret scanning** siano attivi.
3. **Firma del setup.** Il pacchetto dello Store lo firma Microsoft. Il setup NSIS scaricabile da GitHub invece non è firmato, e Windows SmartScreen mostra un avviso. Per eliminarlo serve un certificato di firma del codice; in alternativa si distribuisce solo tramite Store.
4. **Referente per la sicurezza**: chi riceve le segnalazioni e decide sulle correzioni.
5. **Uso da parte di terzi**: se il portale remoto o l'app vengono dati ad altre aziende, rivedere la sezione CRA con il consulente legale.

## Se il CRA dovesse applicarsi

Cosa mancherebbe, oltre alle misure già in atto:

- valutazione dei rischi di cybersicurezza documentata, come parte della documentazione tecnica (allegato VII);
- **periodo di supporto** dichiarato, di norma almeno 5 anni, e aggiornamenti di sicurezza gratuiti per tutto il periodo;
- procedura di **segnalazione a ENISA/CSIRT** entro 24 ore per le vulnerabilità sfruttate attivamente, con contatti e responsabilità definiti;
- dichiarazione UE di conformità e **marcatura CE**;
- istruzioni per l'utente con le informazioni dell'allegato II: contatto per le vulnerabilità, periodo di supporto, uso previsto;
- conservazione della documentazione per 10 anni.
