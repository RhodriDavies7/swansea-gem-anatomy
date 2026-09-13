import {factVariants} from './data.js';
const prompts={Actions:'What is the main action of the marked structure?',Innervation:'What is the innervation of the marked structure?',Function:'What is the main function of the marked structure?',Origin:'What is the origin of the marked structure?',Insertion:'Where does the marked structure insert?','Blood supply':'What is the blood supply of the marked structure?','Sensory functions':'What sensory functions does the marked nerve carry?','Motor functions':'What does the marked nerve supply?'};
export function spotterPool(catalog,region='',{tags=[],topics=[],tagEffect='include',topicEffect='include',models=[],modelEffect='include'}={}){
 return catalog.structures.filter(s=>s.kind!=='model-note'&&(!region||s.regions.includes(region))&&(!tags.length||(tagEffect==='exclude'?!tags.some(t=>s.tags.includes(t)):tags.some(t=>s.tags.includes(t))))).flatMap(s=>{
  const images=s.imageIds.map(id=>catalog.imagesById.get(id)).filter(i=>i?.quizReady&&i.quizSrc&&i.quizStructureId===s.id&&(!models.length||(modelEffect==='exclude'?!models.includes(i.modelId):models.includes(i.modelId))));
  if(!images.length)return [];
  const questions=[{topic:'Identification',question:'Identify the marked structure.',answer:s.name}];
  for(const f of s.facts)if(prompts[f.question]&&factVariants(f).length===1)questions.push({topic:f.question,question:prompts[f.question],answer:factVariants(f)[0].answer});
  const selected=topics.length?questions.filter(q=>topicEffect==='exclude'?!topics.includes(q.topic):topics.includes(q.topic)):questions;return selected.length?[{structureId:s.id,name:s.name,images,questions:selected}]:[];
 });
}
function shuffle(xs,random){const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function makeSpotter(pool,count=30,random=Math.random){
 if(!Number.isInteger(count)||count<1||pool.length<count)throw Error('Not enough distinct structures for this run.');
 const used=new Map();
 return shuffle(pool,random).slice(0,count).map(s=>{
  const qs=shuffle(s.questions,random).sort((a,b)=>(used.get(a.topic)||0)-(used.get(b.topic)||0));const q=qs[0];used.set(q.topic,(used.get(q.topic)||0)+1);
  return {...q,structureId:s.structureId,name:s.name,image:s.images[Math.floor(random()*s.images.length)],response:'',flagged:false,mark:null};
 });
}
export const answeredCount=run=>run.filter(q=>q.response.trim()).length;
export const remainingSeconds=(deadline,now=Date.now())=>deadline===null?null:Math.max(0,Math.ceil((deadline-now)/1000));
