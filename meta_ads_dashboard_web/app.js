const cfg = window.DASHBOARD_CONFIG || {};
let charts = {};
let rawData = null;
let currentData = null;
let timer = null;

const sample = {
  period:{start:"2026-09-16",end:"2026-10-15"},
  summary:{currency:"VND",spend:305154553,impressions:4675106,cpm:65272.2212,cpc:3560.1068,ctr:0.0183,frequency:4.3332,clicks:85715,messages:2270,leads:530,purchases:142,roas:0.0316},
  segments:[
    {name:"Messenger",spend:63590802,impressions:349825,cpm:181778.8952,cpc:7069.5722,ctr:0.0257,frequency:3.9369,clicks:8995,messages:1954,leads:326,purchases:90,roas:0.016},
    {name:"Lead",spend:3965593,impressions:94649,cpm:41897.8859,cpc:3457.3609,ctr:0.0121,frequency:2.9836,clicks:1147,messages:153,leads:171,purchases:11,roas:0},
    {name:"CPAS",spend:237598102,impressions:4230629,cpm:56161.4129,cpc:3143.9549,ctr:0.0179,frequency:4.331,clicks:75573,messages:163,leads:33,purchases:41,roas:0.0363}
  ],
  campaigns:[
    {campaign:"Tineco S7 Stretch Steam - CPAS",spend:23220141,cpm:59692.7999,cpc:3576.7315,ctr:0.0167,frequency:2.6845,purchases:4,roas:0,messages:31,leads:7},
    {campaign:"Ecovacs T30S Pro Plus - Click",spend:15858599,cpm:70009.3987,cpc:4559.6892,ctr:0.0154,frequency:null,purchases:3,roas:0.5442,messages:7,leads:4},
    {campaign:"Ecovacs T80 Max Omni - CPAS",spend:15196026,cpm:97385.4524,cpc:4262.5599,ctr:0.0228,frequency:null,purchases:3,roas:0,messages:9,leads:3},
    {campaign:"Ecovacs X12 OmniCyclone - Mess",spend:14625087,cpm:227199.9348,cpc:7905.4524,ctr:0.0287,frequency:2.4348,purchases:19,roas:0,messages:412,leads:73},
    {campaign:"Tineco tổ hợp 10.10 - CPAS",spend:13566506,cpm:43234.7612,cpc:2996.1365,ctr:0.0144,frequency:2.4741,purchases:2,roas:0,messages:2,leads:1},
    {campaign:"Ecovacs T90 Pro Omni LAL NG148 - Mess",spend:13530887,cpm:192569.3731,cpc:8884.3644,ctr:0.0217,frequency:2.6876,purchases:28,roas:0,messages:287,leads:88},
    {campaign:"Ecovacs T30C Max Omni - CPAS",spend:11564089,cpm:97167.4201,cpc:2603.3519,ctr:0.0373,frequency:null,purchases:0,roas:0,messages:5,leads:0},
    {campaign:"Ecovacs X11 Pro Omni NG119 Copy - Mess",spend:10958992,cpm:142961.3995,cpc:4436.8389,ctr:0.0322,frequency:2.177,purchases:9,roas:0,messages:669,leads:67},
    {campaign:"Ecovacs T30S Combo 02.10 - CPAS",spend:7941084,cpm:78067.3017,cpc:1544.6575,ctr:0.0505,frequency:1.8652,purchases:0,roas:0,messages:9,leads:1},
    {campaign:"Affiliate Ecovacs - Lead",spend:3001566,cpm:35484.5368,cpc:3756.6533,ctr:0.0094,frequency:3.1631,purchases:9,roas:0,messages:146,leads:168}
  ]
};


