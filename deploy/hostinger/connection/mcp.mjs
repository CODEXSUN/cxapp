import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
let env;try{env=parseEnv(await readFile(new URL('../../../.env',import.meta.url),'utf8'))}catch{console.error('CXApp root .env unavailable');process.exit(1)}
if(!env.HOSTINGER_API_TOKEN){console.error('HOSTINGER_API_TOKEN is missing');process.exit(1)}
const cmd=process.platform==='win32'?'cmd.exe':'npx';
const args=process.platform==='win32'?['/d','/s','/c','npx -y @hostinger/mcp@3.24.1']:['-y','@hostinger/mcp@3.24.1'];
const child=spawn(cmd,args,{cwd:root,env:{...process.env,HOSTINGER_API_TOKEN:env.HOSTINGER_API_TOKEN},stdio:'inherit',windowsHide:true});
child.on('error',()=>{console.error('Hostinger MCP could not start');process.exitCode=1});
child.on('exit',(code,signal)=>{if(signal)process.kill(process.pid,signal);else process.exitCode=code??1});
