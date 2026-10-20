import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const node=readFileSync(new URL('../../.node-version',import.meta.url),'utf8').trim();
if(process.versions.node!==node)throw Error(`Recovery requires Node ${node}; found ${process.versions.node}.`);
const npm=process.env.npm_config_user_agent?.match(/^npm\/([^ ]+)/)?.[1] || execFileSync('npm',['--version'],{encoding:'utf8'}).trim();
if(npm!=='12.2.1')throw Error(`Recovery requires npm 12.2.1; found ${npm}.`);
console.log(`Recovery environment: Node ${node}, npm ${npm}.`);
