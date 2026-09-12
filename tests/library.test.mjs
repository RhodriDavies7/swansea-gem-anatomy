import {registerUpload} from '../local/image-api.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {execFileSync,spawnSync} from 'node:child_process';
import {indexCatalog,hydrateModel,filterStructures,studyCards,factVariants} from '../dist/data.js';
const root=new URL('../',import.meta.url);const data=JSON.parse(await fs.readFile(new URL('dist/data/catalog.json',root)));const catalog={...data,byId:new Map(data.structures.map(s=>[s.id,s])),imagesById:new Map(data.images.map(i=>[i.id,i]))};
test('exact-name duplicates share records; ambiguous hand and foot entries do not',()=>{const frontal=data.structures.filter(s=>s.name==='Frontal bone');assert.equal(frontal.length,1);assert.ok(frontal[0].occurrences.length>=6);const digit=data.structures.filter(s=>s.name==='Abductor digiti minimi muscle');assert.equal(digit.length,2);assert.notEqual(digit[0].scope,digit[1].scope);});
test('selecting a preferred fact changes linked model answers without destroying source versions',()=>{const s=structuredClone(data.structures.find(s=>s.facts.some(f=>f.variants.length>1)));const f=s.facts.find(f=>f.variants.length>1);const [a,b]=f.variants;f.preferredVariantId=b.id;const m={cards:[{id:'test',structureId:s.id,factId:f.id,variantId:a.id}]};const c={byId:new Map([[s.id,s]])};assert.equal(hydrateModel(m,c).cards[0].answer,b.answer);assert.equal(hydrateModel(m,c,{original:true}).cards[0].answer,a.answer);assert.equal(factVariants(f).length,1);assert.ok(f.variants.length>1);});
test('search combines words and facets, searches answers and omits model notes',()=>{const found=filterStructures(data.structures,{query:'pectoralis',types:'Muscles'});assert.ok(found.length);assert.ok(found.every(s=>s.types.includes('Muscles')));assert.equal(filterStructures(data.structures,{query:'zzzznotfound'}).length,0);const answer=data.structures.find(s=>s.kind!=='model-note').facts.find(f=>f.question!=='Identification').variants[0].answer;assert.ok(filterStructures(data.structures,{query:answer}).length);assert.ok(filterStructures(data.structures,{}).every(s=>s.kind!=='model-note'));});
test('knowledge revision uses each shared fact version once and narrows by topic',()=>{const structures=filterStructures(data.structures,{types:'Muscles'});const cards=studyCards(structures,catalog,{topic:'Actions'});assert.ok(cards.length);assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);assert.ok(cards.every(c=>c.question==='Actions'&&!c.identification));assert.equal(studyCards(structures,{...catalog,imagesById:new Map()},{mode:'identification'}).length,0);});
test('image quizzes require a ready image assigned to the exact target, with neutral prompt metadata',()=>{const a={id:'a',name:'Example A',imageIds:['image'],facts:[]},b={...a,id:'b',name:'Example B'};const im={id:'image',src:'images/answer.png',alt:'Example A',quizReady:true,quizSrc:'images/prompt.png',quizAlt:'Identify the structure marked A',quizStructureId:'a'};const c={imagesById:new Map([['image',im]])};const cards=studyCards([a,b],c,{mode:'identification'});assert.equal(cards.length,1);assert.equal(cards[0].answer,'Example A');assert.equal(cards[0].image.quizAlt,'Identify the structure marked A');im.quizReady=false;assert.equal(studyCards([a],c,{mode:'identification'}).length,0);});
test('local image registration and builder work; broken images fail before replacing output',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'anatomy-images-'));try{
 for(const sub of ['scripts','content/structures','content/models','dist/images'])await fs.mkdir(path.join(dir,sub),{recursive:true});
 for(const f of ['build-data.mjs','add-image.mjs'])await fs.copyFile(new URL('scripts/'+f,root),path.join(dir,'scripts',f));
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aifoAAAAASUVORK5CYII=','base64');await fs.writeFile(path.join(dir,'dist/images/model.png'),png);
 const source={modelId:'model',cardId:'card',sourceLine:1};const s={id:'fixture',name:'Fixture',kind:'structure',scope:'',aliases:[],types:['Other'],regions:[],systems:[],organs:[],tags:[],imageIds:[],occurrences:[{modelId:'model',label:'1',path:['1'],section:''}],facts:[{id:'f',question:'Identification',preferredVariantId:'v',variants:[{id:'v',answer:'Fixture',sources:[source]}]}]};
 await fs.writeFile(path.join(dir,'content/structures/fixture.json'),JSON.stringify(s));await fs.writeFile(path.join(dir,'content/images.json'),'[]');await fs.writeFile(path.join(dir,'content/models.json'),JSON.stringify([{id:'model',name:'Model',file:'model.json',image:'images/model.png'}]));await fs.writeFile(path.join(dir,'content/models/model.json'),JSON.stringify({id:'model',name:'Model',cards:[{id:'card',structureId:'fixture',factId:'f',variantId:'v',tags:['Identification'],label:'1',path:['1']}]}));
 await registerUpload(dir,{structureId:'fixture',image:{name:'model.png',data:png.toString('base64')},alt:'Reference image',quizReady:true,marker:{x:.25,y:.75}});
 const cat=JSON.parse(await fs.readFile(path.join(dir,'dist/data/catalog.json')));assert.equal(cat.images.length,1);assert.deepEqual(cat.images[0].quizMarker,{x:.25,y:.75});assert.equal(cat.images[0].quizStructureId,'fixture');assert.equal(cat.structures[0].imageIds.length,1);
 await registerUpload(dir,{structureId:'fixture',modelId:'model',image:{name:'model.png',data:png.toString('base64')},alt:'   ',quizReady:true,physicalPin:true});
 const updated=JSON.parse(await fs.readFile(path.join(dir,'dist/data/catalog.json')));assert.equal(updated.images.length,2);assert.equal(updated.structures[0].imageIds.length,2);assert.equal(updated.images[1].modelId,'model');assert.equal(updated.images[1].alt,'Fixture — Model');assert.equal(updated.images[1].quizMarker,undefined);assert.equal(updated.images[1].quizAlt,'Identify the pinned structure.');
 await assert.rejects(registerUpload(dir,{structureId:'fixture',modelId:'unknown',image:{name:'model.png',data:png.toString('base64')},alt:'Invalid model',quizReady:true,physicalPin:true}));
 const before=await fs.readFile(path.join(dir,'dist/data/catalog.json'),'utf8');cat.images[0].src='images/missing.png';await fs.writeFile(path.join(dir,'content/images.json'),JSON.stringify(cat.images));const run=spawnSync(process.execPath,[path.join(dir,'scripts/build-data.mjs')]);assert.notEqual(run.status,0);assert.equal(await fs.readFile(path.join(dir,'dist/data/catalog.json'),'utf8'),before);
 }finally{await fs.rm(dir,{recursive:true,force:true});}});

