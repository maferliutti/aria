// FUNÇÕES DE TOAST
function toast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, duration);
}

// FUNÇÕES DE SEGURANÇA
function sanitizeHTML(str) {
  const tmp = document.createElement('div');
  tmp.innerHTML = str;
  tmp.querySelectorAll('script,iframe,object,embed,form,input').forEach(el => el.remove());
  tmp.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      if (attr.name.startsWith('on') || attr.value.includes('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return tmp.innerHTML;
}

function escapeHTML(str){ 
  const div=document.createElement('div'); 
  div.textContent=str; 
  return div.innerHTML; 
}

// FUNÇÕES DE FETCH
async function fetchJSON(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const r = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { 'Accept': 'application/json', ...(options.headers || {}) },
    });

    const raw = await r.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw ? { raw } : null; }

    if (!r.ok) {
      const details = data?.error?.message || data?.message || data?.raw || `HTTP ${r.status}`;
      throw new Error(`HTTP ${r.status} | ${details}`);
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

// FUNÇÕES DE IDENTIFICAÇÃO DE ATIVOS
function isBRTicker(ticker) {
  const upper = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z]{4}\d{1,2}$/.test(upper) || upper === 'BOVA11';
}

function isFixedIncome(ticker) {
  return ['SELIC','IPCA','CDI','POUPANCA'].includes(ticker.toUpperCase());
}

function canonicalizeTicker(t) {
  return t.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// FUNÇÕES DE PROCESSAMENTO DE DADOS
function processCloses(ticker, closes, meta = {}) {
  const minPoints = meta.minPoints || 4;
  const clean = (closes || []).filter(c => c != null && !isNaN(c) && c > 0);
  if (clean.length < minPoints) throw new Error(`Dados insuficientes para ${ticker} (${clean.length} pontos)`);

  const returns = [];
  for (let i = 1; i < clean.length; i++) returns.push((clean[i] - clean[i - 1]) / clean[i - 1]);
  const filtered = returns.filter(r => Number.isFinite(r) && Math.abs(r) < 0.5);
  if (filtered.length < 3) throw new Error(`Retornos insuficientes para ${ticker} (${filtered.length})`);

  const periodsPerYear = clean.length >= 40 ? 252 : clean.length >= 18 ? 252 : 12;
  return {
    ticker,
    name: meta.name || meta.longName || meta.shortName || ticker,
    currency: meta.currency || 'BRL',
    currentPrice: clean[clean.length - 1],
    previousClose: meta.previousClose ?? clean[clean.length - 2],
    returns: filtered,
    closes: clean,
    annualReturn: Math.pow(1 + mean(filtered), periodsPerYear) - 1,
    annualVol: std(filtered) * Math.sqrt(periodsPerYear),
    isReal: true,
    source: meta.source || 'unknown',
  };
}

function getClass(t){
  const lower=t.toLowerCase();
  if(['selic','ipca','cdi','poupanca'].includes(lower)) return 'fi';
  if(['IVVB11','SPY','QQQ','IVV','VT','VEA','EWZ'].includes(t.toUpperCase())) return 'etf_g';
  if(/^\w+11$/.test(t.toUpperCase())&&!['IVVB11'].includes(t.toUpperCase())) return 'fii';
  return 'equity';
}

function getFixedIncomeData(ticker){
  const rates={selic:S.selic,ipca:S.ipca+0.06,cdi:S.selic*0.998,poupanca:S.selic*0.7};
  const names={selic:'Tesouro Selic',ipca:'Tesouro IPCA+',cdi:'CDI/CDB',poupanca:'Poupança'};
  const rate=rates[ticker.toLowerCase()]||S.selic;
  const daily=Math.pow(1+rate,1/252)-1;
  const volFactor=ticker.toLowerCase()==='ipca'?0.0003:0.00005;
  return { ticker,name:names[ticker.toLowerCase()]||ticker,annualReturn:rate,annualVol:volFactor*Math.sqrt(252),returns:Array(504).fill(0).map(()=>daily+(Math.random()-0.5)*volFactor),currentPrice:null,isReal:false,isFixedIncome:true };
}

function getFallbackData(ticker){
  const fallbacks={ PETR4:{ret:0.22,vol:0.38},VALE3:{ret:0.18,vol:0.32},ITUB4:{ret:0.16,vol:0.24},BBDC4:{ret:0.12,vol:0.26},IVVB11:{ret:0.20,vol:0.20},BOVA11:{ret:0.14,vol:0.22},WEGE3:{ret:0.28,vol:0.26},ABEV3:{ret:0.08,vol:0.18},MGLU3:{ret:-0.10,vol:0.52},KNRI11:{ret:0.13,vol:0.14},SMAL11:{ret:0.10,vol:0.28},B3SA3:{ret:0.15,vol:0.30},RENT3:{ret:0.14,vol:0.28},SUZB3:{ret:0.20,vol:0.35},GGBR4:{ret:0.16,vol:0.34},BBAS3:{ret:0.18,vol:0.26} };
  const f=fallbacks[ticker.toUpperCase()]||{ret:0.12,vol:0.25};
  const daily=Math.pow(1+f.ret,1/252)-1, dailyVol=f.vol/Math.sqrt(252);
  const returns=Array(504).fill(0).map(()=>{ const u1=Math.random(),u2=Math.random(); const z=Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2); return daily+z*dailyVol; });
  return { ticker,name:ticker,annualReturn:f.ret,annualVol:f.vol,returns,isReal:false,isFallback:true };
}

