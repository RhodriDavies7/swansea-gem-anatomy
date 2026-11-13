const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('anatomyDesktop',Object.freeze({
 loadProgress:()=>ipcRenderer.invoke('progress:load'),
 rate:(key,rating)=>ipcRenderer.invoke('progress:rate',key,rating),
 exportProgress:()=>ipcRenderer.invoke('progress:export'),
 importProgress:()=>ipcRenderer.invoke('progress:import')
}));
