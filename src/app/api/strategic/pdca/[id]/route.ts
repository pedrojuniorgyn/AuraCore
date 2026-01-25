/**
 * API: PDCA Cycle by ID
 * @module api/strategic/pdca/[id]
 * 
 * ⚠️ S1.1 Batch 3 Phase 2: Zod validation added
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ✅ S1.1 Batch 3 Phase 2: ID param validation
const idParamSchema = z.object({
  id: z.string().min(1, 'ID do PDCA é obrigatório'),
});

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
  const resolvedParams = await params;
  
  // ✅ S1.1 Batch 3 Phase 2: Validate ID
  const validation = idParamSchema.safeParse(resolvedParams);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'ID inválido', details: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  
  const { id } = validation.data;

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
  const resolvedParams = await params;
  
  // ✅ S1.1 Batch 3 Phase 2: Validate ID
  const validation = idParamSchema.safeParse(resolvedParams);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'ID inválido', details: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  
  const { id } = validation.data;

  if (!pdcaStore.has(id)) {
    return NextResponse.json({ error: 'PDCA transition not found' }, { status: 404 });
  }

  pdcaStore.delete(id);

  return NextResponse.json({ success: true });
}