// FUNÇÕES DE BUSCA DE DADOS EXTERNOS
async function fetchBCB() {
  try {
    const [selicData, ipcaData] = await Promise.allSettled([
      fetchJSON('https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json'),
      fetchJSON('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json'),
    ]);

    if (selicData.status === 'fulfilled' && selicData.value?.[0]?.valor) {
      const selicDaily = parseFloat(selicData.value[0].valor) / 100;
      S.selic = Math.pow(1 + selicDaily, 252) - 1;
      document.getElementById('t-selic').textContent = (S.selic * 100).toFixed(2) + '%';
    }

    if (ipcaData.status === 'fulfilled' && ipcaData.value?.length) {
      S.ipca = ipcaData.value.reduce((a, d) => a + parseFloat(d.valor), 0) / 100;
      document.getElementById('t-ipca').textContent = (S.ipca * 100).toFixed(2) + '%';
    }

    if (selicData.status === 'fulfilled' || ipcaData.status === 'fulfilled') {
      document.getElementById('ds-bcb').textContent = 'online ✓';
      document.getElementById('ds-bcb').className = 'ds-ok';
      document.getElementById('liveDot').classList.remove('offline');
      return;
    }
    throw new Error('BCB indisponível');
  } catch(e) {
    console.warn('BCB fallback:', e.message);
    document.getElementById('t-selic').textContent = '10.65%';
    document.getElementById('t-ipca').textContent = '4.83%';
    document.getElementById('ds-bcb').textContent = 'fallback';
    document.getElementById('ds-bcb').className = 'ds-err';
    document.getElementById('liveDot').classList.add('offline');
    toast('BCB offline — usando taxas de fallback', 'warning');
  }
}

async function fetchBrapi(ticker) {
  const upper = ticker.toUpperCase();
  const needsToken = !BRAPI_FREE_TICKERS.includes(upper);
  if (needsToken && !S.brapiToken) throw new Error(`${upper} requer token da brapi.dev`);

  const allowedRanges = ['3mo', '1mo', '5d', '1d'];
  let lastError = null;
  for (const range of allowedRanges) {
    try {
      const params = new URLSearchParams({ range, interval: '1d' });
      if (S.brapiToken) params.set('token', S.brapiToken.trim());
      const url = `https://brapi.dev/api/quote/${encodeURIComponent(upper)}?${params.toString()}`;
      const data = await fetchJSON(url);
      const result = data?.results?.[0];
      if (!result) throw new Error(`Resposta sem results para ${upper}`);

      let hist = [];
      if (Array.isArray(result.historicalDataPrice)) hist = result.historicalDataPrice;
      else if (Array.isArray(result.priceHistory)) hist = result.priceHistory;
      else if (Array.isArray(result.history)) hist = result.history;

      const closes = hist
        .sort((a, b) => (a.date || 0) - (b.date || 0))
        .map(h => h.adjustedClose ?? h.close ?? h.price)
        .filter(c => c != null && Number.isFinite(c) && c > 0);

      if (closes.length < 4) {
        if (upper === 'BOVA11' && Number.isFinite(result.regularMarketPrice) && Number.isFinite(result.regularMarketPreviousClose)) {
          const curr = Number(result.regularMarketPrice);
          const prev = Number(result.regularMarketPreviousClose) || curr;
          const drift = prev > 0 ? (curr - prev) / prev : 0;
          const syntheticReturns = Array.from({ length: 21 }, (_, i) => drift / 21 + ((i % 2 === 0 ? 1 : -1) * 0.0008));
          const syntheticCloses = [prev];
          for (const r of syntheticReturns) syntheticCloses.push(syntheticCloses[syntheticCloses.length - 1] * (1 + r));
          const processed = processCloses(upper, syntheticCloses, {
            name: result.longName || result.shortName || upper,
            currency: result.currency || 'BRL',
            previousClose: prev,
            source: `brapi.dev (${range}, quote-only)` ,
            minPoints: 4,
          });
          processed.currentPrice = curr;
          processed.previousClose = prev;
          processed.sampleWindow = range;
          processed.isReal = false;
          processed.note = 'BOVA11 sem histórico no plano atual da brapi; usando benchmark sintético baseado no último preço e fechamento anterior.';
          return processed;
        }
        throw new Error(`Histórico insuficiente na brapi para ${upper} em ${range} (${closes.length} pontos)`);
      }

      const processed = processCloses(upper, closes, {
        name: result.longName || result.shortName || upper,
        currency: result.currency || 'BRL',
        previousClose: result.regularMarketPreviousClose ?? result.previousClose ?? closes[closes.length - 2],
        source: `brapi.dev (${range})`,
        minPoints: 4,
      });
      processed.sampleWindow = range;
      return processed;
    } catch (e) {
      lastError = e;
      console.warn(`[brapi] ${upper} falhou em ${range}: ${e.message}`);
      if (!/range/i.test(e.message) && !/Histórico insuficiente/i.test(e.message)) throw e;
    }
  }
  throw lastError || new Error(`Nenhum range disponível na brapi para ${upper}`);
}

