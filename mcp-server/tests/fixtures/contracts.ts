export const mockApiContract = {
  id: 'api-contract',
  title: 'API Contract',
  category: 'backend',
  description: 'Regras para APIs',
  rules: [
    'APIs devem usar GET/POST/PUT/DELETE',
    'Endpoints devem retornar status HTTP corretos',
    'Validacao com Zod obrigatoria'
  ],
  examples: []
};

export const mockRbacContract = {
  id: 'rbac-contract',
  title: 'RBAC Contract',
  category: 'security',
  description: 'Regras de autenticacao e autorizacao',
  rules: [
    'Sempre verificar permissoes',
    'RBAC no backend obrigatorio'
  ]
};

