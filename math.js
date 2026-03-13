// FUNÇÕES MATEMÁTICAS E ESTATÍSTICAS
function mean(arr) { 
  return arr?.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; 
}

function std(arr) {
  if (!arr || arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((a,b)=>a+Math.pow(b-m,2),0)/(arr.length-1);
  return Math.sqrt(variance);
}

function pearsonCorr(a,b) {
  const n = Math.min(a.length,b.length); if(n<10) return 0;
  const ax=a.slice(-n), bx=b.slice(-n), ma=mean(ax), mb=mean(bx), sa=std(ax), sb=std(bx);
  if(sa===0||sb===0) return 0;
  const cov = ax.reduce((s,v,i)=>s+(v-ma)*(bx[i]-mb),0)/(n-1);
  return Math.max(-1,Math.min(1,cov/(sa*sb)));
}

function calcBeta(p,b) {
  const n=Math.min(p.length,b.length); if(n<20) return null;
  const pp=p.slice(-n), bb=b.slice(-n), mb=mean(bb), mp=mean(pp);
  const varB = bb.reduce((s,v)=>s+Math.pow(v-mb,2),0)/(n-1); if(varB===0) return null;
  const cov = pp.reduce((s,v,i)=>s+(v-mp)*(bb[i]-mb),0)/(n-1);
  return cov/varB;
}

function maxDrawdown(returns) {
  if(!returns||returns.length<2) return 0;
  let peak=1,mdd=0,cumulative=1;
  for(const r of returns){ cumulative*=(1+r); if(cumulative>peak)peak=cumulative; mdd=Math.max(mdd,(peak-cumulative)/peak); }
  return -mdd;
}

function sortinoRatio(returns,rf){
  if(!returns||returns.length<20) return null;
  const annualR = Math.pow(1+mean(returns),252)-1;
  const dailyRf = Math.pow(1+rf,1/252)-1;
  const downside = returns.filter(r=>r<dailyRf); if(downside.length===0) return null;
  const downVol = std(downside)*Math.sqrt(252); if(downVol===0) return null;
  return (annualR-rf)/downVol;
}
