export const mockRepositoryPattern = {
  id: 'repository-pattern',
  name: 'Repository Pattern',
  category: 'data-access',
  description: 'Padrao para acesso a dados usando repositories',
  status: 'approved' as const,
  approvedBy: 'Tech Lead',
  approvedDate: '2024-12-01',
  tags: ['database', 'prisma', 'data-access'],
  example: {
    typescript: 'export class UserRepository { ... }'
  },
  rules: [
    'Repository deve encapsular acesso ao Prisma',
    'Metodos devem seguir nomenclatura find/create/update/delete'
  ],
  relatedContracts: ['api-contract']
};

export const mockServicePattern = {
  id: 'service-pattern',
  name: 'Service Layer Pattern',
  category: 'architecture',
  description: 'Camada de servicos para logica de negocio',
  status: 'approved' as const,
  tags: ['service', 'business-logic'],
  rules: [
    'Services devem ser stateless',
    'Validacao em services, nao em controllers'
  ]
};

export const mockProposedPattern = {
  id: 'test-pattern',
  name: 'Test Pattern',
  category: 'testing',
  description: 'Pattern for testing',
  status: 'proposed' as const,
  proposedDate: '2025-12-26',
  tags: ['test'],
  rules: ['Test rule']
};

