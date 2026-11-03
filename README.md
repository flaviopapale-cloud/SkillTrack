# SkillTrack personale v1.6 — diario intensità nello stile del coach

## Cosa cambia

- Il riepilogo **INTENSITÀ LOOP / INTENSITÀ LIBERO** non stampa più descrizioni verbose come "Combo spinta · ... (1x1 combo/...)". Crea **una riga per blocco realmente registrato**, nel formato `2x sequenza - loop`, per ciascuna W1–W4.
- In ogni serie d'intensità puoi inserire **l'esercizio/combos realmente eseguiti** anche se diversi dalla scheda (es. iso al posto di elevate maltese). L'esercizio pianificato rimane nel programma.
- **Commento al coach** per singola serie, visibile anche nello storico e nel TXT tra parentesi quadre.
- **Esercizi EMOM**: campo libero per la sequenza svolta, ad esempio `2push adv + put, pu`. Se sono stati completati sei minuti su dieci, nel TXT appare `EMOM10’ - 6x2push adv + put, pu`.
- **Nota al coach** per l'intera sessione, mostrata nel TXT.
- **Personalizza testo** in allenamento o nello storico: permette di riscrivere l'intero riepilogo della sessione, se serve una notazione più particolare. Puoi in qualsiasi momento ripristinare la generazione automatica.
- **Registra esercizio libero / extra** se durante l'intensità fai un movimento non previsto dai blocchi. Aggiunge un blocco soltanto alla sessione, non alla scheda generale.
- La vista Progressi e il TXT completo/copia per coach usano lo stesso nuovo formato.
- Il Volume, il calendario e le settimane restano invariati.

## Esempio di esportazione

```text
INTENSITÀ LOOP — MESE 1
W1 - 2x pu slow, press, neg, iso, lsit, iso, press (full) - VR
2x put slow, pu, pu (full) - VR
3x maltese elev - VR2G
3x put semi wide - VR2G
EMOM10’ - 6x2push adv + put, pu
W2 - —
W3 - —
W4 - —
```

Questo risultato dipende da ciò che **registri nei campi reali**; l'app non interpreta da sola abbreviazioni o inventa i movimenti eseguiti. Se lasci il nome precompilato, verrà riportato quello programmato.

## Aggiornamento su GitHub Pages

1. **Prima di tutto**, sull'iPhone vai in SkillTrack → Impostazioni → **Backup JSON** e salva il file in iCloud Drive. Il TXT non è un backup ripristinabile.
2. Scarica `SkillTrack_aggiornamento_personale_v1_6.zip` ed estrai `index.html`, `sw.js`, `progress-v16.js`.
3. Apri **il repository della tua SkillTrack personale**, non SkillTrack Coach né skilltrack-platform.
4. Carica i tre file **nella radice** del repository, sostituendo i precedenti `index.html` e `sw.js`; `progress-v16.js` sarà nuovo.
5. Premi Commit changes e attendi il completamento di GitHub Pages.
6. Su iPhone, con Internet attivo, riapri SkillTrack; se non vedi le novità, chiudi e riapri. **Non eliminare la PWA né cancellare la memoria del browser.**
7. **Non eliminare** `progress-v13.js`, `progress-v14.js`, `progress-v15.js`, `manifest.webmanifest` o le icone: servono ancora.

## Come utilizzarlo

- Apri Intensità Loop o Libero, registra una serie: nel pannello compila **Esercizio o combo realmente eseguita**, **Loop / assistenza**, e **Commento da mostrare al coach**.
- Per il finale, usa il bottone **Esercizi EMOM** nel riepilogo e scrivi la sequenza da esportare.
- Se vuoi una nota generale, usa **Note per coach**.
- Se vuoi un testo esattamente tuo, usa **Personalizza testo**; le modifiche successive alle serie non aggiorneranno il testo manuale, finché non lo ripristini.
- Anche per una seduta terminata puoi aprire Storico → seduta, premere Modifica sulle serie e correggere le note o il testo.
- Da Progressi scegli la giornata e il mese, poi Copia per coach o Scarica TXT.

## Compatibilità e verifiche

- Mantiene la chiave locale `skilltrack-data-v1` e lo schema principale `version:1`, aggiungendo soltanto campi opzionali.
- Le serie e i risultati già registrati non vengono cancellati.
- Verificati con test automatici Node: esempio testuale esatto, esercizi sostituiti, note, EMOM, testo personalizzato, settimana vuota e volume invariato.
- Non è stato possibile verificare il rendering completo su Safari iPhone da questo ambiente. Verifica dopo il caricamento e conserva il backup JSON.
