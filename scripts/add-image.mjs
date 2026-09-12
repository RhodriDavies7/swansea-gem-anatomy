import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const [structureId,input,alt,...rest]=process.argv.slice(2);
if(!structureId||!input||!alt||!/^[a-z0-9-]+$/.test(structureId))throw Error('Usage: npm run image:add -- STRUCTURE_ID /path/image.jpg "Description" [--credit "Credit"] [--quiz /path/marked-unlabelled.jpg --quiz-alt "Identify the structure marked A"]');
const allowed=new Set(['--credit','--license','--source','--quiz','--quiz-alt','--answer','--marker-x','--marker-y','--model']);const args={};for(let i=0;i<rest.length;i+=2){if(!allowed.has(rest[i])||!rest[i+1])throw Error('Unknown or incomplete image option '+rest[i]);args[rest[i]]=rest[i+1];}
if(args['--quiz']&&!args['--quiz-alt'])throw Error('A quiz image needs a neutral --quiz-alt description');
if(args['--marker-x']!==undefined||args['--marker-y']!==undefined){if(!args['--quiz']||!['--marker-x','--marker-y'].every(k=>args[k]!==undefined&&Number.isFinite(Number(args[k]))&&Number(args[k])>=0&&Number(args[k])<=1))throw Error('Marker coordinates must be between 0 and 1 and require a quiz image');}
const structurePath=path.join(root,'content/structures',structureId+'.json');const s=JSON.parse(await fs.readFile(structurePath));
if(args['--model']){const models=JSON.parse(await fs.readFile(path.join(root,'content/models.json')));if(!models.some(m=>m.id===args['--model'])||!s.occurrences.some(o=>o.modelId===args['--model']))throw Error('Choose a model containing this structure');}
const planned=[];
async function prepareImage(source){const ext=path.extname(source).toLowerCase();if(!['.jpg','.jpeg','.png','.webp'].includes(ext))throw Error('Use JPG, PNG or WebP');const bytes=await fs.readFile(path.resolve(source));const filename=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16)+ext;const dest='images/structures/'+filename;planned.push({dest,bytes});return dest;}
const src=await prepareImage(input),quizSrc=args['--quiz']?await prepareImage(args['--quiz']):null,answerSrc=args['--answer']?await prepareImage(args['--answer']):null;
const imagesPath=path.join(root,'content/images.json');const images=JSON.parse(await fs.readFile(imagesPath));const id='img-'+crypto.createHash('sha1').update(structureId+src+(quizSrc||'')+(args['--model']||'')).digest('hex').slice(0,12);if(images.some(i=>i.id===id))throw Error('Already registered; edit the existing entry in content/images.json');
const image={id,src,alt,caption:'',credit:args['--credit']||'',license:args['--license']||'',sourceUrl:args['--source']||'',quizReady:!!quizSrc};if(args['--model'])image.modelId=args['--model'];if(quizSrc)Object.assign(image,{quizSrc,quizAlt:args['--quiz-alt'],quizStructureId:structureId});if(answerSrc)image.answerSrc=answerSrc;if(args['--marker-x']!==undefined)image.quizMarker={x:Number(args['--marker-x']),y:Number(args['--marker-y'])};
await fs.mkdir(path.join(root,'dist/images/structures'),{recursive:true});for(const {dest,bytes} of planned)await fs.writeFile(path.join(root,'dist',dest),bytes);
images.push(image);s.imageIds.push(id);await fs.writeFile(imagesPath,JSON.stringify(images,null,2)+'\n');await fs.writeFile(structurePath,JSON.stringify(s,null,2)+'\n');console.log('Registered '+id+' for '+s.name+'. Run npm run build:data, then refresh the library.');
