import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import nodemailer from 'nodemailer';
import {enquiryHtml} from './email-template.mjs';

const {SMTP_PASSWORD, SMTP_USER, ENQUIRY_TO, ENQUIRY_SHARED_SECRET} = process.env;
if (!SMTP_USER || !ENQUIRY_TO) throw Error('SMTP_USER and ENQUIRY_TO are required');
if (!SMTP_PASSWORD || !ENQUIRY_SHARED_SECRET || ENQUIRY_SHARED_SECRET.length < 32) throw Error('SMTP_PASSWORD and a shared secret of at least 32 characters are required');
const port = Number(process.env.PORT || 3110);
const transport = nodemailer.createTransport({host:'smtp.hostinger.com',port:465,secure:true,auth:{user:SMTP_USER,pass:SMTP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000});
const send = (res,status,body) => {res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));};
const clean = (x,n) => typeof x==='string' ? x.trim().slice(0,n) : '';
http.createServer(async (req,res) => {
  if(req.method!=='POST'||req.url!=='/enquiry') return send(res,404,{error:'Not found'});
  const token=Buffer.from(req.headers.authorization || ''), expected=Buffer.from('Bearer '+ENQUIRY_SHARED_SECRET);
  if(token.length!==expected.length||!timingSafeEqual(token,expected)) return send(res,401,{error:'Unauthorized'});
  if(!(req.headers['content-type']||'').toLowerCase().startsWith('application/json')) return send(res,415,{error:'Invalid content type'});
  let body='';
  try {
    for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>12000) return send(res,413,{error:'Too large'});}
    const p=JSON.parse(body); if(!p||typeof p!=='object'||Array.isArray(p))return send(res,400,{error:'Invalid enquiry'});
    const name=clean(p.name,120),email=clean(p.email,254),company=clean(p.company,160),phone=clean(p.phone,40),message=clean(p.message,5000);
    if(!name||!email||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||/[\r\n]/.test(email)||message.length<10)return send(res,400,{error:'Invalid enquiry'});
    const text=['New website enquiry','','Name: '+name,'Email: '+email,'Company: '+(company||'Not provided'),'Phone: '+(phone||'Not provided'),'','Enquiry:',message].join('\n');
    await transport.sendMail({from:{name:'CXApp',address:SMTP_USER},to:ENQUIRY_TO,replyTo:email,subject:'New website enquiry - CXApp',text,html:enquiryHtml({name,email,company,phone,message})});
    return send(res,200,{ok:true});
  } catch (error) {console.error('Enquiry failed:', error?.code || 'invalid request or mail error');return send(res,502,{error:'Delivery failed'});}
}).listen(port,process.env.BIND_ADDRESS || '127.0.0.1',()=>console.log(`Enquiry service listening on port ${port}`));
