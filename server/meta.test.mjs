import test from 'node:test';
import assert from 'node:assert/strict';
import {readConfig,dateRange,graphClient,mapInsights,getInsights,MetaError} from './meta.mjs';
const config={account:'act_123',version:'v23.0',token:'fixture-token',user:'manager',password:'fixture-password-123',labels:{}};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status});
test('configuration fails closed without credentials and validates account/password',()=>{
  assert.throws(()=>readConfig({}),/Configure/);
  assert.throws(()=>readConfig({META_ACCESS_TOKEN:'fixture',META_AD_ACCOUNT_ID:'../other',DASHBOARD_PASSWORD:'fixture-password-123'}),/numeric/);
  assert.throws(()=>readConfig({META_ACCESS_TOKEN:'fixture',META_AD_ACCOUNT_ID:'123',DASHBOARD_PASSWORD:'short'}),/16/);
});
test('date ranges: default, invalid dates, reversed and excessive windows',()=>{
  assert.deepEqual(dateRange(new URLSearchParams(),new Date('2026-10-16T00:00:00Z')),{since:'2026-09-17',until:'2026-10-16'});
  for(const q of ['until=garbage','since=2026-02-30','since=2026-10-17&until=2026-10-16','since=2026-01-01&until=2026-10-16'])assert.throws(()=>dateRange(new URLSearchParams(q)),e=>e instanceof MetaError&&e.status===400);
});
test('Graph pagination uses bearer auth, strips URL token and rejects foreign redirects',async()=>{
  const calls=[];const client=graphClient(config,async(url,options)=>{calls.push({url:String(url),options});return reply(calls.length===1?{data:[{id:1}],paging:{next:'https://graph.facebook.com/v23.0/act_123/insights?after=page2&access_token=not-a-secret'}}:{data:[{id:2}]});});
  assert.deepEqual(await client('act_123/insights',{limit:1}),[{id:1},{id:2}]);
  assert.equal(calls[1].url.includes('access_token'),false);assert.equal(calls[0].options.headers.Authorization,'Bearer fixture-token');assert.equal(calls[0].options.redirect,'error');
  const foreign=graphClient(config,async()=>reply({data:[],paging:{next:'https://example.org/steal'}}));await assert.rejects(()=>foreign('act_123/insights',{}),/phân trang/);
});
test('expired token error is sanitized, never includes upstream payload/token',async()=>{
  const client=graphClient(config,async()=>reply({error:{code:190,message:'fixture-token'}},400));
  await assert.rejects(()=>client('act_123/insights',{}),e=>/hết hạn/.test(e.message)&&!e.message.includes('fixture-token'));
});
test('mapping preserves ad dimensions, explicit labels, decimals and avoids double counting purchase aliases',()=>{
  const result=mapInsights([{date_start:'2026-10-01',ad_id:'1',spend:'123.45',inline_link_clicks:'12',actions:[{action_type:'omni_purchase',value:'2'},{action_type:'purchase',value:'2'},{action_type:'lead',value:'4'},{action_type:'onsite_conversion.messaging_first_reply',value:'3'}],action_values:[{action_type:'omni_purchase',value:'500'}]}],[{id:'1',creative:{id:'c1',name:'Video',object_story_spec:{page_id:'99'}},adset:{targeting:{custom_audiences:[{id:'88',name:'Customers'}]}}}],{'1':{product:'Robot',owner:'Lan'}})[0];
  assert.equal(result.purchases,2);assert.equal(result.leads,4);assert.equal(result.messages,3);assert.equal(result.gmv,500);assert.equal(result.spend,123.45);assert.equal(result.page,'Page 99');assert.equal(result.product,'Robot');assert.equal(result.owner,'Lan');assert.equal(result.audience,'Customers');
});
test('API workflow requests daily ad-level insights and returns account currency without credentials',async()=>{
  const calls=[];const client=async(path,params)=>{calls.push({path,params});return path.endsWith('/insights')?[{date_start:'2026-10-01',ad_id:'1'}]:[];};client.object=async()=>({currency:'USD',name:'Test account',timezone_name:'Asia/Ho_Chi_Minh'});
  const data=await getInsights(config,{since:'2026-10-01',until:'2026-10-02'},client);assert.equal(data.currency,'USD');assert.equal(calls[0].params.level,'ad');assert.equal(calls[0].params.time_increment,1);assert.equal(JSON.stringify(data).includes('fixture-token'),false);
});
