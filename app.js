// ============================================================
// APP.JS — Dashboard Borges Macedo
// ============================================================

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FMT_PCT = (n) => n.toFixed(1) + '%';

let grafFaturamento = null;
let grafReunioes    = null;

// ---- ENTRADA PRINCIPAL ----
document.addEventListener('DOMContentLoaded', () => {
  iniciarDatePicker();
  carregar();
});

// ============================================================
// DATE PICKER
// ============================================================

const PRESETS = {
  'hoje':         () => { const h = new Date(); return [h, h]; },
  'ontem':        () => { const d = new Date(); d.setDate(d.getDate()-1); return [d, d]; },
  'esta-semana':  () => { const h = new Date(), d = new Date(h); d.setDate(h.getDate() - h.getDay()); return [d, h]; },
  'mes-ate-agora':() => { const h = new Date(); return [new Date(h.getFullYear(), h.getMonth(), 1), h]; },
  'este-mes':     () => { const h = new Date(); return [new Date(h.getFullYear(), h.getMonth(), 1), new Date(h.getFullYear(), h.getMonth()+1, 0)]; },
  '7dias':        () => { const h = new Date(), d = new Date(h); d.setDate(h.getDate()-6); return [d, h]; },
  '30dias':       () => { const h = new Date(), d = new Date(h); d.setDate(h.getDate()-29); return [d, h]; },
  'este-ano':     () => { const h = new Date(); return [new Date(h.getFullYear(), 0, 1), h]; },
  'mes-passado':  () => { const h = new Date(); return [new Date(h.getFullYear(), h.getMonth()-1, 1), new Date(h.getFullYear(), h.getMonth(), 0)]; },
};

const PRESET_LABELS = {
  'hoje': 'Hoje', 'ontem': 'Ontem', 'esta-semana': 'Esta semana',
  'mes-ate-agora': 'Este mês, até agora', 'este-mes': 'Este mês (completo)',
  '7dias': 'Últimos 7 dias', '30dias': 'Últimos 30 dias',
  'este-ano': 'Este ano, até agora', 'mes-passado': 'Mês passado',
  'fixo': 'Período personalizado',
};

let presetAtivo = 'mes-ate-agora';

function iniciarDatePicker() {
  const btn   = document.getElementById('date-picker-btn');
  const panel = document.getElementById('date-picker-panel');
  const label = document.getElementById('date-picker-label');

  // Abre/fecha
  btn.addEventListener('click', e => {
    e.stopPropagation();
    btn.classList.toggle('open');
    panel.classList.toggle('open');
  });

  // Fecha ao clicar fora
  document.addEventListener('click', () => {
    btn.classList.remove('open');
    panel.classList.remove('open');
  });
  panel.addEventListener('click', e => e.stopPropagation());

  // Clique nos presets
  document.querySelectorAll('.preset-item').forEach(el => {
    el.addEventListener('click', () => {
      const preset = el.dataset.preset;

      // Atualiza visual
      document.querySelectorAll('.preset-item').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
      presetAtivo = preset;

      if (preset === 'fixo') {
        document.getElementById('date-custom').style.display = 'block';
        label.textContent = PRESET_LABELS['fixo'];
        // preenche inputs com datas atuais
        const h = new Date();
        const ini = new Date(h.getFullYear(), h.getMonth(), 1);
        document.getElementById('data-inicio').value = toInputDate(ini);
        document.getElementById('data-fim').value    = toInputDate(h);
        return;
      }

      document.getElementById('date-custom').style.display = 'none';
      const [ini, fim] = PRESETS[preset]();
      document.getElementById('data-inicio').value = toInputDate(ini);
      document.getElementById('data-fim').value    = toInputDate(fim);
      label.textContent = PRESET_LABELS[preset];

      btn.classList.remove('open');
      panel.classList.remove('open');
      carregar();
    });
  });

  // Botão aplicar (período fixo)
  document.getElementById('btn-filtrar').addEventListener('click', () => {
    const ini = document.getElementById('data-inicio').value;
    const fim = document.getElementById('data-fim').value;
    if (!ini || !fim) return;
    const fmtIni = new Date(ini + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
    const fmtFim = new Date(fim + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
    label.textContent = `${fmtIni} – ${fmtFim}`;
    btn.classList.remove('open');
    panel.classList.remove('open');
    carregar();
  });

  // Aplica preset inicial
  const [ini, fim] = PRESETS[presetAtivo]();
  document.getElementById('data-inicio').value = toInputDate(ini);
  document.getElementById('data-fim').value    = toInputDate(fim);
  label.textContent = PRESET_LABELS[presetAtivo];
  document.querySelector(`[data-preset="${presetAtivo}"]`)?.classList.add('active');
}

async function carregar() {
  mostrarLoading(true);
  try {
    const { vendedores, totaisGlobais } = await buscarDoSheets();
    renderizar(vendedores, totaisGlobais);
    document.getElementById('ultima-atualizacao').textContent =
      new Date().toLocaleString('pt-BR');
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
    mostrarErro('Não foi possível carregar os dados. Verifique se as planilhas estão com acesso "qualquer pessoa com o link".');
  } finally {
    mostrarLoading(false);
  }
}

function redefinirFiltro() {
  presetAtivo = 'mes-ate-agora';
  const [ini, fim] = PRESETS[presetAtivo]();
  document.getElementById('data-inicio').value = toInputDate(ini);
  document.getElementById('data-fim').value    = toInputDate(fim);
  document.getElementById('date-picker-label').textContent = PRESET_LABELS[presetAtivo];
  document.querySelectorAll('.preset-item').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-preset="mes-ate-agora"]')?.classList.add('active');
  document.getElementById('date-custom').style.display = 'none';
  carregar();
}

function atualizarDados() {
  const btn = document.getElementById('btn-atualizar');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.classList.add('girando');
  carregar().finally(() => {
    btn.disabled = false;
    btn.classList.remove('girando');
  });
}

// ============================================================
// BUSCA E PARSING DO GOOGLE SHEETS
// ============================================================

// Busca via Sheets API v4 — retorna TODAS as linhas, incluindo ocultas
async function fetchSheetData(sheetId, gid) {
  const key = CONFIG.GOOGLE_API_KEY;

  // Descobre o nome da aba pelo gid
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties&key=${key}`;
  const metaResp = await fetch(metaUrl);
  if (!metaResp.ok) {
    const err = await metaResp.json().catch(() => ({}));
    throw new Error(`Erro metadados (${metaResp.status}): ${err?.error?.message || metaResp.statusText}`);
  }
  const meta = await metaResp.json();
  const sheet = meta.sheets?.find(s => String(s.properties.sheetId) === String(gid));
  if (!sheet) throw new Error(`Aba gid=${gid} não encontrada na planilha ${sheetId}`);
  const sheetName = sheet.properties.title;

  // Busca os dados (inclui linhas ocultas)
  const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}?key=${key}`;
  const dataResp = await fetch(dataUrl);
  if (!dataResp.ok) {
    const err = await dataResp.json().catch(() => ({}));
    throw new Error(`Erro dados (${dataResp.status}): ${err?.error?.message || dataResp.statusText}`);
  }
  const json = await dataResp.json();
  return json.values || [];
}

// Converte array de arrays (Sheets API v4) em array de objetos usando a primeira linha como cabeçalho
function sheetsToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => String(h).trim());
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = String(row[i] ?? '').trim(); });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}

