let mode='manager',dimension='campaign',drill=[],resultMetric='purchases';
const dimensions=[['campaign','Campaign'],['adset','Adset'],['ad','Ads'],['creative','Creative'],['audience','Audience'],['product','Product'],['page','Page']];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtMoney=v=>v==null?'—':money(v),fmtNum=v=>v==null?'—':num(v),fmtX=v=>v==null?'—':x(v),fmtPct=v=>v==null?'—':pct(v),fmtDec=v=>v==null?'—':v.toFixed(2);
function grouped(a,key){return groupBy(a.map(r=>({...r,[key]:r[key]||'Chưa phân bổ'})),key).map(g=>({...g,purchaseValue:g.gmv,items:g.rows,roas:g.spend?g.gmv/g.spend:null,cpm:g.impressions?g.cpm:null,cpc:g.clicks?g.cpc:null,ctr:g.impressions?g.ctr:null,frequency:g.reach?g.frequency:null}));}
function setMode(next){mode=next;document.body.classList.remove('manager','ads');document.body.classList.add(mode);document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});render();}
const baseRender=render;
render=function(){baseRender();const a=filtered(),m=metrics(a);
if(mode==='manager')$('kpis').innerHTML=[['Chi phí quảng cáo',money(m.spend),'Chi tiêu thực tế'],['Đơn hàng',num(m.purchases),'Lượt mua ghi nhận'],['Khách hàng tiềm năng',num(m.leads),'Leads'],['Tin nhắn mới',num(m.messages),'Liên hệ nhắn tin'],['Doanh thu ghi nhận',money(m.gmv),'Chưa đối soát'],['Hiệu quả doanh thu',m.spend?x(m.roas):'—','Doanh thu / chi phí']].map(v=>`<div class="card"><div class="kpi-label">${v[0]}</div><div class="kpi-value">${v[1]}</div><div class="delta neutral">${v[2]}</div></div>`).join('');
else {$('kpis').innerHTML=[['Spend',money(m.spend)],['Results',num(m[resultMetric])],['CPA',fmtMoney(m[resultMetric]?m.spend/m[resultMetric]:null)],['CPL',fmtMoney(m.leads?m.spend/m.leads:null)],['GMV',money(m.gmv)],['ROAS',fmtX(m.spend?m.roas:null)],['CPM',fmtMoney(m.impressions?m.cpm:null)],['CTR',fmtPct(m.impressions?m.ctr:null)],['CPC',fmtMoney(m.clicks?m.cpc:null)],['Frequency',fmtDec(m.reach?m.frequency:null)]].map(v=>`<div class="card"><div class="kpi-label">${v[0]}</div><div class="kpi-value">${v[1]}</div></div>`).join('');renderDetails();}
$('staffActivity').innerHTML=grouped(a,'campaign').map(g=>`<div class="business-row"><div><b>${esc(g.name)}</b><small>Phụ trách: ${esc([...new Set(g.items.map(r=>r.owner||'Chưa phân bổ'))].join(', '))}</small></div><div>${money(g.spend)}<small>${num(g.purchases)} đơn · ${num(g.leads)} leads · ${num(g.messages)} tin nhắn</small></div></div>`).join('')||'<p class="empty">Không có chiến dịch trong khoảng đã chọn.</p>';
renderComparison(a);};
function renderComparison(a){let el=$('periodComparison');if(!el){el=document.createElement('p');el.id='periodComparison';el.className='note';$('trendChart').after(el);}const s=$('startDate').value,e=$('endDate').value,days=Math.round((new Date(e)-new Date(s))/86400000)+1;if(!s||!e||days<1){el.textContent='Chọn khoảng ngày hợp lệ để xem xu hướng.';return;}
const ps=new Date(+new Date(s)-days*86400000).toISOString().slice(0,10),pe=new Date(+new Date(s)-86400000).toISOString().slice(0,10);const dates=rows.map(r=>r.date).filter(Boolean).sort();if(!dates.length||dates[0]>ps){el.textContent='Chưa đủ lịch sử kỳ trước để kết luận tăng hay giảm.';return;}
const oldS=$('startDate').value,oldE=$('endDate').value;$('startDate').value=ps;$('endDate').value=pe;const previous=metrics(filtered());$('startDate').value=oldS;$('endDate').value=oldE;const now=metrics(a),change=(n,p)=>p?`${n>=p?'tăng':'giảm'} ${Math.abs((n-p)/p*100).toFixed(1)}%`:'chưa có cơ sở so sánh';el.textContent=`So với ${ps} → ${pe}: chi phí ${change(now.spend,previous.spend)}, đơn hàng ${change(now.purchases,previous.purchases)}. Hai kỳ cùng số ngày; cần đối soát ngày thiếu dữ liệu.`;}
function renderDetails(){
  const rows=filtered().filter(r=>drill.every(f=>String(r[f.key]||'Chưa phân bổ')===f.value));
  document.getElementById('dimensionTabs').innerHTML=dimensions.map(([key,label])=>`<button class="btn small ${key===dimension?'active':''}" data-dimension="${key}" aria-pressed="${key===dimension}">${label}</button>`).join('');
  document.getElementById('drillPath').innerHTML=drill.length?drill.map((f,i)=>`<button class="btn small" data-remove-filter="${i}" title="Bỏ bộ lọc từ cấp này">${dimensions.find(d=>d[0]===f.key)[1]}: ${esc(f.value)} ×</button>`).join(''):'Tất cả dữ liệu trong khoảng ngày đã chọn';
  const label=dimensions.find(d=>d[0]===dimension)[1];
  document.getElementById('detailHead').innerHTML='<tr>'+[label,'Spend','Results','CPA','CPL','GMV','ROAS','CPM','CTR','CPC','Frequency'].map(x=>`<th>${x}</th>`).join('')+'</tr>';
  const available=rows.some(r=>r[dimension]);const groups=available?grouped(rows,dimension):[];
  document.getElementById('detailRows').innerHTML=groups.length?groups.map((g,i)=>{const result=g[resultMetric];return `<tr><td><button class="row-link" data-group="${i}">${esc(g.name)}</button></td>${[fmtMoney(g.spend),fmtNum(result),fmtMoney(result?g.spend/result:null),fmtMoney(g.leads?g.spend/g.leads:null),fmtMoney(g.purchaseValue),fmtX(g.roas),fmtMoney(g.cpm),fmtPct(g.ctr),fmtMoney(g.cpc),fmtDec(g.frequency)].map(v=>`<td>${v}</td>`).join('')}</tr>`;}).join(''):`<tr><td colspan="11" class="empty">${rows.length?`Nguồn chưa có dữ liệu ${label} ở phạm vi này.`:'Không có dữ liệu trong phạm vi đã chọn.'}</td></tr>`;
  document.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{const index=dimensions.findIndex(d=>d[0]===dimension);drill=drill.filter(f=>f.key!==dimension);drill.push({key:dimension,value:groups[Number(b.dataset.group)].name});if(index<dimensions.length-1)dimension=dimensions[index+1][0];renderDetails();});
  document.querySelectorAll('[data-dimension]').forEach(b=>b.onclick=()=>{dimension=b.dataset.dimension;renderDetails();});
  document.querySelectorAll('[data-remove-filter]').forEach(b=>b.onclick=()=>{drill=drill.slice(0,Number(b.dataset.removeFilter));renderDetails();});
}

document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('resetDrill').onclick=()=>{drill=[];dimension='campaign';renderDetails();};
$('resultMetric').onchange=e=>{resultMetric=e.target.value;render();};
setMode('manager');
