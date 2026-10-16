const GRAPH_ORIGIN='https://graph.facebook.com';
export class MetaError extends Error {
  constructor(message,status=502){super(message);this.status=status;}
}
export function readConfig(env=process.env){
  const required=['META_ACCESS_TOKEN','META_AD_ACCOUNT_ID','DASHBOARD_PASSWORD'];
  if(required.some(key=>!env[key]))throw new Error('Configure META_ACCESS_TOKEN, META_AD_ACCOUNT_ID and DASHBOARD_PASSWORD securely on the backend host.');
  const account=env.META_AD_ACCOUNT_ID.replace(/^act_/,'');
  if(!/^\d+$/.test(account))throw new Error('META_AD_ACCOUNT_ID must contain the numeric ad account ID.');
  if(env.DASHBOARD_PASSWORD.length<16)throw new Error('DASHBOARD_PASSWORD must have at least 16 characters.');
  const version=env.META_API_VERSION||'v23.0';
  if(!/^v\d+\.\d+$/.test(version))throw new Error('Invalid META_API_VERSION.');
  let labels;try{labels=JSON.parse(env.META_AD_LABELS_JSON||'{}');}catch{throw new Error('META_AD_LABELS_JSON must be a JSON object.');}
  if(!labels||Array.isArray(labels)||typeof labels!=='object')throw new Error('META_AD_LABELS_JSON must be a JSON object.');
  return {account:`act_${account}`,token:env.META_ACCESS_TOKEN,version,user:env.DASHBOARD_USER||'manager',password:env.DASHBOARD_PASSWORD,labels};
}
export function dateRange(query,now=new Date()){
  const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
  const until=query.get('until')||now.toISOString().slice(0,10);
  if(!valid(until))throw new MetaError('Ngày kết thúc không hợp lệ.',400);
  const since=query.get('since')||new Date(+new Date(until+'T00:00:00Z')-29*86400000).toISOString().slice(0,10);
  if(!valid(since)||since>until||(Date.parse(until)-Date.parse(since))/86400000>92)throw new MetaError('Khoảng ngày phải hợp lệ, tối đa 93 ngày.',400);
  return {since,until};
}
export function graphClient(config,fetcher=fetch){
  const prefix=`/${config.version}/`;
  const makeUrl=(path,params)=>{const url=new URL(`${GRAPH_ORIGIN}${prefix}${path}`);for(const [key,value]of Object.entries(params))url.searchParams.set(key,typeof value==='object'?JSON.stringify(value):String(value));return url;};
  async function request(url){
    const res=await fetcher(url,{headers:{Authorization:`Bearer ${config.token}`},signal:AbortSignal.timeout(30000),redirect:'error'});
    let body;try{body=await res.json();}catch{throw new MetaError('Meta trả phản hồi không hợp lệ.');}
    if(!res.ok||body.error){const code=body.error?.code;throw new MetaError(code===190?'Quyền truy cập Meta đã hết hạn hoặc không hợp lệ. Cập nhật token trên backend.':code===10||code===200?'Token thiếu quyền ads_read hoặc quyền truy cập tài khoản quảng cáo.':'Không thể đọc dữ liệu Meta. Kiểm tra quyền, phiên bản API, hạn mức hoặc thử lại sau.');}
    return body;
  }
  async function pages(path,params){
    let url=makeUrl(path,params);const all=[];let count=0;
    while(url){
      if(++count>1000)throw new MetaError('Dữ liệu quá lớn; hãy chọn khoảng ngày ngắn hơn.');
      const body=await request(url);
      if(!Array.isArray(body.data))throw new MetaError('Meta trả dữ liệu sai định dạng.');
      all.push(...body.data);
      const next=body.paging?.next;
      if(!next){url=null;continue;}
      let candidate;try{candidate=new URL(next);}catch{throw new MetaError('Meta trả phân trang không hợp lệ.');}
      if(candidate.origin!==GRAPH_ORIGIN||candidate.username||candidate.password||!candidate.pathname.startsWith(prefix))throw new MetaError('Meta trả phân trang không hợp lệ.');
      candidate.searchParams.delete('access_token');url=candidate;
    }
    return all;
  }
  pages.object=(path,params)=>request(makeUrl(path,params));
  return pages;
}
const finite=value=>{const n=Number(value);return Number.isFinite(n)?n:0;};
function actionValue(list,aliases){for(const key of aliases){const item=(list||[]).find(a=>a.action_type===key);if(item)return finite(item.value);}return 0;}
export function mapInsights(insights,ads,labels={}){
  const byId=new Map(ads.map(ad=>[ad.id,ad]));
  return insights.map(row=>{
    const ad=byId.get(row.ad_id)||{},creative=ad.creative||{},label=labels[row.ad_id]||{};
    const pageId=creative.object_story_spec?.page_id||String(creative.effective_object_story_id||'').split('_')[0];
    const audience=ad.adset?.targeting?.custom_audiences?.map(a=>a.name||a.id).join(', ')||'';
    return {date:row.date_start,campaign:row.campaign_name||'',campaign_id:row.campaign_id,adset:row.adset_name||'',adset_id:row.adset_id,ad:row.ad_name||ad.name||'',ad_id:row.ad_id,creative:creative.name||creative.id||'',audience:label.audience||audience||'Chưa phân bổ',target:label.audience||audience||'Chưa phân bổ',product:label.product||'Chưa phân bổ',owner:label.owner||'',page:label.page||(pageId?`Page ${pageId}`:'Chưa phân bổ'),page_id:pageId||'',objective:row.objective||ad.campaign?.objective||'',spend:finite(row.spend),impressions:finite(row.impressions),reach:finite(row.reach),clicks:finite(row.inline_link_clicks),frequency:finite(row.frequency),purchases:actionValue(row.actions,['omni_purchase','purchase','offsite_conversion.fb_pixel_purchase']),leads:actionValue(row.actions,['lead','onsite_conversion.lead_grouped','offsite_conversion.fb_pixel_lead']),messages:actionValue(row.actions,['onsite_conversion.messaging_first_reply']),gmv:actionValue(row.action_values,['omni_purchase','purchase','offsite_conversion.fb_pixel_purchase'])};
  });
}
export async function getInsights(config,range,client=graphClient(config)){
  const [insights,ads,account]=await Promise.all([
    client(`${config.account}/insights`,{fields:'date_start,date_stop,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,objective,spend,impressions,reach,inline_link_clicks,frequency,actions,action_values',level:'ad',time_increment:1,time_range:range,limit:500}),
    client(`${config.account}/ads`,{fields:'id,name,creative{id,name,object_story_spec,effective_object_story_id},adset{id,name,targeting},campaign{id,name,objective}',limit:100}),
    client.object(config.account,{fields:'currency,name,timezone_name'})
  ]);
  return {dailyRows:mapInsights(insights,ads,config.labels),source:'META_ADS_API',account:config.account,currency:account.currency,accountName:account.name,timezone:account.timezone_name,period:range,fetchedAt:new Date().toISOString(),notes:['Meta attribution data; not reconciled sales.','Product and owner require explicit ad-label mapping.','Frequency across days is approximate.']};
}