async function fetchStockHistory(ticker) {
  if (isFixedIncome(ticker)) return null;
  const upper = canonicalizeTicker(ticker);
  const cacheKey = `stock_${upper}`;
  const cached = S.dataCache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < S.cacheExpiry) return cached.data;

  const providers = isBRTicker(upper)
    ? [{ name: 'brapi.dev', fn: () => fetchBrapi(upper) }]
    : [{ name: 'external-blocked', fn: () => { throw new Error(`${upper} precisa de backend/proxy próprio`); } }];

  for (const provider of providers) {
    try {
      const data = await provider.fn();
      S.dataCache.set(cacheKey, { data, ts: Date.now() });
      document.getElementById('ds-proxy').textContent = provider.name + ' ✓';
      document.getElementById('ds-proxy').className = 'ds-ok';
      return data;
    } catch(e) {
      console.warn(`[${upper}] ✗ ${provider.name}: ${e.message}`);
    }
  }
  throw new Error(`Nenhum provider conseguiu dados para ${upper}`);
}

async function fetchBenchmark() {
  try {
    return await fetchStockHistory('BOVA11');
  } catch (e) {
    console.warn('Benchmark fallback:', e.message);
    return {
      ticker: 'BOVA11',
      name: 'Ibovespa (estimado)',
      currency: 'BRL',
      currentPrice: 100,
      previousClose: 99.5,
      returns: Array.from({ length: 63 }, () => (Math.random() - 0.48) * 0.01),
      closes: Array.from({ length: 64 }, (_, i) => 100 + i * 0.03),
      annualReturn: 0.12,
      annualVol: 0.20,
      isReal: false,
      source: 'fallback-estimado'
    };
  }
}

async function fetchUSDBRL() {
  try {
    const data = await fetchJSON('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const usd = data.USDBRL;
    if (usd) {
      const bid = parseFloat(usd.bid);
      const pctChange = parseFloat(usd.pctChange);
      document.getElementById('t-usd').textContent = bid.toFixed(2);
      const chgEl = document.getElementById('tc-usd');
      chgEl.textContent = (pctChange >= 0 ? '+' : '') + pctChange.toFixed(2) + '%';
      chgEl.className = 'tick-chg ' + (pctChange >= 0 ? 'up' : 'dn');
    }
  } catch (e) {
    console.warn('Erro ao buscar USD/BRL:', e.message);
    document.getElementById('t-usd').textContent = '—';
    document.getElementById('tc-usd').textContent = '';
  }
}

async function fetchSP500() {
  if (S.brapiToken) {
    try {
      const data = await fetchBrapi('SPY');
      if (data) {
        const price = data.currentPrice;
        const prev = data.previousClose || data.closes[data.closes.length - 2];
        const chg = prev ? ((price - prev) / prev * 100) : 0;
        document.getElementById('t-sp').textContent = price.toFixed(2);
        const chgEl = document.getElementById('tc-sp');
        chgEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
        chgEl.className = 'tick-chg ' + (chg >= 0 ? 'up' : 'dn');
        return;
      }
    } catch (e) {
      console.warn('Erro ao buscar SPY via brapi:', e.message);
    }
  }
  document.getElementById('t-sp').textContent = '—';
  document.getElementById('tc-sp').textContent = '';
}

async function fetchTopbarTickers() {
  try {
    const d = await fetchBenchmark();
    if (d) {
      const price = d.currentPrice;
      const prev = d.previousClose || d.closes[d.closes.length - 2];
      const chg = prev ? ((price - prev) / prev * 100) : 0;
      document.getElementById('t-ibov').textContent = price.toFixed(0);
      const chgEl = document.getElementById('tc-ibov');
      chgEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
      chgEl.className = 'tick-chg ' + (chg >= 0 ? 'up' : 'dn');
    }
  } catch(e) { console.warn('Topbar BOVA11:', e.message); }
  await fetchUSDBRL();
  await fetchSP500();
}
