/**
 * API: PDCA Cycle by ID
 * @module api/strategic/pdca/[id]
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

// Mock store (shared with main route via module scope)
const pdcaStore = new Map<string, PDCATransition>();

function initializeMockData() {
  if (pdcaStore.size > 0) return;

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const mockTransition: PDCATransition = {
    id: 'pdca-1',
    actionPlanId: 'ap-001',
    actionPlanCode: 'AP-2026-001',
    actionPlanTitle: 'Melhoria OTD Região Sul',
    fromPhase: 'PLAN',
    toPhase: 'DO',
    transitionReason: 'Planejamento concluído',
    evidences: ['Cronograma aprovado'],
    completionPercent: 25,
    transitionedBy: 'João Silva',
    transitionedAt: yesterday,
  };

  pdcaStore.set(mockTransition.id, mockTransition);
}

// GET - Obter transição específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  initializeMockData();
  const { id } = await params;

  const transition = pdcaStore.get(id);

  if (!transition) {
    return NextResponse.json({ error: 'PDCA transition not found' }, { status: 404 });
  }

  return NextResponse.json(transition);
}

// DELETE - Remover transição
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  initializeMockData();
  const { id } = await params;

  if (!pdcaStore.has(id)) {
    return NextResponse.json({ error: 'PDCA transition not found' }, { status: 404 });
  }

  pdcaStore.delete(id);

  return NextResponse.json({ success: true });
}
