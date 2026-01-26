/**
 * API Route: Strategic Ideas (IdeaBox)
 * 
 * GET /api/strategic/ideas - Lista ideias
 * POST /api/strategic/ideas - Cria nova ideia
 * 
 * @module api/strategic/ideas
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ideaBoxTable } from '@/modules/strategic/infrastructure/persistence/schemas/idea-box.schema';
import { getTenantContext } from '@/lib/auth/context';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

// Schema de validação para criação
const CreateIdeaSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().max(2000).optional().default(''), // Campo correto do schema
  sourceType: z.enum(['MANUAL', 'MEETING', 'AGENT', 'SWOT', 'CUSTOMER_FEEDBACK', 'SUGGESTION', 'COMPLAINT', 'OBSERVATION', 'BENCHMARK', 'AUDIT', 'CLIENT_FEEDBACK']).default('MANUAL'),
  importance: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  department: z.string().max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Construir condições
    const conditions = [
      eq(ideaBoxTable.organizationId, ctx.organizationId),
      eq(ideaBoxTable.branchId, ctx.branchId),
      isNull(ideaBoxTable.deletedAt),
    ];

    if (status && status !== 'all') {
      conditions.push(eq(ideaBoxTable.status, status));
    }

    // E13: Migrado para paginação server-side (OFFSET/FETCH)
    // 1. Count total
    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(ideaBoxTable)
      .where(and(...conditions));

    // 2. Buscar página com paginação (MSSQL: usar offset().fetch())
    const offset = (page - 1) * pageSize;
    const baseQuery = db
      .select()
      .from(ideaBoxTable)
      .where(and(...conditions))
      .orderBy(desc(ideaBoxTable.createdAt));

    // MSSQL: usar offset(n).fetch(m) ao invés de limit(m).offset(n)
    const ideas = await baseQuery.offset(offset).fetch(pageSize);

    return NextResponse.json({
      items: ideas,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Erro ao listar ideias:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validar input
    const validation = CreateIdeaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Gerar código sequencial
    const existingIdeas = await db
      .select({ code: ideaBoxTable.code })
      .from(ideaBoxTable)
      .where(eq(ideaBoxTable.organizationId, ctx.organizationId))
      .orderBy(desc(ideaBoxTable.createdAt));

    let nextNumber = 1;
    if (existingIdeas.length > 0 && existingIdeas[0].code) {
      const match = existingIdeas[0].code.match(/IDEA-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    const code = `IDEA-${nextNumber.toString().padStart(4, '0')}`;

    // Criar ideia
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(ideaBoxTable).values({
      id,
      code,
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      sourceType: data.sourceType,
      urgency: 'MEDIUM',
      importance: data.importance,
      status: 'SUBMITTED',
      department: data.department?.trim() || null,
      submittedBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Buscar ideia criada
    const created = await db
      .select()
      .from(ideaBoxTable)
      .where(
        and(
          eq(ideaBoxTable.id, id),
          eq(ideaBoxTable.organizationId, ctx.organizationId),
          eq(ideaBoxTable.branchId, ctx.branchId),
          isNull(ideaBoxTable.deletedAt)
        )
      );

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Erro ao criar ideia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