const snapshotDailySummary = [
  ["2026-09-16",9867083,217627,2360,1.9996,33,14,3,0],["2026-09-17",4809097,86518,1213,1.7096,61,16,4,0],["2026-09-18",4062259,48660,1287,1.8657,79,9,5,8630400],["2026-09-19",3528468,49727,1654,1.7238,52,19,4,0],["2026-09-20",4326521,56423,1871,1.8289,80,14,3,0],["2026-09-21",3629659,53100,1774,1.8240,42,21,3,0],["2026-09-22",4582958,62818,1765,1.8335,40,16,2,0],["2026-09-23",4993742,84602,1649,1.9161,49,10,20,0],["2026-09-24",7113440,128248,1388,1.8329,40,22,6,0],["2026-09-25",12258910,260960,2358,2.0666,37,10,5,0],["2026-09-26",8258911,162374,1700,1.9015,73,14,4,0],["2026-09-27",7120198,92889,1354,2.1754,74,21,7,0],["2026-09-28",4014602,33603,620,2.0246,66,24,12,0],["2026-09-29",3959974,35128,1144,1.7822,60,23,2,0],["2026-09-30",3709083,38516,1321,1.9344,67,16,3,0],["2026-10-01",3098923,39973,1224,1.7540,66,23,5,0],["2026-10-02",5262513,72711,2165,1.8431,67,18,3,0],["2026-10-03",5847516,84954,3297,1.9895,76,19,3,0],["2026-10-04",7178754,104256,4332,1.9334,83,18,3,0],["2026-10-05",5912300,110891,3969,1.9250,62,16,5,0],["2026-10-06",10964957,229389,5901,1.9371,51,16,1,0],["2026-10-07",17580368,388073,7376,2.1210,62,16,4,0],["2026-10-08",21602676,370607,7338,2.2897,75,21,5,1019000],["2026-10-09",22542316,306593,5505,2.2318,90,18,9,0],["2026-10-10",35784837,346331,5241,2.6436,86,12,4,0],["2026-10-11",34136454,434403,5107,2.4960,113,14,3,0],["2026-10-12",9656173,90162,1762,2.3671,133,20,4,0],["2026-10-13",6989309,70909,1792,2.0703,130,29,4,0],["2026-10-14",11911038,211905,3198,1.9590,194,18,4,0],["2026-10-15",20453021,402780,4050,2.1856,129,23,2,0]
].map(r=>({date:r[0],spend:r[1],impressions:r[2],clicks:r[3],frequency:r[4],messages:r[5],leads:r[6],purchases:r[7],purchaseValue:r[8]}));

function aggregateSummaryRows(rows){
  const sum=k=>rows.reduce((a,b)=>a+(b[k]||0),0);
  const spend=sum('spend'), impressions=sum('impressions'), clicks=sum('clicks'), purchaseValue=sum('purchaseValue');
  const wt=rows.reduce((a,b)=>a+((b.frequency!=null&&b.impressions)?b.impressions:0),0);
  const fw=rows.reduce((a,b)=>a+((b.frequency!=null&&b.impressions)?b.frequency*b.impressions:0),0);
  return {currency:'VND',spend,impressions,cpm:impressions?spend/impressions*1000:null,cpc:clicks?spend/clicks:null,ctr:impressions?clicks/impressions:null,frequency:wt?fw/wt:null,clicks,messages:sum('messages'),leads:sum('leads'),purchases:sum('purchases'),roas:spend?purchaseValue/spend:null};
}

const fmtMoney=v=>v==null?"—":new Intl.NumberFormat('vi-VN').format(Math.round(v))+" ₫";
const fmtNum=v=>v==null?"—":new Intl.NumberFormat('vi-VN').format(Math.round(v));
const fmtPct=v=>v==null?"—":`${(v*100).toFixed(2)}%`;
const fmtX=v=>v==null?"—":`${Number(v).toFixed(2)}x`;
const fmtDec=v=>v==null?"—":Number(v).toFixed(2);
const iso=d=>d.toISOString().slice(0,10);

function recommendation(c){
  const msgCpl = c.messages>0 ? c.spend/c.messages : null;
  if(c.roas>=4) return ["SCALE","good"];
  if(msgCpl && msgCpl<=40000) return ["TĂNG NHẸ","good"];
  if(c.ctr<0.015 && c.spend>3000000) return ["ĐỔI CREATIVE","bad"];
  if(c.frequency>3 && c.ctr<0.02) return ["GIẢM/REFRESH","bad"];
  return ["GIỮ & KIỂM TRA","warn"];
}