// Mantido por compatibilidade (não é mais usado internamente)
async function fetchCSV(sheetId, gid) {
  const rows = await fetchSheetData(sheetId, gid);
  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function parseCSV(texto) {
  const linhas = texto.split('\n').filter(l => l.trim());
  if (linhas.length < 2) return [];
  const cabecalho = splitCSVLinha(linhas[0]).map(h => h.trim());
  return linhas.slice(1).map(linha => {
    const vals = splitCSVLinha(linha);
    const obj  = {};
    cabecalho.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim(); });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}

function splitCSVLinha(linha) {
  const resultado = [];
  let atual = '';
  let dentroAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (dentroAspas && linha[i + 1] === '"') { atual += '"'; i++; }
      else dentroAspas = !dentroAspas;
    } else if (c === ',' && !dentroAspas) {
      resultado.push(atual); atual = '';
    } else {
      atual += c;
    }
  }
  resultado.push(atual);
  return resultado;
}

// DD/MM/YYYY → Date
function parseBRDate(str) {
  if (!str) return null;
  const p = str.trim().split('/');
  if (p.length !== 3) return null;
  const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  return isNaN(d) ? null : d;
}

// "R$ 1.800,00" → 1800.00
function parseBRL(str) {
  if (!str) return 0;
  const limpa = str.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(limpa) || 0;
}

function toInputDate(d) {
  return d.toISOString().slice(0, 10);
}

// ============================================================
// PROCESSAMENTO DOS DADOS
// ============================================================

async function buscarDoSheets() {
  const cfg = CONFIG;

  const [csvAtend, csvContratos] = await Promise.all([
    fetchCSV(cfg.SHEET_ATENDIMENTOS.ID, cfg.SHEET_ATENDIMENTOS.GID),
    fetchCSV(cfg.SHEET_CONTRATOS.ID,    cfg.SHEET_CONTRATOS.GID),
  ]);


  const atendimentos = parseCSV(csvAtend);
  const contratos    = parseCSV(csvContratos);
  window._rawAtend     = atendimentos;
  window._rawContratos = contratos;

  const dataInicio = new Date(document.getElementById('data-inicio').value + 'T00:00:00');
  const dataFim    = new Date(document.getElementById('data-fim').value    + 'T23:59:59');

  const cA = cfg.SHEET_ATENDIMENTOS.COLS;
  const cC = cfg.SHEET_CONTRATOS.COLS;

  // --- TOTAIS GLOBAIS: contam registros únicos da planilha (sem somar por pessoa) ---
  const atendNoPeriodo = atendimentos.filter(r => {
    const d = parseBRDate(r[cA.DATA_AGENDAMENTO]);
    return d && d >= dataInicio && d <= dataFim;
  });
  const realizadosNoPeriodo = atendimentos.filter(r => {
    const d = parseBRDate(r[cA.DATA_ATENDIMENTO]);
    return d && d >= dataInicio && d <= dataFim &&
      r[cA.STATUS_ATENDIMENTO] === cfg.SHEET_ATENDIMENTOS.STATUS_REALIZADO;
  });
  const contratosNoPeriodo = contratos.filter(r => {
    const d = parseBRDate(r[cC.DATA_FECHAMENTO]);
    return d && d >= dataInicio && d <= dataFim;
  });

  const totaisGlobais = {
    agendadas:   atendNoPeriodo.length,
    realizadas:  realizadosNoPeriodo.length,
    clientes:    contratosNoPeriodo.length,
    faturamento: contratosNoPeriodo.reduce((s, r) => s + parseBRL(r[cC.HONORARIOS]), 0),
  };

  // --- MÉTRICAS POR PESSOA ---
  const vendedores = cfg.EQUIPE.map(membro => {
    const nLow  = membro.nome.toLowerCase();
    const isSdr = membro.tipo === 'SDR';

    const colAtend   = isSdr ? 'SDR' : cA.CLOSER;
    const colContrat = isSdr ? 'SDR' : cC.CLOSER;

    const meusAtend = atendimentos.filter(r =>
      (r[colAtend] || '').toLowerCase() === nLow
    );

    const agendadas = meusAtend.filter(r => {
      const d = parseBRDate(r[cA.DATA_AGENDAMENTO]);
      return d && d >= dataInicio && d <= dataFim;
    }).length;

    const realizadas = meusAtend.filter(r => {
      const d = parseBRDate(r[cA.DATA_ATENDIMENTO]);
      return d && d >= dataInicio && d <= dataFim &&
        r[cA.STATUS_ATENDIMENTO] === cfg.SHEET_ATENDIMENTOS.STATUS_REALIZADO;
    }).length;

    const meusContratos = contratos.filter(r => {
      const d = parseBRDate(r[cC.DATA_FECHAMENTO]);
      return (r[colContrat] || '').toLowerCase() === nLow &&
        d && d >= dataInicio && d <= dataFim;
    });

    const clientes    = meusContratos.length;
    const faturamento = meusContratos.reduce((s, r) => s + parseBRL(r[cC.HONORARIOS]), 0);
    const historico   = calcularHistorico(nLow, isSdr, atendimentos, contratos, dataFim);

    return {
      nome: membro.nome,
      tipo: membro.tipo,
      reunioesAgendadas:  agendadas,
      reunioesRealizadas: realizadas,
      clientes,
      faturamento,
      meta:     membro.meta,
      historico,
    };
  });

  return { vendedores, totaisGlobais };
}

