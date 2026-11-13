const {execFileSync}=require('node:child_process');
const path=require('node:path');
module.exports=async context=>{
 if(context.electronPlatformName!=='darwin')return;
 const app=path.join(context.appOutDir,context.packager.appInfo.productFilename+'.app');
 execFileSync('/usr/bin/codesign',['--verify','--deep','--strict','--verbose=2',app],{stdio:'pipe'});
 console.log('Verified complete Mac app signature: '+app);
};
