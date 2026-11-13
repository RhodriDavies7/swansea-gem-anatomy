import {loadCatalog} from './data.js';
import {desktop,ready,progress,progressError,mountReviews,exportBackup,importBackup} from './review-client.js';
import {reviewKey} from './review-scheduler.js';
import {defaultReviewFilters,reviewPool,dueCards,reviewSession,progressGroups} from './review-logic.js';
import {difficultyChoices} from './difficulty-choices.js';
import {bindProgressKey} from './progress-key.js';
import {enhanceFilters} from './filter-menu.js';
const app=document.querySelector('#review-app');
const e=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replaceAll(String.fromCharCode(34),'&quot;');
let catalog,models=[],filters=defaultReviewFilters(),newLimit=20,run=[],index=0,revealed=false,advanced=false,group='models',tagQuery='',modelQuery='',inputTimer;
const pool=()=>reviewPool(catalog,filters);
const values=key=>[...new Set(catalog.structures.flatMap(s=>s[key]||[]))].sort();
function select(key,label,choices,placeholder='All'){
 const current=key==='mode'?filters.mode:key==='limit'?String(newLimit):key==='group'?group:filters[key]||'';
 return `<label>${e(label)}<select id="review-${key}" data-filter="${key}">${placeholder!==null?`<option value="">${e(placeholder)}</option>`:''}${choices.map(item=>{const [value,name]=Array.isArray(item)?item:[item,item];return `<option value="${e(value)}" ${current===String(value)?'selected':''}>${e(name)}</option>`;}).join('')}</select></label>`;
}
function chips(items,selected,action){return items.map(t=>`<button class="chip" data-action="${action}" data-value="${e(Array.isArray(t)?t[0]:t)}" aria-pressed="${selected.includes(Array.isArray(t)?t[0]:t)}">${e(Array.isArray(t)?t[1]:t)}</button>`).join('');}
function effectControls(key){return `<div class="segments">${['include','exclude'].map(value=>`<button data-action="effect" data-key="${key}" data-value="${value}" aria-pressed="${filters[key]===value}">${value==='include'?'Include selected':'Exclude selected'}</button>`).join('')}</div>`;}
function sectionSelect(){const parts=models.find(m=>m.id===filters.modelId)?.sections;return parts?.length?select('section','Model section',parts.map(p=>p.name),'All sections'):'';}
function advancedFilters(){
 const tags=values('tags').filter(t=>!/^([A-Z]{1,3}\d+(?:[_/]\d+)*)$/i.test(t)&&t.toLowerCase().includes(tagQuery.toLowerCase()));
 const topics=['Identification',...new Set(catalog.structures.flatMap(s=>s.facts.map(f=>f.question)).filter(t=>t!=='Identification'))].sort();
 return `<details class="advanced-options review-advanced" ${advanced?'open':''}><summary>Advanced filters <span>${filters.topics.length+filters.tags.length+filters.models.length} selected</span></summary><section><h2>Question types</h2><p>Include or exclude the questions you want to practise, such as Origin or Insertion.</p>${effectControls('topicEffect')}<div class="chips">${chips(topics,filters.topics,'topic')}</div><h2>Tags</h2>${effectControls('tagEffect')}<input type="search" id="review-tag-search" value="${e(tagQuery)}" placeholder="Find a tag" aria-label="Find a tag"><div class="chips bounded-chips">${chips(tags,filters.tags,'tag')}</div><h2>Multiple models</h2><p>Choose several models, or exclude ones you have not studied.</p>${effectControls('modelEffect')}<input type="search" id="review-model-search" value="${e(modelQuery)}" placeholder="Find a model" aria-label="Find models"><div class="chips bounded-chips">${chips(models.filter(m=>m.name.toLowerCase().includes(modelQuery.toLowerCase())).map(m=>[m.id,m.name]),filters.models,'model')}</div></section></details>`;
}
function report(cards){
 const groups=progressGroups(cards,catalog,models,progress,group);
 return `<section class="panel progress-report"><div class="report-heading"><div><h2>Your progress</h2><p>Latest rating Good or Easy, out of all cards in the filtered set. This shows recall, not permanent mastery.</p></div>${select('group','Group by',[['models','Model'],['systems','System'],['regions','Region']],null)}</div><div class="progress-groups">${groups.map(row=>`<article class="progress-group"><div><strong>${e(row.name)}</strong><b>${row.percent}%</b></div><progress value="${row.confident}" max="${row.total}" aria-label="${e(row.name)}: ${row.confident} of ${row.total} cards last rated Good or Easy"></progress><p>${row.good} Good · ${row.easy} Easy · ${row.again+row.hard} Again/Hard · ${row.new} new <span>${row.due} due</span></p></article>`).join('')||'<p>No cards match these filters.</p>'}</div><p class="review-note">Shared knowledge counts once within each group. Images count toward the model they belong to. A shared fact can contribute to more than one model, system or region.</p></section>`;
}
function dashboard(message=''){
 run=[];const focus=document.activeElement,focusId=focus?.id,start=focus?.selectionStart,end=focus?.selectionEnd;
 const cards=pool(),due=dueCards(cards,progress),old=due.filter(c=>progress.records[reviewKey(c)]),fresh=due.length-old.length;
 const today=new Date().toLocaleDateString(),done=progress.history.filter(h=>new Date(h.at).toLocaleDateString()===today).length;
 const latest=new Map();for(const h of progress.history)latest.set(h.key,h.rating);const confident=cards.filter(c=>latest.get(reviewKey(c))>=3).length;
 const next=cards.map(c=>Date.parse(progress.records[reviewKey(c)]?.due)).filter(t=>t>Date.now()).sort((a,b)=>a-b)[0];
 app.innerHTML=`<section class="review-dashboard"><div class="eyebrow">Your study schedule</div><h1>Review & progress</h1><p>Choose your anatomy and work through the cards ready for review.</p><div class="review-stats"><div><strong>${old.length}</strong><span>Due now</span></div><div><strong>${fresh}</strong><span>New in this set</span></div><div><strong>${cards.length?Math.round(confident*100/cards.length):0}%</strong><span>Latest rating Good/Easy</span></div><div><strong>${done}</strong><span>Ratings today · all cards</span></div></div><section class="knowledge-filters" aria-label="Review filters"><label class="knowledge-search">Search anatomy<input type="search" id="review-query" value="${e(filters.query)}" placeholder="Structure, label or fact…"></label><div class="facet-grid review-facets">${select('mode','Cards',[['combined','Marked images + knowledge'],['images','Marked images'],['knowledge','Knowledge questions']],null)}${select('modelId','Model',models.map(m=>[m.id,m.name]),'All models')}${sectionSelect()}${difficultyChoices(filters.difficulty)}${select('year','Learning-outcome year',['Year 1','Year 2','Year not mapped'])}${select('types','Structure type',values('types'))}${select('systems','System',values('systems'))}${select('regions','Region',values('regions'))}${select('organs','Organ collection',values('organs'))}${select('limit','New cards per session',[10,20,50].map(n=>[String(n),String(n)]),null)}</div><button class="text-button" data-action="clear">Clear filters</button>${advancedFilters()}</section><div class="start-row"><div><strong>${cards.length} cards match · ${old.length} due · ${fresh} new</strong><p>All due cards, plus up to ${newLimit} new cards.${next?' Next review: '+e(new Date(next).toLocaleString())+'.':''}</p></div><button class="primary" data-action="start" ${due.length&&!progressError?'':'disabled'}>Review ${old.length+Math.min(fresh,newLimit)} cards</button></div>${report(cards)}<section class="panel progress-backup"><h2>Progress stays on this computer</h2><p>Updates replace the app, not your progress. Export a backup to keep a separate copy or move to another computer.</p><div><button class="secondary" data-action="export">Export progress</button><button class="secondary" data-action="import">Import backup</button></div><p class="review-save" role="status">${e(progressError||message)}</p></section></section>`;
 enhanceFilters(app);
 if(focusId){const target=document.getElementById(focusId);if(target&&target.type==='search'){target.focus({preventScroll:true});if(start!==null)target.setSelectionRange(start,end);}}
}
function draw(){
 const c=run[index];if(!c){dashboard('Session complete. Your ratings are saved.');return;}
 const im=c.image;
 const picture=im?`<figure class="quiz-figure"><div class="marked-image"><img src="./${e(revealed&&im.answerSrc?im.answerSrc:im.quizSrc)}" alt="${e(revealed?im.alt:im.quizAlt)}">${im.quizMarker&&!(revealed&&im.answerSrc)?`<span class="image-marker" style="left:${im.quizMarker.x*100}%;top:${im.quizMarker.y*100}%" aria-hidden="true">?</span>`:''}</div></figure>`:`<h1>${e(c.name)}</h1>`;
 app.innerHTML=`<section class="session"><div class="session-top"><button class="text-button" data-action="end">← End session</button><span>${index+1} / ${run.length}</span></div><progress value="${index}" max="${run.length}" aria-label="Session progress"></progress><article class="flashcard" tabindex="-1"><div class="card-meta"><span>${c.identification?'Image identification':'Knowledge'}</span><span>${e(c.question)}</span></div>${picture}<h2>${e(c.question)}</h2>${revealed?`<div class="answer" role="status">${e(c.answer)}</div>`:'<button class="primary reveal" data-action="reveal">Reveal answer</button>'}</article></section>`;
 mountReviews(app,{card:c,onNext:()=>{index++;revealed=false;draw();}});app.querySelector('.flashcard')?.focus({preventScroll:true});
}
app.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action]'),action=button?.dataset.action;if(!button||button.disabled)return;
 if(action==='start'){clearTimeout(inputTimer);run=reviewSession(pool(),progress,{newLimit});index=0;revealed=false;draw();return;}
 if(action==='end'){dashboard();return;}
 if(action==='reveal'){revealed=true;draw();requestAnimationFrame(()=>(app.querySelector('.review-grades')||app.querySelector('.answer'))?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'}));return;}
 if(action==='clear'){filters=defaultReviewFilters();tagQuery='';modelQuery='';dashboard();return;}
 if(action==='effect'){filters[button.dataset.key]=button.dataset.value;dashboard();return;}
 if(['topic','tag','model'].includes(action)){
  const key={topic:'topics',tag:'tags',model:'models'}[action],value=button.dataset.value;
  filters[key]=filters[key].includes(value)?filters[key].filter(v=>v!==value):[...filters[key],value];
  if(action==='model'){filters.modelId='';filters.section='';}dashboard();return;
 }
 if(action==='export'||action==='import'){
  try{const changed=await (action==='export'?exportBackup():importBackup());dashboard(changed?(action==='export'?'Backup exported.':'Backup merged. Newer ratings were kept.'):'Cancelled.');}catch(error){dashboard('Could not '+action+' progress. '+error.message);}
 }
});
app.addEventListener('change',event=>{
 const el=event.target;
 if(el.dataset.difficulty){const value=el.dataset.difficulty;filters.difficulty=el.checked?[...filters.difficulty,value]:filters.difficulty.filter(v=>v!==value);dashboard();return;}
 if(!el.id.startsWith('review-'))return;const key=el.id.slice(7);
 if(key==='limit')newLimit=Number(el.value);else if(key==='group')group=el.value;else if(key in filters){filters[key]=el.value;if(key==='modelId'){filters.models=[];filters.section='';}}
 else return;dashboard();
});
app.addEventListener('input',event=>{const el=event.target;if(el.id==='review-query')filters.query=el.value;else if(el.id==='review-tag-search')tagQuery=el.value;else if(el.id==='review-model-search')modelQuery=el.value;else return;clearTimeout(inputTimer);inputTimer=setTimeout(()=>{if(!run.length)dashboard();},250);});
app.addEventListener('toggle',event=>{if(event.target.matches('.review-advanced'))advanced=event.target.open;},true);
bindProgressKey(()=>run.length>0,()=>{if(!revealed){revealed=true;draw();}});
if(!desktop)app.innerHTML='<section class="review-dashboard"><h1>Review on your computer</h1><p>Saved progress and spaced repetition are available in the desktop app. The website offers fresh revision runs.</p><a class="icon-link" href="https://github.com/RhodriDavies7/swansea-gem-anatomy/releases/latest">Download the desktop app ↗</a></section>';
else{await ready;try{catalog=await loadCatalog();models=await fetch('./data/models.json').then(r=>r.json());dashboard();}catch(error){app.innerHTML='<p role="alert">Could not load review data: '+e(error.message)+'</p>';}}
setInterval(()=>{if(desktop&&catalog&&!run.length&&!app.querySelector('.filter-trigger[aria-expanded="true"]')&&!app.contains(document.activeElement))dashboard();},30000);
