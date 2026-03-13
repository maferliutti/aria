// FUNÇÃO PRINCIPAL DE ANÁLISE
function computeAnalysis(portfolio, marketData, benchmark) {
  const total = Object.values(portfolio).reduce((a,b)=>a+b,0); if(total===0) return null;
  const weights = {}; Object.keys(portfolio).forEach(t=>weights[t]=portfolio[t]/total);
  const tickers = Object.keys(weights), SELIC = S.selic;
  const returnsMap = {};
  tickers.forEach(t=>{
    const d = marketData[t];
    if(d?.returns?.length) returnsMap[t]=d.returns;
    else if(d?.annualReturn!==undefined){
      const daily = Math.pow(1+d.annualReturn,1/252)-1;
      returnsMap[t]=Array(504).fill(daily);
    }
  });
  const validReturns = Object.values(returnsMap).filter(r=>r.length);
  if(validReturns.length===0) return null;
  const minLen = Math.min(...validReturns.map(r=>r.length)); if(minLen<20) return null;
  const portReturns = [];
  for(let i=0;i<minLen;i++){
    let dayRet=0;
    tickers.forEach(t=>{ const rets=returnsMap[t]; if(rets) dayRet+=weights[t]*(rets[rets.length-minLen+i]??0); });
    portReturns.push(dayRet);
  }
  const annualReturn = Math.pow(1+mean(portReturns),252)-1;
  const annualVol = std(portReturns)*Math.sqrt(252);
  const sharpe = annualVol>0?(annualReturn-SELIC)/annualVol:0;
  const sortino = sortinoRatio(portReturns,SELIC);
  const mdd = maxDrawdown(portReturns);
  const sorted = [...portReturns].sort((a,b)=>a-b);
  const varIdx = Math.max(1,Math.floor(sorted.length*0.05));
  const var95 = sorted[varIdx];
  const cvar95 = mean(sorted.slice(0,varIdx));
  let betaVal = null;
  if(benchmark?.returns?.length>20) betaVal = calcBeta(portReturns, benchmark.returns.slice(-minLen));
  const corrMatrix = {};
  for(let i=0;i<tickers.length;i++) for(let j=i+1;j<tickers.length;j++){
    const a=tickers[i],b=tickers[j];
    if(returnsMap[a]&&returnsMap[b]) corrMatrix[`${a}_${b}`]=corrMatrix[`${b}_${a}`]=pearsonCorr(returnsMap[a],returnsMap[b]);
  }
  const n = tickers.length;
  const hhi = tickers.reduce((s,t)=>s+Math.pow(weights[t],2),0);
  let divScore = n>1?10*(1-(hhi-1/n)/(1-1/n)):0;
  tickers.forEach((a,i)=>tickers.slice(i+1).forEach(b=>{
    const c = Math.abs(corrMatrix[`${a}_${b}`]||0);
    if(c>0.7) divScore -= (c-0.7)*8*weights[a]*weights[b];
  }));
  const hasFixedIncome = tickers.some(t=>['selic','ipca','cdi','poupanca'].includes(t.toLowerCase()));
  const hasGlobal = tickers.some(t=>['IVVB11','SPY','QQQ','IVV','VT','VEA'].includes(t.toUpperCase()));
  const hasEquity = tickers.some(t=>getClass(t)==='equity');
  if(!hasFixedIncome&&hasEquity) divScore-=1;
  if(!hasGlobal) divScore-=0.3;
  if(n===1) divScore=0;
  divScore = Math.max(0,Math.min(10,divScore));
  let profile = 'Conservador';
  if(annualVol>0.08) profile='Moderado';
  if(annualVol>0.15) profile='Moderado-Agressivo';
  if(annualVol>0.25) profile='Agressivo';
  if(annualVol>0.35) profile='Muito Agressivo';
  const SCENARIOS = {
    'Crise 2008':{equity:-0.58,fi:0.08,etf_g:-0.52,fii:-0.55},
    'COVID 2020':{equity:-0.45,fi:0.02,etf_g:-0.34,fii:-0.50},
    'Selic +3pp':{equity:-0.15,fi:0.12,etf_g:-0.05,fii:-0.20},
    'Dólar +30%':{equity:0.05,fi:-0.05,etf_g:0.30,fii:-0.15},
    'Lula 2002':{equity:-0.35,fi:-0.08,etf_g:0.05,fii:-0.30},
  };
  const scenarios = {};
  Object.entries(SCENARIOS).forEach(([name,shocks])=>{
    let impact=0;
    tickers.forEach(t=>{ const cls=getClass(t); impact+=weights[t]*(shocks[cls]??shocks.equity); });
    scenarios[name]=impact;
  });
  const portPath=[1], benchPath=[1];
  const benchReturns = benchmark?.returns?.slice(-minLen)||[];
  for(let i=0;i<minLen;i++){
    portPath.push(portPath[portPath.length-1]*(1+portReturns[i]));
    benchPath.push(benchPath[benchPath.length-1]*(1+(benchReturns[i]??0)));
  }
  return { annualReturn,annualVol,sharpe,sortino,var95,cvar95,betaVal,mdd,corrMatrix,divScore,profile,scenarios,portPath,benchPath,weights,tickers,minLen,isRealData:Object.values(marketData).some(d=>d?.isReal),dataPoints:minLen,hhi };
}
