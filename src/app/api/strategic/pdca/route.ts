/**
 * API: PDCA Cycles
 * @module api/strategic/pdca
 */
import { NextRequest, NextResponse } from 'next/server';

interface PDCATransition {
  id: string;
  actionPlanId: string;
  actionPlanCode: string;
  actionPlanTitle: string;
  fromPhase: 'PLAN' | 'DO' | 'CHECK' | 'ACT';
  toPhase: 'PLAN' | 'DO' | 'CHECK' | 'ACT';
  transitionReason?: string;
  evidences: string[];
  completionPercent: number;
  transitionedBy: string;
  transitionedAt: Date;
}

// Mock store
const pdcaStore = new Map<string, PDCATransition>();

function initializeMockData() {
  if (pdcaStore.size > 0) return;

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const mockTransitions: PDCATransition[] = [
    {
      id: 'pdca-1',
      actionPlanId: 'ap-001',
      actionPlanCode: 'AP-2026-001',
      actionPlanTitle: 'Melhoria OTD Região Sul',
      fromPhase: 'PLAN',
      toPhase: 'DO',
      transitionReason: 'Planejamento concluído, iniciando execução',
      evidences: ['Cronograma aprovado', 'Recursos alocados'],
      completionPercent: 25,
      transitionedBy: 'João Silva',
      transitionedAt: twoDaysAgo,
    },
    {
      id: 'pdca-2',
      actionPlanId: 'ap-001',
      actionPlanCode: 'AP-2026-001',
      actionPlanTitle: 'Melhoria OTD Região Sul',
      fromPhase: 'DO',
      toPhase: 'CHECK',
      transitionReason: 'Execução finalizada, iniciando verificação',
      evidences: ['Treinamento realizado', 'Processo revisado'],
      completionPercent: 75,
      transitionedBy: 'Maria Santos',
      transitionedAt: yesterday,
    },
    {
      id: 'pdca-3',
      actionPlanId: 'ap-002',
      actionPlanCode: 'AP-2026-002',
      actionPlanTitle: 'Redução de Devoluções',
      fromPhase: 'PLAN',
      toPhase: 'DO',
      transitionReason: 'Início da implementação',
      evidences: ['Equipe definida'],
      completionPercent: 20,
      transitionedBy: 'Pedro Alves',
      transitionedAt: now,
    },
  ];

  mockTransitions.forEach((t) => pdcaStore.set(t.id, t));
}

// GET - Listar transições PDCA
export async function GET(request: NextRequest) {
  initializeMockData();

  const { searchParams } = new URL(request.url);
  const actionPlanId = searchParams.get('actionPlanId');

  let transitions = Array.from(pdcaStore.values());

  if (actionPlanId) {
    transitions = transitions.filter((t) => t.actionPlanId === actionPlanId);
  }

  // Ordenar por data (mais recente primeiro)
  transitions.sort(
    (a, b) => new Date(b.transitionedAt).getTime() - new Date(a.transitionedAt).getTime()
  );

  return NextResponse.json({ data: transitions });
}

// POST - Registrar transição PDCA
export async function POST(request: NextRequest) {
  initializeMockData();

  try {
    const body = await request.json();

    const { actionPlanId, fromPhase, toPhase, transitionReason, evidences, completionPercent } =
      body;

    if (!actionPlanId || !fromPhase || !toPhase) {
      return NextResponse.json(
        { error: 'actionPlanId, fromPhase and toPhase are required' },
        { status: 400 }
      );
    }

    const newTransition: PDCATransition = {
      id: `pdca-${Date.now()}`,
      actionPlanId,
      actionPlanCode: body.actionPlanCode || 'AP-XXXX',
      actionPlanTitle: body.actionPlanTitle || 'Action Plan',
      fromPhase,
      toPhase,
      transitionReason: transitionReason || '',
      evidences: evidences || [],
      completionPercent: completionPercent || 0,
      transitionedBy: 'Usuário Atual',
      transitionedAt: new Date(),
    };

    pdcaStore.set(newTransition.id, newTransition);

    return NextResponse.json(newTransition, { status: 201 });
  } catch (error) {
    console.error('Error creating PDCA transition:', error);
    return NextResponse.json({ error: 'Failed to create PDCA transition' }, { status: 500 });
  }
}