function calcularHistorico(nLow, isSdr, atendimentos, contratos, dataRef) {
  const cA = CONFIG.SHEET_ATENDIMENTOS.COLS;
  const cC = CONFIG.SHEET_CONTRATOS.COLS;
  const colAtend   = isSdr ? 'SDR'  : cA.CLOSER;
  const colContrat = isSdr ? 'SDR'  : cC.CLOSER;
  const hist = [];

  for (let i = 4; i >= 0; i--) {
    const ini = new Date(dataRef.getFullYear(), dataRef.getMonth() - i, 1);
    const fim = new Date(dataRef.getFullYear(), dataRef.getMonth() - i + 1, 0, 23, 59, 59);
    const mes      = ini.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    const mesLabel = mes.charAt(0).toUpperCase() + mes.slice(1);

    const agendadas = atendimentos.filter(r => {
      const d = parseBRDate(r[cA.DATA_AGENDAMENTO]);
      return (r[colAtend] || '').toLowerCase() === nLow && d && d >= ini && d <= fim;
    }).length;

    const realizadas = atendimentos.filter(r => {
      const d = parseBRDate(r[cA.DATA_ATENDIMENTO]);
      return (r[colAtend] || '').toLowerCase() === nLow && d && d >= ini && d <= fim &&
        r[cA.STATUS_ATENDIMENTO] === CONFIG.SHEET_ATENDIMENTOS.STATUS_REALIZADO;
    }).length;

    const faturamento = contratos
      .filter(r => {
        const d = parseBRDate(r[cC.DATA_FECHAMENTO]);
        return (r[colContrat] || '').toLowerCase() === nLow && d && d >= ini && d <= fim;
      })
      .reduce((s, r) => s + parseBRL(r[cC.HONORARIOS]), 0);

    hist.push({ mes: mesLabel, agendadas, realizadas, faturamento });
  }

  return hist;
}

// ============================================================
// RENDERIZAÇÃO
// ============================================================

function renderizar(vendedores, totaisGlobais) {
  if (vendedores.length === 0) {
    mostrarErro('Nenhum dado encontrado para o período selecionado.');
    return;
  }
  renderizarResumoGeral(totaisGlobais);
  renderizarTaxaConversao(vendedores);
  renderizarRanking(vendedores);
  renderizarMetas(vendedores);
  renderizarNoShow();
  renderizarTempoFechamento();
  renderizarTicketMedio();
  renderizarGraficos(vendedores);
  renderizarCardsVendedor(vendedores);
}

// Calcula a data da Páscoa pelo algoritmo gregoriano anônimo
function calcularPascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes   = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const dia   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes, dia);
}

// Retorna Set com todos os feriados do ano no formato 'YYYY-MM-DD'
function feriadosDoAno(ano) {
  const fmt = (d) => d.toISOString().slice(0, 10);
  const soma = (base, dias) => {
    const d = new Date(base); d.setDate(d.getDate() + dias); return fmt(d);
  };

  const pascoa = calcularPascoa(ano);

  const lista = [
    // Feriados nacionais fixos
    `${ano}-01-01`, // Ano Novo
    `${ano}-04-21`, // Tiradentes
    `${ano}-05-01`, // Dia do Trabalho
    `${ano}-09-07`, // Independência
    `${ano}-10-12`, // Nossa Senhora Aparecida
    `${ano}-11-02`, // Finados
    `${ano}-11-15`, // Proclamação da República
    `${ano}-11-20`, // Consciência Negra
    `${ano}-12-25`, // Natal
    // Feriados móveis baseados na Páscoa
    soma(pascoa, -48), // Segunda de Carnaval
    soma(pascoa, -47), // Terça de Carnaval
    soma(pascoa,  -2), // Sexta-feira Santa
    fmt(pascoa),       // Páscoa
    soma(pascoa,  60), // Corpus Christi
    // Feriados extras definidos no config.js
    ...(CONFIG.FERIADOS_EXTRAS || []),
  ];

  return new Set(lista);
}

// Cache de feriados por ano para não recalcular toda vez
const _cacheFeriados = {};
function getFeriados(ano) {
  if (!_cacheFeriados[ano]) _cacheFeriados[ano] = feriadosDoAno(ano);
  return _cacheFeriados[ano];
}

// Conta dias úteis (seg–sex, sem feriados) de dia 1 até `ate` no mês/ano dado
function contarDiasUteis(ano, mes, ate) {
  const feriados = getFeriados(ano);
  let count = 0;
  for (let d = 1; d <= ate; d++) {
    const data = new Date(ano, mes, d);
    const dow  = data.getDay();
    const iso  = data.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !feriados.has(iso)) count++;
  }
  return count;
}

// Retorna a data final do filtro ativo (fallback: hoje)
function getFimFiltro() {
  const val = document.getElementById('data-fim')?.value;
  return val ? new Date(val + 'T12:00:00') : new Date();
}

