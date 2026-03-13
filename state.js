// ESTADO GLOBAL
const S = {
  portfolio: {},
  marketData: {},
  analysis: null,
  apiKey: localStorage.getItem('aria_key') || '',
  mode: 'Analista sênior',
  messages: [],
  loading: false,
  charts: {},
  selic: 0.1065,
  ipca: 0.0483,
  proxyIndex: 0,
  dataCache: new Map(),
  cacheExpiry: 5 * 60000,
  abortController: null,
  brapiToken: localStorage.getItem('aria_brapi_token') || '',
};

if (S.brapiToken === '••••••••' || S.brapiToken.length < 10) {
  S.brapiToken = '';
  localStorage.removeItem('aria_brapi_token');
}

// MODELOS DE IA
const MODELS = { 
  'haiku':{ id:'claude-haiku-4-5-20251001', label:'Haiku 4.5', cost:'~$0.25/MTok' }, 
  'sonnet':{ id:'claude-sonnet-4-20250514', label:'Sonnet 4', cost:'~$3/MTok' } 
};
S.selectedModel = 'haiku';

// MAPA DE NOMES COMUNS PARA TICKERS
const NL_MAP = {
  petrobras:'PETR4',petr4:'PETR4','petro':'PETR4',
  vale:'VALE3',vale3:'VALE3',
  'itaú':'ITUB4',itau:'ITUB4',itub4:'ITUB4','itaúsa':'ITSA4',itausa:'ITSA4',
  bradesco:'BBDC4',bbdc4:'BBDC4',
  'banco do brasil':'BBAS3',bbas3:'BBAS3','bb':'BBAS3',
  ivvb11:'IVVB11','s&p':'IVVB11','s&p 500':'IVVB11','sp500':'IVVB11',
  bova11:'BOVA11',ibovespa:'BOVA11',
  sbsp3:'SBSP3',bsbp3:'SBSP3',sabesp:'SBSP3',
  weg:'WEGE3',wege3:'WEGE3',
  ambev:'ABEV3',abev3:'ABEV3',
  'magazine luiza':'MGLU3',magalu:'MGLU3',mglu3:'MGLU3',
  suzano:'SUZB3',suzb3:'SUZB3',
  b3:'B3SA3',b3sa3:'B3SA3',
  localiza:'RENT3',rent3:'RENT3',
  gerdau:'GGBR4',ggbr4:'GGBR4',
  'tesouro selic':'selic','tesouro ipca':'ipca','tesouro ipca+':'ipca',
  selic:'selic',ipca:'ipca',cdi:'cdi',cdb:'cdi',
  'poupança':'poupanca',poupanca:'poupanca',
  apple:'AAPL',aapl:'AAPL',google:'GOOGL',googl:'GOOGL',
  microsoft:'MSFT',msft:'MSFT',amazon:'AMZN',amzn:'AMZN',
  nvidia:'NVDA',nvda:'NVDA',tesla:'TSLA',tsla:'TSLA',
  meta:'META',
};

// TICKERS GRATUITOS DA BRAPI
const BRAPI_FREE_TICKERS = ['PETR4','MGLU3','VALE3','ITUB4'];

// CORES PADRÃO PARA GRÁFICOS
const COLORS = ['#f59e0b','#10b981','#60a5fa','#8b5cf6','#ef4444','#ec4899','#14b8a6','#f97316','#a3e635','#fb923c'];

// CONFIGURAÇÕES PADRÃO DE GRÁFICOS
const chartDefaults = { 
  responsive:true, maintainAspectRatio:false, 
  plugins:{ 
    legend:{ labels:{ color:'#8896aa', font:{family:"'IBM Plex Mono'",size:9}, boxWidth:10, padding:10 } }, 
    tooltip:{ backgroundColor:'#0c1018', borderColor:'#1f2d42', borderWidth:1, titleColor:'#f59e0b', bodyColor:'#dde4f0', titleFont:{family:"'IBM Plex Mono'",size:11}, bodyFont:{family:"'IBM Plex Mono'",size:10}, padding:10, cornerRadius:4 } 
  }, 
  scales:{ 
    x:{ grid:{color:'#192030'}, ticks:{color:'#3d4f65', font:{family:"'IBM Plex Mono'",size:9}} }, 
    y:{ grid:{color:'#192030'}, ticks:{color:'#3d4f65', font:{family:"'IBM Plex Mono'",size:9}} } 
  } 
};
