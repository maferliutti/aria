// FUNÇÕES DO CHAT
const SYSTEM = `Você é ARIA — Asset Risk Intelligence Advisor, um sistema de análise de risco quantitativo.

REGRAS CRÍTICAS:
1. Você recebe dados quantitativos JÁ CALCULADOS com dados reais do Yahoo Finance, brapi.dev e API do Banco Central do Brasil.
2. NUNCA invente, arredonde ou altere os números fornecidos. Use-os EXATAMENTE como recebidos.
3. NUNCA recomende compra ou venda específica de ativos — isso é ato de advisor regulado.
4. Se não tiver dados suficientes, diga explicitamente.

MODO DE EXPLICAÇÃO: {MODE}

FORMATO:
- Use HTML básico (strong, em, br, ul/li) para formatação.
- Comece SEMPRE com o insight mais crítico e acionável.
- Seja direto, denso em insight, sem enrolação.
- Use comparações concretas (ex: "sua volatilidade é 2x a do Ibovespa").
- Termine com 1 pergunta ou sugestão de próximo passo.
- Sempre em português brasileiro.
- Máximo 400 palavras por resposta.`;

async function callClaude(msg) {
  const history = S.messages.slice(-8).map(m => ({ role: m.role, content: m.content.slice(0,800) }));
  const model = MODELS[S.selectedModel].id;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': S.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM.replace('{MODE}', S.mode),
      messages: [...history, { role: 'user', content: msg }],
    }),
  });
  if (!r.ok) {
    const e = await r.json().catch(()=>({}));
    const errMsg = e.error?.message || `HTTP ${r.status}`;
    if (r.status === 401) throw new Error('API Key inválida. Verifique sua chave Anthropic.');
    if (r.status === 400 && errMsg.includes('credit')) throw new Error('FALLBACK');
    if (r.status === 403 || errMsg.toLowerCase().includes('billing') || errMsg.toLowerCase().includes('credit') || errMsg.toLowerCase().includes('insufficient')) throw new Error('FALLBACK');
    if (r.status === 429) throw new Error('Rate limit atingido. Aguarde 1 minuto.');
    if (r.status === 529) throw new Error('API sobrecarregada. Tente novamente em 30s.');
    throw new Error(errMsg);
  }
  const d = await r.json();
  return d.content?.[0]?.text || 'Resposta vazia da API.';
}

function smartFallback(msg) {
  const a = S.analysis;
  if (!a) return `<strong>ARIA — Modo Local Ativo</strong><br><br>Os cálculos quantitativos funcionam 100% sem IA — Sharpe, VaR, Beta, correlações, tudo com dados reais.<br><br>A IA é usada apenas para <em>narrar</em> os resultados. Sem créditos na API, você recebe a análise completa por regras.<br><br><strong>Monte seu portfólio para começar.</strong>`;

  const parts = [];
  if (a.sharpe < 0) parts.push(`<strong style="color:var(--red)">⚠ Alerta crítico:</strong> Sharpe negativo (${a.sharpe.toFixed(2)}) — seu portfólio rende <em>menos</em> que a Selic (${(S.selic*100).toFixed(1)}%). Cada unidade de risco assumida está destruindo valor.`);
  else if (a.sharpe < 0.5) parts.push(`<strong style="color:var(--amber)">⚠ Sharpe fraco (${a.sharpe.toFixed(2)}):</strong> O retorno mal compensa o risco. Considere aumentar renda fixa ou diversificar globalmente.`);
  else if (a.sharpe > 1.5) parts.push(`<strong class="tag-green">✓ Excelente Sharpe (${a.sharpe.toFixed(2)}):</strong> Retorno muito bem compensado para o risco assumido. Portfólio eficiente.`);
  else if (a.sharpe > 1) parts.push(`<strong class="tag-green">✓ Bom Sharpe (${a.sharpe.toFixed(2)}):</strong> Retorno adequado ao risco. Acima da maioria dos fundos multimercado.`);
  else parts.push(`<strong>Sharpe razoável (${a.sharpe.toFixed(2)}):</strong> Há espaço para otimização do binômio risco-retorno.`);

  parts.push(`<br><br><strong>Métricas calculadas com ${a.isRealData ? 'dados reais' : 'estimativas'}:</strong><br>
• Retorno anual: <strong>${(a.annualReturn*100).toFixed(2)}%</strong> ${a.annualReturn > S.selic ? '(supera a Selic ✓)' : '(abaixo da Selic ✗)'}<br>
• Volatilidade: <strong>${(a.annualVol*100).toFixed(1)}%</strong> a.a. — ${a.annualVol<0.1?'baixa':a.annualVol<0.2?'moderada':a.annualVol<0.3?'alta':'muito alta'}<br>
• VaR 95% (1d): <strong>${(a.var95*100).toFixed(2)}%</strong> — em 5% dos dias, perda ≥ ${Math.abs(a.var95*100).toFixed(2)}%<br>
• CVaR 95%: <strong>${(a.cvar95*100).toFixed(2)}%</strong> — nos piores dias, perda média de ${Math.abs(a.cvar95*100).toFixed(2)}%<br>
• Max Drawdown: <strong>${(a.mdd*100).toFixed(1)}%</strong> ${a.mdd > -0.15 ? '(controlado)' : a.mdd > -0.30 ? '(moderado — atenção)' : '(severo — alto risco de cauda)'}`);

  if (a.betaVal != null) {
    const betaMsg = a.betaVal > 1.2 ? `— portfólio amplifica movimentos do mercado` : a.betaVal < 0.8 ? `— portfólio defensivo vs mercado` : `— alinhado com o mercado`;
    parts.push(`<br>• Beta: <strong>${a.betaVal.toFixed(2)}</strong> ${betaMsg}`);
  }

  if (a.divScore < 4) {
    parts.push(`<br><br><strong style="color:var(--red)">⚠ Diversificação fraca (${a.divScore.toFixed(1)}/10):</strong> Concentração elevada. `);
    if (!a.tickers.some(t => ['selic','ipca','cdi'].includes(t.toLowerCase()))) parts.push(`Não há renda fixa — considere Tesouro Selic como lastro. `);
    if (!a.tickers.some(t => ['IVVB11','SPY','QQQ'].includes(t.toUpperCase()))) parts.push(`Sem exposição global — IVVB11 reduz correlação com mercado local.`);
  } else if (a.divScore >= 7) {
    parts.push(`<br><br><strong class="tag-green">✓ Boa diversificação (${a.divScore.toFixed(1)}/10)</strong> — mix adequado entre classes.`);
  } else {
    parts.push(`<br><br><strong>Diversificação moderada (${a.divScore.toFixed(1)}/10).</strong>`);
  }

  const worstScenario = Object.entries(a.scenarios).sort((a,b) => a[1] - b[1])[0];
  if (worstScenario) parts.push(`<br><br><strong>Pior cenário:</strong> ${worstScenario[0]} causaria <strong style="color:var(--red)">${(worstScenario[1]*100).toFixed(1)}%</strong> de impacto.`);

  parts.push(`<br><br><strong>Perfil:</strong> ${a.profile} · <strong>Período:</strong> ${a.dataPoints} dias úteis`);
  parts.push(`<br><br><em>— Análise gerada por regras quantitativas (modo local, sem IA).</em>`);
  return parts.join('');
}

