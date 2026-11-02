# SkillTrack v1.5 — Inizio programma e cicli personalizzati

## Novità

- **Impostazioni → Calendario del programma → Data di inizio**: scegli il giorno in cui vuoi cominciare W1 del Mese 1. L'app lo allinea al **lunedì della settimana scelta**, indipendentemente dal giorno in cui è stata installata.
- **Inizia nuovo mese (W1) da questa settimana**: chiude il mese precedente e apre un nuovo mese anche prima della quarta settimana; poi prosegue automaticamente W1, W2, W3, W4.
- **Settimane in pausa**: escludi dal conteggio le settimane intere in cui non ti alleni. Al rientro la numerazione riprende senza consumare una W del programma.
- **Modifica o elimina gli inizi mese personalizzati** e **rimuovi le pause** dalle Impostazioni.
- **Home e Progressi** mostrano il mese/settimana attuali e un collegamento rapido al calendario.
- Lo storico, le progressioni, il TXT sintetico per il coach e i backup JSON seguono la nuova numerazione. L'assegnazione manuale di una sessione a Mese/Week (v1.3) continua a funzionare e non viene modificata.

### Esempio: il problema di domenica 1 novembre

Se hai creato una sessione domenica **01/11/2026**, nella versione precedente il lunedì 02/11 risultava W2 perché il programma veniva ancorato al lunedì precedente (26/10).

Per fare partire il programma lunedì **02/11/2026**:

1. Apri **SkillTrack → Impostazioni → Calendario del programma**.
2. Imposta **Data di inizio del programma: 02/11/2026**.
3. Premi **Salva data iniziale**.
4. La settimana del 2 novembre diventa **Mese 1, W1**. La settimana successiva sarà W2, salvo pause o modifiche manuali.

### Come gestire le settimane saltate e i mesi variabili

- Nessun allenamento nella settimana del 09/11? Seleziona **09/11/2026** in **Settimane in pausa** e premi **Aggiungi settimana di pausa**. La settimana del 16/11 sarà W2, invece di W3; il mese durerà cinque settimane di calendario, con quattro settimane allenabili.
- Vuoi concludere il mese prima? In **Inizia nuovo mese** scegli la data dalla quale comincerà la prossima W1; le settimane del mese precedente non ancora completate rimarranno vuote.
- Hai già registrato un allenamento nella settimana che vuoi dichiarare in pausa? Prima assegnalo manualmente alla settimana desiderata nello Storico. Questo evita spostamenti imprevedibili.
- Se registri oggi una seduta di una settimana precedente, continua a usare **Cambia settimana** all'interno di quella seduta, indipendentemente da quanto è avanzato il calendario.

## Sicurezza dati

Tutti gli allenamenti rimangono nel `localStorage` della stessa web app. **Non rimuovere l'icona della PWA e non cancellare i dati del browser.** Prima di aggiornare, salva **Impostazioni → Backup JSON** su iCloud Drive. Il TXT è un diario da inviare al coach, non un backup importabile.

Spostare la data d'inizio o un inizio mese può ricalcolare la settimana degli allenamenti **automatici**, senza eliminarli; le sessioni **assegnate manualmente** mantengono la loro collocazione. Se la nuova data è posteriore ad alcuni allenamenti molto vecchi, il riepilogo può collocarli in W1 del primo mese: puoi correggerli singolarmente.

## Come aggiornare il repository GitHub Pages

1. Fai backup JSON dall'iPhone e salvalo esternamente.
2. Dal file `SkillTrack_aggiornamento_v1_5.zip` estrai **tre file**: `index.html`, `sw.js`, `progress-v15.js`.
3. Caricali nella **radice** del tuo repository GitHub, sostituendo i file esistenti quando necessario.
4. **Non cancellare** `progress-v13.js`, `progress-v14.js`, `manifest.webmanifest`, icone o altri file.
5. Premi **Commit changes**. Quando GitHub Pages ha finito, apri la PWA su iPhone con connessione attiva; chiudila e riaprila se vedi ancora la vecchia versione.

Il codice è statico, gira nel browser, senza backend. Lo storico rimane locale e non viene pubblicato su GitHub.