function segmentName(campaign){
  const s=(campaign||'').toLowerCase();
  if(s.includes('_mess_') || s.includes(' - mess') || s.includes('messenger')) return 'Messenger';
  if(s.includes('_lead_') || s.includes(' - lead') || s.includes('khách hàng tiềm năng')) return 'Lead';
  return 'CPAS';
}

function aggregateDaily(rows){
  const byCampaign=new Map();
  for(const r of rows){
    const k=r.campaign;
    if(!byCampaign.has(k)) byCampaign.set(k,{campaign:k,spend:0,impressions:0,clicks:0,messages:0,leads:0,purchases:0,purchaseValue:0,reach:0,frequencyWeighted:0,frequencyWeight:0});
    const x=byCampaign.get(k);
    x.spend += r.spend||0; x.impressions += r.impressions||0; x.clicks += r.clicks||0; x.messages += r.messages||0; x.leads += r.leads||0; x.purchases += r.purchases||0; x.purchaseValue += r.purchaseValue||0;
    if(r.frequency!=null && r.impressions){ x.frequencyWeighted += r.frequency*r.impressions; x.frequencyWeight += r.impressions; }
  }
  const campaigns=[...byCampaign.values()].map(x=>({
    campaign:x.campaign, spend:x.spend, impressions:x.impressions, clicks:x.clicks,
    cpm:x.impressions?x.spend/x.impressions*1000:null,
    cpc:x.clicks?x.spend/x.clicks:null,
    ctr:x.impressions?x.clicks/x.impressions:null,
    frequency:x.frequencyWeight?x.frequencyWeighted/x.frequencyWeight:null,
    purchases:x.purchases, roas:x.spend?x.purchaseValue/x.spend:null,
    messages:x.messages, leads:x.leads
  }));
  const sum=k=>campaigns.reduce((a,b)=>a+(b[k]||0),0);
  const spend=sum('spend'), impressions=sum('impressions'), clicks=sum('clicks'), purchaseValue=rows.reduce((a,b)=>a+(b.purchaseValue||0),0);
  const frequencyWeight=rows.reduce((a,b)=>a+((b.frequency!=null&&b.impressions)?b.impressions:0),0);
  const frequencyWeighted=rows.reduce((a,b)=>a+((b.frequency!=null&&b.impressions)?b.frequency*b.impressions:0),0);
  const summary={currency:'VND',spend,impressions,cpm:impressions?spend/impressions*1000:null,cpc:clicks?spend/clicks:null,ctr:impressions?clicks/impressions:null,frequency:frequencyWeight?frequencyWeighted/frequencyWeight:null,clicks,messages:sum('messages'),leads:sum('leads'),purchases:sum('purchases'),roas:spend?purchaseValue/spend:null};
  const segs=['Messenger','Lead','CPAS'].map(name=>{
    const cs=campaigns.filter(c=>segmentName(c.campaign)===name); const sp=cs.reduce((a,b)=>a+(b.spend||0),0), imp=cs.reduce((a,b)=>a+(b.impressions||0),0), clk=cs.reduce((a,b)=>a+(b.clicks||0),0); const pv=rows.filter(r=>segmentName(r.campaign)===name).reduce((a,b)=>a+(b.purchaseValue||0),0);
    const fw=rows.filter(r=>segmentName(r.campaign)===name&&r.frequency!=null&&r.impressions).reduce((a,b)=>a+b.frequency*b.impressions,0), wt=rows.filter(r=>segmentName(r.campaign)===name&&r.frequency!=null&&r.impressions).reduce((a,b)=>a+b.impressions,0);
    return {name,spend:sp,impressions:imp,cpm:imp?sp/imp*1000:null,cpc:clk?sp/clk:null,ctr:imp?clk/imp:null,frequency:wt?fw/wt:null,clicks:clk,messages:cs.reduce((a,b)=>a+(b.messages||0),0),leads:cs.reduce((a,b)=>a+(b.leads||0),0),purchases:cs.reduce((a,b)=>a+(b.purchases||0),0),roas:sp?pv/sp:null};
  });
  return {summary,segments:segs,campaigns};
}

