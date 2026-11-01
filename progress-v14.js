/* SkillTrack 1.4 — confronto settimanale compatto + export sintetico per coach.
   Nessuna modifica ai dati salvati. Continua a supportare la scelta manuale di W/M. */
'use strict';

function v14WeekSessions(day,mi,w) { return sessionsOfWeek(day.id,mi,w); }
function v14Unit(u) { return u==='seconds' ? '"' : u==='reps' ? '' : u==='combo' ? ' combo' : ' '+(u||''); }
function v14Names(entries) { return [...new Set(entries.map(e=>e.exerciseName||'Esercizio'))].join(' / '); }
function v14Grouped(entries) {
  const groups=[];
  for(const e of entries){
    const key=[e.exerciseName||'',e.unit,e.progression||'',e.assistance||'',e.loadKg||0].join('|');
    let g=groups.find(x=>x.key===key);
    if(!g){g={key,e,entries:[]};groups.push(g);}
    g.entries.push(e);
  }
  return groups.map(g=>{
    const vals=[];
    for(const e of g.entries){
      let x=vals.find(k=>k.value===e.value);
      if(!x){x={value:e.value,count:0};vals.push(x);}
      x.count++;
    }
    const total=g.entries.reduce((v,e)=>v+nval(e.value),0);
    const meta=[g.e.progression||'',g.e.assistance?'loop '+g.e.assistance:'',nval(g.e.loadKg)?((g.e.loadKg>0?'+':'')+fmt(g.e.loadKg,1)+'kg'):''].filter(Boolean).join(', ');
    const name=g.e.exerciseName||'Esercizio';
    const pattern=vals.map(x=>`${x.count}x${fmt(x.value,1)}${v14Unit(g.e.unit)}`).join('/');
    return {name, pattern, total, unit:g.e.unit, meta};
  });
}
function v14SideInfo(sessions,side){
  const entries=sessions.flatMap(s=>validEntries(s,side));
  const units=[...new Set(entries.map(e=>e.unit))];
  const total=entries.reduce((n,e)=>n+nval(e.value),0);
  return {entries,sets:entries.length,units,total,groups:v14Grouped(entries)};
}
function v14Brief(info){
  if(!info.sets)return '—';
  const desc=info.groups.map(g=>{
    const suffix=g.meta?` [${g.meta}]`:'';
    return `${fmt(g.total,1)}${v14Unit(g.unit)} ${g.name} (${g.pattern}${suffix})`;
  });
  return desc.join(' ; ');
}
function v14CoachWeekLine(day,mi,w){
  const sessions=v14WeekSessions(day,mi,w);
  const tag=`W${w+1} - `;
  if(!sessions.length)return tag+'—';
  if(day.type==='volume'){
    const p=v14Brief(v14SideInfo(sessions,'push'));
    const q=v14Brief(v14SideInfo(sessions,'pull'));
    return tag+p+' + '+q+(sessions.length>1?` (${sessions.length} sedute)`:'');
  }
  const sections=[];
  for(const s of sessions){
    const blocks=(s.blocks||[]).map(b=>{
      const a=(s.blockLog?.[b.id]||[]).filter(x=>x&&x.valid!==false);
      const patterns=v14Grouped(a).map(g=>g.pattern).join('/');
      return `${b.name} ${a.length}${patterns?' ('+patterns+')':''}`;
    });
    const rounds=Object.values(s.emomLog||{}).filter(x=>x&&x.valid).length;
    sections.push(blocks.join(' + ')+` + ${s.emom?.name||'EMOM'} ${rounds}/${s.emom?.minutes||10}`);
  }
  return tag+sections.join(' ; ');
}
function v14MonthText(day,mi,withTitle=true){
  return [...(withTitle?[`${day.name.toUpperCase()} — MESE ${mi+1}`]:[]),
    ...Array.from({length:4},(_,w)=>v14CoachWeekLine(day,mi,w))].join('\n');
}
// Solo le righe W1–W4, senza singole serie, note, vecchio PDF o righe tecniche.
buildTextDiary=function(){
  const lines=[];
  for(const day of data.days){
    const sess=allDaySessions(day.id);
    if(!sess.length)continue;
    const max=Math.max(...sess.map(sessionMonthIndex));
    for(let mi=0;mi<=max;mi++){
      if(!monthSessions(day.id,mi).length)continue;
      if(lines.length)lines.push('');
      lines.push(v14MonthText(day,mi));
    }
  }
  return lines.length?lines.join('\n'):'Nessun allenamento registrato.';
};

