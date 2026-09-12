import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const [keepId,mergeId,...flags]=process.argv.slice(2);if(!keepId||!mergeId||keepId===mergeId||![keepId,mergeId].every(x=>/^[a-z0-9-]+$/.test(x)))throw Error('Usage: npm run structures:merge -- KEEP_ID MERGE_ID [--apply]');
const dir=path.join(root,'content/structures'),read=async id=>JSON.parse(await fs.readFile(path.join(dir,id+'.json')));
const keep=await read(keepId),merge=await read(mergeId);const union=(a,b)=>[...new Set([...a,...b])];
keep.aliases=union(keep.aliases,[merge.name,...merge.aliases]).filter(n=>n!==keep.name);
for(const key of ['types','regions','systems','organs','tags','imageIds'])keep[key]=union(keep[key],merge[key]);
keep.redirectIds=union(keep.redirectIds||[],[merge.id,...(merge.redirectIds||[])]);
keep.occurrences=[...keep.occurrences,...merge.occurrences];const mapping=new Map();
for(const f of merge.facts){
 let target=keep.facts.find(t=>t.question===f.question);
 if(!target){let id=f.id;while(keep.facts.some(t=>t.id===id))id+='-merged';target={...f,id,variants:[],preferredVariantId:null};keep.facts.push(target);}
 for(const v of f.variants){let existing=target.variants.find(t=>t.answer===v.answer);if(existing){existing.sources=[...existing.sources,...v.sources];}else{let id=v.id;while(target.variants.some(t=>t.id===id))id+='-merged';existing={...structuredClone(v),id};target.variants.push(existing);}mapping.set(f.id+'/'+v.id,{factId:target.id,variantId:existing.id});}
 target.preferredVariantId=target.variants.length===1?target.variants[0].id:null;
}
const modelDir=path.join(root,'content/models');const updates=[];let changed=0;
for(const filename of await fs.readdir(modelDir)){if(!filename.endsWith('.json'))continue;const model=JSON.parse(await fs.readFile(path.join(modelDir,filename)));let touched=false;for(const c of model.cards)if(c.structureId===mergeId){c.structureId=keepId;const mapped=mapping.get(c.factId+'/'+c.variantId);c.factId=mapped.factId;c.variantId=mapped.variantId;changed++;touched=true;}if(touched)updates.push({filename,model});}
console.log(`Keep "${keep.name}" (${keepId}); merge "${merge.name}" (${mergeId}). Repoint ${changed} model cards. Preserve every fact version and image. Review that both names mean the SAME structure, including region and laterality.`);
if(!flags.includes('--apply')){console.log('Preview only. Add --apply to save.');process.exit(0);}
// Archive the original entry so the merge remains reversible through Git or the snapshot.
await fs.mkdir(path.join(root,'content/merged'),{recursive:true});await fs.copyFile(path.join(dir,mergeId+'.json'),path.join(root,'content/merged',mergeId+'.json'));
await fs.writeFile(path.join(dir,keepId+'.json'),JSON.stringify(keep,null,2)+'\n');for(const {filename,model} of updates)await fs.writeFile(path.join(modelDir,filename),JSON.stringify(model,null,2)+'\n');
const ip=path.join(root,'content/images.json'),images=JSON.parse(await fs.readFile(ip));for(const image of images)if(image.quizStructureId===mergeId)image.quizStructureId=keepId;await fs.writeFile(ip,JSON.stringify(images,null,2)+'\n');await fs.unlink(path.join(dir,mergeId+'.json'));console.log('Saved. Run npm run build:data and npm test.');
