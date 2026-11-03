/* SkillTrack personale v1.6 — intensità realmente eseguita e testo coach essenziale.
   Caricare dopo v13, v14, v15. Lo schema JSON v1 e la chiave locale rimangono invariati.
   Nuovi campi facoltativi: blockLog[].exerciseName, session.coachNotes,
   session.emomPerformedText, session.coachTextOverride. */
'use strict';

function v16FindSession(id) {
  return data.activeSession?.id === id ? data.activeSession : data.history.find(s => s.id === id);
}
function v16Compact(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
function v16Exercise(entry, block) { return v16Compact(entry.exerciseName || block.name || 'Esercizio'); }
function v16CountText(e) {
  const val = Number(e.value || 0);
  if (!val || val === 1) return '';
  if (e.unit === 'seconds') return `${fmt(val,1)}\u2033 `;
  if (e.unit === 'combo') return `${fmt(val,1)} combo `;
  return `${fmt(val,1)}rep `;
}
function v16SetBody(e, b) {
  let txt = v16CountText(e) + v16Exercise(e,b);
  if (e.assistance) txt += ` - ${v16Compact(e.assistance)}`;
  if (e.progression && !txt.toLowerCase().includes(v16Compact(e.progression).toLowerCase())) txt += ` (${v16Compact(e.progression)})`;
  if (nval(e.loadKg)) txt += ` ${nval(e.loadKg)>0?'+':''}${fmt(e.loadKg,1)}kg`;
  if (e.quality === 'parziale' || e.quality === 'non valida' || e.valid === false) txt += ' [esito: '+(e.quality || 'non valida')+']';
  if (v16Compact(e.notes)) txt += ` [${v16Compact(e.notes)}]`;
  return txt;
}
function v16BlockSummary(s,b) {
  const entries = (s.blockLog?.[b.id] || []).filter(Boolean);
  if (!entries.length) return [];
  // Gruppi per risultato reale: 2 serie uguali diventano 2x, quelle diverse restano separate.
  // Le note si aggregano soltanto quando identiche, per non perdere informazioni.
  const groups = [];
  for (const e of entries) {
    const body = v16SetBody(e,b);
    const prev = groups.at(-1);
    if (prev?.body === body) prev.count++;
    else groups.push({body,count:1});
  }
  return groups.map(g => `${g.count}x ${g.body}`);
}
function v16EmomDescription(s) {
  if (v16Compact(s.emomPerformedText)) return v16Compact(s.emomPerformedText);
  const valid = Object.values(s.emomLog||{}).filter(x=>x&&x.valid!==false);
  const unique = [...new Set(valid.map(e=>v16Compact(e.notes)).filter(Boolean))];
  return unique.length===1 ? unique[0] : '';
}
function v16EmomSummary(s) {
  const minutes=Number(s.emom?.minutes||10);
  const done=Object.values(s.emomLog||{}).filter(e=>e&&e.valid!==false).length;
  if (!done && !v16EmomDescription(s)) return '';
  const what=v16EmomDescription(s);
  const heading = `EMOM${minutes}\u2019`;
  return what ? `${heading} - ${done}x${what}` : `${heading} - ${done}/${minutes} completati`;
}
function v16AutoBody(s) {
  const out=[];
  for(const b of (s.blocks||[])) out.push(...v16BlockSummary(s,b));
  const emom=v16EmomSummary(s);
  if(emom) out.push(emom);
  if(v16Compact(s.coachNotes)) out.push('Note: '+v16Compact(s.coachNotes));
  // Una nota modificata nello storico non viene persa: non esporta però la nota
  // precompilata originariamente nella scheda.
  if(v16Compact(s.notes) && v16Compact(s.notes)!==v16Compact(s.daySnapshot?.notes)) {
    out.push('Note sessione: '+v16Compact(s.notes));
  }
  return out.join('\n');
}
function v16SessionBody(s) {
  const override=String(s.coachTextOverride||'').trim();
  return override ? override.replace(/^W\d+\s*[-–]\s*/i,'') : v16AutoBody(s);
}
const v16OldCoachWeekLine=v14CoachWeekLine;
v14CoachWeekLine=function(day,mi,w) {
  if(day.type!=='intensity') return v16OldCoachWeekLine(day,mi,w);
  const sessions=v14WeekSessions(day,mi,w);
  if(!sessions.length)return `W${w+1} - —`;
  return sessions.map((s,i)=>{
    const body=v16SessionBody(s)||'nessun risultato registrato';
    return `W${w+1}${sessions.length>1?' ('+(i+1)+'/'+sessions.length+')':''} - ${body}`;
  }).join('\n');
};

// Il riepilogo W1-W4 delle intensità mostra l'esecuzione, non soltanto i blocchi programmati.
v14IntensityCell=function(sessions,side) {
  if(!sessions.length)return '<div class="v14-cell"><span class="v14-sub">—</span></div>';
  const words=side==='push'?['spinta','push']:['tirata','pull'];
  const rows=[];
  for(const s of sessions)for(const b of (s.blocks||[])){
    if(!words.some(x=>String(b.name||'').toLowerCase().includes(x))) continue;
    rows.push(...v16BlockSummary(s,b));
  }
  return `<div class="v14-cell"><div class="v14-int-result">${rows.length?rows.map(v=>`<div>${esc(v)}</div>`).join(''):'—'}</div></div>`;
};

// Ogni serie può essere sostituita da un movimento/una combo differente.
// Salviamo la scelta soltanto nel log: la scheda originale non viene modificata.
const v16OldIntensityDialog=intensityDialog;
intensityDialog=function(s,blockId,index) {
  v16OldIntensityDialog(s,blockId,index);
  const b=(s.blocks||[]).find(x=>x.id===blockId);
  if(!b)return;
  const e=s.blockLog?.[blockId]?.[index];
  const notes=document.getElementById('int-notes');
  if(!notes)return;
  const field=notes.closest('.field');
  const extra=document.createElement('div');
  extra.className='field top-gap';
  extra.innerHTML=`<label for="v16-real-exercise">Esercizio o combo realmente eseguita</label>
    <textarea id="v16-real-exercise" rows="2" placeholder="Es. pu slow, press, neg, iso, lsit, iso, press (full)">${esc(e?.exerciseName??b.name)}</textarea>
    <p class="tip">Scrivi liberamente la sequenza e le abbreviazioni. Cambia solo questa serie, non il programma.</p>`;
  field.parentNode.insertBefore(extra,field);
  const lab=field.querySelector('label');
  if(lab)lab.textContent='Commento da mostrare al coach';
  notes.placeholder='Es. oggi non riuscivo a fare elev maltese, ho fatto solo iso';
};

const v16OldIntensityBlock=intensityBlock;
intensityBlock=function(s,b,i) {
  let html=v16OldIntensityBlock(s,b,i);
  const entries=(s.blockLog?.[b.id]||[]).filter(Boolean);
  if(!entries.length)return html;
  const summary=entries.map(e=>{
    const x=v16Exercise(e,b);
    const notes=v16Compact(e.notes);
    return `<div class="v16-performed"><strong>${esc(x)}</strong>${e.assistance?` <span>· ${esc(e.assistance)}</span>`:''}${notes?`<div class="v16-comment">${esc(notes)}</div>`:''}</div>`;
  }).join('');
  const end=html.lastIndexOf('</div>');
  return end<0 ? html : html.slice(0,end)+`<div class="v16-performed-list"><small>EFFETTIVAMENTE ESEGUITO</small>${summary}</div>`+html.slice(end);
};

function v16Controls(s) {
  return `<div class="panel top-gap v16-panel"><h3>Riepilogo per il coach</h3>
    <p class="tip">Le righe sono generate da ciò che hai registrato. Puoi cambiare anche tutta la descrizione senza toccare la scheda.</p>
    <div class="v16-summary"><pre>${esc(v16SessionBody(s)||'Registra una serie per generare il riepilogo')}</pre></div>
    <div class="v16-buttons"><button class="btn sm secondary" data-action="v16-emom" data-session="${esc(s.id)}">✎ Esercizi EMOM</button>
    <button class="btn sm secondary" data-action="v16-notes" data-session="${esc(s.id)}">✎ Note per coach</button>
    <button class="btn sm" data-action="v16-edit-text" data-session="${esc(s.id)}">✎ Personalizza testo</button></div>
    ${s.coachTextOverride?'<p class="tip">Stai usando un testo personalizzato: le modifiche alle serie non aggiorneranno questa anteprima finché non ripristini il testo automatico.</p>':''}
  </div>`;
}
const v16OldIntensityView=intensityView;
intensityView=function(s) {
  const html=v16OldIntensityView(s);
  if(s.dayType!=='intensity')return html;
  return html.replace(foot(),v16Controls(s)+foot());
};
const v16OldHistoryDetail=historyDetail;
historyDetail=function() {
  const html=v16OldHistoryDetail();
  const s=data.history.find(x=>x.id===selectedHistoryId);
  if(!s||s.dayType!=='intensity')return html;
  let result=html;
  // Nell'archivio rendiamo leggibili i movimenti veramente eseguiti e le note.
  for(const b of (s.blocks||[])){
    for(let i=0;i<(b.count||0);i++){
      const e=s.blockLog?.[b.id]?.[i];
      if(!e)continue;
      const marker=`data-action="edit-intensity-saved" data-session="${esc(s.id)}" data-block="${esc(b.id)}" data-index="${i}"`;
      const pos=result.indexOf(marker);
      if(pos<0)continue;
      const close=result.indexOf('</button>',pos);
      if(close<0)continue;
      const snippet=` <span class="v16-record">${esc(v16Exercise(e,b))}${e.assistance?' · '+esc(e.assistance):''}${e.notes?' · '+esc(v16Compact(e.notes)):''}</span>`;
      result=result.slice(0,close+9)+snippet+result.slice(close+9);
    }
  }
  result=result.replace('<div class="panel-plain top-gap"><label class="label">Note della sessione</label>',v16Controls(s)+'<div class="panel-plain top-gap"><label class="label">Note della sessione</label>');
  return result;
};

function v16ModalEditText(s){
  currentModal={type:'v16-edit-text',sessionId:s.id};
  modal(`<h2>Testo per il coach</h2><p>Una riga per blocco, come nelle tue vecchie note. Il campo è facoltativo: senza testo manuale viene usato il riepilogo automatico.</p>
    <div class="field"><label>Testo della settimana (senza W1 -)</label><textarea id="v16-coach-override" class="v16-editbox" spellcheck="false">${esc(s.coachTextOverride??v16AutoBody(s))}</textarea></div>
    <div class="buttons"><button class="btn secondary" data-action="v16-reset-text">Ripristina automatico</button><button class="btn" data-action="v16-save-text">Salva testo</button></div>`);
}
function v16ModalEmom(s){
  currentModal={type:'v16-edit-emom',sessionId:s.id};
  modal(`<h2>Finale EMOM — esercizi svolti</h2><p>Scrivi la sequenza realmente eseguita per ogni minuto. Il numero di minuti completati viene calcolato dal registro.</p>
    <div class="field"><label for="v16-emom-description">Esercizi / abbreviazioni</label><textarea id="v16-emom-description" placeholder="Es. 2push adv + put, pu">${esc(s.emomPerformedText||'')}</textarea></div>
    <div class="tip top-gap">Esempio: EMOM10’ - 6x2push adv + put, pu</div>
    <div class="buttons"><button class="btn" data-action="v16-save-emom">Salva</button></div>`);
}
function v16ModalNotes(s){
  currentModal={type:'v16-edit-notes',sessionId:s.id};
  modal(`<h2>Nota al coach</h2><p>Questa nota comparirà nel TXT della settimana, senza il dettaglio delle singole serie.</p>
    <div class="field"><label for="v16-coach-notes">Commento libero</label><textarea id="v16-coach-notes" placeholder="Es. oggi ho sostituito gli elevate maltese con solo ISO">${esc(s.coachNotes||'')}</textarea></div>
    <div class="buttons"><button class="btn" data-action="v16-save-notes">Salva nota</button></div>`);
}
function v16AddExtra(s) {
  const b=defaultBlock('Esercizio extra / free',1,'combo');
  b.extra=true;
  s.blocks.push(b);
  save();render();
  intensityDialog(s,b.id,0);
}
// Aggiunta libera per movimenti eseguiti al posto di, o oltre, quelli programmati.
const v16OriginalSessionView=sessionView;
sessionView=function(){
  const html=v16OriginalSessionView();
  const s=data.activeSession;
  if(!s||s.dayType!=='intensity')return html;
  const button=`<div class="v16-extra"><button class="btn secondary full" data-action="v16-add-extra" data-session="${esc(s.id)}">+ Registra esercizio libero / extra</button></div>`;
  return html.replace('<div class="row top-gap"><button class="btn" data-action="finish">',button+'<div class="row top-gap"><button class="btn" data-action="finish">');
};

// Tutte le azioni nuove e il salvataggio intensità sono gestiti prima del router legacy.
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');if(!b)return;
  const action=b.dataset.action;
  if(!action.startsWith('v16-') && action!=='save-intensity')return;
  event.stopImmediatePropagation();
  if(action==='save-intensity'){
    const m=currentModal;
    if(!m||m.type!=='intensity')return;
    const ss=v16FindSession(m.sessionId);
    const bb=ss?.blocks?.find(x=>x.id===m.blockId);
    if(!ss||!bb)return;
    const v=ss.blockLog[m.blockId]||[];
    const quality=document.getElementById('int-quality').value;
    const real=v16Compact(document.getElementById('v16-real-exercise')?.value)||bb.name;
    v[m.index]={id:v[m.index]?.id||uid(),value:clamp(nval(document.getElementById('int-val').value),0,99999),unit:document.getElementById('int-unit').value,
      target:bb.target,exerciseName:real,progression:document.getElementById('int-prog').value,
      assistance:document.getElementById('int-assist').value,loadKg:nval(document.getElementById('int-load').value),
      rpe:document.getElementById('int-rpe').value?clamp(nval(document.getElementById('int-rpe').value),1,10):null,
      quality,valid:quality==='valida',notes:document.getElementById('int-notes').value,
      loggedAt:v[m.index]?.loggedAt||nowISO()};
    ss.blockLog[m.blockId]=v;
    save();closeModal();render();toast('Esercizio realmente eseguito salvato');return;
  }
  const session=v16FindSession(b.dataset.session || currentModal?.sessionId);
  if(!session)return;
  if(action==='v16-add-extra')v16AddExtra(session);
  if(action==='v16-emom')v16ModalEmom(session);
  if(action==='v16-notes')v16ModalNotes(session);
  if(action==='v16-edit-text')v16ModalEditText(session);
  if(action==='v16-save-emom'){
    session.emomPerformedText=document.getElementById('v16-emom-description')?.value.trim()||'';
    save();closeModal();render();toast('Esercizi EMOM salvati');
  }
  if(action==='v16-save-notes'){
    session.coachNotes=document.getElementById('v16-coach-notes')?.value||'';
    save();closeModal();render();toast('Nota al coach salvata');
  }
  if(action==='v16-save-text'){
    session.coachTextOverride=document.getElementById('v16-coach-override')?.value.trim()||'';
    save();closeModal();render();toast('Testo per coach personalizzato');
  }
  if(action==='v16-reset-text'){
    delete session.coachTextOverride;
    save();closeModal();render();toast('Riepilogo automatico ripristinato');
  }
},true);