// Conta dias úteis entre duas datas (intervalo livre)
function contarDiasUteisPeriodo(ini, fim) {
  let count = 0;
  const d   = new Date(ini); d.setHours(0, 0, 0, 0);
  const end = new Date(fim); end.setHours(23, 59, 59);
  while (d <= end) {
    const dow = d.getDay();
    const iso = d.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !getFeriados(d.getFullYear()).has(iso)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

// Calcula a meta proporcional com base no período selecionado
function calcMetaProp(meta) {
  const ref        = getFimFiltro();
  const ano        = ref.getFullYear();
  const mes        = ref.getMonth();
  const ultimoDia  = new Date(ano, mes + 1, 0).getDate();
  const totalUtils = contarDiasUteis(ano, mes, ultimoDia);

  // Usa o início do filtro para calcular dias úteis do período selecionado
  const iniStr = document.getElementById('data-inicio')?.value;
  const ini    = iniStr ? new Date(iniStr + 'T00:00:00') : new Date(ano, mes, 1);
  const diaUtil = (ini.getFullYear() === ano && ini.getMonth() === mes && ini.getDate() === 1)
    ? contarDiasUteis(ano, mes, ref.getDate())
    : contarDiasUteisPeriodo(ini, ref);

  return {
    valor:     totalUtils > 0 ? meta * (diaUtil / totalUtils) : 0,
    diaUtil,
    totalUtils,
    diaCalend: ref.getDate(),
  };
}

// ---- COMPARAÇÃO COM PERÍODO ANTERIOR ----
function periodoAnterior() {
  const iniStr = document.getElementById('data-inicio').value;
  const fimStr = document.getElementById('data-fim').value;
  if (!iniStr || !fimStr) return null;

  const di = new Date(iniStr + 'T00:00:00');
  const df = new Date(fimStr + 'T23:59:59');

  const recuar = (ano, mes, dia) => {
    const mesAnt = mes === 0 ? 11 : mes - 1;
    const anoAnt = mes === 0 ? ano - 1 : ano;
    const ultimo = new Date(anoAnt, mesAnt + 1, 0).getDate();
    return new Date(anoAnt, mesAnt, Math.min(dia, ultimo));
  };

  const ini = recuar(di.getFullYear(), di.getMonth(), di.getDate());
  const fim = recuar(df.getFullYear(), df.getMonth(), df.getDate());
  fim.setHours(23, 59, 59);

  const label = ini.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
  return { ini, fim, label: label.charAt(0).toUpperCase() + label.slice(1) };
}

function calcularTotaisParaPeriodo(ini, fim) {
  const cA = CONFIG.SHEET_ATENDIMENTOS.COLS;
  const cC = CONFIG.SHEET_CONTRATOS.COLS;
  const atend     = window._rawAtend     || [];
  const contratos = window._rawContratos || [];

  const contratosP = contratos.filter(r => {
    const d = parseBRDate(r[cC.DATA_FECHAMENTO]);
    return d && d >= ini && d <= fim;
  });

  return {
    agendadas:   atend.filter(r => { const d = parseBRDate(r[cA.DATA_AGENDAMENTO]); return d && d >= ini && d <= fim; }).length,
    realizadas:  atend.filter(r => { const d = parseBRDate(r[cA.DATA_ATENDIMENTO]); return d && d >= ini && d <= fim && r[cA.STATUS_ATENDIMENTO] === CONFIG.SHEET_ATENDIMENTOS.STATUS_REALIZADO; }).length,
    clientes:    contratosP.length,
    faturamento: contratosP.reduce((s, r) => s + parseBRL(r[cC.HONORARIOS]), 0),
  };
}

function badgeComp(atual, anterior, label, isCurrency = false) {
  const delta = atual - anterior;
  const cor   = delta >= 0 ? '#22c55e' : '#ef4444';
  const seta  = delta >= 0 ? '↑' : '↓';
  const abs   = Math.abs(delta);
  const texto = isCurrency
    ? FMT_BRL.format(abs)
    : abs.toString();
  return `<span style="color:${cor}">${seta} ${texto}</span> vs. ${label}`;
}

// ---- RESUMO GERAL ----
function renderizarResumoGeral(totais) {
  setText('total-agendadas',   totais.agendadas);
  setText('total-realizadas',  totais.realizadas);
  setText('total-clientes',    totais.clientes);
  setText('total-faturamento', FMT_BRL.format(totais.faturamento));

  // Barras de reuniões com meta proporcional ao dia útil
  const metaAg = CONFIG.META_REUNIOES?.agendadas  || 1;
  const metaRe = CONFIG.META_REUNIOES?.realizadas || 1;
  const maxAg  = totais.agendadas || 1;

  const mpAg = calcMetaProp(metaAg);
  const mpRe = calcMetaProp(metaRe);

  const renderCardReu = (prefixo, valor, meta, mp, unidade = 'reuniões') => {
    const pct     = Math.min((valor / meta) * 100, 100);
    const cor     = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
    const corCls  = pct >= 80 ? 'verde' : pct >= 50 ? 'amarelo' : 'vermelho';
    const pctProp = Math.min((mp.valor / meta) * 100, 100);
    const diff    = valor - Math.round(mp.valor);
    const corDiff = diff >= 0 ? '#22c55e' : '#ef4444';
    const sinal   = diff >= 0 ? '▲' : '▼';

    setBarra(`barra-${prefixo}`, valor, meta);

    const elPct = document.getElementById(`pct-${prefixo}`);
    if (elPct) { elPct.textContent = FMT_PCT(pct) + ' da meta'; elPct.className = 'card-pct ' + corCls; }

    const elInfo = document.getElementById(`info-${prefixo}`);
    if (elInfo) elInfo.textContent = `${valor} de ${meta} ${unidade}`;

    const elDiff = document.getElementById(`diff-${prefixo}`);
    if (elDiff) { elDiff.textContent = `${sinal} ${Math.abs(diff)} vs meta d.u. ${mp.diaUtil}`; elDiff.style.color = corDiff; elDiff.style.fontSize = '0.7rem'; elDiff.style.fontWeight = '600'; }

    const elHint = document.getElementById(`hint-${prefixo}`);
    if (elHint) elHint.innerHTML = `Meta para hoje (${mp.diaUtil}º d.u. de ${mp.totalUtils}): <strong>${Math.round(mp.valor)} ${unidade}</strong>`;

    const elTick = document.getElementById(`tick-${prefixo}`);
    if (elTick) elTick.style.left = pctProp + '%';

    const elBarra = document.getElementById(`barra-${prefixo}`);
    if (elBarra) elBarra.style.background = cor;
  };

  renderCardReu('agendadas',  totais.agendadas,  metaAg, mpAg);
  renderCardReu('realizadas', totais.realizadas, metaRe, mpRe);

  const metaCli = CONFIG.META_CLIENTES || 1;
  renderCardReu('clientes', totais.clientes, metaCli, calcMetaProp(metaCli), 'clientes');

  const maxFat = CONFIG.META_TOTAL || 80000;
  desenharGauge('gauge-geral', totais.faturamento, maxFat);

  // Comparação com período correspondente do mês anterior
  const ant = periodoAnterior();
  if (ant) {
    const prev = calcularTotaisParaPeriodo(ant.ini, ant.fim);
    const setComp = (id, atual, anterior, isCurrency) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = badgeComp(atual, anterior, ant.label, isCurrency);
    };
    setComp('comp-agendadas',   totais.agendadas,   prev.agendadas,   false);
    setComp('comp-realizadas',  totais.realizadas,  prev.realizadas,  false);
    setComp('comp-clientes',    totais.clientes,    prev.clientes,    false);
    setComp('comp-faturamento', totais.faturamento, prev.faturamento, true);
  }

  // Meta proporcional ao dia atual
  const mp   = calcMetaProp(CONFIG.META_TOTAL);
  const diff = totais.faturamento - mp.valor;
  const corStatus = diff >= 0 ? '#22c55e' : '#ef4444';
  const sinal     = diff >= 0 ? '▲ Adiantado' : '▼ Atrasado';
  const elProp = document.getElementById('meta-prop-geral');
  if (elProp) {
    elProp.innerHTML = `
      <div class="meta-prop-linha">
        <span class="meta-prop-label">${mp.diaUtil}º dia útil de ${mp.totalUtils} — Meta para hoje:</span>
        <span class="meta-prop-val">${FMT_BRL.format(mp.valor)}</span>
      </div>
      <div class="meta-prop-status" style="color:${corStatus}">
        ${sinal} em ${FMT_BRL.format(Math.abs(diff))}
      </div>`;
  }
}

// ---- TAXA DE CONVERSÃO ----
function renderizarTaxaConversao(vends) {
  const grid = document.getElementById('taxa-conversao-grid');
  grid.innerHTML = '';
  vends.forEach(v => {
    const taxa = v.reunioesRealizadas > 0
      ? (v.clientes / v.reunioesRealizadas) * 100 : 0;
    const cor = taxa >= 30 ? '#22c55e' : taxa >= 15 ? '#f59e0b' : '#ef4444';
    grid.innerHTML += `
      <div class="taxa-item">
        <div class="taxa-header">
          <span class="taxa-nome">${v.nome}</span>
          <span class="taxa-pct">${FMT_PCT(taxa)}</span>
        </div>
        <div class="taxa-barra-wrap">
          <div class="taxa-barra" style="width:${Math.min(taxa,100)}%;background:${cor}"></div>
        </div>
        <span style="font-size:0.7rem;color:#64748b">
          ${v.clientes} cliente${v.clientes !== 1 ? 's' : ''} / ${v.reunioesRealizadas} realizadas
        </span>
      </div>`;
  });
}

// ---- RANKING ----
function renderizarRanking(vends) {
  const sorted = [...vends].sort((a, b) => b.faturamento - a.faturamento);
  const tbody  = document.querySelector('#tabela-ranking tbody');
  tbody.innerHTML = '';
  sorted.forEach((v, i) => {
    const tr = document.createElement('tr');
    if (i === 0) tr.classList.add('rank-1');
    tr.innerHTML = `
      <td class="pos">${i + 1}º</td>
      <td>${v.nome}</td>
      <td class="fat">${FMT_BRL.format(v.faturamento)}</td>
      <td>${v.clientes}</td>`;
    tbody.appendChild(tr);
  });
}

// ---- META VS REALIZADO ----
function renderizarMetas(vends) {
  const grid = document.getElementById('metas-grid');
  if (!grid) return;
  grid.innerHTML = '';
  [...vends].sort((a, b) => b.faturamento - a.faturamento).forEach(v => {
    const pct    = Math.min((v.faturamento / v.meta) * 100, 100);
    const cor    = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
    const corCls = pct >= 80 ? 'verde'   : pct >= 50 ? 'amarelo' : 'vermelho';
    const mp     = calcMetaProp(v.meta);
    const pctProp = Math.min((mp.valor / v.meta) * 100, 100);
    const diff    = v.faturamento - mp.valor;
    const corDiff = diff >= 0 ? '#22c55e' : '#ef4444';
    const sinal   = diff >= 0 ? '▲' : '▼';
    grid.innerHTML += `
      <div class="meta-item">
        <div class="meta-header">
          <span class="meta-nome">${v.nome}</span>
          <span class="meta-pct ${corCls}">${FMT_PCT(pct)} da meta</span>
        </div>
        <div class="meta-barra-container">
          <div class="meta-barra-wrap">
            <div class="meta-barra" style="width:${pct}%;background:${cor}"></div>
          </div>
          <div class="meta-prop-tick" style="left:${pctProp}%" title="Meta para hoje (${mp.diaUtil}º dia útil de ${mp.totalUtils})"></div>
        </div>
        <div class="meta-prop-row">
          <span class="meta-info">${FMT_BRL.format(v.faturamento)} de ${FMT_BRL.format(v.meta)}</span>
          <span style="color:${corDiff};font-size:0.7rem;font-weight:600">
            ${sinal} ${FMT_BRL.format(Math.abs(diff))} vs meta d.u. ${mp.diaUtil}
          </span>
        </div>
        <div class="meta-prop-hint">
          Meta para hoje (${mp.diaUtil}º d.u. de ${mp.totalUtils}): <strong>${FMT_BRL.format(mp.valor)}</strong>
        </div>
      </div>`;
  });
}

// ---- GRÁFICOS ----
function renderizarGraficos(vends) {
  const meses = vends[0]?.historico?.map(h => h.mes) || [];
  const cores  = ['#2563eb','#22c55e','#f59e0b','#a855f7','#ef4444','#06b6d4'];

  const datasetsFat = vends.map((v, i) => ({
    label:           v.nome,
    data:            v.historico?.map(h => h.faturamento) || [],
    borderColor:     cores[i % cores.length],
    backgroundColor: cores[i % cores.length] + '22',
    tension: 0.4, fill: true, pointRadius: 4,
  }));

  if (grafFaturamento) grafFaturamento.destroy();
  grafFaturamento = new Chart(document.getElementById('grafico-faturamento'), {
    type: 'line',
    data: { labels: meses, datasets: datasetsFat },
    options: opcoesGrafico('R$'),
  });

  const datasetsAg = vends.map((v, i) => ({
    label:       v.nome + ' (agendadas)',
    data:        v.historico?.map(h => h.agendadas) || [],
    borderColor: cores[i % cores.length] + 'aa',
    borderDash: [4, 4],
    tension: 0.4, pointRadius: 3, fill: false,
  }));
  const datasetsRe = vends.map((v, i) => ({
    label:       v.nome + ' (realizadas)',
    data:        v.historico?.map(h => h.realizadas) || [],
    borderColor: cores[i % cores.length],
    tension: 0.4, pointRadius: 3, fill: false,
  }));

  // Legenda customizada: 3 colunas (por pessoa), ag em cima / re embaixo
  const legendEl = document.getElementById('legenda-reunioes');
  if (legendEl) {
    legendEl.innerHTML = vends.map((v, i) => {
      const cor = cores[i % cores.length];
      return `
        <div class="legenda-col">
          <div class="legenda-item">
            <span class="legenda-linha tracejada" style="border-color:${cor}aa"></span>
            <span>${v.nome} (agendadas)</span>
          </div>
          <div class="legenda-item">
            <span class="legenda-linha" style="border-color:${cor}"></span>
            <span>${v.nome} (realizadas)</span>
          </div>
        </div>`;
    }).join('');
  }

  const opReunioes = opcoesGrafico('');
  opReunioes.plugins.legend = { display: false };

  if (grafReunioes) grafReunioes.destroy();
  grafReunioes = new Chart(document.getElementById('grafico-reunioes'), {
    type: 'line',
    data: { labels: meses, datasets: [...datasetsAg, ...datasetsRe] },
    options: opReunioes,
  });
}

function opcoesGrafico(prefixo) {
  return {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: ctx => prefixo === 'R$'
            ? ctx.dataset.label + ': ' + FMT_BRL.format(ctx.parsed.y)
            : ctx.dataset.label + ': ' + ctx.parsed.y,
        },
      },
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: '#1e2d4a' } },
      y: {
        ticks: {
          color: '#64748b',
          callback: v => prefixo === 'R$' ? 'R$ ' + (v / 1000).toFixed(0) + 'k' : v,
        },
        grid: { color: '#1e2d4a' },
      },
    },
  };
}

