# SkillTrack — Calisthenics Skills (v1)

Mini-app locale (PWA), senza librerie e senza account. Interfaccia in italiano, progettata per il telefono.

## Provala subito

Apri `index.html` in un browser. Non è necessario installare dipendenze o creare un account. Per attivare installazione PWA e utilizzo offline ospita l'intera cartella tramite HTTPS, ad esempio con GitHub Pages (o un server locale durante lo sviluppo).

## Quattro giorni preconfigurati dalla scheda fotografata

- **Volume 1**: riscaldamento 15 min, blocco Presse + Touch 60 min, condizionamento loop 15 min.
- **Intensità Loop**: riscaldamento, due serie combo spinta, due combo tirata, tre power spinta, tre power tirata, finale EMOM 10 min.
- **Volume 2**: riscaldamento 15 min, Mezza supina push deadstop + PUT & Pull 60 min, condizionamento 15 min.
- **Intensità Libero**: due combo spinta, due combo tirata, set eventuale, tre serie power per categoria, EMOM 10 min.

Nomi e abbreviazioni dal documento originale sono stati conservati quanto possibile. **Controlla l'associazione spinta/tirata e i dettagli della scheda**: alcune notazioni non sono del tutto univoche.

## Funzionalità

- Calendario **non rigido**: puoi scegliere qualsiasi giornata; aggiungere/eliminare giornate per schede da 3/4/5+ allenamenti.
- Registra superserie con un pulsante, oppure una serie di spinta/tirata.
- Target preimpostato, modificabile in corso d'opera; ogni serie conserva il valore di quando è stata registrata.
- Ripetizioni, secondi, combo, progressione, assistenza loop, sovraccarico e qualità della singola serie.
- Timer autonomo per il blocco volume e timer per il finale EMOM.
- Registrazione delle serie programmate nei giorni intensità, intervalli EMOM individuali.
- Storico modificabile, grafici delle serie, percentuali solo per sessioni confrontabili.
- Appunti W1–W13 del vecchio PDF conservati come archivio **testuale**, esclusi dai calcoli automatici fino a quando la notazione non sarà chiarita.
- Salvataggio automatico locale ed export/import JSON.

## Limiti della v1

- Non c'è login, cloud sync o vera condivisione multiutente. L'architettura dati usa un identificatore profilo, e le giornate non sono fissate a quattro: è una base per evolvere verso un backend multiutente.
- Le statistiche di una combo non aggregano automaticamente movimenti eterogenei in una scala di forza comune.
- La variazione delle serie quando cambiano progressione, loop o target viene mostrata solo come dato grezzo, **non come aumento di forza %**.
- Il browser può cancellare i dati locali: esegui backup regolari. Gli aggiornamenti dell'app non dovrebbero cancellare localStorage, ma nessun backup è garantito senza esportazione.
- Il file `index.html` aperto direttamente da file system è utilizzabile ma non installabile come PWA e non ha service worker: per questi serve un contesto HTTPS.

## Installazione con GitHub Pages

1. Crea un repository pubblico o usa il tuo repository già esistente.
2. Carica nella radice `index.html`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png`.
3. Vai in **Settings → Pages** e pubblica la branch principale dalla root.
4. Apri il link HTTPS di GitHub Pages e scegli **Aggiungi a schermata Home** (Safari su iPhone) oppure **Installa app** (Chrome Android).

Nota: anche quando ospitata online, i risultati vengono salvati **solo nel browser/dispositivo** con cui accedi, non nel repository GitHub né su server.

## Organizzazione dati

`profile` + `days[]` (scheda variabile) + `activeSession` + `history[]` + `legacyNotes`.
Ogni sessione contiene uno snapshot della giornata, per preservare la fotografia della programmazione originale, più gli esiti delle serie.

## Codice

È volutamente vanilla JavaScript + HTML + CSS, senza pacchetti esterni e senza build. Puoi modificare `index.html` e usare un server statico.
