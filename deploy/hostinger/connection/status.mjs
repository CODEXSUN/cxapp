import {readFile} from 'node:fs/promises';
import {HostingerSshService} from './hostinger-ssh.service.mjs';
try {
  const target=JSON.parse(await readFile(new URL('./target.json',import.meta.url),'utf8'));
  console.log(JSON.stringify(await new HostingerSshService(target).status(),null,2));
} catch(error) {
  console.error('Hostinger SSH status failed:',error instanceof Error?error.message:String(error));
  process.exitCode=1;
}