function calcularVendedorPeriodo(nLow, isSdr, ini, fim) {
  const cA = CONFIG.SHEET_ATENDIMENTOS.COLS;
  const cC = CONFIG.SHEET_CONTRATOS.COLS;
  const colAtend   = isSdr ? 'SDR' : cA.CLOSER;
  const colContrat = isSdr ? 'SDR' : cC.CLOSER;
  const atend      = (window._rawAtend || []).filter(r => (r[colAtend] || '').toLowerCase() === nLow);
  const contratosP = (window._rawContratos || []).filter(r => {
    const d = parseBRDate(r[cC.DATA_FECHAMENTO]);
    return (r[colContrat] || '').toLowerCase() === nLow && d && d >= ini && d <= fim;
  });
  return {
    agendadas:   atend.filter(r => { const d = parseBRDate(r[cA.DATA_AGENDAMENTO]); return d && d >= ini && d <= fim; }).length,
    realizadas:  atend.filter(r => { const d = parseBRDate(r[cA.DATA_ATENDIMENTO]); return d && d >= ini && d <= fim && r[cA.STATUS_ATENDIMENTO] === CONFIG.SHEET_ATENDIMENTOS.STATUS_REALIZADO; }).length,
    clientes:    contratosP.length,
    faturamento: contratosP.reduce((s, r) => s + parseBRL(r[cC.HONORARIOS]), 0),
  };
}

