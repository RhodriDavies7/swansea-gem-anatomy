import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=async name=>JSON.parse(await fs.readFile(new URL(name,root),'utf8'));
test('all supplied outcome sessions and stable links are present',async()=>{
 const data=await read('content/learning-outcomes.json'),catalog=await read('dist/data/catalog.json'),models=await read('content/models.json');
 assert.equal(data.sessions.length,54);assert.equal(data.sessions.filter(s=>s.year===1).length,32);assert.equal(data.sessions.filter(s=>s.year===2).length,22);assert.equal(data.sessions.reduce((n,s)=>n+s.outcomes.length,0),477);
 const ids=new Set(),structures=new Set(catalog.structures.map(s=>s.id)),modelIds=new Set(models.map(m=>m.id));
 for(const s of data.sessions){assert.ok(s.summary);assert.ok(s.title);assert.equal(Number(s.week[0]),s.year);for(const id of s.modelIds)assert.ok(modelIds.has(id));for(const o of s.outcomes){assert.ok(!ids.has(o.id));ids.add(o.id);assert.ok(o.text.trim());assert.ok(s.pages.includes(o.page));for(const id of o.structureIds)assert.ok(structures.has(id));for(const id of o.relatedModelIds)assert.ok(modelIds.has(id));}}
 assert.deepEqual(await read('dist/data/learning-outcomes.json'),data);
 assert.deepEqual(data.sessions.find(s=>s.week==='113').pages,[12,13]);
 for(const y of [1,2])assert.ok((await fs.readFile(new URL(`dist/documents/year-${y}-learning-outcomes.pdf`,root))).subarray(0,5).equals(Buffer.from('%PDF-')));
});
