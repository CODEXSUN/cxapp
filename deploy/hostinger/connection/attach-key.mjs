import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {parseEnv} from 'node:util';
const env=parseEnv(await readFile(new URL('../../../.env',import.meta.url),'utf8'));
if (!env.HOSTINGER_API_TOKEN) throw Error('HOSTINGER_API_TOKEN missing');
const key=(await readFile(join(homedir(),'.ssh','codexsun_hostinger_ed25519.pub'),'utf8')).trim();
const endpoint='https://developers.hostinger.com/api/vps/v1';
async function api(path,method='GET',body){const r=await fetch(endpoint+path,{method,headers:{Authorization:'Bearer '+env.HOSTINGER_API_TOKEN,'Content-Type':'application/json',Accept:'application/json'},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`Hostinger API request failed: HTTP ${r.status}`);return r.json()}
async function all(path){let result=[],page=1;while(true){const x=await api(path+'?page='+page);result.push(...(x.data||[]));if(!x.meta||page>=Math.ceil(x.meta.total/x.meta.per_page))return result;if(++page>100)throw Error('Too many public key pages')}}
const vm=await api('/virtual-machines/914719');if(Number(vm.id)!==914719||!(vm.ipv4||[]).some(x=>x.address==='69.62.81.166'))throw Error('VPS identity mismatch');
const material=k=>String(k).trim().split(/\s+/).slice(0,2).join(' ');
const account=await all('/public-keys');let existing=account.find(x=>material(x.key)===material(key));if(!existing){existing=await api('/public-keys','POST',{name:'cxapp-hostinger',key});console.log('Registered CXApp public key.');}
if(!Number.isSafeInteger(existing.id))throw Error('Invalid key ID');
const action=await api('/public-keys/attach/914719','POST',{ids:[existing.id]});console.log('Attach request accepted; action state:',action.state||'unknown');
