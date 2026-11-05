// ============================================================
// CONFIGURAÇÃO DO DASHBOARD — BORGES MACEDO
// ============================================================
//
// O painel deste repositório saiu do ar em 05/11/2026. Este arquivo continua
// publicado porque o painel da TV (painel-tv) lê daqui os nomes das colunas,
// as metas e os feriados. Nada mais depende dele.
//
// O que saiu daqui em 05/11/2026, e por quê:
//
//   • a chave de API do Google — este repositório é público, e a chave vivia
//     nele em texto puro. Quem precisava dela (o painel da TV) passou a tirar
//     a sua do próprio cofre. A chave antiga continua no histórico público do
//     git: só a rotação dela no Google Cloud a invalida de fato;
//   • os IDs e gids das planilhas — ID no código entrega o endereço do dado
//     junto com a página. As planilhas de atendimentos e de contratos agora
//     são lidas pelo proxy (fontes "atend" e "clientes"), que guarda os IDs
//     nas Propriedades do Script e roda com a conta dona delas;
//   • o bloco da planilha de 2025, que nenhum painel lia mais daqui.
//
// Sobrou a configuração de verdade: como as colunas se chamam e quais são as
// metas. Mudar uma meta aqui continua mudando a TV.

const CONFIG = {

  // --- PLANILHA 1: CRM / Atendimentos (proxy: fonte "atend") ---
  // Controla reuniões agendadas e realizadas
  SHEET_ATENDIMENTOS: {
    COLS: {
      CLOSER:             'Closer',
      SDR:                'SDR',
      DATA_AGENDAMENTO:   'Data do Agendamento',
      DATA_ATENDIMENTO:   'Data do Atendimento',
      STATUS_ATENDIMENTO: 'Etapa do Funil',
      LEAD:               'Lead',
    },
    STATUS_NAO_REALIZADO: ['Reunião Agendada', 'Remarcar Reunião', 'Lead Apagado'],
  },

  // --- PLANILHA 2: Contratos Fechados 2026 (proxy: fonte "clientes") ---
  SHEET_CONTRATOS: {
    COLS: {
      CLOSER:          'CLOSER',
      SDR:             'SDR',
      DATA_REUNIAO:    'DATA DA REUNIÃO',
      DATA_FECHAMENTO: 'DATA DO FECHAMENTO',
      HONORARIOS:      'VALOR DA ENTRADA',
      CLIENTE:         'CONTATO (QUEM ESTÁ EM CONTATO COM O ESCRITÓRIO)',
    },
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