// ---- CARDS DE VENDEDOR ----
function renderizarCardsVendedor(vends) {
  const grid = document.getElementById('vendedores-grid');
  grid.innerHTML = '';

  vends.forEach((v, idx) => {
    const pctMeta = Math.min((v.faturamento / v.meta) * 100, 100);
    const corMeta = pctMeta >= 80 ? '#22c55e' : pctMeta >= 50 ? '#f59e0b' : '#ef4444';
    const taxa    = v.reunioesRealizadas > 0
      ? ((v.clientes / v.reunioesRealizadas) * 100).toFixed(1) : '0.0';
    const mp      = calcMetaProp(v.meta);
    const diffV   = v.faturamento - mp.valor;
    const sinalV  = diffV >= 0 ? '▲' : '▼';
    const corDiffV = diffV >= 0 ? '#22c55e' : '#ef4444';

    const ant  = periodoAnterior();
    const prev = ant ? calcularVendedorPeriodo(v.nome.toLowerCase(), v.tipo === 'SDR', ant.ini, ant.fim) : null;

    const compItem = (atual, anterior, label) => {
      const delta = atual - anterior;
      const cor   = delta >= 0 ? '#22c55e' : '#ef4444';
      const seta  = delta >= 0 ? '↑' : '↓';
      return `<span class="cv-comp-item"><span style="color:${cor};font-weight:700">${seta}${Math.abs(delta)}</span> ${label}</span>`;
    };
    const compFat = (atual, anterior) => {
      const delta = atual - anterior;
      const cor   = delta >= 0 ? '#22c55e' : '#ef4444';
      const seta  = delta >= 0 ? '↑' : '↓';
      const abs   = Math.abs(delta);
      const txt   = abs >= 1000 ? 'R$' + (abs/1000).toFixed(1).replace('.',',') + 'k' : FMT_BRL.format(abs);
      return `<span class="cv-comp-item"><span style="color:${cor};font-weight:700">${seta}${txt}</span> fat.</span>`;
    };
    const compHTML = prev ? `
      <div class="cv-comp">
        <span class="cv-comp-label">vs. ${ant.label}:</span>
        ${compItem(v.reunioesAgendadas, prev.agendadas, 'agend.')}
        ${compItem(v.reunioesRealizadas, prev.realizadas, 'realiz.')}
        ${compItem(v.clientes, prev.clientes, 'clientes')}
        ${compFat(v.faturamento, prev.faturamento)}
      </div>` : '';

    const canvasId = `gauge-v-${idx}`;
    const card     = document.createElement('div');
    card.className = 'card-vendedor';
    card.innerHTML = `
      <div class="cv-nome">
        ${v.nome}
        <span class="cv-cargo cv-cargo-${v.tipo.toLowerCase()}">${v.tipo}</span>
      </div>
      <div class="cv-stats">
        <div class="cv-stat">
          <span class="cv-stat-label">Reuniões Agendadas</span>
          <span class="cv-stat-val">${v.reunioesAgendadas}</span>
        </div>
        <div class="cv-stat">
          <span class="cv-stat-label">Reuniões Realizadas</span>
          <span class="cv-stat-val">${v.reunioesRealizadas > 0 ? v.reunioesRealizadas : '—'}</span>
        </div>
        <div class="cv-stat">
          <span class="cv-stat-label">Clientes</span>
          <span class="cv-stat-val">${v.clientes}</span>
        </div>
        <div class="cv-stat">
          <span class="cv-stat-label">Taxa de Conversão</span>
          <span class="cv-stat-val azul">${taxa}%</span>
        </div>
      </div>
      <div class="cv-gauge-wrap">
        <canvas id="${canvasId}" height="110"></canvas>
      </div>
      <div class="cv-meta">
        <div class="cv-meta-header">
          <span class="cv-meta-label">Meta de Faturamento</span>
          <span class="cv-meta-pct" style="color:${corMeta}">${FMT_PCT(pctMeta)} da meta</span>
        </div>
        <div class="cv-meta-barra-container">
          <div class="cv-meta-barra-wrap">
            <div class="cv-meta-barra" style="width:${pctMeta}%;background:${corMeta}"></div>
          </div>
          <div class="meta-prop-tick meta-prop-tick-sm" style="left:${Math.min((mp.valor/v.meta)*100,100)}%" title="Meta para hoje"></div>
        </div>
        <div class="meta-prop-row" style="margin-top:0.3rem">
          <span style="font-size:0.7rem;color:#64748b">${FMT_BRL.format(v.faturamento)} de ${FMT_BRL.format(v.meta)}</span>
          <span style="font-size:0.7rem;color:${corDiffV};font-weight:600">${sinalV} ${FMT_BRL.format(Math.abs(diffV))}</span>
        </div>
        <div class="meta-prop-hint">
          Meta para hoje (${mp.diaUtil}º d.u. de ${mp.totalUtils}): <strong>${FMT_BRL.format(mp.valor)}</strong>
        </div>
      </div>
      ${compHTML}`;

    grid.appendChild(card);
    setTimeout(() => desenharGauge(canvasId, v.faturamento, v.meta), 50);
  });
}

