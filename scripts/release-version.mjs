import fs from 'node:fs/promises';
const run=process.env.GITHUB_RUN_NUMBER;
if(!/^[1-9]\d*$/.test(run||''))throw Error('A positive GitHub workflow run number is required.');
const version=`1.3.${run}`;
for(const file of ['package.json','package-lock.json']){
 const value=JSON.parse(await fs.readFile(file,'utf8'));value.version=version;
 if(value.packages?.[''])value.packages[''].version=version;
 await fs.writeFile(file,JSON.stringify(value,null,2)+'\n');
}
if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,`version=${version}\n`);
console.log(`Desktop release version: ${version}`);