const v16Style=document.createElement('style');
v16Style.textContent=`
.v16-panel{border-color:#496078}.v16-panel h3{margin:0 0 6px;font-size:16px}
.v16-summary{background:#0d1726;border:1px solid #33485e;border-radius:12px;padding:12px;margin:12px 0}
.v16-summary pre{white-space:pre-wrap;overflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;line-height:1.65;color:#e5efff;margin:0}
.v16-buttons{display:flex;gap:7px;flex-wrap:wrap}.v16-buttons .btn{flex:1 1 140px}
.v16-performed-list{margin-top:11px;border-top:1px solid #34475c;padding-top:10px}
.v16-performed-list small{color:#a9bfd4;font-weight:750;letter-spacing:.06em;font-size:10px}
.v16-performed{padding:6px 0;font-size:12px;overflow-wrap:anywhere}
.v16-performed strong{color:#e7f8f1}.v16-performed span{color:#9accc9}
.v16-comment{color:#edc5a1;margin-top:3px;white-space:pre-wrap}
.v16-record{display:block;color:#adf1df;font-size:12px;padding-top:6px;white-space:pre-wrap}
.v16-editbox{min-height:220px;font-size:16px!important;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
.v16-extra{margin-top:15px}
`;
document.head.appendChild(v16Style);
foot=()=>'<div class="footer-msg">SkillTrack v1.6 · Registro intensità reale · Diario per il coach · Backup JSON</div>';
render();
