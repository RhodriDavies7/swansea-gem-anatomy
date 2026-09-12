export function indexCatalog(catalog){
 const byId=new Map(catalog.structures.map(s=>[s.id,s]));
 for(const s of catalog.structures)for(const oldId of s.redirectIds||[])byId.set(oldId,s);
 return {...catalog,byId,imagesById:new Map(catalog.images.map(i=>[i.id,i]))};
}
let catalogPromise;
export async function loadCatalog(){
 if(!catalogPromise)catalogPromise=fetch('./data/catalog.json').then(r=>{if(!r.ok)throw Error('Could not load anatomy library');return r.json();}).then(indexCatalog).catch(e=>{catalogPromise=null;throw e;});
 return catalogPromise;
}
export function hydrateModel(model,catalog,{original=false}={}){
 return {...model,cards:model.cards.map(c=>{const s=catalog.byId.get(c.structureId),f=s?.facts.find(f=>f.id===c.factId);const v=f?.variants.find(v=>v.id===(!original&&f.preferredVariantId?f.preferredVariantId:c.variantId));if(!v)throw Error('Broken structure reference: '+c.id);return {...c,question:f.question,answer:v.answer};})};
}
export function factVariants(fact){return fact.preferredVariantId?fact.variants.filter(v=>v.id===fact.preferredVariantId):fact.variants;}
export function filterStructures(structures,filters){
 const q=(filters.query||'').toLowerCase().trim().replace(/^#/,''),words=q.split(/\s+/).filter(Boolean);
 const label=q.replace(/^label\s*/,'').replace(/\s+/g,'');const isLabel=/^\d+[a-z]?$/.test(label);
 return structures.filter(s=>{
  const occurrences=(s.occurrences||[]).filter(o=>!filters.modelId||o.modelId===filters.modelId);
  if(s.kind==='model-note'||(filters.modelId&&!occurrences.length))return false;
  if(!['types','regions','systems','organs','tags'].every(k=>!filters[k]||s[k].includes(filters[k]))||(filters.images&&!s.imageIds.length))return false;
  if(isLabel)return occurrences.some(o=>String(o.label).toLowerCase().replace(/\s+/g,'')===label);
  const text=[s.name,...s.aliases,...s.tags,...s.facts.flatMap(f=>factVariants(f).map(v=>v.answer))].join(' ').toLowerCase();
  return words.every(w=>text.includes(w));
 }).sort((a,b)=>Number(b.name.toLowerCase().includes(q))-Number(a.name.toLowerCase().includes(q))||a.name.localeCompare(b.name));
}
export function studyCards(structures,catalog,{mode='knowledge',topic=''}={}){
 const cards=[];
 for(const s of structures){
 if(mode==='identification'){
 const im=s.imageIds.map(id=>catalog.imagesById.get(id)).find(im=>im?.quizReady&&im.quizSrc&&im.quizStructureId===s.id);
 if(im)cards.push({id:s.id+':identify',structureId:s.id,name:s.name,question:'Identify the marked structure',answer:s.name,image:im,identification:true,variantCount:1,sources:[]});
 }else for(const f of s.facts){if(f.question==='Identification'||(topic&&f.question!==topic))continue;for(const v of factVariants(f))cards.push({id:s.id+':'+f.id+':'+v.id,structureId:s.id,name:s.name,question:f.question,answer:v.answer,identification:false,variantCount:factVariants(f).length,sources:v.sources||[]});}
 }
 return cards;
}
