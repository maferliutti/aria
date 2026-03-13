// FUNÇÕES DE GERENCIAMENTO DE GRÁFICOS
function destroyChart(k){ 
  if(S.charts[k]){ 
    S.charts[k].destroy(); 
    delete S.charts[k]; 
  } 
}

function showCanvas(cId,eId){ 
  document.getElementById(eId).style.display='none'; 
  const c=document.getElementById(cId); 
  c.style.display='block'; 
  return c; 
}

function renderAlloc(p){
  destroyChart('alloc'); 
  const c=showCanvas('c-alloc','empty-alloc'); 
  const labels=Object.keys(p);
  document.getElementById('badge-n').textContent=labels.length+' ativo'+(labels.length>1?'s':'');
  S.charts.alloc=new Chart(c,{ 
    type:'doughnut', 
    data:{ 
      labels, 
      datasets:[{ 
        data:Object.values(p), 
        backgroundColor:COLORS.slice(0,labels.length), 
        borderColor:'#07090d', 
        borderWidth:3 
      }] 
    }, 
    options:{ 
      responsive:true, 
      maintainAspectRatio:false, 
      cutout:'62%', 
      plugins:{ 
        ...chartDefaults.plugins, 
        tooltip:{ 
          ...chartDefaults.plugins.tooltip, 
          callbacks:{ 
            label:ctx=>` ${ctx.label}: ${ctx.raw}%` 
          } 
        } 
      } 
    } 
  });
}

function renderReturns(a,b){
  destroyChart('ret'); 
  const c=showCanvas('c-ret','empty-ret');
  const step=Math.max(1,Math.floor(a.portPath.length/60));
  const portSampled=a.portPath.filter((_,i)=>i%step===0);
  const benchSampled=a.benchPath.filter((_,i)=>i%step===0);
  const labels=portSampled.map((_,i)=>{ 
    const d=new Date(); 
    d.setDate(d.getDate()-(portSampled.length-i)*(step>1?21:1)); 
    return d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}); 
  });
  const realBadge=a.isRealData?'✓ real':'estimado';
  document.getElementById('badge-ret').textContent=`${a.dataPoints} dias · ${realBadge}`;
  document.getElementById('badge-ret').className=`cbadge ${a.isRealData?'real':''}`;
  S.charts.ret=new Chart(c,{ 
    type:'line', 
    data:{ 
      labels, 
      datasets:[ 
        { 
          label:'Meu Portfólio', 
          data:portSampled, 
          borderColor:'#f59e0b', 
          backgroundColor:'rgba(245,158,11,0.07)', 
          fill:true, 
          tension:0.35, 
          borderWidth:2, 
          pointRadius:0, 
          pointHoverRadius:4 
        }, 
        { 
          label:'Ibovespa (BOVA11)', 
          data:benchSampled, 
          borderColor:'#3d4f65', 
          borderDash:[4,4], 
          tension:0.35, 
          borderWidth:1.5, 
          pointRadius:0, 
          pointHoverRadius:3 
        } 
      ] 
    }, 
    options:{ 
      ...chartDefaults, 
      interaction:{mode:'index',intersect:false}, 
      scales:{ 
        ...chartDefaults.scales, 
        y:{ 
          ...chartDefaults.scales.y, 
          ticks:{ 
            ...chartDefaults.scales.y.ticks, 
            callback:v=>((v-1)*100).toFixed(0)+'%' 
          } 
        } 
      }, 
      plugins:{ 
        ...chartDefaults.plugins, 
        tooltip:{ 
          ...chartDefaults.plugins.tooltip, 
          callbacks:{ 
            label:ctx=>` ${ctx.dataset.label}: ${((ctx.raw-1)*100).toFixed(1)}%` 
          } 
        } 
      } 
    } 
  });
}