test('optic nerve synonyms share a single record, answer and old-link destination', async()=>{
 const indexed=indexCatalog(data),s=data.structures.find(s=>s.name==='Optic nerve (CN II)');
 assert.ok(s.aliases.includes('Optic nerve'));assert.equal(data.structures.filter(s=>s.name==='Optic nerve').length,0);
 assert.ok(s.redirectIds.length);for(const id of s.redirectIds)assert.equal(indexed.byId.get(id),s);
 const answers=new Set();let models=0;
 for(const file of await fs.readdir(new URL('content/models/',root))){const model=JSON.parse(await fs.readFile(new URL('content/models/'+file,root)));const linked=model.cards.filter(c=>c.structureId===s.id);if(linked.length)models++;
 for(const c of hydrateModel(model,indexed).cards.filter(c=>c.structureId===s.id&&c.question==='Sensory functions'))answers.add(c.answer);}
 assert.ok(models>=2);assert.deepEqual([...answers],['Vision and afferent limb of the pupillary light reflex.']);
 assert.equal(studyCards([s],indexed,{topic:'Sensory functions'}).length,1);
});
test('every shared topic has one preferred answer and no duplicate revision versions',()=>{
 for(const s of data.structures)for(const f of s.facts){assert.ok(f.preferredVariantId,s.id+'/'+f.question);assert.equal(factVariants(f).length,1);}
 assert.ok(studyCards(data.structures.filter(s=>s.kind!=='model-note'),catalog).every(c=>c.variantCount===1));
});
test('homonymous foramina and palmar nerve branches retain their distinct source context',()=>{
 const tongue=data.structures.find(s=>s.name==='Foramen caecum (tongue)'),skull=data.structures.find(s=>s.name==='Foramen caecum (skull)');
 assert.ok(tongue.facts.some(f=>f.question==='Embryology'));assert.ok(!skull.facts.some(f=>f.question==='Embryology'));
 assert.ok(skull.facts.some(f=>f.question==='Contents'));assert.ok(!tongue.facts.some(f=>f.question==='Contents'));
 const median=data.structures.find(s=>s.name==='Common palmar digital nerves (median nerve)'),ulnar=data.structures.find(s=>s.name==='Common palmar digital nerve (ulnar nerve)');
 assert.deepEqual(median.occurrences.map(o=>o.label),['73']);assert.deepEqual(ulnar.occurrences.map(o=>o.label),['79']);
 assert.match(factVariants(median.facts.find(f=>f.question==='Roots'))[0].answer,/median/);
 assert.match(factVariants(ulnar.facts.find(f=>f.question==='Roots'))[0].answer,/ulnar/);
});

test('library label search matches the selected model occurrence exactly',()=>{
 const base={kind:'structure',aliases:[],tags:[],facts:[],imageIds:[],types:[],regions:[],systems:[],organs:[]};
 const a={...base,id:'a',name:'First',occurrences:[{modelId:'one',label:'12'},{modelId:'two',label:'27a'}]};
 const b={...base,id:'b',name:'Second',occurrences:[{modelId:'one',label:'112'},{modelId:'two',label:'12'}]};
 assert.deepEqual(filterStructures([a,b],{query:'12',modelId:'one'}).map(s=>s.id),['a']);
 assert.deepEqual(filterStructures([a,b],{query:'#27a',modelId:'two'}).map(s=>s.id),['a']);
 assert.equal(filterStructures([a,b],{query:'27a',modelId:'one'}).length,0);
 assert.equal(filterStructures([a,b],{query:'label 12'}).length,2);
 assert.equal(filterStructures([a,b],{query:'',modelId:'missing'}).length,0);
});
