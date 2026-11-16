import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
const arch=process.argv[2];
if(!['arm64','x64'].includes(arch))throw Error('Expected arm64 or x64');
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const app=path.resolve('release',arch==='arm64'?'mac-arm64':'mac','Swansea GEM Anatomy.app');
const dmg=path.resolve('release',`Swansea-GEM-Anatomy-${version}-${arch}.dmg`);
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'anatomy-dmg-'));
const staging=path.join(tmp,'contents'),mount=path.join(tmp,'mounted');
let mounted=false;
try{
 await fs.mkdir(staging);await fs.mkdir(mount);
 execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
 execFileSync('ditto',[app,path.join(staging,'Swansea GEM Anatomy.app')],{stdio:'inherit'});
 await fs.symlink('/Applications',path.join(staging,'Applications'));
 // Create the final filesystem directly; avoid resize/customisation of a mounted image.
 execFileSync('hdiutil',['create','-ov','-volname','Swansea GEM Anatomy','-srcfolder',staging,'-fs','HFS+','-format','UDZO',dmg],{stdio:'inherit'});
 execFileSync('hdiutil',['verify',dmg],{stdio:'inherit'});
 execFileSync('hdiutil',['attach','-readonly','-nobrowse','-mountpoint',mount,dmg],{stdio:'inherit'});mounted=true;
 execFileSync('codesign',['--verify','--deep','--strict',path.join(mount,'Swansea GEM Anatomy.app')],{stdio:'inherit'});
 await fs.access(path.join(mount,'Applications'));
 console.log('Verified DMG checksums, mounted filesystem and bundled app signature: '+dmg);
}finally{
 if(mounted)execFileSync('hdiutil',['detach',mount],{stdio:'inherit'});
 await fs.rm(tmp,{recursive:true,force:true});
}
