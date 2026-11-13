const allowedOrigins = new Set(['https://app.codexsun.com']);
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const json = (body, status=200) => new Response(JSON.stringify(body), {status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean = (value,max) => typeof value==='string' ? value.trim().slice(0,max) : '';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/enquiry/status') return json({available: Boolean(env.ENQUIRY_SHARED_SECRET && env.ENQUIRY_RELAY_ENABLED === 'true')});
    if (url.pathname !== '/api/enquiry') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return json({error:'Method not allowed.'},405);
    const origin=request.headers.get('Origin');
    if (!origin || !allowedOrigins.has(origin)) return json({error:'Invalid request origin.'},403);
    const ip=request.headers.get('CF-Connecting-IP');
    if (!ip || !env.ENQUIRY_RATE_LIMIT) return json({error:'The enquiry form is temporarily unavailable. Please email us directly.'},503);
    try { if (!(await env.ENQUIRY_RATE_LIMIT.limit({key:ip})).success) return json({error:'Too many enquiries. Please try again later.'},429); } catch { return json({error:'The enquiry form is temporarily unavailable. Please email us directly.'},503); }
    if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return json({error:'Invalid content type.'},415);
    if (Number(request.headers.get('Content-Length') || 0)>12000) return json({error:'Enquiry is too long.'},413);
    let payload;
    try { const body=await request.text(); if(body.length>12000)return json({error:'Enquiry is too long.'},413); payload=JSON.parse(body); } catch { return json({error:'Invalid enquiry.'},400); }
    if (!payload || typeof payload!=='object' || Array.isArray(payload)) return json({error:'Invalid enquiry.'},400);
    if (clean(payload.website,200)) return json({ok:true});
    const name=clean(payload.name,120), email=clean(payload.email,254), company=clean(payload.company,160), phone=clean(payload.phone,40), message=clean(payload.message,5000);
    if(!name || !emailPattern.test(email) || /[\r\n]/.test(email) || message.length<10) return json({error:'Please enter your name, a valid email and an enquiry of at least 10 characters.'},400);
    if(!env.ENQUIRY_SHARED_SECRET || env.ENQUIRY_RELAY_ENABLED !== 'true') return json({error:'The enquiry form is temporarily unavailable. Please email us directly.'},503);
    try {
      const response=await fetch('https://mail-api.codexsun.com/enquiry',{method:'POST',headers:{Authorization:'Bearer '+env.ENQUIRY_SHARED_SECRET,'Content-Type':'application/json'},body:JSON.stringify({name,email,company,phone,message}),signal:AbortSignal.timeout(25000),redirect:'manual'});
      if(!response.ok) { console.error('Relay HTTP status',response.status); return json({error:'Unable to send your enquiry. Please email us directly.'},502); }
      return json({ok:true});
    } catch (error) {console.error('Relay connection failed',error instanceof Error ? error.message : 'unknown');return json({error:'Unable to send your enquiry. Please email us directly.'},502)}

  }
};
