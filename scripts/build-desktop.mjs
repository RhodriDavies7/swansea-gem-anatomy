import {build} from 'esbuild';
import fs from 'node:fs/promises';
await build({entryPoints:['desktop/fsrs-entry.js'],bundle:true,format:'esm',outfile:'dist/vendor/fsrs.js',minify:true,legalComments:'eof'});
await fs.copyFile('node_modules/ts-fsrs/LICENSE','dist/vendor/FSRS-LICENSE.txt');
