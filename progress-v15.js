/* SkillTrack v1.5 — partenza libera, nuova fase quando decidi, settimane in pausa.
 * Additivo: mantiene identici STORE_KEY, storico, JSON, nomi esercizi,
 * assegnazioni manuali v1.3 e dashboard/TXT v1.4.
 */
'use strict';
const v15PriorSettings = settings;
const v15PriorHome = home;
const v15PriorStats = statsView;
const v15PriorRangeWeek = rangeWeek;

function v15LocalDate(s) {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s.getTime()) ? null : new Date(s.getFullYear(), s.getMonth(), s.getDate(), 12);
  if (typeof s === 'string') {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const d = new Date(+m[1], +m[2]-1, +m[3], 12);
      return d.getFullYear()===+m[1] && d.getMonth()===+m[2]-1 && d.getDate()===+m[3] ? d : null;
    }
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
}
function v15DateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function v15Mon(input) {
  const d = v15LocalDate(input);
  if (!d) return null;
  d.setDate(d.getDate() - (d.getDay()+6)%7);
  return v15DateStr(d);
}
function v15AddWeeks(iso, n) {
  const d=v15LocalDate(iso);
  d.setDate(d.getDate() + 7*n);
  return v15DateStr(d);
}
function v15MondayDistance(a,b) {
  return Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z')) / (7*86400000));
}
function v15List(key){return Array.isArray(data[key]) ? data[key].filter(s=>typeof s==='string' && !!v15Mon(s)).map(v15Mon) : [];}
function v15NormalizeLists(){
  for(const k of ['cycleStartMondays','pausedWeekMondays'])data[k]=[...new Set(v15List(k))].sort();
}
function v15Start(){
  const existing=v15Mon(data.programStartDate);
  return existing || v15Mon(new Date());
}
function v15WeekPaused(date){return v15List('pausedWeekMondays').includes(v15Mon(date));}
function v15WeekInfo(when){
  const start=v15Start(), monday=v15Mon(when)||v15Mon(new Date());
  if(monday<start)return {month:0,week:0,global:0,paused:false,before:true};
  const pauses=new Set(v15List('pausedWeekMondays'));
  const markers=new Set(v15List('cycleStartMondays'));
  const count=Math.min(5000,Math.max(0,v15MondayDistance(start,monday)));
  let month=0,week=0,active=false,paused=false;
  for(let i=0;i<=count;i++){
    const day=v15AddWeeks(start,i);
    paused=pauses.has(day);
    if(paused)continue;
    if(!active){active=true;month=0;week=0;continue;}
    if(markers.has(day)||week>=3){month++;week=0;}
    else week++;
  }
  return {month,week,global:month*4+week,paused,before:false};
}
// Mantiene il contratto di v1.3 (indice globale = (mese-1)*4 + (week-1)).
programAnchor=function(){return v15LocalDate(v15Start());};
cycleWeek=function(iso){return v15WeekInfo(iso).global;};
monthIndexFor=function(iso){return v15WeekInfo(iso).month;};
currentMonthIndex=function(){return v15WeekInfo(new Date()).month;};
function v15FindWeekStart(globalIndex){
  if(!Number.isInteger(globalIndex)||globalIndex<0)return null;
  const start=v15Start(), pauses=new Set(v15List('pausedWeekMondays'));
  // Max 5000 settimane per impedire loop indefiniti su archivi corrotti.
  for(let n=0;n<5000;n++){
    const date=v15AddWeeks(start,n);
    if(pauses.has(date))continue;
    const info=v15WeekInfo(date);
    if(info.global===globalIndex)return date;
    if(info.global>globalIndex)return null; // ciclo chiuso prima di completare W4
  }
  return null;
}
rangeWeek=function(mi,w){
  const monday=v15FindWeekStart(mi*4+w);
  if(!monday)return 'Non prevista: ciclo chiuso in anticipo';
  const sunday=v15LocalDate(monday);sunday.setDate(sunday.getDate()+6);
  const f=d=>d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'});
  return `${f(v15LocalDate(monday))}–${f(sunday)}`;
};
function v15TodaySummary(){
  const inf=v15WeekInfo(new Date());
  return {inf,text:inf.paused?'Settimana in pausa':`Mese ${inf.month+1} · W${inf.week+1}`};
}
function v15Controls(){
  const start=v15Start(),cur=v15TodaySummary();
  const manualStarts=v15List('cycleStartMondays').filter(x=>x>start);
  const pauses=v15List('pausedWeekMondays').filter(x=>x>=start);
  const today=v15DateStr(v15LocalDate(new Date()));
  const starts=manualStarts.map(date=>`<div class="v15-list-row"><span>📆 ${esc(v15LocalDate(date).toLocaleDateString('it-IT'))} · Mese ${v15WeekInfo(date).month+1}</span><div class="v15-inline"><input aria-label="Cambia data del nuovo mese" type="date" id="v15-marker-${date}" value="${date}"><button class="btn sm secondary" data-action="v15-edit-start" data-date="${date}">Modifica</button><button class="btn sm danger" data-action="v15-remove-start" data-date="${date}">Elimina</button></div></div>`).join('');
  const pauseRows=pauses.map(date=>`<div class="v15-list-row"><span>⏸ ${esc(v15LocalDate(date).toLocaleDateString('it-IT'))}</span><button class="btn sm secondary" data-action="v15-remove-pause" data-date="${date}">Rimuovi pausa</button></div>`).join('');
  return `<div class="panel v15-panel">
    <h3>📅 Calendario del programma</h3>
    <p class="tip">La settimana parte di lunedì. L'app conta automaticamente W1–W4 dal giorno di inizio che scegli; puoi anticipare un nuovo mese o sospendere una settimana senza cancellare gli allenamenti.</p>
    <div class="v15-now"><small>OGGI</small><strong>${esc(cur.text)}</strong><span>Programma iniziato lunedì ${esc(v15LocalDate(start).toLocaleDateString('it-IT'))}</span></div>
    <div class="field top-gap"><label for="v15-start">Data di inizio del programma (W1, Mese 1)</label><input type="date" id="v15-start" value="${start}"></div>
    <p class="tip">Scegli un qualsiasi giorno: il conteggio partirà dal lunedì di quella settimana. Ad esempio, imposta 02/11/2026 per iniziare da questo lunedì.</p>
    <button class="btn sm" data-action="v15-save-start">Salva data iniziale</button>
    <hr class="divider">
    <h3>🔄 Inizia un nuovo mese quando vuoi</h3>
    <p class="tip">Normalmente dopo quattro settimane allenabili parte il mese successivo. Qui puoi farlo iniziare prima, anche se il mese precedente non ha quattro settimane complete.</p>
    <div class="field"><label for="v15-new-month">Da quale giorno vuoi far partire la nuova W1?</label><input type="date" id="v15-new-month" value="${today}"></div>
    <button class="btn top-gap" data-action="v15-new-cycle">Inizia nuovo mese (W1) da questa settimana</button>
    ${starts?`<div class="v15-list"><strong>Inizi mese personalizzati</strong>${starts}</div>`:''}
    <hr class="divider">
    <h3>⏸ Settimane di pausa</h3>
    <p class="tip">Se una settimana non ti alleni, segnala la pausa: non conterà come W1, W2, W3 o W4. Al rientro riprenderai dalla settimana successiva del tuo ciclo.</p>
    <div class="field"><label for="v15-pause-date">Settimana da mettere in pausa</label><input type="date" id="v15-pause-date" value="${today}"></div>
    <button class="btn sm secondary top-gap" data-action="v15-pause-add">Aggiungi settimana di pausa</button>
    ${pauseRows?`<div class="v15-list"><strong>Pause registrate</strong>${pauseRows}</div>`:''}
    <p class="note top-gap">Le sessioni già salvate restano nel diario. Le assegnazioni manuali non cambiano. Se modifichi il calendario, le sessioni con assegnazione automatica si riallineano alla nuova data; fai prima un backup JSON.</p>
  </div>`;
}
settings=function(){
  const html=v15PriorSettings();
  return html.replace('<h3>Backup dei dati</h3>',v15Controls()+'<h3>Backup dei dati</h3>');
};
home=function(){
  const cur=v15TodaySummary();
  return `<div class="v15-hero"><span>IL TUO CICLO ATTUALE</span><strong>${esc(cur.text)}</strong><button class="small-btn" data-action="settings">⚙ Gestisci settimane e mesi</button></div>`+v15PriorHome();
};
statsView=function(){
  const cur=v15TodaySummary();
  return `<div class="v15-toolbar"><span>Calendario: ${esc(cur.text)}</span><button class="btn sm secondary" data-action="settings">Gestisci inizio, pause e mesi</button></div>`+v15PriorStats();
};
function v15SaveCalendar(){v15NormalizeLists();save();statMonthIndex=null;render();}
function v15WarnNoDate(inputId){const d=v15Mon(document.getElementById(inputId)?.value);if(!d)toast('Seleziona una data valida');return d;}
function v15NewCycle(date){
  const start=v15Start();
  if(date<=start){toast('Per cambiare la prima W1 usa «Data di inizio»');return;}
  if(v15WeekPaused(date)){toast('Rimuovi prima la pausa da questa settimana');return;}
  const markers=new Set(v15List('cycleStartMondays'));
  if(markers.has(date)){toast('Hai già impostato un inizio mese in questa settimana');return;}
  // Se è già W1 per un passaggio automatico, la settimana è corretta senza un altro mese.
  const cur=v15WeekInfo(date),prev=v15WeekInfo(v15AddWeeks(date,-1));
  if(cur.week===0 && cur.month>prev.month){toast(`Questa settimana è già Mese ${cur.month+1} · W1`);return;}
  markers.add(date);data.cycleStartMondays=[...markers].sort();v15SaveCalendar();toast('Nuovo mese iniziato da questa settimana');
}
function v15PauseAdd(date){
  if(date<v15Start()){toast('La pausa deve essere successiva all’inizio del programma');return;}
  if(v15List('cycleStartMondays').includes(date)){toast('Questa settimana è impostata come inizio mese: modifica prima quella data');return;}
  if(v15WeekPaused(date)){toast('Questa settimana è già in pausa');return;}
  const hasSessions=data.history.concat(data.activeSession?[data.activeSession]:[]).some(s=>!Number.isInteger(s.assignedWeekIndex) && v15Mon(s.startedAt)===date);
  if(hasSessions){toast('Ci sono sedute automatiche in questa settimana. Prima correggi la loro assegnazione manualmente.');return;}
  data.pausedWeekMondays=[...new Set([...v15List('pausedWeekMondays'),date])].sort();v15SaveCalendar();toast('Settimana in pausa: il conteggio riprenderà al rientro');
}
function v15EditMarker(oldDate,newDate){
  if(newDate<=v15Start()){toast('Per modificare la prima W1 cambia la data iniziale');return;}
  if(v15WeekPaused(newDate)){toast('La nuova data coincide con una settimana in pausa');return;}
  const existing=v15List('cycleStartMondays').filter(d=>d!==oldDate);
  if(existing.includes(newDate)){toast('Esiste già un inizio mese in questa settimana');return;}
  data.cycleStartMondays=[...existing,newDate].sort();v15SaveCalendar();toast('Data del nuovo mese modificata');
}
// Capture phase, come v1.3/v1.4. Non intercetta i controlli precedenti.
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]'); if(!b||!b.dataset.action.startsWith('v15-'))return;
  e.stopImmediatePropagation();
  const action=b.dataset.action;
  if(action==='v15-save-start'){
    const start=v15WarnNoDate('v15-start');if(!start)return;
    if(data.programStartDate===start){toast('La data iniziale è già impostata');return;}
    data.programStartDate=start;
    // Rimuove soltanto eventi che precedono la nuova data iniziale.
    data.cycleStartMondays=v15List('cycleStartMondays').filter(d=>d>start);
    data.pausedWeekMondays=v15List('pausedWeekMondays').filter(d=>d>=start);
    v15SaveCalendar();toast('Il programma ora parte dal '+v15LocalDate(start).toLocaleDateString('it-IT'));
  }
  if(action==='v15-new-cycle'){
    const d=v15WarnNoDate('v15-new-month');if(d)v15NewCycle(d);
  }
  if(action==='v15-pause-add'){
    const d=v15WarnNoDate('v15-pause-date');if(d)v15PauseAdd(d);
  }
  if(action==='v15-remove-pause'){
    data.pausedWeekMondays=v15List('pausedWeekMondays').filter(x=>x!==b.dataset.date);v15SaveCalendar();toast('Pausa rimossa');
  }
  if(action==='v15-remove-start'){
    data.cycleStartMondays=v15List('cycleStartMondays').filter(x=>x!==b.dataset.date);v15SaveCalendar();toast('Inizio personalizzato rimosso');
  }
  if(action==='v15-edit-start'){
    const d=v15WarnNoDate('v15-marker-'+b.dataset.date);if(d)v15EditMarker(b.dataset.date,d);
  }
},true);
const v15CSS=document.createElement('style');
v15CSS.textContent=`
.v15-panel{margin-bottom:18px;border:1px solid #426b78}.v15-panel h3{margin:12px 0 9px;font-size:18px}
.v15-now{padding:14px;border-radius:12px;background:#18392f;border:1px solid #327e68;display:flex;flex-direction:column;gap:5px}
.v15-now small{color:#9fdcc8;font-size:10px;font-weight:800;letter-spacing:.08em}.v15-now strong{font-size:21px;color:#eafff7}
.v15-now span{font-size:12px;color:#b2dacb}
.v15-list{display:flex;flex-direction:column;gap:10px;margin-top:16px}.v15-list>strong{font-size:12px}
.v15-list-row{background:#19283b;border:1px solid #31445a;padding:10px;border-radius:9px;display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center}
.v15-list-row>span{font-size:12px}.v15-inline{display:flex;align-items:center;flex-wrap:wrap;gap:6px;max-width:100%}.v15-inline input{width:150px;max-width:100%;font-size:16px}
.v15-hero{margin:0 0 15px;padding:14px;background:#18382f;border:1px solid #347b67;border-radius:13px;display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.v15-hero span{font-size:10px;letter-spacing:.07em;color:#abdbc9}.v15-hero strong{font-size:18px;color:#eafff7}.v15-hero .small-btn{font-size:12px}
.v15-toolbar{padding:10px 12px;background:#19333e;border-radius:11px;margin-bottom:12px;display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}
.v15-toolbar span{font-size:12px;color:#c7f9df}
`;
document.head.appendChild(v15CSS);
foot=function(){return '<div class="footer-msg">SkillTrack v1.5 · Cicli personalizzabili · Backup completo JSON</div>';};
render();
