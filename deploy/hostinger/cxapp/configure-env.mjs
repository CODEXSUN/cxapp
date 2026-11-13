import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
const env=parseEnv(await readFile(new URL('../../../.env',import.meta.url),'utf8'));
if(!env.SMTP_USER || !env.ENQUIRY_TO || !env.CXAPP_SMTP_PASSWORD || !env.CXAPP_RELAY_SECRET) { console.error('Set SMTP_USER, ENQUIRY_TO, CXAPP_SMTP_PASSWORD and CXAPP_RELAY_SECRET in the root .env first.'); process.exit(1); }
const remote=`import json, os, sys, tempfile
v=json.load(sys.stdin)
p='/etc/cxapp-enquiry.env'
fd,tmp=tempfile.mkstemp(dir='/etc',prefix='.cxapp-')
try:
 os.fchmod(fd,0o600)
 with os.fdopen(fd,'w',encoding='utf-8') as f:
  for k in ('SMTP_PASSWORD','ENQUIRY_SHARED_SECRET','SMTP_USER','ENQUIRY_TO'):
   x=v[k]
   if any(c in x for c in '\\r\\n\\0'): raise ValueError('Invalid environment value')
   f.write(k+'='+json.dumps(x,ensure_ascii=False)+'\\n')
  f.write('PORT=3110\\n')
 os.replace(tmp,p)
finally:
 if os.path.exists(tmp): os.unlink(tmp)`;
const encoded=Buffer.from(remote).toString('base64');
const payload=JSON.stringify({SMTP_USER:env.SMTP_USER,ENQUIRY_TO:env.ENQUIRY_TO,SMTP_PASSWORD:env.CXAPP_SMTP_PASSWORD,ENQUIRY_SHARED_SECRET:env.CXAPP_RELAY_SECRET});
const result=spawnSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=12','codexsun-hostinger',`python3 -c "import base64;exec(base64.b64decode('${encoded}'))"`],{input:payload,encoding:'utf8',windowsHide:true});
if(result.status!==0){console.error('Could not securely update the VPS environment.');process.exit(1)}
console.log('VPS environment updated securely.');
