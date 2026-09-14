import test from 'node:test';import assert from 'node:assert/strict';
import {spotterPool,makeSpotter,remainingSeconds,answeredCount} from '../dist/spotter-logic.js';
import {validateUpload} from '../local/image-api.mjs';
const fixture=()=>{const structures=Array.from({length:35},(_,n)=>({id:'s'+n,name:'Structure '+n,kind:'structure',regions:[n%2?'Head':'Arm'],imageIds:['i'+n],facts:[{question:'Actions',preferredVariantId:'v',variants:[{id:'v',answer:'Acts '+n}]},{question:'Innervation',preferredVariantId:'v',variants:[{id:'v',answer:'Nerve '+n}]}]}));return {structures,imagesById:new Map(structures.map((s,n)=>['i'+n,{id:'i'+n,quizReady:true,quizSrc:'images/q'+n+'.png',quizStructureId:s.id}]))};};
test('full spotter has 30 distinct structures, images and a balanced mix without answer leakage',()=>{const c=fixture(),pool=spotterPool(c),run=makeSpotter(pool,30,()=>.42);assert.equal(run.length,30);assert.equal(new Set(run.map(q=>q.structureId)).size,30);assert.equal(new Set(run.map(q=>q.image.id)).size,30);assert.deepEqual([...new Set(run.map(q=>q.topic))].sort(),['Actions','Identification','Innervation']);for(const q of run){assert.ok(!q.question.includes(q.name));assert.equal(q.response,'');}assert.equal(pool.length,35);assert.equal(answeredCount(run),0);run[0].response=' answer ';assert.equal(answeredCount(run),1);assert.equal(makeSpotter(pool,30,()=>.42)[0].response,'');});
test('unready, wrong-target and image-less structures cannot appear; short runs are explicit',()=>{const c=fixture();c.imagesById.get('i0').quizReady=false;c.imagesById.get('i1').quizStructureId='s0';c.imagesById.get('i2').quizSrc='';c.structures[3].imageIds=[];assert.equal(spotterPool(c).length,31);const pool=spotterPool(c,'Head');assert.ok(pool.length<30);assert.throws(()=>makeSpotter(pool,30),/Not enough/);assert.equal(makeSpotter(pool,pool.length).length,pool.length);});
test('timer uses elapsed wall time and clamps at zero',()=>{assert.equal(remainingSeconds(null,500),null);assert.equal(remainingSeconds(60000,0),60);assert.equal(remainingSeconds(60000,60001),0);assert.equal(remainingSeconds(60000,30001),30);});
test('image upload rejects unsupported files, traversal, missing markers and oversized data',()=>{const data=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aifoAAAAASUVORK5CYII=','base64').toString('base64');const p={structureId:'optic-nerve',alt:'Brain',image:{name:'brain.png',data},quizReady:true,marker:{x:.5,y:.2}};assert.ok(validateUpload(p).bytes.length);for(const patch of [{structureId:'../secret'},{marker:null},{marker:{x:1.1,y:0}},{image:{name:'x.svg',data}},{image:{name:'x.png',data:Buffer.from('not an image file').toString('base64')}},{alt:123}])assert.throws(()=>validateUpload({...p,...patch}));});

test('spotter filters combine region, any selected tag and requested topics',()=>{
 const image={id:'im',quizReady:true,quizSrc:'x.jpg',quizStructureId:'s'};
 const catalog={imagesById:new Map([['im',image]]),structures:[{id:'s',name:'Example',kind:'structure',regions:['Upper limb'],tags:['Muscle'],imageIds:['im'],facts:[{question:'Actions',variants:[{answer:'Flexion'}]}]}]};
 assert.equal(spotterPool(catalog,'Upper limb',{tags:['Nerve','Muscle'],topics:['Actions']})[0].questions[0].topic,'Actions');
 assert.equal(spotterPool(catalog,'',{tags:['Nerve']}).length,0);
 assert.equal(spotterPool(catalog,'',{topics:['Innervation']}).length,0);
 assert.equal(spotterPool(catalog,'Lower limb').length,0);
});

test('spotter exclusion removes structures matching a selected tag',()=>{
 const c={imagesById:new Map([['im',{quizReady:true,quizSrc:'x',quizStructureId:'s'}]]),structures:[{id:'s',name:'S',regions:[],tags:['Nerve'],imageIds:['im'],facts:[]}]};
 assert.equal(spotterPool(c,'',{tags:['Nerve'],tagEffect:'exclude'}).length,0);
 assert.equal(spotterPool(c,'',{tags:['Muscle'],tagEffect:'exclude'}).length,1);
});

test('excluding question types keeps the structure and model filters select only eligible photos',()=>{
 const c={imagesById:new Map([['a',{quizReady:true,quizSrc:'a',quizStructureId:'s',modelId:'one'}],['b',{quizReady:true,quizSrc:'b',quizStructureId:'s',modelId:'two'}]]),structures:[{id:'s',name:'Muscle',regions:[],tags:[],imageIds:['a','b'],facts:[{question:'Origin',variants:[{answer:'Origin answer'}]},{question:'Insertion',variants:[{answer:'Insertion answer'}]}]}]};
 const pool=spotterPool(c,'',{topics:['Origin','Insertion'],topicEffect:'exclude',models:['one']});
 assert.equal(pool.length,1);assert.deepEqual(pool[0].questions.map(q=>q.topic),['Identification']);assert.deepEqual(pool[0].images.map(i=>i.modelId),['one']);
 assert.deepEqual(spotterPool(c,'',{models:['one'],modelEffect:'exclude'})[0].images.map(i=>i.modelId),['two']);
 assert.equal(spotterPool(c,'',{models:['unknown']}).length,0);
});


test('nerve prompts explicitly distinguish motor from sensory with their matching answers',()=>{
 const c=fixture();c.structures[0].facts=[{question:'Motor functions',variants:[{answer:'None; purely sensory.'}]},{question:'Sensory functions',variants:[{answer:'Sensation from the target region.'}]}];
 const qs=spotterPool(c)[0].questions;
 const motor=qs.find(q=>q.topic==='Motor functions'),sensory=qs.find(q=>q.topic==='Sensory functions');
 assert.match(motor.question,/motor supply/i);assert.equal(motor.answer,'None; purely sensory.');
 assert.match(sensory.question,/sensory/i);assert.equal(sensory.answer,'Sensation from the target region.');
});
