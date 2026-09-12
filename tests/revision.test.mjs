import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {filterCards,makeRun,structureFor} from '../dist/logic.js';
import {hydrateModel} from '../dist/data.js';
const rawCatalog=JSON.parse(await readFile(new URL('../dist/data/catalog.json',import.meta.url)));
const catalog={...rawCatalog,byId:new Map(rawCatalog.structures.map(s=>[s.id,s]))};
const manifest=JSON.parse(await readFile(new URL('../dist/data/models.json',import.meta.url)));
const models=await Promise.all(manifest.map(m=>readFile(new URL('../dist/data/'+m.file,import.meta.url)).then(JSON.parse).then(m=>hydrateModel(m,catalog,{original:true}))));
test('all 34 guides retain every card, answer, tag and source order',async()=>{
 assert.equal(models.length,34);assert.equal(models.reduce((n,m)=>n+m.cards.length,0),6353);
 for(const [i,m] of models.entries()){
 const lines=(await readFile(new URL('../source-guides/'+m.name+'.txt',import.meta.url),'utf8')).split(/\r?\n/);
 assert.equal(m.cards.length,lines.filter(l=>l.includes('→')).length);assert.equal(m.cards.length,manifest[i].count);
 assert.equal(new Set(m.cards.map(c=>c.id)).size,m.cards.length);
 for(const c of m.cards){const source=lines[c.sourceLine-1].trim();const split=source.indexOf('→');assert.equal(c.question,source.slice(0,split));assert.equal(c.answer,source.slice(split+1).replace(/(?:^|\s)#[^\s#]+/g,'').trim());assert.deepEqual(c.tags,Array.from(source.slice(split+1).matchAll(/(?:^|\s)#([^\s#]+)/g),m=>m[1]));assert.ok(c.label);}
 }
});
test('identification, tag intersections, unions and empty results',()=>{
 const cards=models.flatMap(m=>m.cards);const id=filterCards(cards,'identification',[],'all');assert.ok(id.length);assert.ok(id.every(c=>c.tags.includes('Identification')));
 assert.ok(filterCards(cards,'all',['Muscle','Innervation'],'all').every(c=>c.tags.includes('Muscle')&&c.tags.includes('Innervation')));
 const any=filterCards(cards,'all',['Muscle','Nerve'],'any');assert.ok(any.length);assert.ok(any.every(c=>c.tags.includes('Muscle')||c.tags.includes('Nerve')));
 assert.equal(filterCards(cards,'all',['nonexistent'],'all').length,0);
});
test('runs retain all cards exactly once without mutating data',()=>{
 const cards=models[0].cards;assert.deepEqual(makeRun(cards),cards);const before=cards.map(c=>c.id);const run=makeRun(cards,true,()=>0.25);assert.deepEqual(run.map(c=>c.id).sort(),[...before].sort());assert.deepEqual(cards.map(c=>c.id),before);assert.notDeepEqual(run.map(c=>c.id),before);
});
test('nested labels and repeated section numbers keep correct structure context',()=>{
 const ear=models.find(m=>m.name==='Ear (Model DS3)');assert.ok(ear.cards.some(c=>c.path.join('/')==='7/a'&&c.label==='7a'));
 const tongue=models.find(m=>m.name==='Larynx and Tongue (Model GS4)');for(const section of ['Larynx','Tongue']){const card=tongue.cards.find(c=>c.section===section&&c.label==='1'&&!c.tags.includes('Identification'));assert.ok(card);const expected=tongue.cards.find(c=>c.section===section&&c.label==='1'&&c.tags.includes('Identification')).answer;assert.equal(structureFor(card,tongue.cards),expected);}
});