function applyDateFilter(){
  if(!rawData) return;
  const start=document.getElementById('startDate').value;
  const end=document.getElementById('endDate').value;
  if(rawData.dailyRows?.length){
    const filtered=rawData.dailyRows.filter(r=>(!start||r.date>=start)&&(!end||r.date<=end));
    const data=aggregateDaily(filtered);
    data.period={start,end};
    render(data, rawData.sourceLabel||'LIVE');
    document.getElementById('dateFilterStatus').textContent=`${filtered.length} dòng dữ liệu trong khoảng đã chọn`;
  } else if(rawData.dailySummaryRows?.length){
    const filtered=rawData.dailySummaryRows.filter(r=>(!start||r.date>=start)&&(!end||r.date<=end));
    const summary=aggregateSummaryRows(filtered);
    render({summary,segments:[],campaigns:[],period:{start,end}}, rawData.sourceLabel||'SNAPSHOT DAILY');
    document.getElementById('dateFilterStatus').textContent=`${filtered.length} ngày dữ liệu thực tế trong khoảng đã chọn · Bảng Campaign cần LIVE Sheet để lọc theo ngày.`;
  } else {
    render(rawData, rawData.sourceLabel||'SAMPLE');
    document.getElementById('dateFilterStatus').textContent='Nguồn hiện chưa có cột Date; cần thêm Date trong query Supermetrics để lọc chính xác.';
  }
}

function setPreset(type){
  const today=new Date(); let start,end=new Date(today);
  if(type==='7' || type==='30'){ start=new Date(today); start.setDate(start.getDate()-(Number(type)-1)); }
  else if(type==='thisMonth'){ start=new Date(today.getFullYear(),today.getMonth(),1); }
  else if(type==='lastMonth'){ start=new Date(today.getFullYear(),today.getMonth()-1,1); end=new Date(today.getFullYear(),today.getMonth(),0); }
  else if(type==='all'){
    if(rawData?.dailyRows?.length || rawData?.dailySummaryRows?.length){ const ds=(rawData.dailyRows||rawData.dailySummaryRows).map(r=>r.date).sort(); document.getElementById('startDate').value=ds[0]; document.getElementById('endDate').value=ds[ds.length-1]; applyDateFilter(); return; }
    document.getElementById('startDate').value=''; document.getElementById('endDate').value=''; applyDateFilter(); return;
  }
  document.getElementById('startDate').value=iso(start); document.getElementById('endDate').value=iso(end); applyDateFilter();
}