// ---- GAUGE (VELOCÍMETRO) ----
function desenharGauge(id, valor, maximo) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w   = canvas.offsetWidth || 200;
  canvas.width  = w;
  const labelH  = Math.max(14, Math.round(w * 0.055));
  const padBot  = labelH + 18;
  canvas.height = Math.round(w * 0.58) + padBot;
  const cx = w / 2;
  const cy = canvas.height - padBot;
  const r  = Math.min(cx, cy) - 10;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
  ctx.lineWidth   = 18;
  ctx.strokeStyle = '#1e2d4a';
  ctx.stroke();

  const pct   = maximo > 0 ? Math.min(valor / maximo, 1) : 0;
  const cor   = pct >= 0.8 ? '#22c55e' : pct >= 0.5 ? '#f59e0b' : '#2563eb';

  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI + pct * Math.PI);
  ctx.lineWidth   = 18;
  ctx.lineCap     = 'round';
  ctx.strokeStyle = cor;
  ctx.stroke();

  const label = valor >= 1000
    ? 'R$ ' + (valor / 1000).toFixed(1).replace('.', ',') + ' mil'
    : FMT_BRL.format(valor);

  ctx.fillStyle    = '#e2e8f0';
  ctx.font         = `bold ${Math.round(w * 0.085)}px Segoe UI,system-ui,sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy - r * 0.3);

  ctx.fillStyle = '#64748b';
  ctx.font      = `${Math.round(w * 0.06)}px Segoe UI,system-ui,sans-serif`;
  ctx.fillText('Faturamento', cx, cy - r * 0.3 + Math.round(w * 0.1));

  // Rótulos nas pontas do arco, dentro do canvas
  const labelSize = Math.max(9, Math.round(w * 0.042));
  ctx.fillStyle    = '#64748b';
  ctx.font         = `${labelSize}px Segoe UI,system-ui,sans-serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign    = 'left';
  ctx.fillText('R$ 0', 4, cy + 12);
  ctx.textAlign = 'right';
  ctx.fillText(formataMilhar(maximo), w - 4, cy + 12);
}

// ---- NO-SHOW ----
function renderizarNoShow() {
  const dataInicio = new Date(document.getElementById('data-inicio').value + 'T00:00:00');
  const dataFim    = new Date(document.getElementById('data-fim').value    + 'T23:59:59');
  const cA  = CONFIG.SHEET_ATENDIMENTOS.COLS;
  const raw = window._rawAtend || [];

  const atendNoPeriodo = raw.filter(r => {
    const d = parseBRDate(r[cA.DATA_AGENDAMENTO]);
    return d && d >= dataInicio && d <= dataFim;
  });

  const isNoShow = (r) =>
    (r[cA.STATUS_ATENDIMENTO] || '').toLowerCase().includes('no') &&
    (r[cA.STATUS_ATENDIMENTO] || '').toLowerCase().includes('show');

  const totalNoShow = atendNoPeriodo.filter(isNoShow).length;
  const totalGeral  = atendNoPeriodo.length;
  const pctGlobal   = totalGeral > 0 ? (totalNoShow / totalGeral) * 100 : 0;

  const el = document.getElementById('noshow-pct-global');
  if (el) el.textContent = FMT_PCT(pctGlobal);

  const lista = document.getElementById('noshow-lista');
  if (!lista) return;
  lista.innerHTML = '';

  CONFIG.EQUIPE.filter(m => m.tipo === 'SDR').forEach(membro => {
    const nLow    = membro.nome.toLowerCase();
    const col     = membro.tipo === 'SDR' ? 'SDR' : cA.CLOSER;
    const meus    = atendNoPeriodo.filter(r => (r[col] || '').toLowerCase() === nLow);
    const meusNS  = meus.filter(isNoShow).length;
    const pct     = meus.length > 0 ? (meusNS / meus.length) * 100 : 0;
    const cor     = pct <= 15 ? '#22c55e' : pct <= 30 ? '#f59e0b' : '#ef4444';

    lista.innerHTML += `
      <div class="noshow-item">
        <div class="noshow-item-header">
          <span>${membro.nome}</span>
          <span style="color:${cor};font-weight:600">${FMT_PCT(pct)}</span>
        </div>
        <div class="noshow-bar-wrap">
          <div class="noshow-bar" style="width:${Math.min(pct,100)}%;background:${cor}"></div>
        </div>
        <span style="font-size:0.68rem;color:#64748b">${meusNS} no-show de ${meus.length} agendadas</span>
      </div>`;
  });
}

