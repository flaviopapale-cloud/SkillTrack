/* SkillTrack 1.2 — cicli di 4 settimane, progressi per giornata e TXT diretto.
   Non cambia lo schema dati o la chiave localStorage esistenti. */
'use strict';
let statMonthIndex = null;
const v12OriginalSettings = settings;
const v12OriginalHistoryView = historyView;

function daySerial(date) {
  const d = new Date(date);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
}
function weekMonday(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
function programAnchor() {
  if (data.programStartDate && !isNaN(new Date(data.programStartDate + 'T12:00:00').getTime()))
    return weekMonday(new Date(data.programStartDate + 'T12:00:00'));
  const all = data.history.concat(data.activeSession ? [data.activeSession] : []);
  const starts = all.map(s => new Date(s.startedAt || s.endedAt)).filter(d => !isNaN(d.getTime()));
  return weekMonday(starts.length ? new Date(Math.min(...starts.map(d => d.getTime()))) : new Date());
}
function cycleWeek(iso) {
  return Math.max(0, Math.floor((daySerial(iso) - daySerial(programAnchor())) / 7));
}
function monthIndexFor(iso) { return Math.floor(cycleWeek(iso) / 4); }
function currentMonthIndex() { return monthIndexFor(new Date()); }
function allDaySessions(dayId) {
  return data.history.filter(s => s.dayId === dayId)
    .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}
function monthSessions(dayId, mi) { return allDaySessions(dayId).filter(s => monthIndexFor(s.startedAt) === mi); }
function sessionsOfWeek(dayId, mi, w) {
  return allDaySessions(dayId).filter(s => cycleWeek(s.startedAt) === mi * 4 + w);
}
function rangeWeek(mi, w) {
  const monday = programAnchor();
  const start = new Date(monday);
  start.setDate(monday.getDate() + (mi * 4 + w) * 7);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const f = d => d.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'});
  return `${f(start)}–${f(end)}`;
}
function cleanProgress(e) {
  const p = [e.progression || '', e.assistance ? `loop ${e.assistance}` : '',
    nval(e.loadKg) ? `+${fmt(e.loadKg, 1)} kg` : ''].filter(Boolean);
  return p.length ? ` <span class="muted">(${esc(p.join(' · '))})</span>` : '';
}
function sideSummary(sessions, side) {
  const entries = sessions.flatMap(s => validEntries(s, side));
  const patterns = [];
  for (const e of entries) {
    const key = [e.exerciseName || '', e.unit, e.value, e.progression || '', e.assistance || '', e.loadKg || 0].join('|');
    const item = patterns.find(x => x.key === key);
    if (item) item.count++;
    else patterns.push({ key, count: 1, e });
  }
  const totalReps = entries.filter(e => e.unit === 'reps').reduce((v, e) => v + nval(e.value), 0);
  const totalSeconds = entries.filter(e => e.unit === 'seconds').reduce((v, e) => v + nval(e.value), 0);
  const totalCombos = entries.filter(e => e.unit === 'combo').reduce((v, e) => v + nval(e.value), 0);
  const total = [`${entries.length} serie`];
  if (totalReps) total.push(`${fmt(totalReps, 1)} rip. totali`);
  if (totalSeconds) total.push(`${fmt(totalSeconds, 1)}″ totali`);
  if (totalCombos) total.push(`${fmt(totalCombos, 1)} combo totali`);
  return { entries, sets: entries.length, total: total.join(' · '), patterns,
    compact: patterns.length ? patterns.map(g => `${g.count}×${fmt(g.e.value, 1)}${g.e.unit === 'seconds' ? '″' : g.e.unit === 'combo' ? ' combo' : ' rip.'}`).join(' / ') : '—' };
}
function sideHTML(sessions, side) {
  const r = sideSummary(sessions, side);
  return `<div class="v12-side"><div class="row"><strong>${side === 'push' ? '↗ Spinta' : '↙ Tirata'}</strong><span class="pill grey">${r.sets} serie</span></div>
    ${r.patterns.length ? r.patterns.map(g => `<div class="v12-pattern"><strong>${g.count} serie × ${fmt(g.e.value, 1)} ${unitLabel(g.e.unit)}</strong>${cleanProgress(g.e)}<div class="tip">${esc(g.e.exerciseName || 'Esercizio')}</div></div>`).join('') : '<p class="tip">Nessuna serie valida</p>'}
    <div class="tip">${r.total}</div></div>`;
}
function comparableWeeks(before, after, side) {
  return before.length === 1 && after.length === 1 && comparable(before[0], after[0], side);
}
function weekChange(day, mi, week, side) {
  if (week === 0) return '<span class="muted">Settimana iniziale</span>';
  const before = sessionsOfWeek(day.id, mi, week - 1), after = sessionsOfWeek(day.id, mi, week);
  if (!before.length || !after.length) return '<span class="muted">—</span>';
  const x = sideSummary(before, side).sets, y = sideSummary(after, side).sets;
  return comparableWeeks(before, after, side)
    ? `<span class="${y >= x ? 'pos' : 'neg'}">${pctLabel(x, y)} serie vs W${week}</span>`
    : '<span class="muted">Condizioni diverse: % non confrontabile</span>';
}
function intensityWeekHTML(sessions) {
  return sessions.map(s => {
    const blocks = (s.blocks || []).map(b => {
      const valid = (s.blockLog?.[b.id] || []).filter(x => x && x.valid !== false);
      const results = valid.map(x => `${fmt(x.value, 1)} ${unitLabel(x.unit)}`).join(' / ');
      return `<div class="v12-intensity-row"><strong>${esc(b.name)}</strong><div>${valid.length}/${b.count} serie${results ? ' · ' + esc(results) : ''}</div></div>`;
    }).join('');
    const rounds = Object.values(s.emomLog || {}).filter(Boolean);
    return `<div class="v12-intensity-group"><div class="tip">${esc(localDay(s.startedAt))}</div>${blocks}<div class="v12-intensity-row"><strong>${esc(s.emom?.name || 'Finale')}</strong><div>${rounds.filter(r => r.valid).length}/${s.emom?.minutes || 10} minuti completati</div></div><button class="textbtn" data-action="open-history" data-session="${esc(s.id)}">Apri e modifica sessione →</button></div>`;
  }).join('');
}
function weekCard(day, mi, w) {
  const sessions = sessionsOfWeek(day.id, mi, w);
  const vol = day.type === 'volume';
  return `<div class="panel-plain v12-week"><div class="row v12-week-head"><div><span class="tag">SETTIMANA ${w + 1} <span class="muted">· W globale ${mi * 4 + w + 1}</span></span><div class="tip">${rangeWeek(mi,w)}</div></div><span class="pill ${sessions.length ? 'mint' : 'grey'}">${sessions.length} ${sessions.length === 1 ? 'seduta' : 'sedute'}</span></div>
    ${sessions.length ? (vol ? `<div class="v12-week-grid">${sideHTML(sessions, 'push')}${sideHTML(sessions, 'pull')}</div>
      <div class="v12-changes"><div>Spinta: ${weekChange(day,mi,w,'push')}</div><div>Tirata: ${weekChange(day,mi,w,'pull')}</div></div>` : intensityWeekHTML(sessions)) : '<div class="no-data">Nessuna seduta registrata in questa settimana.</div>'}
    ${sessions.length && vol ? `<div class="v12-links">${sessions.map(s=>`<button class="textbtn" data-action="open-history" data-session="${esc(s.id)}">${esc(localDay(s.startedAt))} · dettaglio serie →</button>`).join('')}</div>` : ''}</div>`;
}
function weekMean(dayId, mi, side) {
  const weeks = Array.from({length:4}, (_,w)=>sessionsOfWeek(dayId, mi, w)).filter(a => a.length);
  if (!weeks.length) return {avg:null, valid:false, activeWeeks:0, sessions:0};
  const counts = weeks.map(a => sideSummary(a, side).sets);
  const all = weeks.flat();
  const onePerWeek = weeks.every(a => a.length === 1);
  const sigs = new Set(all.flatMap(s=>validEntries(s,side).map(signature)));
  const uniformDurations = new Set(all.map(s => s.durationMin || 60)).size === 1;
  return {avg:counts.reduce((a,b)=>a+b,0)/weeks.length,
    valid:onePerWeek && sigs.size===1 && uniformDurations && all.every(s=>validEntries(s,side).length),
    sig:sigs.size===1?[...sigs][0]:null, duration: all[0]?.durationMin || 60,
    activeWeeks: weeks.length, sessions: all.length};
}
function monthComparison(day, mi) {
  if (mi === 0) return '<p class="tip">Questo è il primo mese del programma. Il confronto mensile sarà disponibile dal Mese 2.</p>';
  if (day.type !== 'volume') {
    const older=monthSessions(day.id,mi-1),newer=monthSessions(day.id,mi);
    const count=s=>s.reduce((v,x)=>v+Object.values(x.blockLog||{}).reduce((n,arr)=>n+arr.filter(e=>e&&e.valid!==false).length,0),0);
    return `<div class="tip">Mese ${mi}: ${older.length} sedute, ${count(older)} serie valide · Mese ${mi+1}: ${newer.length} sedute, ${count(newer)} serie valide. Le combo e le progressioni possono essere diverse: non è una percentuale di forza.</div>`;
  }
  return ['push','pull'].map(side=>{
    const a=weekMean(day.id,mi-1,side), b=weekMean(day.id,mi,side);
    const comparableMonth=a.valid && b.valid && a.sig===b.sig && a.duration===b.duration;
    return `<div class="v12-intensity-row"><strong>${side === 'push' ? 'Spinta' : 'Tirata'}</strong><div>M${mi}: ${a.avg===null?'—':fmt(a.avg,1)} → M${mi+1}: ${b.avg===null?'—':fmt(b.avg,1)} serie/settimana allenata
      <br><strong class="${comparableMonth&&b.avg>=a.avg?'pos':''}">${comparableMonth?pctLabel(a.avg,b.avg):'Confronto % non omogeneo'}</strong></div></div>`;
  }).join('') + '<p class="footnote">Medie per settimana in cui ti sei allenato. La % è mostrata solo con una seduta per settimana, stesso esercizio, target, progressione, assistenza e durata in entrambi i mesi.</p>';
}
function monthlyOverview(day, maxMonth) {
  const months=Array.from({length:maxMonth+1},(_,mi)=>{
    const s=monthSessions(day.id,mi), weeks=new Set(s.map(x=>cycleWeek(x.startedAt))).size;
    const value=day.type==='volume'?s.reduce((n,x)=>n+summarize(x).sets,0):s.reduce((n,x)=>n+Object.values(x.blockLog||{}).reduce((m,b)=>m+b.filter(e=>e&&e.valid!==false).length,0),0);
    return `<button class="v12-month-item ${mi===statMonthIndex?'active':''}" data-action="select-progress-month" data-month="${mi}"><strong>Mese ${mi+1}</strong><span>${weeks}/4 sett. · ${s.length} sedute · ${value} serie</span></button>`;
  });
  return `<div class="v12-month-list">${months.join('')}</div>`;
}

statsView = function() {
  const day=data.days.find(d=>d.id===statDayId)||data.days[0];
  if(!day)return '<div class="no-data">Aggiungi prima una giornata nella tua scheda.</div>';
  const all=allDaySessions(day.id);
  const maxRecorded=all.length?Math.max(...all.map(s=>monthIndexFor(s.startedAt))):0;
  const maxMonth=Math.min(150,Math.max(currentMonthIndex(),maxRecorded,0));
  if(statMonthIndex===null)statMonthIndex=maxMonth;
  statMonthIndex=clamp(statMonthIndex,0,maxMonth);
  const mi=statMonthIndex, cur=monthSessions(day.id,mi), prev=mi?monthSessions(day.id,mi-1):[];
  const weeks=Array.from({length:4},(_,w)=>sessionsOfWeek(day.id,mi,w));
  const series=weeks.map((ss,w)=>({lab:'W'+(w+1),val:day.type==='volume'?ss.reduce((n,s)=>n+summarize(s).sets,0):ss.reduce((n,s)=>n+Object.values(s.blockLog||{}).reduce((m,a)=>m+a.filter(e=>e&&e.valid!==false).length,0),0)}));
  const trainedWeeks=weeks.filter(a=>a.length).length;
  return `<div class="page-head"><div class="eyebrow">Diario delle progressioni</div><h2>Progressi settimana per settimana</h2><p>Ogni mese di allenamento comprende 4 settimane, indipendentemente dai mesi del calendario. Lo storico non si cancella mai.</p></div>
    <div class="panel"><div class="field"><label>Giornata da analizzare</label><select id="stats-day">${data.days.map(d=>`<option value="${esc(d.id)}" ${d.id===day.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div>
    <div class="field top-gap"><label>Mese di allenamento (4 settimane)</label><select id="stats-month">${Array.from({length:maxMonth+1},(_,n)=>`<option value="${n}" ${n===mi?'selected':''}>Mese ${n+1} · settimane globali ${n*4+1}–${n*4+4}</option>`).join('')}</select></div>
    <div class="row wrap top-gap"><button class="btn sm secondary" data-action="month-prev" ${mi===0?'disabled':''}>← Mese ${mi}</button><span class="pill mint">Mese ${mi+1}</span><button class="btn sm secondary" data-action="month-next" ${mi===maxMonth?'disabled':''}>Mese ${mi+2} →</button></div>
    <p class="footnote top-gap">Inizio programma: ${esc(programAnchor().toLocaleDateString('it-IT'))}. Settimane di 7 giorni a partire dal lunedì.</p>
    <div class="grid3 top-gap"><div class="stat"><strong>${trainedWeeks}/4</strong><small>Settimane allenate</small></div><div class="stat"><strong>${cur.length}</strong><small>Sedute del mese</small></div><div class="stat"><strong>${series.reduce((n,x)=>n+x.val,0)}</strong><small>Serie valide</small></div></div></div>
    <div class="section-title"><h3>Mese ${mi+1} · W1–W4</h3><span>${cur.length} sedute</span></div>
    <div class="stack">${weeks.map((_,w)=>weekCard(day,mi,w)).join('')}</div>
    <div class="panel top-gap"><div class="section-title"><h3>Andamento nel mese</h3><span>Serie totali per settimana</span></div>${smallChart(series)}<p class="footnote">Il grafico mostra il numero di serie. Per ripetizioni, tenute e varianti consulta le schede delle singole settimane.</p></div>
    <div class="panel top-gap"><h3>Confronto con il mese precedente</h3>${monthComparison(day,mi)}</div>
    <div class="section-title"><h3>Tutti i mesi</h3><span>Seleziona il mese da rivedere</span></div>${monthlyOverview(day,maxMonth)}
    <p class="note top-gap">Quando inizia un nuovo mese, la numerazione riparte da W1 ma tutti i mesi precedenti rimangono consultabili. Le annotazioni W1–W13 del vecchio PDF restano separate perché le abbreviazioni non sono state ancora interpretate.</p>`;
};

settings = function() {
  return v12OriginalSettings().replace(
    '<button class="btn full top-gap" data-action="open-text-diary">✎ Apri diario in testo</button>',
    '<div class="settings-actions top-gap"><button class="btn" data-action="download-text-diary">⬇ Scarica TXT</button><button class="btn secondary" data-action="open-text-diary">Anteprima e copia per Note</button></div>'
  );
};
historyView = function() {
  const html=v12OriginalHistoryView();
  if(selectedHistoryId){const s=data.history.find(x=>x.id===selectedHistoryId);
    return s ? `<button class="btn secondary full" data-action="goto-progress-day" data-day="${esc(s.dayId)}">↗ Progressioni W1–W4 e mesi di ${esc(s.dayName)}</button><div class="top-gap"></div>`+html : html;
  }
  return html.replace('<div class="section-title"><h3>',
    '<button class="btn secondary full" data-action="goto" data-to="stats">↗ Confronta settimane e mesi per giornata</button><div class="section-title"><h3>');
};

buildTextDiary = function() {
  const lines=['SKILLTRACK — DIARIO CALISTHENICS','Profilo: '+(data.profile?.name||'Il mio profilo'),
    'Esportato: '+new Date().toLocaleString('it-IT'),
    'Mese = 4 settimane; ogni mese riparte da W1. Lo storico non si perde.',
    'Formati: 5x8 = 5 serie da 8 rip.; 4x6" = 4 serie da 6 secondi.',
    'TXT modificabile in Note. Per ripristinare SkillTrack serve il backup JSON.',
    '','========================================','PROGRESSIONI SETTIMANALI','========================================'];
  for(const day of data.days){
    lines.push('','=== '+(day.weekday||'Giorno').toUpperCase()+' — '+day.name.toUpperCase()+' ===');
    const sessions=allDaySessions(day.id), max=sessions.length?Math.max(...sessions.map(s=>monthIndexFor(s.startedAt))):0;
    if(!sessions.length)lines.push('(nessuna seduta completata)');
    for(let mi=0;sessions.length&&mi<=max;mi++){
      lines.push('','MESE '+(mi+1)+' (4 settimane)');
      for(let w=0;w<4;w++){
        const week=sessionsOfWeek(day.id,mi,w);
        if(!week.length){lines.push('W'+(w+1)+' - nessuna seduta');continue;}
        week.forEach((s,j)=>{
          const row=s.dayType==='volume'?diaryVolumeLine(s,w+1):diaryIntensityLine(s,w+1);
          lines.push(row+(week.length>1?' [seduta '+(j+1)+'/'+week.length+']':''));
          lines.push(diaryDetails(s),'');
        });
      }
    }
  }
  if(data.activeSession){const s=data.activeSession;
    lines.push('','=== SESSIONE IN CORSO ===',s.dayName||'',
      s.dayType==='volume'?diaryVolumeLine(s,'*'):diaryIntensityLine(s,'*'),diaryDetails(s));}
  lines.push('','========================================','STORICO ORIGINALE — ABBREVIAZIONI DEL PDF','========================================');
  for(const [key,title] of [['volume1','LUNEDÌ VOLUME'],['volume2','GIOVEDÌ VOLUME']]){
    lines.push('',title);(data.legacyNotes?.[key]||[]).forEach(n=>lines.push(n));
  }
  lines.push('','========================================','APPUNTI PERSONALI','========================================',
    data.manualTextNotes||'(nessun appunto)','','FINE DIARIO');
  return lines.join('\n');
};

// Fissa il giorno iniziale del ciclo senza toccare gli allenamenti precedenti.
// Per gli archivi già esistenti lo deduce dalla prima seduta registrata.
function fixedStartFrom(date) {
  const d=weekMonday(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
if(!data.programStartDate && data.history.length){
  data.programStartDate=fixedStartFrom(programAnchor());
  save();
}
const v12OriginalStartSession=startSession;
startSession=function(id){
  const already=!!data.activeSession;
  v12OriginalStartSession(id);
  if(!already && data.activeSession && !data.programStartDate){
    data.programStartDate=fixedStartFrom(new Date(data.activeSession.startedAt));
    save();
  }
};

const styleV12=document.createElement('style');
styleV12.textContent=`.v12-week{padding:15px}.v12-week-head{margin-bottom:13px}.v12-week-grid{display:grid;gap:11px;grid-template-columns:repeat(2,minmax(0,1fr))}.v12-side{padding:12px;border-radius:12px;background:#192a3d;min-width:0}.v12-pattern{margin-top:9px;padding-bottom:8px;border-bottom:1px solid #314458;overflow-wrap:anywhere;font-size:13px}.v12-pattern strong{color:#f4f7fc}.v12-changes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px;color:var(--muted);font-size:12px}.v12-changes .pos{color:var(--mint)}.v12-changes .neg{color:var(--red)}.v12-links{display:flex;flex-wrap:wrap;gap:5px 15px;margin-top:9px}.v12-intensity-group{padding:10px;background:#1b2c3f;border-radius:11px;margin-top:7px}.v12-intensity-row{font-size:13px;padding:7px 0;border-bottom:1px solid #304158;overflow-wrap:anywhere}.v12-intensity-row strong{display:block;margin-bottom:3px}.v12-month-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.v12-month-item{border:1px solid #40516b;color:var(--text);background:#19283b;text-align:left;border-radius:12px;padding:12px;min-width:0;display:grid;gap:5px}.v12-month-item.active{border-color:var(--mint);background:#1a433d}.v12-month-item span{font-size:11px;color:var(--muted)}@media(max-width:380px){.v12-week-grid{grid-template-columns:1fr}.v12-changes{grid-template-columns:1fr}}`;
document.head.appendChild(styleV12);

document.addEventListener('change',e=>{
  if(e.target.id==='stats-month'){statMonthIndex=Number(e.target.value);render();}
});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  if(b.dataset.action==='select-progress-month'||b.dataset.action==='month-prev'||b.dataset.action==='month-next'||b.dataset.action==='goto-progress-day'){
    e.stopImmediatePropagation();
    if(b.dataset.action==='goto-progress-day'){statDayId=b.dataset.day;statMonthIndex=null;selectedHistoryId=null;go('stats');return;}
    if(b.dataset.action==='select-progress-month')statMonthIndex=Number(b.dataset.month);
    else statMonthIndex=Math.max(0,(statMonthIndex??currentMonthIndex())+(b.dataset.action==='month-next'?1:-1));
    render();
  }
},true);
foot = function(){return '<div class="footer-msg">SkillTrack v1.2 · Progressioni per mesi di 4 settimane · Backup in Impostazioni</div>';};
render();
