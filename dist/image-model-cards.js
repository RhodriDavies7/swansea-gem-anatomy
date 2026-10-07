// Models without printed labels are revised against their own quiz-ready photos.
export function imageModelCards(model,catalog,cards=model.cards){
 const seen=new Set();
 return cards.flatMap(card=>{
  const structure=catalog.byId.get(card.structureId);
  const images=(structure?.imageIds||[]).map(id=>catalog.imagesById.get(id)).filter(im=>im?.quizReady&&im.quizSrc&&im.quizStructureId===card.structureId&&im.modelId===model.id);
  if(!images.length)return [];
  const key=card.structureId+'/'+card.factId;
  if(seen.has(key))return [];seen.add(key);
  return [{...card,images,image:images[0]}];
 });
}
export function imageQuestion(topic){
 const questions={Identification:'Identify the marked structure.',Actions:'What is the main action of the marked structure?',Innervation:'What is the innervation of the marked structure?',Origin:'What is the origin of the marked structure?',Insertion:'Where does the marked structure insert?',Function:'What is the main function of the marked structure?',Location:'Where is the marked structure located?',Relations:'What are the key relationships of the marked structure?',Structure:'Describe the marked structure.',Contents:'What does the marked structure contain?',Course:'Describe the course of the marked structure.',Supply:'What does the marked vessel supply?',Drainage:'Where does the marked structure drain?',Articulations:'What does the marked structure articulate with?',Attachments:'What attaches to the marked structure?',Connections:'What are the connections of the marked structure?',Lesion:'What are the main effects of a lesion of the marked structure?','Clinical relevance':'What is the key clinical relevance of the marked structure?','Blood supply':'What is the blood supply of the marked structure?','Sensory functions':'What is the sensory supply or function of the marked nerve?','Motor functions':'What is the motor supply of the marked nerve?'};
 return questions[topic]||topic+' — marked structure';
}
