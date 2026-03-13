// FUNÇÃO PRINCIPAL DE ANÁLISE
async function runAnalysis() {
  if(!Object.keys(S.portfolio).length||S.loading) return;
  S.loading=true;
  const btn=document.getElementById('btnAnalyze'), progress=document.getElementById('analyzeProgress');
  btn.disabled=true; btn.childNodes[0].textContent='⏳ BUSCANDO DADOS REAIS...';
  document.getElementById('dataStatus').style.display='block';
  document.getElementById('ds-yf').textContent='conectando...'; document.getElementById('ds-yf').className='ds-loading';
  progress.style.width='10%';
  const tickers=Object.keys(S.portfolio);
  const marketData={};
  let yfSuccess=0,yfFail=0;
  const fixedIncomeTickers=tickers.filter(t=>['selic','ipca','cdi','poupanca'].includes(t.toLowerCase()));
  const equityTickers=tickers.filter(t=>!fixedIncomeTickers.includes(t));
  fixedIncomeTickers.forEach(t=>{ marketData[t]=getFixedIncomeData(t); setAssetStatus(t,'ok','BCB'); });
  progress.style.width='20%';
  const failedTickers=[];
  const equityPromises = equityTickers.map(async ticker=>{
    try{
      setAssetStatus(ticker,'loading','...');
      const d=await fetchStockHistory(ticker);
      marketData[ticker]=d;
      setAssetStatus(ticker,'ok',d.source==='brapi.dev'?'brapi ✓':'YF ✓');
      yfSuccess++;
    }catch(e){
      marketData[ticker]=getFallbackData(ticker);
      setAssetStatus(ticker,'err','est.');
      failedTickers.push(ticker);
      yfFail++;
      console.warn(`Fallback para ${ticker}:`,e.message);
    }
  });
  await Promise.allSettled(equityPromises);
  if(yfFail>0&&!S.brapiToken) toast(`${failedTickers.join(', ')} sem dados reais — crie token grátis em brapi.dev/dashboard`,'warning',8000);
  else if(yfFail>0) toast(`${failedTickers.join(', ')}: tickers não encontrados. Verifique se existem na B3.`,'warning',6000);
  progress.style.width='60%';
  document.getElementById('ds-yf').textContent = yfFail===0?`${yfSuccess} ativos ✓`:`${yfSuccess} ok, ${yfFail} fallback`;
  document.getElementById('ds-yf').className = yfFail===0?'ds-ok':'ds-err';
  let benchmark=null;
  try{ benchmark=await fetchBenchmark(); document.getElementById('ds-period').textContent=benchmark?`${benchmark.returns.length} dias úteis`:'—'; document.getElementById('ds-period').className='ds-ok'; }catch(e){}
  progress.style.width='75%';
  S.marketData=marketData;
  const analysis=computeAnalysis(S.portfolio,marketData,benchmark);
  if(!analysis){ toast('Dados insuficientes para análise','error'); resetAnalyzeBtn(); return; }
  S.analysis=analysis;
  progress.style.width='85%';
  updateMetrics(analysis);
  renderAlloc(S.portfolio);
  renderReturns(analysis,benchmark);
  renderRisk(analysis,marketData);
  renderScenarios(analysis);
  progress.style.width='95%';
  const portfolioStr = Object.entries(S.portfolio).map(([t,p])=>`${p}% ${t}`).join(', ');
  const assetDetails = tickers.map(t=>{ const d=marketData[t]; return `${t}: ret_anual=${((d.annualReturn||0)*100).toFixed(1)}%, vol=${((d.annualVol||0)*100).toFixed(1)}%, fonte=${d.isReal?'Yahoo Finance':'estimado'}`; }).join(' | ');
  const corrPairs=[];
  for(let i=0;i<tickers.length;i++) for(let j=i+1;j<tickers.length;j++){ const key=`${tickers[i]}_${tickers[j]}`; if(analysis.corrMatrix[key]!==undefined) corrPairs.push(`${tickers[i]}↔${tickers[j]}: ${analysis.corrMatrix[key].toFixed(2)}`); }
  await sendToAria(
    `ANÁLISE COMPLETA DO PORTFÓLIO — dados ${analysis.isRealData?'reais do Yahoo Finance':'estimados'}:\n\nPortfólio: ${portfolioStr}\nPeríodo: ${analysis.dataPoints} dias úteis (${analysis.isRealData?'histórico real':'estimado'})\n\nMÉTRICAS CALCULADAS (use EXATAMENTE estes valores):\n- Retorno anual: ${(analysis.annualReturn*100).toFixed(2)}%\n- Volatilidade anual: ${(analysis.annualVol*100).toFixed(2)}%\n- Sharpe Ratio: ${analysis.sharpe.toFixed(3)} (Selic: ${(S.selic*100).toFixed(2)}%)\n- Sortino Ratio: ${analysis.sortino?.toFixed(3)??'N/A'}\n- VaR histórico 95% (1d): ${(analysis.var95*100).toFixed(2)}%\n- CVaR 95%: ${(analysis.cvar95*100).toFixed(2)}%\n- Max Drawdown: ${(analysis.mdd*100).toFixed(2)}%\n- Beta vs Ibovespa: ${analysis.betaVal?.toFixed(2)??'N/A'}\n- Diversificação: ${analysis.divScore.toFixed(1)}/10 (HHI: ${analysis.hhi.toFixed(3)})\n- Perfil: ${analysis.profile}\n\nATIVOS: ${assetDetails}\nCORRELAÇÕES: ${corrPairs.join(' | ')||'N/A'}\n\nCENÁRIOS DE ESTRESSE: ${Object.entries(analysis.scenarios).map(([k,v])=>`${k}: ${(v*100).toFixed(1)}%`).join(' | ')}\n\nModo: ${S.mode}\nAnalise com profundidade, identifique os principais riscos, e sugira melhorias concretas e acionáveis.`,
    `Analisei: ${portfolioStr}`
  );
  progress.style.width='100%'; setTimeout(()=>{ progress.style.width='0'; },500);
  resetAnalyzeBtn();
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async () => {
  // Configuração do relógio
  setInterval(() => {
    document.getElementById('clock').textContent =
      new Date().toLocaleTimeString('pt-BR', { hour12: false });
  }, 1000);

  // Event listeners
  document.getElementById('btnAdd').addEventListener('click',()=>{
    let t=document.getElementById('inpTick').value.trim().toUpperCase();
    const p=parseFloat(document.getElementById('inpPct').value);
    if(!t||isNaN(p)||p<=0||p>100){ 
      if(!t) toast('Digite um ticker','warning'); 
      else if(isNaN(p)||p<=0||p>100) toast('Percentual inválido (1-100)','warning'); 
      return; 
    }
    const nlKey=t.toLowerCase(); if(NL_MAP[nlKey]) t=NL_MAP[nlKey];
    S.portfolio[t]=p;
    document.getElementById('inpTick').value=''; 
    document.getElementById('inpPct').value=''; 
    document.getElementById('inpTick').focus();
    renderAssetList();
  });

  ['inpTick','inpPct'].forEach(id=>document.getElementById(id).addEventListener('keydown',e=>{ 
    if(e.key==='Enter') document.getElementById('btnAdd').click(); 
  }));

  document.getElementById('btnAnalyze').addEventListener('click',runAnalysis);

  // Cenários
  document.querySelectorAll('.sc-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(!S.analysis){ toast('Monte e analise um portfólio primeiro','warning'); return; }
      const sc=btn.dataset.sc;
      const names={ crise_2008:'Crise 2008', covid_2020:'COVID 2020', selic_up:'Selic +3pp', dollar_shock:'Dólar +30%', lula_2002:'Lula 2002', base:'Cenário Base' };
      const name=names[sc]||sc; 
      const impact=S.analysis.scenarios[name];
      sendToAria(`Simule o cenário "${name}" no meu portfólio (${Object.entries(S.portfolio).map(([t,p])=>`${p}% ${t}`).join(', ')}). Impacto calculado: ${impact!==undefined?(impact*100).toFixed(1)+'%':'calculando...'}. Detalhe o que aconteceria com cada ativo e qual seria a estratégia de proteção.`,`Cenário: ${name}`);
    });
  });

  // Modos de explicação
  document.querySelectorAll('.pill').forEach(p=>{
    p.addEventListener('click',()=>{
      document.querySelectorAll('.pill').forEach(x=>x.classList.remove('active'));
      p.classList.add('active'); 
      S.mode=p.dataset.mode;
    });
  });

  // API Key
  document.getElementById('btnKey').addEventListener('click',()=>{
    const k=document.getElementById('inpKey').value.trim();
    if(!k){ toast('Cole sua API Key','warning'); return; }
    S.apiKey=k; 
    localStorage.setItem('aria_key',k); 
    updateBadge();
    addAriaMsg(`Chave configurada. Usando <strong>${MODELS[S.selectedModel].label}</strong> (${MODELS[S.selectedModel].cost} — o mais econômico). Análise narrativa habilitada.`);
    toast('API Key salva','success');
  });

  document.getElementById('modalSave').addEventListener('click',()=>{
    const k=document.getElementById('modalKey').value.trim();
    S.apiKey=k; 
    if(k) localStorage.setItem('aria_key',k);
    document.getElementById('modal').classList.remove('open'); 
    updateBadge();
  });

  document.getElementById('modalSkip').addEventListener('click',()=>{ 
    document.getElementById('modal').classList.remove('open'); 
  });

  document.getElementById('modelBadge').addEventListener('click',()=>{
    if(!S.apiKey) return;
    S.selectedModel=S.selectedModel==='haiku'?'sonnet':'haiku';
    updateBadge(); 
    toast(`Modelo trocado para ${MODELS[S.selectedModel].label} (${MODELS[S.selectedModel].cost})`,'info');
  });

  // brapi token
  document.getElementById('btnBrapi').addEventListener('click',()=>{
    const raw=document.getElementById('inpBrapi').value; 
    const t=raw.trim().replace(/\s+/g,'');
    if(!t||t==='••••••••'||t.length<10){ 
      toast('Cole um token brapi.dev válido (mínimo 10 caracteres)','warning'); 
      return; 
    }
    S.brapiToken=t; 
    localStorage.setItem('aria_brapi_token',t); 
    S.dataCache.clear(); 
    updateBrapiStatus();
    console.log('[brapi] token salvo:',S.brapiToken.slice(0,6)+'...'+S.brapiToken.slice(-4));
    toast('Token brapi.dev salvo — clique ANALISAR para buscar dados reais','success',5000);
    addAriaMsg('Token brapi.dev configurado. Clique em <strong>▶ ANALISAR COM DADOS REAIS</strong> para buscar todos os ativos com dados históricos reais.');
  });

  document.getElementById('btnBrapiClear').addEventListener('click',()=>{
    S.brapiToken=''; 
    localStorage.removeItem('aria_brapi_token'); 
    S.dataCache.clear(); 
    document.getElementById('inpBrapi').value=''; 
    updateBrapiStatus();
    toast('Token brapi.dev removido','info');
  });

  // Chat
  document.getElementById('btnSend').addEventListener('click', async () => {
    const input = document.getElementById('chatIn');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    input.style.height = '36px';
    const parsed = parsePortfolio(msg);
    if (parsed && Object.keys(parsed).length >= 1) {
      S.portfolio = parsed;
      renderAssetList();
      await runAnalysis();
    } else {
      await sendToAria(msg);
    }
  });

  document.getElementById('chatIn').addEventListener('keydown', e => {
    if (e.key==='Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      document.getElementById('btnSend').click(); 
    }
  });

  document.getElementById('chatIn').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 96) + 'px';
  });

  document.querySelectorAll('.sug').forEach(s => s.addEventListener('click', () => {
    document.getElementById('chatIn').value = s.dataset.msg;
    document.getElementById('btnSend').click();
  }));

  // Inicialização
  updateBadge();
  updateBrapiStatus();
  
  if (!S.apiKey) setTimeout(() => document.getElementById('modal').classList.add('open'), 800);
  
  await Promise.allSettled([ fetchBCB(), fetchTopbarTickers() ]);
  setInterval(fetchTopbarTickers, 10000);
  
  if (!document.getElementById('ds-proxy').textContent.trim()) {
    document.getElementById('ds-proxy').textContent = 'brapi.dev ✓';
    document.getElementById('ds-proxy').className = 'ds-ok';
  }
});
