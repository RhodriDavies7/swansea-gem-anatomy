import test from 'node:test';
import assert from 'node:assert/strict';
import {imageModelCards,imageQuestion} from '../dist/image-model-cards.js';
test('unnumbered models require their own ready exact-target images and deduplicate repeated section facts',()=>{
 const model={id:'head',cards:[{id:'one',structureId:'s',factId:'identity',section:'Section 1'},{id:'two',structureId:'s',factId:'identity',section:'Section 2'},{id:'three',structureId:'t',factId:'identity'}]};
 const catalog={byId:new Map([['s',{imageIds:['wrong-model','not-ready','wrong-target','ready']}],['t',{imageIds:['wrong-model']}]]),imagesById:new Map([
 ['wrong-model',{modelId:'other',quizReady:true,quizSrc:'other.jpg',quizStructureId:'s'}],
 ['not-ready',{modelId:'head',quizReady:false,quizSrc:'draft.jpg',quizStructureId:'s'}],
 ['wrong-target',{modelId:'head',quizReady:true,quizSrc:'wrong.jpg',quizStructureId:'t'}],
 ['ready',{modelId:'head',quizReady:true,quizSrc:'correct.jpg',quizStructureId:'s'}]
 ])};
 const cards=imageModelCards(model,catalog);assert.equal(cards.length,1);assert.equal(cards[0].image.quizSrc,'correct.jpg');
 assert.equal(imageModelCards(model,catalog,model.cards.filter(c=>c.section==='Section 2'))[0].id,'two');
 catalog.imagesById.delete('ready');assert.equal(imageModelCards(model,catalog).length,0);
 assert.equal(imageQuestion('Identification'),'Identify the marked structure.');
 assert.match(imageQuestion('Motor functions'),/motor/);assert.match(imageQuestion('Sensory functions'),/sensory/);
});