function v14MetricString(info){
  if(!info.sets)return {bold:'—',sub:'Nessun allenamento'};
  const pat=info.groups.map(g=>g.pattern).join(' / ');
  const unit=info.units.length===1?info.units[0]:null;
  const amount=unit==='seconds'?'secondi':unit==='reps'?'ripetizioni':unit==='combo'?'combo':'unità miste';
  return {bold:pat,sub:`${info.sets} serie · ${unit?fmt(info.total,1)+' '+amount:'unità miste'}`};
}
function v14Compare(day,mi,w,side){
  const current=v14WeekSessions(day,mi,w);
  const previous=w>0?v14WeekSessions(day,mi,w-1):[];
  if(!current.length||!previous.length)return null;
  const a=v14SideInfo(previous,side),b=v14SideInfo(current,side);
  if(!a.sets||!b.sets)return null;
  const matched=comparableWeeks(previous,current,side);
  const sameUnit=a.units.length===1&&b.units.length===1&&a.units[0]===b.units[0];
  return {series:pct(a.sets,b.sets),work:sameUnit?pct(a.total,b.total):null,homogeneous:matched,multiple:previous.length>1||current.length>1};
}
function v14Pct(v){return v===null?'—':`${v>0?'+':''}${fmt(v,1)}%`;}
function v14SideCell(day,mi,w,side){
  const sessions=v14WeekSessions(day,mi,w),info=v14SideInfo(sessions,side),m=v14MetricString(info),diff=v14Compare(day,mi,w,side);
  const name=info.groups.length?[...new Set(info.groups.map(g=>g.name))].join(' / '):'';
  const complexity=info.groups.map(g=>g.meta).filter(Boolean).join(' | ');
  const delta=diff?`<span class="v14-delta ${diff.series>=0?'up':'down'}">${v14Pct(diff.series)} serie</span>${diff.work!==null?`<span class="v14-delta ${diff.work>=0?'up':'down'}">${v14Pct(diff.work)} lavoro</span>`:''}`:'';
  const note=diff&&!diff.homogeneous?'<span class="v14-caution">Confronto non omogeneo*</span>':'';
  return `<div class="v14-cell"><div class="v14-work">${esc(m.bold)}</div><div class="v14-sub">${esc(m.sub)}</div>${name?`<div class="v14-exercise">${esc(name)}</div>`:''}${complexity?`<div class="v14-extra">${esc(complexity)}</div>`:''}${delta?`<div class="v14-deltas">${delta}</div>`:''}${note}</div>`;
}
function v14IntensityCell(sessions,side){
  if(!sessions.length)return '<div class="v14-cell"><span class="v14-sub">—</span></div>';
  const words=side==='push'?['spinta','push']:['tirata','pull'];
  const groups=[];
  for(const s of sessions){
    for(const b of (s.blocks||[])){
      if(!words.some(x=>b.name.toLowerCase().includes(x)))continue;
      const a=(s.blockLog?.[b.id]||[]).filter(e=>e&&e.valid!==false);
      const pattern=v14Grouped(a).map(g=>g.pattern).join('/');
      groups.push(`${b.name}: ${a.length}/${b.count}${pattern?' ('+pattern+')':''}`);
    }
  }
  return `<div class="v14-cell"><div class="v14-int-result">${groups.length?groups.map(g=>`<div>${esc(g)}</div>`).join(''):'—'}</div></div>`;
}
function v14WeekTable(day,mi){
  const vol=day.type==='volume';
  const cols=vol?['SPINTA','TIRATA']:['BLOCCHI SPINTA','BLOCCHI TIRATA'];
  return `<div class="v14-comparison" aria-label="Confronto settimanale delle progressioni">
    <div class="v14-heading"><div>WEEK</div><div>${cols[0]}</div><div>${cols[1]}</div></div>
    ${Array.from({length:4},(_,w)=>{
      const sessions=v14WeekSessions(day,mi,w);
      return `<div class="v14-week-row ${sessions.length?'has-session':''}"><div class="v14-week-tag"><strong>W${w+1}</strong><span>${sessions.length>1?sessions.length+' sedute':sessions.length?'1 seduta':'—'}</span></div>
        ${vol?v14SideCell(day,mi,w,'push')+v14SideCell(day,mi,w,'pull'):v14IntensityCell(sessions,'push')+v14IntensityCell(sessions,'pull')}
        </div>`;
    }).join('')}</div>
    <p class="footnote">*Le percentuali indicano variazioni grezze di serie e lavoro, non necessariamente di forza. Se cambiano esercizio, target, loop, progressione, durata o numero di sedute, il confronto è segnalato come non omogeneo. Le settimane senza allenamenti non contano come 0.</p>`;
}
function v14Controls(day,mi,maxMonth){
  return `<div class="panel v14-controls"><div class="field"><label>Giornata da confrontare</label><select id="stats-day">${data.days.map(d=>`<option value="${esc(d.id)}" ${d.id===day.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div>
    <div class="field top-gap"><label>Mese (4 settimane)</label><select id="stats-month">${Array.from({length:maxMonth+1},(_,k)=>`<option value="${k}" ${k===mi?'selected':''}>Mese ${k+1}</option>`).join('')}</select></div>
    <div class="row wrap top-gap" style="justify-content:space-between"><button class="btn sm secondary" data-action="month-prev" ${mi===0?'disabled':''}>← Precedente</button><strong>Mese ${mi+1} · W1–W4</strong><button class="btn sm secondary" data-action="month-next" ${mi===maxMonth?'disabled':''}>Successivo →</button></div>
    <div class="v14-actions"><button class="btn" data-action="v14-copy-coach" data-day="${esc(day.id)}" data-month="${mi}">Copia per coach</button><button class="btn secondary" data-action="v14-download-coach" data-day="${esc(day.id)}" data-month="${mi}">Scarica TXT mese</button><button class="btn secondary" data-action="v14-share-coach" data-day="${esc(day.id)}" data-month="${mi}">Condividi</button></div></div>`;
}
function v14MaxMonth(day){
  const arr=allDaySessions(day.id);
  return Math.min(150,Math.max(currentMonthIndex(),arr.length?Math.max(...arr.map(sessionMonthIndex)):0,0));
}
const v14PriorStatsView=statsView;
statsView=function(){
  const day=data.days.find(d=>d.id===statDayId)||data.days[0];
  if(!day)return '<div class="no-data">Aggiungi una giornata alla scheda.</div>';
  const maxMonth=v14MaxMonth(day);
  if(statMonthIndex===null)statMonthIndex=maxMonth;
  statMonthIndex=clamp(statMonthIndex,0,maxMonth);
  const mi=statMonthIndex;
  const weeks=Array.from({length:4},(_,w)=>v14WeekSessions(day,mi,w));
  const sessions=monthSessions(day.id,mi);
  return `<div class="page-head"><div class="eyebrow">Progressioni</div><h2>W1 → W4 a confronto</h2><p>Serie, ripetizioni e variazioni settimana dopo settimana, senza aprire ogni allenamento.</p></div>
    ${v14Controls(day,mi,maxMonth)}
    <div class="panel v14-summary"><span><strong>${weeks.filter(x=>x.length).length}/4</strong> settimane allenate</span><span><strong>${sessions.length}</strong> sedute</span><span><strong>${day.type==='volume'?sessions.reduce((n,s)=>n+summarize(s).sets,0):sessions.reduce((n,s)=>n+Object.values(s.blockLog||{}).reduce((m,b)=>m+b.filter(e=>e&&e.valid!==false).length,0),0)}</strong> serie valide</span></div>
    <div class="section-title"><h3>Progressi · Mese ${mi+1}</h3><span>W1–W4</span></div>${v14WeekTable(day,mi)}
    <div class="panel top-gap"><h3>Testo da inviare al coach</h3><pre class="v14-coach-preview">${esc(v14MonthText(day,mi))}</pre><div class="v14-actions"><button class="btn" data-action="v14-copy-coach" data-day="${esc(day.id)}" data-month="${mi}">Copia queste 4 righe</button><button class="btn secondary" data-action="v14-download-coach" data-day="${esc(day.id)}" data-month="${mi}">Scarica TXT</button></div></div>
    <details class="panel top-gap"><summary>Apri dettagli delle singole settimane</summary><div class="stack top-gap">${weeks.map((_,w)=>weekCard(day,mi,w)).join('')}</div></details>
    <div class="panel top-gap"><h3>Confronto con il mese precedente</h3>${monthComparison(day,mi)}</div>
    <div class="section-title"><h3>Altri mesi</h3></div>${monthlyOverview(day,maxMonth)}`;
};

// Lo storico mostra il confronto accostato già nella prima schermata.
const v14PriorHistoryView=historyView;
historyView=function(){
  const original=v14PriorHistoryView();
  if(selectedHistoryId||!data.days.length)return original;
  const day=data.days.find(d=>d.id===statDayId)||data.days.find(d=>d.type==='volume')||data.days[0];
  const maxMonth=v14MaxMonth(day);
  const mi=statMonthIndex===null?maxMonth:clamp(statMonthIndex,0,maxMonth);
  const selector=`<div class="field"><label>Confronto rapido · giornata</label><select id="v14-history-day">${data.days.map(d=>`<option value="${esc(d.id)}" ${d.id===day.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div>
    <div class="field top-gap"><label>Mese</label><select id="v14-history-month">${Array.from({length:maxMonth+1},(_,k)=>`<option value="${k}" ${k===mi?'selected':''}>Mese ${k+1}</option>`).join('')}</select></div>`;
  const block=`<div class="panel"><div class="section-title"><h3>Confronto W1–W4</h3><span>Riepilogo rapido</span></div>${selector}<div class="v14-actions"><button class="btn" data-action="goto-progress-day" data-day="${esc(day.id)}">Analisi completa</button><button class="btn secondary" data-action="v14-copy-coach" data-day="${esc(day.id)}" data-month="${mi}">Copia per coach</button></div></div>${v14WeekTable(day,mi)}`;
  return original.replace('<div class="section-title"><h3>',block+'<div class="section-title"><h3>');
};

const v14PriorSettings=settings;
settings=function(){
  return v14PriorSettings()
    .replace('Diario testuale per Note</h3>','TXT sintetico per il coach</h3>')
    .replace(/Esporta uno storico in formato leggibile e modificabile:[\s\S]*?Le modifiche fatte in Note non vengono sincronizzate nell'app\./,
      'Il TXT contiene solo le righe W1, W2, W3 e W4 per ogni giornata e mese. Nessun dettaglio delle singole serie; modificabile in Note. Il backup JSON resta necessario per ripristinare i dati.')
    .replace('⬇ Scarica TXT','⬇ Scarica TXT completo');
};
function v14DownloadText(text,name){
  const url=URL.createObjectURL(new Blob(['\ufeff',text],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);
}
function v14GetCoachText(button){
  const day=data.days.find(d=>d.id===button.dataset.day);
  if(!day)return null;
  const mi=Number(button.dataset.month);
  return {day,mi,text:v14MonthText(day,mi)};
}
async function v14Copy(text){
  try{
    if(!navigator.clipboard||!window.isSecureContext)throw Error('Clipboard non disponibile');
    await navigator.clipboard.writeText(text);
    toast('Copiato: puoi incollare il riepilogo al coach');
  }catch(err){
    currentModal={type:'coach-copy'};
    modal(`<h2>Copia riepilogo</h2><p>Seleziona tutto e usa Copia.</p><textarea id="v14-copy-field" class="diary-text" readonly>${esc(text)}</textarea><div class="buttons"><button class="btn secondary" data-action="close-modal">Chiudi</button></div>`);
    const f=document.getElementById('v14-copy-field');if(f){f.focus();f.select();}
  }
}
async function v14Share(item){
  if(!navigator.share){await v14Copy(item.text);return;}
  const name=`SkillTrack_${item.day.name.replace(/[^a-z0-9]+/gi,'_')}_Mese${item.mi+1}.txt`;
  const file=new File([item.text],name,{type:'text/plain'});
  try{
    if(navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:'Progressi SkillTrack'});
    else await navigator.share({text:item.text,title:`${item.day.name} Mese ${item.mi+1}`});
  }catch(e){if(e.name!=='AbortError')toast('Non condivisibile: usa Copia per coach');}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  if(!['v14-copy-coach','v14-download-coach','v14-share-coach'].includes(b.dataset.action))return;
  e.stopImmediatePropagation();
  const item=v14GetCoachText(b);if(!item)return;
  if(b.dataset.action==='v14-copy-coach')v14Copy(item.text);
  if(b.dataset.action==='v14-download-coach'){
    v14DownloadText(item.text,`SkillTrack_${item.day.name.replace(/[^a-z0-9]+/gi,'_')}_Mese${item.mi+1}.txt`);
    toast('TXT sintetico scaricato');
  }
  if(b.dataset.action==='v14-share-coach')v14Share(item);
},true);
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.id==='v14-history-day'){statDayId=el.value;statMonthIndex=null;render();}
  if(el.id==='v14-history-month'){statMonthIndex=Number(el.value);render();}
});
const v14Styles=document.createElement('style');
v14Styles.textContent=`
.v14-comparison{border:1px solid #34465d;border-radius:15px;overflow:hidden;background:#162439}
.v14-heading,.v14-week-row{display:grid;grid-template-columns:48px minmax(0,1fr) minmax(0,1fr)}
.v14-heading{background:#233449;font-weight:800;letter-spacing:.06em;font-size:10px;color:#b5cce1}
.v14-heading>div{padding:12px 7px;border-right:1px solid #314158}
.v14-week-row{border-top:1px solid #314158}
.v14-week-row.has-session{background:#182b3c}
.v14-week-tag{border-right:1px solid #314158;padding:13px 5px;display:flex;flex-direction:column;gap:4px;align-items:center}
.v14-week-tag strong{color:#86ead2;font-size:18px}
.v14-week-tag span{font-size:9px;color:#b9cadd;text-align:center}
.v14-cell{min-width:0;padding:11px 8px 10px;overflow-wrap:anywhere;border-right:1px solid #314158}
.v14-cell:last-child{border-right:0}
.v14-work{font-weight:800;font-size:15px;color:#f4f7fc;line-height:1.35}
.v14-sub{font-size:11px;color:#d4e1eb;margin-top:4px}
.v14-exercise{font-size:11px;color:#a2b9cd;margin-top:3px}
.v14-extra{font-size:10px;color:#9eafc4;margin-top:3px}
.v14-deltas{display:flex;flex-direction:column;gap:4px;margin-top:6px}
.v14-delta{font-size:11px;font-weight:750;white-space:normal}
.v14-delta.up{color:#7be5c5}.v14-delta.down{color:#ff999b}
.v14-caution{font-size:10px;color:#f4c98f;display:block;margin-top:5px}
.v14-int-result{font-size:12px;color:#d6e8f3;line-height:1.5}
.v14-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}
.v14-actions .btn{flex:1 1 125px;min-width:0;white-space:normal}
.v14-coach-preview{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.6;letter-spacing:0;background:#142133;color:#e2eff8;border:1px solid #2c4358;padding:13px;border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.v14-summary{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:11px;color:#a9bdcf}
.v14-summary strong{font-size:15px;color:#eff6fb}
@media(max-width:370px){.v14-heading,.v14-week-row{grid-template-columns:39px minmax(0,1fr) minmax(0,1fr)}.v14-cell{padding:9px 5px}.v14-work{font-size:13px}.v14-delta{font-size:10px}.v14-sub{font-size:10px}}
`;
document.head.appendChild(v14Styles);
foot=function(){return '<div class="footer-msg">SkillTrack v1.4 · Riepilogo coach TXT · Backup completo JSON</div>';};
render();