function render(data, sourceLabel){
  currentData=data; const s=data.summary;
  document.getElementById('connectionBadge').textContent=`DATA: ${sourceLabel}`;
  document.getElementById('lastUpdated').textContent='Cập nhật: '+new Date().toLocaleString('vi-VN');
  const cards=[['Spend',fmtMoney(s.spend)],['Impressions',fmtNum(s.impressions)],['CPM',fmtMoney(s.cpm)],['CPC Link',fmtMoney(s.cpc)],['CTR Link',fmtPct(s.ctr)],['Frequency',fmtDec(s.frequency)],['Messages',fmtNum(s.messages)],['Leads',fmtNum(s.leads)],['Purchases',fmtNum(s.purchases)],['ROAS',fmtX(s.roas)]];
  document.getElementById('kpis').innerHTML=cards.map(([a,b])=>`<div class="card kpi"><div class="label">${a}</div><div class="value">${b}</div></div>`).join('');
  const alerts=[];
  if(s.frequency>3) alerts.push(['Frequency cao',`Frequency tổng ${fmtDec(s.frequency)}. Nên kiểm tra ad fatigue theo campaign và refresh creative ở nhóm >3.`,'red']);
  if(s.roas!=null && s.roas<1) alerts.push(['ROAS thấp',`ROAS báo cáo ${fmtX(s.roas)}. Cần đối soát purchase value/attribution trước khi scale theo ROAS.`,'red']);
  const bestMsg=[...data.campaigns].filter(x=>x.messages>0).sort((a,b)=>(a.spend/a.messages)-(b.spend/b.messages))[0];
  if(bestMsg) alerts.push(['Messenger nổi bật',`${bestMsg.campaign}: ~${fmtMoney(bestMsg.spend/bestMsg.messages)}/new messaging contact.`,'green']);
  document.getElementById('alerts').innerHTML=alerts.map(a=>`<div class="alert ${a[2]}"><b>${a[0]}</b>${a[1]}</div>`).join('') || '<div class="alert green"><b>Không có cảnh báo lớn</b>Khoảng ngày đang chọn chưa có tín hiệu vượt ngưỡng.</div>';
  document.getElementById('campaignRows').innerHTML=(data.campaigns?.length?[...data.campaigns].sort((a,b)=>b.spend-a.spend).map(c=>{const [rec,cls]=recommendation(c); const mc=c.messages?c.spend/c.messages:null; const lc=c.leads?c.spend/c.leads:null; return `<tr><td>${c.campaign}</td><td>${fmtMoney(c.spend)}</td><td>${fmtMoney(c.cpm)}</td><td>${fmtMoney(c.cpc)}</td><td>${fmtPct(c.ctr)}</td><td>${fmtDec(c.frequency)}</td><td>${fmtNum(c.purchases)}</td><td>${fmtX(c.roas)}</td><td>${fmtNum(c.messages)}</td><td>${fmtNum(c.leads)}</td><td>${fmtMoney(mc)}</td><td>${fmtMoney(lc)}</td><td><span class="tag ${cls}">${rec}</span></td></tr>`}).join(''):`<tr><td colspan="13" style="text-align:center;color:#6b7280;padding:22px">Snapshot offline chỉ có KPI theo ngày. Kết nối Google Sheets DAILY để bảng Campaign lọc theo ngày.</td></tr>`);
  drawChart('spendChart','bar',(data.segments||[]).map(x=>x.name),(data.segments||[]).map(x=>x.spend),'Spend'); drawChart('ctrChart','bar',(data.segments||[]).map(x=>x.name),(data.segments||[]).map(x=>(x.ctr||0)*100),'CTR %'); drawChart('cpmChart','bar',(data.segments||[]).map(x=>x.name),(data.segments||[]).map(x=>x.cpm||0),'CPM'); drawChart('roasChart','bar',(data.segments||[]).map(x=>x.name),(data.segments||[]).map(x=>x.roas||0),'ROAS');
}

