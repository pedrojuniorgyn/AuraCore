/**
 * API: Strategic Permissions
 * Gerenciamento de permissões do módulo estratégico
 * @module api/strategic/permissions
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  module: string;
  actions: string[];
}

// Mock permissions
const permissions: Permission[] = [
  {
    id: 'perm-1',
    code: 'strategic.goals.view',
    name: 'Visualizar Objetivos',
    description: 'Permite visualizar objetivos estratégicos',
    module: 'strategic',
    actions: ['read'],
  },
  {
    id: 'perm-2',
    code: 'strategic.goals.manage',
    name: 'Gerenciar Objetivos',
    description: 'Permite criar, editar e excluir objetivos',
    module: 'strategic',
    actions: ['create', 'update', 'delete'],
  },
  {
    id: 'perm-3',
    code: 'strategic.kpis.view',
    name: 'Visualizar KPIs',
    description: 'Permite visualizar indicadores',
    module: 'strategic',
    actions: ['read'],
  },
  {
    id: 'perm-4',
    code: 'strategic.kpis.manage',
    name: 'Gerenciar KPIs',
    description: 'Permite criar, editar e excluir KPIs',
    module: 'strategic',
    actions: ['create', 'update', 'delete'],
  },
  {
    id: 'perm-5',
    code: 'strategic.action-plans.view',
    name: 'Visualizar Planos de Ação',
    description: 'Permite visualizar planos de ação',
    module: 'strategic',
    actions: ['read'],
  },
  {
    id: 'perm-6',
    code: 'strategic.action-plans.manage',
    name: 'Gerenciar Planos de Ação',
    description: 'Permite criar, editar e excluir planos de ação',
    module: 'strategic',
    actions: ['create', 'update', 'delete'],
  },
  {
    id: 'perm-7',
    code: 'strategic.war-room.access',
    name: 'Acessar War Room',
    description: 'Permite acessar salas de crise',
    module: 'strategic',
    actions: ['read'],
  },
  {
    id: 'perm-8',
    code: 'strategic.war-room.manage',
    name: 'Gerenciar War Room',
    description: 'Permite criar e gerenciar salas de crise',
    module: 'strategic',
    actions: ['create', 'update', 'delete'],
  },
  {
    id: 'perm-9',
    code: 'strategic.reports.view',
    name: 'Visualizar Relatórios',
    description: 'Permite visualizar relatórios estratégicos',
    module: 'strategic',
    actions: ['read'],
  },
  {
    id: 'perm-10',
    code: 'strategic.admin',
    name: 'Administrador Estratégico',
    description: 'Acesso total ao módulo estratégico',
    module: 'strategic',
    actions: ['*'],
  },
];

// GET - Listar permissões disponíveis
export const GET = withDI(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const moduleFilter = searchParams.get('module');

  let filtered = permissions;

  if (moduleFilter) {
    filtered = permissions.filter((p) => p.module === moduleFilter);
  }

  return NextResponse.json({ data: filtered });
});
