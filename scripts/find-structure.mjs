import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';import path from 'node:path';
const root=fileURLToPath(new URL('../content/structures/',import.meta.url));const query=process.argv.slice(2).join(' ').trim().toLowerCase();if(!query)throw Error('Usage: npm run structure:find -- "pectoralis"');
for(const file of await fs.readdir(root)){if(!file.endsWith('.json'))continue;const s=JSON.parse(await fs.readFile(path.join(root,file)));if([s.name,...s.aliases,s.id].some(n=>n.toLowerCase().includes(query)))console.log(s.id+'\n  '+s.name+' · '+s.regions.join(', ')+'\n');}
