// FUNÇÕES DE INTERFACE
function setAssetStatus(ticker,status,label){
  document.querySelectorAll('.arow').forEach(row=>{
    if(row.querySelector('.arow-tick')?.textContent===ticker){
      let badge=row.querySelector('.arow-status');
      if(!badge){ 
        badge=document.createElement('span'); 
        badge.className='arow-status'; 
        row.querySelector('.arow-tick').after(badge); 
      }
      badge.className=`arow-status ${status}`; 
      badge.textContent=label;
    }
  });
}

function renderAssetList(){
  const list=document.getElementById('assetList');
  const total=Object.values(S.portfolio).reduce((a,b)=>a+b,0);
  list.innerHTML='';
  Object.entries(S.portfolio).forEach(([t,p])=>{
    const row=document.createElement('div'); row.className='arow';
    row.innerHTML=`<span class="arow-tick">${escapeHTML(t)}</span><div class="arow-bar"><div class="arow-fill" style="width:${Math.min(p,100)}%"></div></div><span class="arow-pct">${p}%</span><span class="arow-del" data-t="${escapeHTML(t)}">✕</span>`;
    list.appendChild(row);
  });
  list.querySelectorAll('.arow-del').forEach(b=>b.addEventListener('click',()=>{ delete S.portfolio[b.dataset.t]; renderAssetList(); }));
  const totalEl=document.getElementById('totalPct');
  totalEl.textContent=total+'%';
  totalEl.className='total-val '+(total===100?'ok-color':total>100?'err-color':'warn-color');
  document.getElementById('btnAnalyze').disabled=Math.abs(total-100)>0.5||!Object.keys(S.portfolio).length;
  if(Object.keys(S.portfolio).length>0) renderAlloc(S.portfolio);
}

function resetAnalyzeBtn(){ 
  document.getElementById('btnAnalyze').disabled=false; 
  document.getElementById('btnAnalyze').childNodes[0].textContent='▶ ANALISAR COM DADOS REAIS'; 
  S.loading=false; 
}

function updateBadge(){
  const b=document.getElementById('modelBadge');
  if(S.apiKey){ 
    const m=MODELS[S.selectedModel]; 
    b.textContent=m.label; 
    b.className='model-badge'; 
    b.title=`${m.id} (${m.cost})`; 
  }
  else{ 
    b.textContent='OFFLINE — modo local'; 
    b.className='model-badge offline'; 
    b.title='Análise funciona sem IA — adicione API Key para narrativa'; 
  }
}

function updateBrapiStatus(){
  const el=document.getElementById('brapiStatus');
  if(S.brapiToken&&S.brapiToken!=='••••••••'){
    const preview=S.brapiToken.slice(0,8)+'...'+S.brapiToken.slice(-4);
    el.innerHTML=`<span style="color:var(--green)">✓ Token ativo:</span> <span style="color:var(--text2)">${preview}</span>`;
    document.getElementById('inpBrapi').value=''; 
    document.getElementById('inpBrapi').placeholder='Token salvo ✓ (cole novo para trocar)';
  } else {
    el.innerHTML=`<span style="color:var(--amber)">⚠ Sem token — dados reais limitados a 4 tickers</span>`;
    document.getElementById('inpBrapi').placeholder='Cole token brapi.dev aqui';
  }
}