function addUserMsg(txt) {
  const d = document.createElement('div');
  d.className = 'msg msg-user';
  d.innerHTML = `<div class="bubble">${escapeHTML(txt)}</div>`;
  document.getElementById('msgs').appendChild(d);
  scrollChat();
  S.messages.push({ role:'user', content: txt });
}

function addAriaMsg(html) {
  const now = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const d = document.createElement('div');
  d.className = 'msg msg-aria';
  d.innerHTML = `<div class="aria-hd"><div class="aria-dot"></div><span class="aria-name">ARIA</span><span class="aria-time">${now}</span></div><div class="bubble">${sanitizeHTML(html)}</div>`;
  document.getElementById('msgs').appendChild(d);
  scrollChat();
  S.messages.push({ role:'assistant', content: html });
}

function scrollChat() {
  requestAnimationFrame(() => {
    const msgs = document.getElementById('msgs');
    msgs.scrollTop = msgs.scrollHeight;
  });
}

function addTyping() {
  const d = document.createElement('div');
  d.id = 'typing';
  d.className = 'msg msg-aria';
  d.innerHTML = `<div class="aria-hd"><div class="aria-dot"></div><span class="aria-name">ARIA</span></div><div class="typing"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>`;
  document.getElementById('msgs').appendChild(d);
  scrollChat();
  return d;
}

async function sendToAria(fullMsg, displayMsg) {
  if (S.loading && !displayMsg) return;
  document.getElementById('sugs').style.display = 'none';
  addUserMsg(displayMsg || fullMsg);
  const t = addTyping();
  document.getElementById('btnSend').disabled = true;
  try {
    let resp;
    if (S.apiKey) {
      try {
        resp = await callClaude(fullMsg);
      } catch(e) {
        if (e.message === 'FALLBACK') {
          console.log('Usando fallback local (sem IA)');
          resp = smartFallback(fullMsg);
        } else {
          console.warn('Erro na API, usando fallback:', e.message);
          resp = smartFallback(fullMsg) + `<br><br><small>(Erro na conexão com a IA: ${escapeHTML(e.message)})</small>`;
        }
      }
    } else {
      resp = smartFallback(fullMsg);
    }
    t.remove();
    addAriaMsg(resp);
  } catch(e) {
    t.remove();
    addAriaMsg(`<strong style="color:var(--red)">Erro inesperado:</strong> ${escapeHTML(e.message)}<br><br><em>A análise quantitativa continua funcionando — apenas a narrativa IA está indisponível.</em>`);
  }
  document.getElementById('btnSend').disabled = false;
}

function parsePortfolio(txt) {
  const portfolio = {};
  const re = /(\d+(?:[.,]\d+)?)\s*%\s*(?:em|no|na|de|n[ao])?\s*([a-záéíóúâêîôûãõçA-Z0-9\+\s&]+?)(?=[,\.;\n]|$|\s+e\s+|\s+and\s+)/gi;
  let m;
  while ((m = re.exec(txt)) !== null) {
    const pct = parseFloat(m[1].replace(',', '.'));
    const raw = m[2].trim().toLowerCase();
    if (pct <= 0 || pct > 100) continue;
    let ticker = null;
    if (NL_MAP[raw]) ticker = NL_MAP[raw];
    else {
      for (const [k, v] of Object.entries(NL_MAP)) {
        if (raw.includes(k)) { ticker = v; break; }
      }
    }
    if (!ticker) {
      const up = raw.toUpperCase().replace(/\s+/g,'');
      if (/^[A-Z]{4}\d{1,2}$/.test(up) || /^[A-Z]{2,5}$/.test(up)) ticker = up;
    }
    if (ticker) portfolio[ticker] = pct;
  }
  return Object.keys(portfolio).length >= 1 ? portfolio : null;
}
