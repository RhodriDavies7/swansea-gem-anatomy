import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {deleteImage} from '../local/image-api.mjs';
test('image deletion removes references and restores them when rebuilding fails',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'image-delete-'));
 try{
 await fs.mkdir(path.join(root,'content/structures'),{recursive:true});await fs.mkdir(path.join(root,'scripts'));
 const registry=path.join(root,'content/images.json'),structure=path.join(root,'content/structures/example.json'),builder=path.join(root,'scripts/build-data.mjs');
 const original=JSON.stringify([{id:'img-123'},{id:'img-456'}]);const linked=JSON.stringify({imageIds:['img-123','img-456']});
 await fs.writeFile(registry,original);await fs.writeFile(structure,linked);await fs.writeFile(builder,'process.exit(1)');
 await assert.rejects(deleteImage(root,{imageId:'img-123'}));assert.equal(await fs.readFile(registry,'utf8'),original);assert.equal(await fs.readFile(structure,'utf8'),linked);
 await fs.writeFile(builder,'');await deleteImage(root,{imageId:'img-123'});
 assert.deepEqual(JSON.parse(await fs.readFile(registry)),[{id:'img-456'}]);assert.deepEqual(JSON.parse(await fs.readFile(structure)).imageIds,['img-456']);
 await assert.rejects(deleteImage(root,{imageId:'../../bad'}));await assert.rejects(deleteImage(root,{imageId:'img-123'}));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