function renderRisk(a,md){
  destroyChart('risk'); 
  const c=showCanvas('c-risk','empty-risk');
  S.charts.risk=new Chart(c,{ 
    type:'bubble', 
    data:{ 
      datasets: a.tickers.map((t,i)=>{ 
        const d=md[t]||{}; 
        return { 
          label:t, 
          data:[{ 
            x:((d.annualVol||0.2)*100), 
            y:((d.annualReturn||0.1)*100), 
            r:Math.max(6,a.weights[t]*60) 
          }], 
          backgroundColor:COLORS[i%COLORS.length]+'77', 
          borderColor:COLORS[i%COLORS.length], 
          borderWidth:1.5 
        }; 
      }) 
    }, 
    options:{ 
      ...chartDefaults, 
      scales:{ 
        x:{ 
          ...chartDefaults.scales.x, 
          title:{ 
            display:true, 
            text:'Volatilidade Anual (%)', 
            color:'#3d4f65', 
            font:{family:"'IBM Plex Mono'",size:9} 
          } 
        }, 
        y:{ 
          ...chartDefaults.scales.y, 
          title:{ 
            display:true, 
            text:'Retorno Anual (%)', 
            color:'#3d4f65', 
            font:{family:"'IBM Plex Mono'",size:9} 
          } 
        } 
      }, 
      plugins:{ 
        ...chartDefaults.plugins, 
        legend:{ 
          ...chartDefaults.plugins.legend, 
          labels:{ 
            ...chartDefaults.plugins.legend.labels, 
            boxWidth:8 
          } 
        }, 
        tooltip:{ 
          ...chartDefaults.plugins.tooltip, 
          callbacks:{ 
            label:ctx=>` ${ctx.dataset.label}: Vol ${ctx.raw.x.toFixed(1)}% · Ret ${ctx.raw.y.toFixed(1)}%` 
          } 
        } 
      } 
    } 
  });
}

function renderScenarios(a){
  destroyChart('sc'); 
  const c=showCanvas('c-sc','empty-sc'); 
  const labels=Object.keys(a.scenarios); 
  const vals=Object.values(a.scenarios).map(v=>(v*100).toFixed(1));
  S.charts.sc=new Chart(c,{ 
    type:'bar', 
    data:{ 
      labels, 
      datasets:[{ 
        label:'Impacto no Portfólio', 
        data:vals, 
        backgroundColor:vals.map(v=>parseFloat(v)>=0?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)'), 
        borderColor:vals.map(v=>parseFloat(v)>=0?'#10b981':'#ef4444'), 
        borderWidth:1.5, 
        borderRadius:3 
      }] 
    }, 
    options:{ 
      ...chartDefaults, 
      indexAxis:'y', 
      scales:{ 
        x:{ 
          ...chartDefaults.scales.x, 
          ticks:{ 
            ...chartDefaults.scales.x.ticks, 
            callback:v=>v+'%' 
          } 
        }, 
        y:{ 
          ...chartDefaults.scales.y 
        } 
      }, 
      plugins:{ 
        ...chartDefaults.plugins, 
        legend:{display:false}, 
        tooltip:{ 
          ...chartDefaults.plugins.tooltip, 
          callbacks:{ 
            label:ctx=>` ${parseFloat(ctx.raw)>=0?'+':''}${ctx.raw}% impacto estimado` 
          } 
        } 
      } 
    } 
  });
}

function updateMetrics(a){
  const set=(id,val,subId,sub,colorClass,badge)=>{
    const el=document.getElementById(id);
    el.className=`m-val ${colorClass}`;
    el.innerHTML=val+(badge?`<span class="source-badge ${badge.cls}">${badge.txt}</span>`:'');
    document.getElementById(subId).textContent=sub;
  };
  const realBadge=a.isRealData?{cls:'source-real',txt:'real'}:{cls:'source-est',txt:'est.'};
  const sh=a.sharpe; 
  set('m-sharpe',sh.toFixed(2),'ms-sharpe',sh>1.5?'Excelente':sh>1?'Bom':sh>0.5?'Razoável':sh>0?'Fraco':'Negativo',sh>1?'green':sh>0.5?'amber':'red',realBadge);
  set('m-var',(a.var95*100).toFixed(2)+'%','ms-var',`CVaR: ${(a.cvar95*100).toFixed(2)}%`,'red',realBadge);
  const vol=a.annualVol*100; 
  set('m-vol',vol.toFixed(1)+'%','ms-vol',vol<10?'Baixa':vol<20?'Moderada':vol<30?'Alta':'Muito alta',vol<12?'green':vol<22?'amber':'red',realBadge);
  set('m-mdd',(a.mdd*100).toFixed(1)+'%','ms-mdd',a.mdd>-0.1?'Controlado':a.mdd>-0.25?'Moderado':'Severo',a.mdd>-0.1?'green':a.mdd>-0.25?'amber':'red',realBadge);
  const div=a.divScore; 
  set('m-div',div.toFixed(1)+'/10','ms-div',div>=7?'Bem diversificado':div>=4?'Moderado':'Concentrado',div>=7?'green':div>=4?'amber':'red',realBadge);
  set('m-prof',a.profile,'ms-prof',a.betaVal?`Beta: ${a.betaVal.toFixed(2)}${a.sortino?` · Sortino: ${a.sortino.toFixed(2)}`:''}`:'','blue',null);
}
