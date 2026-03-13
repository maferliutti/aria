# ARIA — Assistente de Análise Quantitativa de Portfólio (Projeto DIO Bootcamp - Bradesco | GenAI & Dados)

A **ARIA** é uma aplicação web de análise de portfólio com **núcleo quantitativo** e **camada opcional de IA** para interpretação dos resultados.

Ela foi desenvolvida para transformar dados de mercado em análises mais claras, visuais e úteis para tomada de decisão. O sistema calcula métricas financeiras reais com base em dados históricos e apresenta os resultados em uma interface interativa.

## Visão geral

Na prática, a ARIA permite que o usuário monte um portfólio com diferentes ativos e receba uma análise baseada em métricas de risco e retorno. O projeto combina:

- interface web interativa em um único arquivo HTML;
- coleta de dados de mercado;
- motor quantitativo local para cálculos financeiros;
- visualização gráfica;
- interpretação opcional por IA.

## O que o projeto faz

A aplicação permite:

- montar um portfólio com pesos por ativo;
- buscar dados de mercado para ativos e indicadores;
- calcular métricas quantitativas de risco e retorno;
- visualizar gráficos de alocação, risco e desempenho;
- testar cenários de estresse;
- gerar explicações em diferentes níveis de profundidade;
- usar IA de forma opcional para transformar os resultados em linguagem natural.

## Principais métricas calculadas

A ARIA calcula, entre outras, as seguintes métricas:

- **Sharpe Ratio**
- **VaR 95% (1 dia)**
- **Volatilidade anualizada**
- **Max Drawdown**
- **Beta**
- **Correlação**
- **Score de diversificação**
- **Perfil de risco**

## Cenários de estresse

O sistema também compara o portfólio em cenários simulados, como:

- crise de 2008;
- choque da COVID;
- alta da Selic;
- choque cambial;
- cenário político de 2002;
- cenário base.

## Arquitetura do projeto

A arquitetura da ARIA segue uma lógica híbrida:

1. o usuário monta o portfólio;
2. o sistema busca dados de mercado;
3. o motor quantitativo processa os dados localmente;
4. a interface exibe métricas e gráficos;
5. a camada de IA, quando ativada, interpreta os resultados.

Isso significa que os **números não são inventados pela IA**. Primeiro o projeto calcula os dados; depois, a IA apenas ajuda a explicar o que foi calculado.

## Tecnologias utilizadas

- **HTML, CSS e JavaScript**
- **Chart.js** para gráficos
- **brapi.dev** para dados da B3
- **Banco Central do Brasil** para indicadores macroeconômicos
- **Anthropic API** como camada opcional de interpretação por IA

## Diferencial do projeto

O principal diferencial da ARIA é a separação entre:

- **cálculo quantitativo real**, feito localmente;
- **interpretação textual**, feita opcionalmente por IA.

Esse desenho reduz dependência de respostas genéricas e torna a análise mais confiável, porque as métricas são calculadas antes da etapa narrativa.

## Estrutura do repositório

├── index.html          # Estrutura HTML
├── styles.css          # Toda a estilização
├── state.js            # Estado global e constantes
├── math.js             # Funções matemáticas/estatísticas
├── data.js             # Busca de dados (BCB, brapi, fallback)
├── analysis.js         # Cálculo das métricas do portfólio
├── charts.js           # Renderização de gráficos
├── ui.js               # Interface do usuário
├── chat.js             # Lógica do chat e integração IA
└── app.js              # Inicialização e fluxo principal

## Como executar

1. baixe ou clone este repositório;
2. abra o arquivo `index.html` no navegador;
3. insira seu token da `brapi.dev` para acessar ativos da B3 além dos liberados sem token;
4. opcionalmente, insira uma chave da Anthropic para ativar a interpretação por IA.

## Observações importantes

- a análise quantitativa funciona mesmo sem IA;
- a integração com IA é opcional;
- não publique tokens reais no GitHub;
- se necessário, substitua chaves por placeholders antes de subir o projeto;
- no arquivo "INDEX.html" está presente o código completo

## Sobre este projeto

Este projeto foi desenvolvido como peça de portfólio técnico para demonstrar conhecimentos em:

- finanças quantitativas;
- análise de risco;
- integração com APIs;
- visualização de dados;
- construção de produtos analíticos com interface conversacional.
