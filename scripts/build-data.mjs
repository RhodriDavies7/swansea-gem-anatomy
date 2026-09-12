import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
const fail=m=>{throw new Error(m);};
const index=await read('content/models.json');const files=(await fs.readdir(path.join(root,'content/structures'))).filter(f=>f.endsWith('.json')).sort();
const structures=await Promise.all(files.map(f=>read('content/structures/'+f)));const byId=new Map();
const images=await read('content/images.json'),imageIds=new Set();
const localImage=async p=>{if(typeof p!=='string'||!/^images\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp)$/i.test(p)||p.split('/').includes('..'))fail('Image paths must be local images/... JPG, PNG or WebP: '+p);await fs.access(path.join(root,'dist',p));};
for(const im of images){if(im.quizMarker&&(!im.quizReady||!['x','y'].every(k=>Number.isFinite(im.quizMarker[k])&&im.quizMarker[k]>=0&&im.quizMarker[k]<=1)))fail('Invalid quiz marker: '+im.id);if(!im.id||imageIds.has(im.id))fail('Duplicate/missing image ID');imageIds.add(im.id);await localImage(im.src);if(!im.alt?.trim())fail('Missing alt text: '+im.id);if(im.answerSrc)await localImage(im.answerSrc);if(im.quizReady){await localImage(im.quizSrc);if(!im.quizAlt?.trim())fail('Add neutral quizAlt: '+im.id);}}
for(const [i,s] of structures.entries()){
 if(!s.id||byId.has(s.id)||!s.name?.trim())fail('Duplicate ID or missing name: '+s.id);if(files[i]!==s.id+'.json')fail('Filename must match structure ID: '+s.id);byId.set(s.id,s);
 for(const key of ['aliases','types','regions','systems','organs','tags','imageIds','facts','occurrences'])if(!Array.isArray(s[key]))fail('Expected array '+key+' on '+s.id);
 for(const id of s.imageIds)if(!imageIds.has(id))fail('Unknown image '+id+' on '+s.id);
 const facts=new Set();for(const f of s.facts){if(!f.id||facts.has(f.id)||!f.question?.trim()||!f.variants.length)fail('Invalid fact on '+s.id);facts.add(f.id);const vs=new Set();for(const v of f.variants){if(!v.id||vs.has(v.id)||!v.answer?.trim()||!Array.isArray(v.sources))fail('Invalid variant '+s.id+'/'+f.id);vs.add(v.id);}if(f.preferredVariantId&&!vs.has(f.preferredVariantId))fail('Invalid preferredVariantId '+s.id+'/'+f.id);}
}
const redirects=new Set();
for(const s of structures)for(const id of s.redirectIds||[]){if(byId.has(id)||redirects.has(id))fail('Duplicate redirect ID '+id);redirects.add(id);}
const models=[],modelIds=new Set(),cardIds=new Set();
for(const meta of index){if(modelIds.has(meta.id)||!meta.id)fail('Duplicate model ID');modelIds.add(meta.id);if(!/^[a-z0-9-]+\.json$/.test(meta.file))fail('Invalid model filename');const m=await read('content/models/'+meta.file);if(m.id!==meta.id)fail('Model ID mismatch');
 for(const c of m.cards){if(cardIds.has(c.id))fail('Duplicate card ID '+c.id);cardIds.add(c.id);const s=byId.get(c.structureId),f=s?.facts.find(f=>f.id===c.factId);if(!f?.variants.some(v=>v.id===c.variantId))fail('Broken card reference '+c.id);if('answer' in c||'question' in c)fail('Model cards must reference shared facts: '+c.id);}
 meta.count=m.cards.length;meta.identificationCount=m.cards.filter(c=>c.tags.includes('Identification')).length;meta.tags=[...new Set(m.cards.flatMap(c=>c.tags))].sort();await localImage(meta.image);models.push(m);
}
for(const s of structures){for(const o of s.occurrences)if(!modelIds.has(o.modelId))fail('Invalid source model '+s.id);for(const f of s.facts)for(const v of f.variants)for(const source of v.sources||[])if(!modelIds.has(source.modelId)||!cardIds.has(source.cardId))fail('Invalid fact source '+s.id);}
for(const image of images)if(image.modelId&&(!modelIds.has(image.modelId)||!structures.some(s=>s.imageIds.includes(image.id)&&s.occurrences.some(o=>o.modelId===image.modelId))))fail('Image model must contain its linked structure: '+image.id);
for(const image of images)if(image.quizReady&&(!byId.has(image.quizStructureId)||!byId.get(image.quizStructureId).imageIds.includes(image.id)))fail('Quiz image must name its linked target structure: '+image.id);
const multi=structures.flatMap(s=>s.facts.filter(f=>f.variants.length>1&&!f.preferredVariantId).map(f=>({structureId:s.id,name:s.name,question:f.question,variants:f.variants.length})));
// Validate every input before writing publishable files.
await fs.mkdir(path.join(root,'dist/data'),{recursive:true});
await fs.writeFile(path.join(root,'dist/data/catalog.json'),JSON.stringify({schemaVersion:1,structures,images})+'\n');
for(let i=0;i<models.length;i++)await fs.writeFile(path.join(root,'dist/data',index[i].file),JSON.stringify(models[i],null,2)+'\n');
await fs.writeFile(path.join(root,'dist/data/models.json'),JSON.stringify(index,null,2)+'\n');
await fs.writeFile(path.join(root,'content/review-needed.json'),JSON.stringify(multi,null,2)+'\n');
console.log(`Built ${structures.length} shared entries, ${models.length} models and ${cardIds.size} cards. ${multi.length} facts need a preferred answer; ${images.length} images registered.`);
