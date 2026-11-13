import {filterStructures,studyCards,factVariants} from './data.js';
import {reviewKey} from './review-scheduler.js';
export function defaultReviewFilters(){return {mode:'combined',query:'',modelId:'',section:'',difficulty:['Easy','Medium','Hard'],year:'',types:'',systems:'',regions:'',organs:'',tags:[],tagEffect:'include',topics:[],topicEffect:'exclude',models:[],modelEffect:'include'};}
export function reviewPool(catalog,filters={}){
 const f={...defaultReviewFilters(),...filters};
 const allowedModel=id=>(!f.modelId||id===f.modelId)&&(!f.models.length||(f.modelEffect==='exclude'?!f.models.includes(id):f.models.includes(id)));
 const structures=filterStructures(catalog.structures,{...f,tags:''}).filter(s=>
  (!f.models.length||s.occurrences.some(o=>allowedModel(o.modelId)))&&
  (!f.tags.length||(f.tagEffect==='exclude'?!f.tags.some(t=>s.tags.includes(t)):f.tags.some(t=>s.tags.includes(t)))));
 const images=f.mode==='knowledge'?[]:structures.flatMap(s=>(s.imageIds||[]).map(id=>catalog.imagesById.get(id)).filter(im=>im?.quizReady&&im.quizSrc&&im.quizStructureId===s.id&&allowedModel(im.modelId)&&(!f.section||!im.section||im.section===f.section)).map(image=>({id:s.id+':'+image.id,structureId:s.id,name:s.name,question:'Identify the marked structure.',answer:s.name,identification:true,image,topic:'Identification'})));
 const knowledge=f.mode==='images'?[]:studyCards(structures,catalog,{mode:'knowledge'}).map(c=>({...c,topic:c.question,modelIds:[...new Set((catalog.byId.get(c.structureId)?.occurrences||[]).map(o=>o.modelId).filter(allowedModel))]}));
 const keys=new Set();return [...images,...knowledge].filter(c=>{
  if(f.topics.length&&(f.topicEffect==='exclude'?f.topics.includes(c.topic):!f.topics.includes(c.topic)))return false;
  const key=reviewKey(c);if(keys.has(key))return false;keys.add(key);return true;
 });
}
export function dueCards(cards,progress,now=Date.now()){
 return cards.filter(c=>{const r=progress.records[reviewKey(c)];return !r||Date.parse(r.due)<=now;});
}
function shuffle(cards,random){const a=[...cards];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function reviewSession(cards,progress,{newLimit=20,now=Date.now(),random=Math.random}={}){
 const ready=dueCards(cards,progress,now),old=ready.filter(c=>progress.records[reviewKey(c)]).sort((a,b)=>Date.parse(progress.records[reviewKey(a)].due)-Date.parse(progress.records[reviewKey(b)].due));
 const fresh=ready.filter(c=>!progress.records[reviewKey(c)]),images=shuffle(fresh.filter(c=>c.identification),random),knowledge=shuffle(fresh.filter(c=>!c.identification),random),mixed=[];
 while(images.length||knowledge.length){if(images.length)mixed.push(images.pop());if(knowledge.length)mixed.push(knowledge.pop());}
 return [...old,...mixed.slice(0,newLimit)];
}
export function progressGroups(cards,catalog,models,progress,group='models',now=Date.now()){
 const latest=new Map();for(const h of progress.history){const old=latest.get(h.key);if(!old||Date.parse(h.at)>=Date.parse(old.at))latest.set(h.key,h);}
 const modelNames=new Map(models.map(m=>[m.id,m.name])),groups=new Map();
 for(const card of cards){
  const structure=catalog.byId.get(card.structureId);if(!structure)continue;
  const names=group==='models'?(card.image?.modelId?[card.image.modelId]:card.modelIds||[...new Set(structure.occurrences.map(o=>o.modelId))]):(structure[group]||[]);
  for(const name of names){
   if(!groups.has(name))groups.set(name,{id:name,name:group==='models'?modelNames.get(name)||name:name,total:0,new:0,again:0,hard:0,good:0,easy:0,due:0,unrated:0,keys:new Set()});
   const row=groups.get(name),key=reviewKey(card);if(row.keys.has(key))continue;row.keys.add(key);row.total++;
   const record=progress.records[key],rating=latest.get(key)?.rating;
   if(!record)row.new++;else{if(Date.parse(record.due)<=now)row.due++;if(rating)row[['','again','hard','good','easy'][rating]]++;else row.unrated++;}
  }
 }
 return [...groups.values()].map(({keys,...row})=>({...row,confident:row.good+row.easy,percent:row.total?Math.round((row.good+row.easy)*100/row.total):0})).sort((a,b)=>a.name.localeCompare(b.name));
}
