import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {indexCatalog,studyCards,structureImages} from '../dist/data.js';
import {reviewPool,reviewSession,progressGroups} from '../dist/review-logic.js';
import {reviewKey,emptyProgress,applyRating} from '../dist/review-scheduler.js';
const catalog=indexCatalog(JSON.parse(await fs.readFile(new URL('../dist/data/catalog.json',import.meta.url))));
const models=JSON.parse(await fs.readFile(new URL('../dist/data/models.json',import.meta.url)));
test('combined review interleaves new photos and knowledge, while topics and modes are exact',()=>{
 const cards=reviewPool(catalog,{mode:'combined'});assert.ok(cards.some(c=>c.identification));assert.ok(cards.some(c=>!c.identification));
 const run=reviewSession(cards,emptyProgress(),{newLimit:20,random:()=>.4});assert.equal(run.length,20);assert.equal(run.filter(c=>c.identification).length,10);
 assert.ok(reviewPool(catalog,{mode:'images'}).every(c=>c.identification));
 assert.ok(reviewPool(catalog,{mode:'knowledge'}).every(c=>!c.identification));
 assert.ok(reviewPool(catalog,{topics:['Origin','Insertion'],topicEffect:'exclude'}).every(c=>!['Origin','Insertion'].includes(c.topic)));
 const origins=reviewPool(catalog,{topics:['Origin'],topicEffect:'include'});assert.ok(origins.length);assert.ok(origins.every(c=>c.topic==='Origin'));
 assert.equal(new Set(cards.map(c=>reviewKey(c))).size,cards.length);
});
test('model-specific photo review and gallery never borrow another model image',()=>{
 const id='foot-model-ns9',pool=reviewPool(catalog,{modelId:id,mode:'combined'});
 assert.ok(pool.some(c=>c.identification));assert.ok(pool.filter(c=>c.identification).every(c=>c.image.modelId===id));
 const shared=catalog.structures.find(s=>new Set(s.imageIds.map(i=>catalog.imagesById.get(i)?.modelId).filter(Boolean)).size>1);
 assert.ok(shared);
 const modelId=catalog.imagesById.get(shared.imageIds[0]).modelId;
 assert.ok(structureImages(shared,catalog,{modelId}).every(im=>im.modelId===modelId));
 assert.ok(studyCards([shared],catalog,{mode:'identification',modelId}).every(c=>c.image.modelId===modelId));
 assert.equal(studyCards([shared],catalog,{mode:'identification',modelId:'nonexistent'}).length,0);
 const excluded=reviewPool(catalog,{mode:'images',models:[id],modelEffect:'exclude'});assert.ok(excluded.every(c=>c.image.modelId!==id));
 const included=reviewPool(catalog,{models:[id],modelEffect:'include'});assert.ok(included.every(c=>c.identification?c.image.modelId===id:c.modelIds.every(m=>m===id)));
});
test('review facets combine search, section, levels, year, system, region, type, organ and tags',()=>{
 const id='head-sections-model-bs5-5';const section=reviewPool(catalog,{modelId:id,section:'Section 11'});assert.ok(section.length);assert.ok(section.every(c=>catalog.byId.get(c.structureId).occurrences.some(o=>o.modelId===id&&o.section==='Section 11')));
 const card=reviewPool(catalog,{mode:'knowledge'}).find(c=>{const s=catalog.byId.get(c.structureId);return s.systems.length&&s.regions.length&&s.organs.length&&s.tags.length;});
 const s=catalog.byId.get(card.structureId),filter={mode:'knowledge',query:s.name,systems:s.systems[0],regions:s.regions[0],types:s.types[0],organs:s.organs[0],difficulty:[s.difficulty],year:s.years[0]||'Year not mapped',tags:[s.tags[0]]};
 assert.ok(reviewPool(catalog,filter).some(c=>c.structureId===s.id));
 assert.equal(reviewPool(catalog,{difficulty:[]}).length,0);
 assert.ok(reviewPool(catalog,{tags:[s.tags[0]],tagEffect:'exclude'}).every(c=>!catalog.byId.get(c.structureId).tags.includes(s.tags[0])));
});
test('progress reports use latest grades, not lifetime successes, and share knowledge without double-counting',()=>{
 const cards=reviewPool(catalog,{modelId:'foot-model-ns9'}).slice(0,5),first=cards[0],now=new Date('2026-11-13T12:00:00Z');
 let p=applyRating(emptyProgress(),reviewKey(first),3,now);
 let rows=progressGroups(cards,catalog,models,p,'models',now.getTime());assert.equal(rows.reduce((n,r)=>n+r.good,0),1);
 p=applyRating(p,reviewKey(first),1,new Date('2026-11-14T12:00:00Z'));
 rows=progressGroups(cards,catalog,models,p,'models');assert.equal(rows.reduce((n,r)=>n+r.confident,0),0);assert.equal(rows.reduce((n,r)=>n+r.again,0),1);
 assert.ok(rows.every(r=>r.total===r.new+r.again+r.hard+r.good+r.easy+r.unrated));
 const shared=reviewPool(catalog,{mode:'knowledge'}).find(c=>c.modelIds.length>1);const progress=applyRating(emptyProgress(),reviewKey(shared),4,now);
 const groups=progressGroups([shared,shared],catalog,models,progress,'models');assert.ok(groups.length>1);assert.ok(groups.every(r=>r.total===1&&r.easy===1&&r.percent===100));
 for(const dimension of ['systems','regions'])assert.ok(progressGroups(cards,catalog,models,p,dimension).every(r=>r.confident<=r.total));
});
