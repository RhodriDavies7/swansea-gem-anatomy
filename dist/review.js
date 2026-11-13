import {loadCatalog,studyCards} from './data.js';
import {desktop,ready,progress,progressError,reviewCards,mountReviews,exportBackup,importBackup} from './review-client.js';
import {reviewKey} from './review-scheduler.js';
import {bindProgressKey} from './progress-key.js';
import {enhanceFilters} from './filter-menu.js';
const app=document.querySelector('#review-app');
const e=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replaceAll(String.fromCharCode(34),'&quot;');
let catalog,models=[],modelId='',mode='images',newLimit=20,run=[],index=0,revealed=false;
function pool(){
 const structures=catalog.structures.filter(s=>s.kind!=='model-note'&&(!modelId||s.occurrences.some(o=>o.modelId===modelId)));
 if(mode==='knowledge')return studyCards(structures,catalog);
 return structures.flatMap(s=>s.imageIds.map(id=>catalog.imagesById.get(id)).filter(im=>im?.quizReady&&im.quizSrc&&im.quizStructureId===s.id&&(!modelId||im.modelId===modelId)).map(image=>({id:s.id+':'+image.id,structureId:s.id,name:s.name,question:'Identify the marked structure.',answer:s.name,identification:true,image})));
}
function available(){return reviewCards(pool()).sort((a,b)=>{const ar=progress.records[reviewKey(a)],br=progress.records[reviewKey(b)];return ar&&br?Date.parse(ar.due)-Date.parse(br.due):ar?-1:br?1:0;});}
function dashboard(message=''){
 run=[];const cards=pool(),due=available(),reviewed=cards.filter(c=>progress.records[reviewKey(c)]),old=due.filter(c=>progress.records[reviewKey(c)]),fresh=due.length-old.length;
 const today=new Date().toLocaleDateString(),done=progress.history.filter(h=>new Date(h.at).toLocaleDateString()===today).length;
 const next=reviewed.map(c=>Date.parse(progress.records[reviewKey(c)].due)).filter(t=>t>Date.now()).sort((a,b)=>a-b)[0];
 app.innerHTML=`<section class="review-dashboard"><div class="eyebrow">Your study schedule</div><h1>Review & progress</h1><p>Small sessions. A schedule that adapts to your recall.</p><div class="review-stats"><div><strong>${old.length}</strong><span>Due now</span></div><div><strong>${fresh}</strong><span>New cards</span></div><div><strong>${reviewed.length}</strong><span>Started in this set</span></div><div><strong>${done}</strong><span>Ratings today</span></div></div><div class="panel review-settings"><label>Cards<select data-filter="review-mode" id="review-mode"><option value="images" ${mode==='images'?'selected':''}>Marked images</option><option value="knowledge" ${mode==='knowledge'?'selected':''}>Knowledge questions</option></select></label><label>Model<select data-filter="review-model" id="review-model"><option value="">All models</option>${models.map(m=>`<option value="${m.id}" ${modelId===m.id?'selected':''}>${e(m.name)}</option>`).join('')}</select></label><label>New cards per session<select data-filter="review-limit" id="review-limit">${[10,20,50].map(n=>`<option ${n===newLimit?'selected':''}>${n}</option>`).join('')}</select></label></div><button class="primary" data-action="start" ${due.length&&!progressError?'':'disabled'}>Review ${old.length+Math.min(fresh,newLimit)} cards</button><p class="review-note">All due cards, plus up to ${newLimit} new cards. ${next?'Next scheduled review: '+e(new Date(next).toLocaleString())+'.':''}</p><section class="panel progress-backup"><h2>Progress stays on this Mac</h2><p>App updates replace the application, not your progress. Export a backup to keep a separate copy or move to another Mac.</p><div><button class="secondary" data-action="export">Export progress</button><button class="secondary" data-action="import">Import backup</button></div><p class="review-save" role="status">${e(progressError||message)}</p></section></section>`;enhanceFilters(app);
}
function draw(){
 const c=run[index];if(!c){dashboard('Session complete. Your ratings are saved.');return;}
 const im=c.image;
 const picture=im?`<figure class="quiz-figure"><div class="marked-image"><img src="./${e(revealed&&im.answerSrc?im.answerSrc:im.quizSrc)}" alt="${e(revealed?im.alt:im.quizAlt)}">${im.quizMarker&&!(revealed&&im.answerSrc)?`<span class="image-marker" style="left:${im.quizMarker.x*100}%;top:${im.quizMarker.y*100}%" aria-hidden="true">?</span>`:''}</div></figure>`:`<h1>${e(c.name)}</h1>`;
 app.innerHTML=`<section class="session"><div class="session-top"><button class="text-button" data-action="end">← End session</button><span>${index+1} / ${run.length}</span></div><progress value="${index}" max="${run.length}" aria-label="Session progress"></progress><article class="flashcard" tabindex="-1"><div class="card-meta"><span>${c.identification?'Image identification':'Knowledge'}</span><span>${e(c.question)}</span></div>${picture}<h2>${e(c.question)}</h2>${revealed?`<div class="answer" role="status">${e(c.answer)}</div>`:'<button class="primary reveal" data-action="reveal">Reveal answer</button>'}</article></section>`;
 mountReviews(app,{card:c,onNext:()=>{index++;revealed=false;draw();}});app.querySelector('.flashcard')?.focus({preventScroll:true});
}
app.addEventListener('click',async event=>{
 const action=event.target.closest('[data-action]')?.dataset.action;
 if(action==='start'){let fresh=0;run=available().filter(c=>progress.records[reviewKey(c)]||fresh++<newLimit);index=0;revealed=false;draw();}
 if(action==='end')dashboard();
 if(action==='reveal'){revealed=true;draw();requestAnimationFrame(()=>(app.querySelector('.review-grades')||app.querySelector('.answer'))?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'}));}
 if(action==='export'||action==='import'){
  try{const changed=await (action==='export'?exportBackup():importBackup());dashboard(changed?(action==='export'?'Backup exported.':'Backup merged. Newer ratings were kept.'):'Cancelled.');}catch(error){dashboard('Could not '+action+' progress. '+error.message);}
 }
});
app.addEventListener('change',event=>{if(event.target.id==='review-mode')mode=event.target.value;if(event.target.id==='review-model')modelId=event.target.value;if(event.target.id==='review-limit')newLimit=Number(event.target.value);dashboard();});
bindProgressKey(()=>run.length>0,()=>{if(!revealed){revealed=true;draw();}});
if(!desktop)app.innerHTML='<section class="review-dashboard"><h1>Review on your Mac</h1><p>Saved progress and spaced repetition are available in the Mac app. The website offers fresh revision runs.</p><a class="icon-link" href="https://github.com/RhodriDavies7/swansea-gem-anatomy/releases/latest">Download the Mac app ↗</a></section>';
else{await ready;try{catalog=await loadCatalog();models=await fetch('./data/models.json').then(r=>r.json());dashboard();}catch(error){app.innerHTML='<p role="alert">Could not load review data: '+e(error.message)+'</p>';}}

setInterval(()=>{if(desktop&&catalog&&!run.length&&!app.querySelector('.filter-trigger[aria-expanded="true"]'))dashboard();},30000);
