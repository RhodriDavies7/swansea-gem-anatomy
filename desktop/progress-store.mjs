import fs from 'node:fs/promises';
import path from 'node:path';
import {emptyProgress,validateProgress,applyRating,mergeProgress} from '../dist/review-scheduler.js';
export class ProgressStore{
 constructor(directory){this.directory=directory;this.file=path.join(directory,'progress-v1.json');this.backup=this.file+'.backup';this.queue=Promise.resolve();}
 async init(){
  await fs.mkdir(this.directory,{recursive:true});
  let missing=true;
  for(const file of [this.file,this.backup]){
   try{
    const raw=JSON.parse(await fs.readFile(file,'utf8'));
    if(raw?.schemaVersion>1)throw Object.assign(Error('This progress file requires a newer app. It has been preserved.'),{future:true});
    this.data=validateProgress(raw);
    if(file===this.backup){
     try{await fs.copyFile(this.file,this.file+'.corrupt-'+Date.now());}catch(error){if(error.code!=='ENOENT')throw error;}
     await this.write(this.data);
    }
    return this.data;
   }catch(error){if(error.future)throw error;if(error.code!=='ENOENT')missing=false;}
  }
  if(missing){this.data=emptyProgress();return this.data;}
  throw Error('Progress could not be read. Your files have been preserved. Import a progress backup before reviewing.');
 }
 async write(data){
  const tmp=this.file+'.tmp';const handle=await fs.open(tmp,'w',0o600);
  try{await handle.writeFile(JSON.stringify(data));await handle.sync();}finally{await handle.close();}
  // The backup is itself atomic; a failed save never replaces the in-memory state.
  if(this.data){const b=this.backup+'.tmp';await fs.writeFile(b,JSON.stringify(this.data),{mode:0o600});await fs.rename(b,this.backup);}
  await fs.rename(tmp,this.file);this.data=data;
 }
 transact(fn){const task=this.queue.then(async()=>{if(!this.data)throw Error('Progress unavailable');const next=fn(this.data);await this.write(next);return structuredClone(next);});this.queue=task.catch(()=>{});return task;}
 rate(key,rating){return this.transact(data=>applyRating(data,key,rating));}
 import(value){validateProgress(value);if(this.data)return this.transact(data=>mergeProgress(data,value));const task=this.queue.then(async()=>{try{await fs.copyFile(this.file,this.file+'.before-restore-'+Date.now());}catch(error){if(error.code!=='ENOENT')throw error;}await this.write(mergeProgress(emptyProgress(),value));return structuredClone(this.data);});this.queue=task.catch(()=>{});return task;}
 async snapshot(){await this.queue;if(!this.data)throw Error('Progress unavailable');return structuredClone(this.data);}
}