// ---- TEMPO MÉDIO DE FECHAMENTO ----
function renderizarTempoFechamento() {
  const dataInicio = new Date(document.getElementById('data-inicio').value + 'T00:00:00');
  const dataFim    = new Date(document.getElementById('data-fim').value    + 'T23:59:59');
  const cC = CONFIG.SHEET_CONTRATOS.COLS;

  const contratos = (window._rawContratos || []).filter(r => {
    const d = parseBRDate(r[cC.DATA_FECHAMENTO]);
    return d && d >= dataInicio && d <= dataFim;
  });

  // Dias = DATA DO FECHAMENTO − DATA DA REUNIÃO
  const calcDias = (r) => {
    const dReu  = parseBRDate(r[cC.DATA_REUNIAO]);
    const dFech = parseBRDate(r[cC.DATA_FECHAMENTO]);
    if (!dReu || !dFech) return null;
    const diff = Math.round((dFech - dReu) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : null;
  };

  const closers = CONFIG.EQUIPE.filter(m => m.tipo === 'Closer');
  let somaGlobal = 0, countGlobal = 0;

  const lista = document.getElementById('tempo-lista');
  if (lista) lista.innerHTML = '';

  closers.forEach(membro => {
    const nLow  = membro.nome.toLowerCase();
    const meus  = contratos.filter(r => (r[cC.CLOSER] || '').toLowerCase() === nLow);
    const dias  = meus.map(calcDias).filter(v => v !== null);
    const media = dias.length > 0 ? dias.reduce((a, b) => a + b, 0) / dias.length : null;
    if (media !== null) { somaGlobal += media * dias.length; countGlobal += dias.length; }

    if (lista) {
      lista.innerHTML += `
        <div class="noshow-item">
          <div class="noshow-item-header">
            <span>${membro.nome}</span>
            <span style="color:#2563eb;font-weight:600">${media !== null ? media.toFixed(1) + ' dias' : '—'}</span>
          </div>
          <span style="font-size:0.68rem;color:#64748b">${dias.length} contrato${dias.length !== 1 ? 's' : ''} analisado${dias.length !== 1 ? 's' : ''}</span>
        </div>`;
    }
  });

  const mediaGlobal = countGlobal > 0 ? somaGlobal / countGlobal : null;
  const elGlobal = document.getElementById('tempo-medio-global');
  if (elGlobal) elGlobal.textContent = mediaGlobal !== null ? mediaGlobal.toFixed(1) : '—';
}

// ---- TICKET MÉDIO ----
function renderizarTicketMedio() {
  const dataInicio = new Date(document.getElementById('data-inicio').value + 'T00:00:00');
  const dataFim    = new Date(document.getElementById('data-fim').value    + 'T23:59:59');
  const cC  = CONFIG.SHEET_CONTRATOS.COLS;
  const contratos = (window._rawContratos || []).filter(r => {
    const d = parseBRDate(r[cC.DATA_FECHAMENTO]);
    return d && d >= dataInicio && d <= dataFim;
  });

  const lista = document.getElementById('ticket-lista');
  if (!lista) return;
  lista.innerHTML = '';

  const closers = CONFIG.EQUIPE.filter(m => m.tipo === 'Closer');

  // Ticket médio global (todos os closers juntos)
  const totalGeral = contratos.reduce((s, r) => s + parseBRL(r[cC.HONORARIOS]), 0);
  const mediaGeral = contratos.length > 0 ? totalGeral / contratos.length : 0;
  lista.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0.6rem;background:rgba(37,99,235,0.08);border:1px solid rgba(37,99,235,0.2);border-radius:8px;margin-bottom:0.6rem">
      <span style="font-size:0.75rem;color:var(--texto-muted)">Ticket médio geral</span>
      <span style="font-weight:800;color:var(--azul-claro)">${mediaGeral > 0 ? FMT_BRL.format(mediaGeral) : '—'}</span>
    </div>`;

  const dados = closers.map(membro => {
    const nLow  = membro.nome.toLowerCase();
    const meus  = contratos.filter(r => (r[cC.CLOSER] || '').toLowerCase() === nLow);
    const total = meus.reduce((s, r) => s + parseBRL(r[cC.HONORARIOS]), 0);
    const media = meus.length > 0 ? total / meus.length : 0;
    return { nome: membro.nome, media, count: meus.length };
  }).sort((a, b) => b.media - a.media);

  dados.forEach((d, i) => {
    const max = dados[0]?.media || 1;
    const pct = max > 0 ? (d.media / max) * 100 : 0;
    const cor = i === 0 ? '#22c55e' : '#2563eb';
    lista.innerHTML += `
      <div class="ticket-item">
        <div class="noshow-item-header">
          <span>${d.nome}</span>
          <span class="ticket-valor">${d.media > 0 ? FMT_BRL.format(d.media) : '—'}</span>
        </div>
        <div class="noshow-bar-wrap">
          <div class="noshow-bar" style="width:${pct}%;background:${cor}"></div>
        </div>
        <span style="font-size:0.68rem;color:#64748b">${d.count} contrato${d.count !== 1 ? 's' : ''} no período</span>
      </div>`;
  });
}

// ============================================================
// HELPERS
// ============================================================

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setBarra(id, valor, max) {
  const el = document.getElementById(id);
  if (el) el.style.width = Math.min((valor / max) * 100, 100) + '%';
}

function setPct(id, valor, max) {
  const el = document.getElementById(id);
  if (!el) return;
  const pct  = max > 0 ? ((valor / max) * 100).toFixed(1) : '0.0';
  const cls  = parseFloat(pct) >= 50 ? 'verde' : 'vermelho';
  el.textContent = pct + '%';
  el.className   = 'card-pct ' + cls;
}

function formataMilhar(n) {
  if (n >= 1000000) return 'R$ ' + (n / 1000000).toFixed(0) + ' mi';
  if (n >= 1000)    return 'R$ ' + (n / 1000).toFixed(0) + ' mil';
  return FMT_BRL.format(n);
}

function mostrarLoading(ativo) {
  let el = document.getElementById('loading-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading-overlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(15,17,23,0.7);display:flex;align-items:center;justify-content:center;z-index:999;font-size:1rem;color:#94a3b8;gap:0.5rem;';
    el.innerHTML = '<span>Carregando dados...</span>';
    document.body.appendChild(el);
  }
  el.style.display = ativo ? 'flex' : 'none';
}

function mostrarErro(msg) {
  const grid = document.getElementById('vendedores-grid');
  if (grid) grid.innerHTML = `<div style="color:#ef4444;padding:1rem">${msg}</div>`;
  console.error(msg);
}