function drawChart(id,type,labels,vals,label){ if(charts[id]) charts[id].destroy(); charts[id]=new Chart(document.getElementById(id),{type,data:{labels,datasets:[{label,data:vals}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}}); }

function parseCsv(text){ const rows=[]; let row=[],cell='',q=false; for(let i=0;i<text.length;i++){const ch=text[i],n=text[i+1]; if(ch==='"'){if(q&&n==='"'){cell+='"';i++;}else q=!q;} else if(ch===','&&!q){row.push(cell);cell='';} else if((ch==='\n'||ch==='\r')&&!q){if(ch==='\r'&&n==='\n')i++;row.push(cell); if(row.some(x=>x!==''))rows.push(row); row=[];cell='';} else cell+=ch;} row.push(cell); if(row.some(x=>x!==''))rows.push(row); return rows; }

function normalizeFromCsv(rows){
  if(rows.length<2) throw new Error('CSV rỗng'); const h=rows[0].map(x=>x.trim()); const ix=(...names)=>{for(const n of names){const i=h.findIndex(x=>x.toLowerCase()===n.toLowerCase()); if(i>=0)return i;} return -1}; const num=v=>{if(v==null||v==='')return null; const n=Number(String(v).replace(/[%₫, ]/g,'')); return Number.isFinite(n)?n:null};
  const dailyRows=rows.slice(1).map(r=>{ let ctr=num(r[ix('CTR','CTR Link','CTR (link click-through rate)')]); if(ctr!=null&&ctr>1)ctr/=100; return {date:String(r[ix('Date')]||'').slice(0,10),campaign:r[ix('Campaign','Campaign name')]||'',spend:num(r[ix('Spend','Cost')]),impressions:num(r[ix('Impressions')]),clicks:num(r[ix('Clicks','Link clicks')]),frequency:num(r[ix('Frequency')]),purchases:num(r[ix('Purchases','Omni purchases')]),purchaseValue:num(r[ix('Purchase value','Purchase conversion value','Omni purchase conversion value')]),messages:num(r[ix('Messages','New messaging contacts')]),leads:num(r[ix('Leads','On-Facebook leads')]),ctr}; }).filter(x=>x.campaign&&(!cfg.campaignContains||x.campaign.includes(cfg.campaignContains)));
  if(dailyRows.some(x=>x.date)) return {dailyRows:dailyRows.filter(x=>x.date),sourceLabel:'LIVE SHEET'};
  const campaigns=dailyRows.map(x=>({campaign:x.campaign,spend:x.spend,impressions:x.impressions,cpm:null,cpc:x.clicks?x.spend/x.clicks:null,ctr:x.ctr,frequency:x.frequency,purchases:x.purchases,roas:null,messages:x.messages,leads:x.leads})); const sum=k=>campaigns.reduce((a,b)=>a+(b[k]||0),0); return {summary:{currency:'VND',spend:sum('spend'),impressions:sum('impressions'),cpm:null,cpc:null,ctr:null,frequency:null,clicks:null,messages:sum('messages'),leads:sum('leads'),purchases:sum('purchases'),roas:null},segments:[],campaigns,sourceLabel:'LIVE SHEET'};
}

async function load(){
  try{
    if(cfg.jsonEndpoint){ const r=await fetch(cfg.jsonEndpoint,{cache:'no-store'}); if(!r.ok)throw new Error(r.status); const d=await r.json(); rawData={...d,sourceLabel:'LIVE JSON'}; initDatesFromData(); applyDateFilter(); return; }
    if(cfg.csvUrl){ const r=await fetch(cfg.csvUrl,{cache:'no-store'}); if(!r.ok)throw new Error(r.status); rawData=normalizeFromCsv(parseCsv(await r.text())); initDatesFromData(); applyDateFilter(); return; }
    rawData={dailySummaryRows:snapshotDailySummary,sourceLabel:'SNAPSHOT DAILY'}; initDatesFromData(); applyDateFilter();
  }catch(e){ console.error(e); rawData={dailySummaryRows:snapshotDailySummary,sourceLabel:'SNAPSHOT DAILY (lỗi nguồn live)'}; initDatesFromData(); applyDateFilter(); }
}

function initDatesFromData(){
  if(rawData?.dailyRows?.length || rawData?.dailySummaryRows?.length){ const ds=(rawData.dailyRows||rawData.dailySummaryRows).map(r=>r.date).filter(Boolean).sort(); if(!document.getElementById('startDate').value) document.getElementById('startDate').value=ds[0]; if(!document.getElementById('endDate').value) document.getElementById('endDate').value=ds[ds.length-1]; }
  else if(rawData?.period){ document.getElementById('startDate').value=rawData.period.start||''; document.getElementById('endDate').value=rawData.period.end||''; }
}

function setupTimer(ms){clearInterval(timer); if(ms>0) timer=setInterval(load,ms)}
document.getElementById('refreshBtn').onclick=load;
document.getElementById('autoRefresh').onchange=e=>setupTimer(Number(e.target.value));
document.getElementById('applyDateBtn').onclick=applyDateFilter;
document.querySelectorAll('[data-range]').forEach(b=>b.onclick=()=>setPreset(b.dataset.range));
document.getElementById('exportBtn').onclick=()=>{ if(!currentData)return; const head=['Campaign','Spend','CPM','CPC','CTR','Frequency','Purchases','ROAS','Messages','Leads']; const lines=[head,...currentData.campaigns.map(c=>[c.campaign,c.spend,c.cpm,c.cpc,c.ctr,c.frequency,c.purchases,c.roas,c.messages,c.leads])].map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'); const blob=new Blob(['\ufeff'+lines],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`meta_ads_ngat_p_${document.getElementById('startDate').value||'all'}_${document.getElementById('endDate').value||'all'}.csv`;a.click();URL.revokeObjectURL(a.href); };
const initialMs=cfg.autoRefreshMs||900000; document.getElementById('autoRefresh').value=String(initialMs); setupTimer(initialMs); load();
