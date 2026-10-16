import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from './index.mjs';
import {MetaError} from './meta.mjs';
const config={account:'act_123',version:'v23.0',token:'fixture-meta-token',user:'manager',password:'fixture-password-123',labels:{}};
const headers={Authorization:'Basic '+Buffer.from(`${config.user}:${config.password}`).toString('base64')};
async function fixture(t,insights){const server=createServer(config,{insights,now:()=>new Date('2026-10-16')});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));return `http://127.0.0.1:${server.address().port}`;}
test('all dashboard/data routes require auth; health stays public; config never exposes tokens',async t=>{
  const base=await fixture(t,async()=>({dailyRows:[]}));
  assert.equal((await fetch(base+'/healthz')).status,200);
  for(const path of ['/','/api/insights','/meta_ads_dashboard_web/config.js','/meta_ads_dashboard_web/app.js'])assert.equal((await fetch(base+path)).status,401);
  assert.equal((await fetch(base+'/api/insights',{headers:{Authorization:'Basic '+Buffer.from('manager:wrong').toString('base64')}})).status,401);
  const configRes=await fetch(base+'/meta_ads_dashboard_web/config.js',{headers});const text=await configRes.text();assert.match(text,/\/api\/insights/);assert.equal(text.includes(config.token),false);assert.equal(text.includes(config.password),false);assert.equal(configRes.headers.get('cache-control'),'no-store');
  assert.equal((await fetch(base+'/.env',{headers})).status,404);
  const root=await fetch(base+'/',{headers});assert.equal(root.status,200);assert.match(await root.text(),/data-mode="manager"/);
});
test('insights validate range, coalesce cached requests, reject unsupported methods',async t=>{
  let count=0;const base=await fixture(t,async()=>{count++;return {dailyRows:[{date:'2026-10-01',spend:100}]};});
  const responses=await Promise.all([fetch(base+'/api/insights',{headers}),fetch(base+'/api/insights',{headers})]);for(const r of responses)assert.equal(r.status,200);assert.equal(count,1);
  assert.equal((await fetch(base+'/api/insights?until=invalid',{headers})).status,400);
  assert.equal((await fetch(base+'/api/insights',{method:'POST',headers})).status,405);
});
test('Meta failure stays an error, is not cached and never returns sample data',async t=>{
  let count=0;const base=await fixture(t,async()=>{count++;throw new MetaError('Token đã hết hạn.');});
  for(let i=0;i<2;i++){const r=await fetch(base+'/api/insights',{headers});assert.equal(r.status,502);assert.deepEqual(await r.json(),{error:'Token đã hết hạn.'});}assert.equal(count,2);
});
