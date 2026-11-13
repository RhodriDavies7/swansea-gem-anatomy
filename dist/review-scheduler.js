import {fsrs,createEmptyCard} from './vendor/fsrs.js';
const scheduler=fsrs({enable_fuzz:false,request_retention:0.9});
export const grades=['Again','Hard','Good','Easy'];
export const emptyProgress=()=>({schemaVersion:1,records:{},history:[]});
export function reviewKey(card,model){
 if(!card.structureId)throw Error('Missing structure');
 const identification=card.identification||card.question==='Identification'||card.tags?.includes('Identification');
 if(identification){
  if(card.image)return JSON.stringify(['identify',card.structureId,'image',card.image.id]);
  return JSON.stringify(['identify',card.structureId,'model',model?.id,card.section||'',card.label||'']);
 }
 return JSON.stringify(['knowledge',card.structureId,card.factId||card.question]);
}
export function schedule(previous,rating,now=new Date()){
 if(!Number.isInteger(rating)||rating<1||rating>4)throw Error('Invalid rating');
 const card=previous?{...previous,due:new Date(previous.due),last_review:previous.last_review?new Date(previous.last_review):undefined}:createEmptyCard(now);
 const result=scheduler.repeat(card,now)[rating];return JSON.parse(JSON.stringify(result));
}
export function validateProgress(value){
 if(!value||value.schemaVersion!==1||!value.records||typeof value.records!=='object'||Array.isArray(value.records)||!Array.isArray(value.history))throw Error('Unsupported progress backup');
 if(Object.keys(value.records).length>100000||value.history.length>1000000)throw Error('Backup is too large');
 for(const [key,card] of Object.entries(value.records)){
  if(key.length>2048||!key.startsWith('[')||!card||!Number.isFinite(Date.parse(card.due))||!Number.isFinite(Date.parse(card.last_review))||!['stability','difficulty','scheduled_days','reps','lapses','learning_steps','state'].every(k=>Number.isFinite(card[k])&&card[k]>=0)||card.state>3||card.difficulty>10)throw Error('Invalid progress record');
 }
 for(const h of value.history)if(!h||typeof h.key!=='string'||!Number.isFinite(Date.parse(h.at))||!Number.isInteger(h.rating)||h.rating<1||h.rating>4)throw Error('Invalid review history');
 return value;
}
export function applyRating(progress,key,rating,now=new Date()){
 if(typeof key!=='string'||key.length>2048||!key.startsWith('['))throw Error('Invalid card key');
 const {card}=schedule(progress.records[key],rating,now);
 return {...progress,records:{...progress.records,[key]:card},history:[...progress.history,{key,rating,at:now.toISOString()}]};
}
export function mergeProgress(current,incoming){
 validateProgress(incoming);const merged=structuredClone(current);
 for(const [key,card] of Object.entries(incoming.records))if(!merged.records[key]||Date.parse(card.last_review)>Date.parse(merged.records[key].last_review))merged.records[key]=card;
 const seen=new Set(merged.history.map(h=>JSON.stringify([h.key,h.rating,h.at])));
 for(const h of incoming.history){const k=JSON.stringify([h.key,h.rating,h.at]);if(!seen.has(k)){merged.history.push(h);seen.add(k);}}
 merged.history.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));return merged;
}
