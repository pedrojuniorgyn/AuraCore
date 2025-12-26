export const mockEpicE0 = {
  id: 'E0',
  name: 'Setup Inicial',
  status: 'COMPLETE',
  progress: 100,
  deliverables: [
    'Estrutura MCP Server',
    'Configuracao Cursor',
    'Integracao funcional'
  ],
  startDate: '2025-12-25',
  endDate: '2025-12-26'
};

export const mockEpicE1 = {
  id: 'E1',
  name: 'Migracao Conhecimento',
  status: 'COMPLETE',
  progress: 100,
  deliverables: [
    '6 contratos migrados',
    '6 ADRs migrados',
    'MCP Resources funcionais'
  ],
  dependencies: ['E0']
};

