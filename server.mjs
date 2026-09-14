import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {registerUpload,deleteImage} from './local/image-api.mjs';
const project=fileURLToPath(new URL('./',import.meta.url)),root=path.resolve(project,'dist');
const token=randomBytes(32).toString('hex');let saving=false;
const mime={'.pdf':'application/pdf','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
function send(res,status,body,type='text/plain'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(body);}
const server=http.createServer(async(req,res)=>{try{
 const host=req.headers.host||'';if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)){send(res,403,'Local access only');return;}
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/_local/images'){
  if(!['POST','DELETE'].includes(req.method)||req.headers.origin!=='http://'+host||req.headers['x-local-token']!==token||req.headers['content-type']!=='application/json'){send(res,403,'Forbidden');return;}
  if(saving){send(res,409,JSON.stringify({error:'Another image is being saved. Try again shortly.'}),'application/json');return;}
  saving=true;try{let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024)throw Error('Image is too large.');chunks.push(chunk);}const result=await (req.method==='DELETE'?deleteImage:registerUpload)(project,JSON.parse(Buffer.concat(chunks)));send(res,200,JSON.stringify(result),'application/json');}catch(error){send(res,400,JSON.stringify({error:error.message.includes('ENOENT')?'The selected structure could not be found.':error.message}),'application/json');}finally{saving=false;}return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){send(res,405,'Method not allowed');return;}
 if(pathname==='/manage-images'){const html=(await readFile(path.join(project,'local/image-manager.html'),'utf8')).replace('__TOKEN__',token);send(res,200,html,'text/html; charset=utf-8');return;}
 if(pathname==='/_local/image-manager.js'){send(res,200,await readFile(path.join(project,'local/image-manager.js')),'text/javascript; charset=utf-8');return;}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){send(res,403,'Forbidden');return;}
 send(res,200,await readFile(file),mime[path.extname(file)]||'application/octet-stream');
}catch{send(res,404,'Not found');}});
server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('Anatomy ready at http://127.0.0.1:'+server.address().port));
