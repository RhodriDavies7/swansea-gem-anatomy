import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {emptyProgress,schedule,reviewKey,applyRating,mergeProgress,validateProgress} from '../dist/review-scheduler.js';
import {ProgressStore} from '../desktop/progress-store.mjs';
const now=new Date('2026-11-13T12:00:00Z'),key=JSON.stringify(['knowledge','muscle','f-action']);
test('all four ratings schedule distinct recall intervals and persist FSRS memory state',()=>{
 const first=[1,2,3,4].map(r=>schedule(null,r,now).card);
 assert.ok(first.every(c=>c.reps===1&&Date.parse(c.due)>now.getTime()));
 assert.deepEqual(first.map(c=>Date.parse(c.due)),first.map(c=>Date.parse(c.due)).sort((a,b)=>a-b));
 assert.equal(new Set(first.map(c=>c.due)).size,4);
 const later=schedule(first[2],3,new Date(first[2].due)).card;assert.equal(later.reps,2);assert.ok(later.stability>0);
 assert.throws(()=>schedule(null,0,now));
});
test('stable fact identity survives renamed cards, content updates and source line changes',()=>{
 const a={id:'old-3',structureId:'s',factId:'f',question:'Actions',answer:'old',sourceLine:3};
 assert.equal(reviewKey(a),reviewKey({...a,id:'new-100',answer:'corrected',sourceLine:100,name:'Renamed'}));
 assert.equal(reviewKey(a,{id:'model-a'}),reviewKey(a,{id:'model-b'}));
 const image={...a,identification:true,image:{id:'im1'}};assert.notEqual(reviewKey(image),reviewKey({...image,image:{id:'im2'}}));
 assert.notEqual(reviewKey({...image,image:null,label:'1'},{id:'a'}),reviewKey({...image,image:null,label:'1'},{id:'b'}));
});
test('progress survives a new store instance, serial writes, imported older backups, and interrupted/corrupt writes',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'anatomy-progress-'));
 try{
  const store=new ProgressStore(dir);await store.init();
  await Promise.all([store.rate(key,3),store.rate(key,4)]);
  const before=await store.snapshot();assert.equal(before.records[key].reps,2);assert.equal(before.history.length,2);
  const restarted=new ProgressStore(dir);await restarted.init();assert.deepEqual(await restarted.snapshot(),before);
  const old=applyRating(emptyProgress(),key,1,now);const merged=await restarted.import(old);assert.equal(merged.records[key].reps,2);
  await fs.writeFile(restarted.file+'.tmp','partial');const updatedApp=new ProgressStore(dir);await updatedApp.init();assert.deepEqual(await updatedApp.snapshot(),merged);
  await fs.writeFile(restarted.file,'corrupt');const recovered=new ProgressStore(dir);await recovered.init();assert.ok(Object.keys((await recovered.snapshot()).records).includes(key));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('backup import merges without erasing newer ratings and rejects bad/future formats',()=>{
 const older=applyRating(emptyProgress(),key,1,now),newer=applyRating(older,key,4,new Date('2026-11-14T12:00:00Z'));
 assert.deepEqual(mergeProgress(newer,older),newer);
 assert.throws(()=>validateProgress({...older,schemaVersion:2}));
 assert.throws(()=>validateProgress({...older,records:{[key]:{...older.records[key],due:'bad'}}}));
});
test('unreadable progress is never silently reset; an explicit backup import can recover it',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'anatomy-recovery-'));
 try{
  const store=new ProgressStore(dir);await fs.writeFile(store.file,'broken');await assert.rejects(store.init());
  assert.equal(await fs.readFile(store.file,'utf8'),'broken');
  const backup=applyRating(emptyProgress(),key,3,now);await store.import(backup);assert.deepEqual(await store.snapshot(),backup);
  const future={...backup,schemaVersion:2};await fs.writeFile(store.file,JSON.stringify(future));const olderApp=new ProgressStore(dir);await assert.rejects(olderApp.init(),/newer app/);assert.equal(JSON.parse(await fs.readFile(store.file)).schemaVersion,2);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
