// ============================================================
// CONFIGURAÇÃO DO DASHBOARD — BORGES MACEDO
// ============================================================

const CONFIG = {

  // Chave de API do Google Cloud (lê todas as linhas, incluindo ocultas)
  GOOGLE_API_KEY: 'AIzaSyDPMGdaY0Yxm4EFrGFoaamJeWBtfDAJZfw',


  // --- PLANILHA 1: CRM / Atendimentos ---
  // Controla reuniões agendadas e realizadas
  SHEET_ATENDIMENTOS: {
    ID:  '1mlObepYSpWFnKS4fuhLhDf7t33ecNTGWSpud4uS1j_Y',
    GID: '845920680',
    COLS: {
      CLOSER:             'Closer',
      SDR:                'SDR',
      DATA_AGENDAMENTO:   'Data do Agendamento',
      DATA_ATENDIMENTO:   'Data do Atendimento',
      STATUS_ATENDIMENTO: 'Status do Atendimento',
      LEAD:               'Lead',
    },
    STATUS_REALIZADO: 'Realizado',
  },

  // --- PLANILHA 2: Contratos Fechados 2026 ---
  SHEET_CONTRATOS: {
    ID:  '1FWbG3Xuo8TjFfi0puF6E9GFsXrUb6fRdollTfq9-4Dg',
    GID: '467767546',
    COLS: {
      CLOSER:          'CLOSER',
      SDR:             'SDR',
      DATA_REUNIAO:    'DATA DA REUNIÃO',
      DATA_FECHAMENTO: 'DATA DO FECHAMENTO',
      HONORARIOS:      'VALOR DA ENTRADA',
      CLIENTE:         'CONTATO (QUEM ESTÁ EM CONTATO COM O ESCRITÓRIO)',
    },
  },

  // --- PLANILHA 3: Contratos Fechados 2025 (aba DADOS) ---
  SHEET_CONTRATOS_2025: {
    ID:  '1nQGtxa97k5vamnt7udQJvjcNadBFAWHgd6v6dvOhI1c',
    GID: '1037589154',
    COL_CLIENTE: 'NOME COMPLETO',
  },

  // --- EQUIPE ATIVA E METAS ---
  EQUIPE: [
    { nome: 'Maiane',  tipo: 'SDR',    meta: 80000 },
    { nome: 'Luiz',    tipo: 'Closer', meta: 65000 },
    { nome: 'Gabriel', tipo: 'Closer', meta: 15000 },
  ],

  // Meta total do escritório (máximo do velocímetro geral)
  META_TOTAL: 80000,

  // Metas mensais de reuniões
  META_REUNIOES: {
    agendadas:  100,
    realizadas:  95,
  },

  // Meta mensal de clientes fechados
  META_CLIENTES: 30,

  // Feriados estaduais/municipais extras (formato 'YYYY-MM-DD')
  // Os feriados nacionais e móveis (Carnaval, Páscoa, Corpus Christi) já são calculados automaticamente
  FERIADOS_EXTRAS: [
    // '2026-07-09', // Exemplo: Revolução Constitucionalista (SP)
    '2026-06-05', // Pós-Corpus Christi (emenda)
    '2026-06-23', // Feriado municipal/estadual
    '2026-06-24', // São João (feriado estadual BA)
    '2026-07-02', // Feriado municipal
  ],
};
