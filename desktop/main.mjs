import {app,BrowserWindow,protocol,net,ipcMain,dialog,shell,Menu} from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ProgressStore} from './progress-store.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),web=path.resolve(here,'../dist');
protocol.registerSchemesAsPrivileged([{scheme:'anatomy',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
// A fixed path independent of version, install location and the web origin.
app.setPath('userData',path.join(app.getPath('appData'),'Swansea GEM Anatomy'));
app.setName('Swansea GEM Anatomy');
const smoke=process.env.ANATOMY_SMOKE_DIR;
const testData=process.env.ANATOMY_TEST_DATA;
if(testData)app.setPath('userData',path.resolve(testData));
if(smoke)app.setPath('userData',path.resolve(smoke));
let store,mainWindow;
const single=app.requestSingleInstanceLock();if(!single)app.quit();
app.on('second-instance',()=>{mainWindow?.show();mainWindow?.focus();});
function trusted(event){if(!event.senderFrame?.url.startsWith('anatomy://app/'))throw Error('Untrusted request');}
async function window(){
 mainWindow=new BrowserWindow({width:1280,height:860,minWidth:760,minHeight:600,backgroundColor:'#f4f7fb',title:'Swansea GEM Anatomy',webPreferences:{preload:path.join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 mainWindow.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 mainWindow.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//.test(url))shell.openExternal(url);return {action:'deny'};});
 mainWindow.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('anatomy://app/')){event.preventDefault();if(/^https:\/\//.test(url))shell.openExternal(url);}});
 await mainWindow.loadURL('anatomy://app/review.html');
 if(smoke){
  try{const result=await mainWindow.webContents.executeJavaScript(`(async()=>{await new Promise(r=>setTimeout(r,1200));const bridge=!!window.anatomyDesktop;const m=await import('./review-client.js');await m.ready;const s=await window.anatomyDesktop.rate(JSON.stringify(['smoke','stable']),3);return {bridge,records:Object.keys(s.records).length,title:document.title,body:document.body.innerText.slice(0,300)};})()`);await fs.writeFile(path.join(smoke,'smoke-result.json'),JSON.stringify(result));await fs.writeFile(path.join(smoke,'smoke.png'),(await mainWindow.webContents.capturePage()).toPNG());app.quit();}catch(e){await fs.writeFile(path.join(smoke,'smoke-error.txt'),String(e));app.exit(1);}
 }
}
if(single)app.whenReady().then(async()=>{
 protocol.handle('anatomy',request=>{
  try{const u=new URL(request.url);if(u.host!=='app'||request.method!=='GET')return new Response('Forbidden',{status:403});
   const relative=decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname);const file=path.resolve(web,'.'+relative);
   if(!file.startsWith(web+path.sep))return new Response('Forbidden',{status:403});return net.fetch(pathToFileURL(file).href);
  }catch{return new Response('Not found',{status:404});}
 });
 store=new ProgressStore(app.getPath('userData'));try{await store.init();}catch(e){dialog.showErrorBox('Progress needs attention',e.message);}
 ipcMain.handle('progress:load',async event=>{trusted(event);return store.snapshot();});
 ipcMain.handle('progress:rate',async(event,key,rating)=>{trusted(event);return store.rate(key,rating);});
 ipcMain.handle('progress:export',async event=>{trusted(event);const snapshot=await store.snapshot();const choice=await dialog.showSaveDialog(mainWindow,{defaultPath:'Swansea-GEM-progress-'+new Date().toISOString().slice(0,10)+'.json',filters:[{name:'Progress backup',extensions:['json']}]});if(choice.canceled)return false;await fs.writeFile(choice.filePath,JSON.stringify(snapshot,null,2));return true;});
 ipcMain.handle('progress:import',async event=>{trusted(event);const choice=await dialog.showOpenDialog(mainWindow,{properties:['openFile'],filters:[{name:'Progress backup',extensions:['json']}]});if(choice.canceled)return null;const file=choice.filePaths[0];if((await fs.stat(file)).size>50*1024*1024)throw Error('Backup exceeds 50 MB');const data=JSON.parse(await fs.readFile(file,'utf8'));return store.import(data);});
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:app.name,submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{role:'quit'}]},{role:'editMenu'},{label:'View',submenu:[{role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]},{role:'windowMenu'}]));
 await window();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)window();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
