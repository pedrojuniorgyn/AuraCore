/**
 * API: GET /api/strategic/search/suggestions
 * Retorna sugestões de busca
 *
 * @module app/api/strategic/search/suggestions
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { SearchSuggestion } from '@/lib/search/search-types';

export const dynamic = 'force-dynamic';

// Mock suggestions data
const COMMON_TERMS = [
  'margem bruta',
  'margem líquida',
  'otd',
  'nps',
  'satisfação',
  'receita',
  'produtividade',
  'qualidade',
  'entrega',
  'cliente',
];

const ENTITY_NAMES = [
  { text: 'Taxa de Entrega (OTD)', type: 'kpi' as const, id: 'kpi-1' },
  { text: 'Margem Bruta', type: 'kpi' as const, id: 'kpi-3' },
  { text: 'NPS - Satisfação do Cliente', type: 'kpi' as const, id: 'kpi-4' },
  { text: 'Melhorar OTD na Região Sul', type: 'action_plan' as const, id: 'plan-1' },
  { text: 'Ciclo PDCA - Qualidade', type: 'pdca_cycle' as const, id: 'pdca-1' },
];

const USERS = [
  { name: 'João Silva', id: 'user-1' },
  { name: 'Maria Santos', id: 'user-2' },
  { name: 'Pedro Lima', id: 'user-3' },
];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim();

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const suggestions: SearchSuggestion[] = [];

    // Query suggestions (common search terms)
    const matchingTerms = COMMON_TERMS.filter((term) => term.includes(query)).slice(0, 3);

    matchingTerms.forEach((term) => {
      suggestions.push({
        type: 'query',
        text: term,
        highlight: term.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>'),
      });
    });

    // Entity suggestions
    const matchingEntities = ENTITY_NAMES.filter((entity) =>
      entity.text.toLowerCase().includes(query)
    ).slice(0, 3);

    matchingEntities.forEach((entity) => {
      suggestions.push({
        type: 'entity',
        text: entity.text,
        highlight: entity.text.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>'),
        entityType: entity.type,
        entityId: entity.id,
      });
    });

    // User suggestions
    const matchingUsers = USERS.filter((user) => user.name.toLowerCase().includes(query)).slice(
      0,
      2
    );

    matchingUsers.forEach((user) => {
      suggestions.push({
        type: 'user',
        text: user.name,
        highlight: user.name.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>'),
        icon: 'user',
      });
    });

    return NextResponse.json(suggestions.slice(0, 8));
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/strategic/search/suggestions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
