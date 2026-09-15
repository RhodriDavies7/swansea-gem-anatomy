import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {indexCatalog,filterStructures,hydrateModel} from '../dist/data.js';
import {spotterPool} from '../dist/spotter-logic.js';
const read=async p=>JSON.parse(await fs.readFile(new URL('../'+p,import.meta.url)));
test('difficulty and evidenced year tags filter the same structures across revision modes',async()=>{
 const c=indexCatalog(await read('dist/data/catalog.json'));const lo=await read('content/learning-outcomes.json');
 for(const s of c.structures){assert.ok(['Easy','Medium','Hard'].includes(s.difficulty));for(const link of s.yearLinks)assert.ok(lo.sessions.some(w=>w.year===link.year&&w.outcomes.some(o=>o.id===link.outcomeId&&o.structureIds.includes(s.id))));}
 assert.equal(c.structures.find(s=>s.name==='Upper lobe of right lung').difficulty,'Easy');
 for(const s of c.structures.filter(s=>s.tags.includes('BronchopulmonarySegment')))assert.equal(s.difficulty,'Hard');
 const opts={difficulty:'Hard',year:'Year 1'};const results=filterStructures(c.structures,opts);assert.ok(results.every(s=>s.difficulty==='Hard'&&s.years.includes('Year 1')));
 assert.ok(spotterPool(c,'',opts).every(s=>results.some(r=>r.id===s.structureId)));
 const m=await read('content/models/thorax-model-hs21.json');const original=hydrateModel(m,c,{original:true});assert.deepEqual(original.cards[0].tags,m.cards[0].tags);assert.ok(hydrateModel(m,c).cards[0].tags.includes(c.byId.get(m.cards[0].structureId).difficulty));
});
