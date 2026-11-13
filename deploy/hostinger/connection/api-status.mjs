import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
let env; try {env=parseEnv(await readFile(new URL('../../../.env',import.meta.url),'utf8'));} catch {console.error('Cannot read the root .env file.');process.exit(1)}
const token=env.HOSTINGER_API_TOKEN;
if(!token){console.error('HOSTINGER_API_TOKEN is empty in the root .env file.');process.exit(1)}
try {
 const response=await fetch('https://developers.hostinger.com/api/vps/v1/virtual-machines/914719',{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok){console.error(`Hostinger connection failed (HTTP ${response.status}).`);process.exitCode=1;} else {const vm=await response.json();const ips=(vm.ipv4||[]).map(x=>x.address);if(Number(vm.id)!==914719||!ips.includes('69.62.81.166')){console.error('Hostinger returned a VPS that does not match the pinned target.');process.exitCode=1;}else console.log('Hostinger API authenticated and the pinned VPS identity matches.');}
} catch {console.error('Hostinger API connection failed.');process.exitCode=1}
