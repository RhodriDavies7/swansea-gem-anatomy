import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const exec=promisify(execFile);
export function validateUpload(p){
 if(!/^[a-z0-9-]+$/.test(p?.structureId||''))throw Error('Choose a valid structure.');
 if(p.alt!==undefined&&(typeof p.alt!=='string'||p.alt.length>500))throw Error('Add a short image description.');
 if(p.credit!==undefined&&(typeof p.credit!=='string'||p.credit.length>500))throw Error('Use a shorter image credit.');
 const ext=path.extname(p.image?.name||'').toLowerCase();if(!['.jpg','.jpeg','.png','.webp'].includes(ext))throw Error('Use JPG, PNG or WebP.');
 if(typeof p.image?.data!=='string'||p.image.data.length>7*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(p.image.data))throw Error('Invalid or oversized image.');
 const bytes=Buffer.from(p.image.data,'base64');if(bytes.length>5*1024*1024||bytes.length<12)throw Error('Image must be smaller than 5 MB.');
 const valid=ext==='.png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):ext==='.webp'?bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP':bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!valid)throw Error('The file is not a supported image.');
 if(p.modelId!==undefined&&p.modelId!==''&&!/^[a-z0-9-]+$/.test(p.modelId))throw Error('Choose a valid model.');
 if(p.physicalPin!==undefined&&typeof p.physicalPin!=='boolean')throw Error('Invalid pin option.');
 if(p.quizReady&&!p.physicalPin&&(!p.marker||!['x','y'].every(k=>Number.isFinite(p.marker[k])&&p.marker[k]>=0&&p.marker[k]<=1)))throw Error('Click the target structure to place marker A.');
 return {bytes,ext};
}
export async function registerUpload(root,p){
 const {bytes,ext}=validateUpload(p);const structurePath=path.join(root,'content/structures',p.structureId+'.json');const before=await fs.readFile(structurePath);const imagesPath=path.join(root,'content/images.json'),imagesBefore=await fs.readFile(imagesPath);
 const structure=JSON.parse(before);const models=p.modelId?JSON.parse(await fs.readFile(path.join(root,'content/models.json'))):[];const model=models.find(m=>m.id===p.modelId);const description=p.alt?.trim()||structure.name+(model?' — '+model.name:'');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'anatomy-image-'));try{const input=path.join(dir,'image'+ext);await fs.writeFile(input,bytes);const args=[path.join(root,'scripts/add-image.mjs'),p.structureId,input,description,'--credit',p.credit?.trim()||'Local image'];if(p.modelId)args.push('--model',p.modelId);if(p.quizReady){args.push('--quiz',input,'--quiz-alt',p.physicalPin?'Identify the pinned structure.':'Identify the structure marked A.');if(!p.physicalPin)args.push('--marker-x',String(p.marker.x),'--marker-y',String(p.marker.y));}
 await exec(process.execPath,args,{cwd:root});try{await exec(process.execPath,[path.join(root,'scripts/build-data.mjs')],{cwd:root});}catch(error){await fs.writeFile(structurePath,before);await fs.writeFile(imagesPath,imagesBefore);throw Error('The image was not registered because the data checks failed.');}
 return {ok:true};
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
