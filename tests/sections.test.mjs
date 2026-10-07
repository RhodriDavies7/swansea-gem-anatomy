import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {filterStructures,hydrateModel,indexCatalog} from '../dist/data.js';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url)));
const catalog=indexCatalog(await read('dist/data/catalog.json'));
const model=hydrateModel(await read('dist/data/head-sections-model-bs5-5.json'),catalog);
const rows=await read('content/bs5-5-source-labels.json');
test('BS5/5 preserves all eleven section keys without conflating repeated numbers',()=>{
 assert.equal(model.sections.length,11);
 assert.equal(rows.length,238);
 assert.deepEqual(model.sections.map(s=>rows.filter(r=>r.section===s.name).length),[15,15,16,24,26,25,24,23,25,26,19]);
 const identification=model.cards.filter(c=>c.question==='Identification');
 assert.equal(identification.length,233);assert.equal(model.cards.length,855);
 assert.equal(model.sourceWarnings.length,5);
 for(const row of rows){
  const matches=identification.filter(c=>c.section===row.section&&c.label===row.label);
  assert.equal(matches.length,row.status==='linked'?1:0);
  if(matches.length)assert.equal(matches[0].structureId,row.structureId);
 }
 const first=identification.find(c=>c.section==='Section 1'&&c.label==='5');
 const sixth=identification.find(c=>c.section==='Section 6'&&c.label==='5');
 assert.notEqual(first.structureId,sixth.structureId);
 for(const card of [first,sixth]){
  const found=filterStructures(catalog.structures,{modelId:model.id,section:card.section,query:'5'});
  assert.deepEqual(found.map(s=>s.id),[card.structureId]);
 }
 const shared=rows.filter(r=>r.name==='Scalp'&&r.status==='linked');
 assert.ok(shared.length>1);assert.equal(new Set(shared.map(r=>r.structureId)).size,1);
});

test('new BS5/5 entries have referenced concise facts linked to every occurrence',async()=>{
 const supplement=await read('content/bs5-5-high-yield.json');
 assert.equal(supplement.structures.length,63);
 assert.equal(supplement.structures.reduce((n,s)=>n+s.facts.length,0),135);
 const added=model.cards.filter(c=>c.editorialSupplement==='BS5_5-high-yield');
 assert.equal(added.length,233);
 for(const entry of supplement.structures){
  const s=catalog.byId.get(entry.structureId);
  for(const fact of entry.facts){
   const shared=s.facts.find(f=>f.question===fact.question);
   assert.ok(shared);
   const preferred=shared.variants.find(v=>v.id===shared.preferredVariantId);
   assert.equal(preferred.answer,fact.answer);
   assert.ok(preferred.references.length);
   for(const occurrence of s.occurrences.filter(o=>o.modelId===model.id)){
    assert.equal(added.filter(c=>c.structureId===s.id&&c.section===occurrence.section&&c.label===occurrence.label&&c.factId===shared.id).length,1);
   }
  }
 }
 const internal=catalog.structures.find(s=>s.name==='Internal capsule');
 assert.match(internal.facts.find(f=>f.question==='Lesion').variants[0].answer,/contralateral/);
 const medial=catalog.structures.find(s=>s.name==='Medial pterygoid muscle');
 assert.match(medial.facts.find(f=>f.question==='Innervation').variants[0].answer,/V3/);
});
