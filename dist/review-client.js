import {emptyProgress,reviewKey,schedule,grades} from './review-scheduler.js';
export const desktop=!!globalThis.anatomyDesktop;
export let progress=emptyProgress();
export let progressError='';
export const ready=desktop?globalThis.anatomyDesktop.loadProgress().then(value=>{progress=value;}).catch(error=>{progressError='Progress could not load. '+error.message;}):Promise.resolve();
export function isDue(card,model,now=Date.now()){const r=progress.records[reviewKey(card,model)];return !r||Date.parse(r.due)<=now;}
export function reviewCards(cards,model,scope='due'){
 if(!desktop)return cards;if(progressError)return [];
 const keys=new Set();return cards.filter(c=>{const key=reviewKey(c,model);if(keys.has(key))return false;keys.add(key);return scope==='all'||isDue(c,model);});
}
export function reviewOptions(scope='due'){
 if(!desktop)return '';return `<label class="review-scope">Study schedule<select data-review-scope><option value="due" ${scope==='due'?'selected':''}>Due + new cards</option><option value="all" ${scope==='all'?'selected':''}>All cards</option></select></label><p class="review-note">${progressError||'Progress saves on this Mac after every rating. Space reveals; then Space = Good, or 1–4 to rate.'}</p>`;
}
export function intervalLabel(due,now=Date.now()){
 const minutes=Math.max(1,Math.round((Date.parse(due)-now)/60000));if(minutes<60)return minutes+' min';if(minutes<1440)return Math.round(minutes/60)+' hr';return Math.round(minutes/1440)+' days';
}
export function mountReviews(root,{card,model,onNext}){
 if(!desktop||!card||!root.querySelector('.answer')||progressError)return;
 const key=reviewKey(card,model),previous=progress.records[key],panel=document.createElement('section');panel.className='review-grades';panel.setAttribute('aria-label','Rate your recall');
 const now=new Date();panel.innerHTML='<p>How well did you recall this?</p><div>'+grades.map((grade,i)=>`<button type="button" class="grade grade-${i+1}" data-grade="${i+1}"><strong>${grade}</strong><small>${intervalLabel(schedule(previous,i+1,now).card.due,now.getTime())}</small><kbd>${i+1}</kbd></button>`).join('')+'</div><p class="review-save" role="status">Saved locally when you choose a rating.</p>';
 root.querySelector('.answer').after(panel);
 const next=root.querySelector('[data-action="next"]');if(next){next.textContent='Skip without rating →';next.title='Continue without changing this card’s schedule';}
 let saving=false;
 panel.addEventListener('click',async event=>{
  const button=event.target.closest('[data-grade]');if(!button||saving)return;saving=true;panel.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{progress=await globalThis.anatomyDesktop.rate(key,Number(button.dataset.grade));if(panel.isConnected)onNext();}
  catch(error){panel.querySelector('.review-save').textContent='Could not save. '+error.message;saving=false;panel.querySelectorAll('button').forEach(b=>b.disabled=false);}
 });
}
if(desktop){
 await ready;
 const nav=document.querySelector('.site-nav');if(nav&&!nav.querySelector('[href="./review.html"]')){const a=document.createElement('a');a.href='./review.html';a.textContent='Review & progress';if(location.pathname.endsWith('review.html'))a.setAttribute('aria-current','page');nav.prepend(a);}
 document.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey||event.repeat||event.target.closest?.('input,textarea,select,[contenteditable=true]'))return;const button=document.querySelector('.review-grades [data-grade="'+event.key+'"]');if(button&&!button.disabled){event.preventDefault();event.stopImmediatePropagation();button.click();}},true);
}
export async function exportBackup(){return globalThis.anatomyDesktop.exportProgress();}
export async function importBackup(){const value=await globalThis.anatomyDesktop.importProgress();if(value){progress=value;progressError='';}return !!value;}
