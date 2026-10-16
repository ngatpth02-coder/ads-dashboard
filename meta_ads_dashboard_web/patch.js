(function(){
  const OBJECTIVES=[['all','Tất cả'],['Mess','Mess'],['Lead','Lead'],['Reach','Reach'],['Click','Click'],['CPAS','CPAS']];

  function classify(raw,campaign){
    const c=String(campaign||'').toLowerCase();
    const r=String(raw||'').toLowerCase();
    if(/(^|[_\s|*-])mess(age|enger)?([_\s|*-]|$)|tin nhắn/.test(c)) return 'Mess';
    if(/(^|[_\s|*-])lead([_\s|*-]|$)|khách hàng tiềm năng/.test(c)) return 'Lead';
    if(/(^|[_\s|*-])reach([_\s|*-]|$)|nhận biết|awareness/.test(c)) return 'Reach';
    if(/(^|[_\s|*-])click([_\s|*-]|$)|traffic/.test(c)) return 'Click';
    if(/(^|[_\s|*-])cpas([_\s|*-]|$)|doanh số/.test(c)) return 'CPAS';
    if(r.includes('lead')) return 'Lead';
    if(r.includes('traffic')||r.includes('click')) return 'Click';
    if(r.includes('reach')||r.includes('awareness')) return 'Reach';
    if(r.includes('engagement')||r.includes('message')) return 'Mess';
    if(r.includes('sales')||r.includes('cpas')) return 'CPAS';
    return 'CPAS';
  }

  function resetObjective(){
    const el=document.getElementById('objectiveFilter');
    if(!el) return;
    const current=el.value||'all';
    el.innerHTML='';
    OBJECTIVES.forEach(([v,t])=>el.add(new Option(t,v)));
    el.value=OBJECTIVES.some(([v])=>v===current)?current:'all';
  }

  function updateRange(){
    const f=v=>{if(!v)return '—';const [y,m,d]=v.split('-');return `${d}/${m}/${y}`};
    const s=document.getElementById('startDate')?.value;
    const e=document.getElementById('endDate')?.value;
    const el=document.getElementById('dateRangeLabel');
    if(el) el.textContent=`Mốc thời gian: ${f(s)} → ${f(e)}`;
  }

  function normalizeCurrentRows(){
    try{ rows.forEach(r=>r.objective=classify(r.objective,r.campaign)); }catch(e){ console.warn(e); }
  }

  normalizeCurrentRows();
  resetObjective();
  updateRange();
  try{ render(); }catch(e){}

  ['startDate','endDate','objectiveFilter'].forEach(id=>document.getElementById(id)?.addEventListener('change',updateRange));
  document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>setTimeout(updateRange,0)));

  const originalLoad=load;
  load=async function(){
    await originalLoad();
    normalizeCurrentRows();
    resetObjective();
    updateRange();
    render();
  };
  document.getElementById('refreshBtn').onclick=load;
})();
