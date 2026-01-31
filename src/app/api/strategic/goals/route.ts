/**
 * API Routes: /api/strategic/goals
 * CRUD de objetivos estratégicos
 *
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { getErrorMessage } from '@/shared/types/type-guards';
import { CreateStrategicGoalUseCase } from '@/modules/strategic/application/commands/CreateStrategicGoalUseCase';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';
import { db } from '@/lib/db';
import { bscPerspectiveTable } from '@/modules/strategic/infrastructure/persistence/schemas/bsc-perspective.schema';
import { eq, and } from 'drizzle-orm';
import { queryGoalsSchema, bscPerspectiveSchema } from '@/lib/validation/strategic-schemas';

// ✅ S1.1 Batch 3: Schema estendido para compatibilidade com estrutura existente
const perspectiveLabels: Record<string, z.infer<typeof bscPerspectiveSchema>> = {
  FINANCIAL: 'FINANCIAL',
  FINANCEIRA: 'FINANCIAL',
  CUSTOMER: 'CUSTOMER',
  CLIENTES: 'CUSTOMER',
  INTERNAL_PROCESS: 'INTERNAL_PROCESS',
  'PROCESSOS INTERNOS': 'INTERNAL_PROCESS',
  LEARNING_GROWTH: 'LEARNING_GROWTH',
  'APRENDIZADO E CRESCIMENTO': 'LEARNING_GROWTH',
};

const cascadeLabels: Record<string, 'CEO' | 'DIRECTOR' | 'MANAGER' | 'TEAM'> = {
  CEO: 'CEO',
  'ESTRATÉGICO (CORPORATIVO)': 'CEO',
  DIRECTOR: 'DIRECTOR',
  'TÁTICO (DIRETORIA)': 'DIRECTOR',
  MANAGER: 'MANAGER',
  'TÁTICO (GESTOR)': 'MANAGER',
  TEAM: 'TEAM',
  OPERACIONAL: 'TEAM',
};

const cascadeUiToDomain: Record<string, 'CEO' | 'DIRECTOR' | 'MANAGER' | 'TEAM'> = {
  STRATEGIC: 'CEO',
  TACTICAL: 'DIRECTOR',
  OPERATIONAL: 'TEAM',
};

const perspectiveUiToDomain: Record<string, z.infer<typeof bscPerspectiveSchema>> = {
  FIN: 'FINANCIAL',
  CLI: 'CUSTOMER',
  INT: 'INTERNAL_PROCESS',
  LRN: 'LEARNING_GROWTH',
};

// ✅ CORREÇÃO: Mapeamento inverso para lookup na bscPerspectiveTable.code
const perspectiveEnumToCode: Record<z.infer<typeof bscPerspectiveSchema>, string> = {
  FINANCIAL: 'FIN',
  CUSTOMER: 'CLI',
  INTERNAL_PROCESS: 'INT',
  LEARNING_GROWTH: 'LRN',
};

const createGoalSchema = z.object({
  perspectiveId: z.string().trim().uuid().optional(),
  strategyId: z.string().trim().uuid().optional(),
  title: z.string().trim().min(1).max(200).optional(), // UI não envia, manter compat
  description: z.string().trim().max(2000).optional().default(''),
  perspective: z
    .string()
    .trim()
    .transform((value) => perspectiveLabels[value.toUpperCase()] ?? perspectiveUiToDomain[value.toUpperCase()] ?? value.toUpperCase())
    .pipe(bscPerspectiveSchema)
    .optional(),
  perspectiveCode: z.string().trim().optional(), // UI envia FIN/CLI/INT/LRN
  cascadeLevel: z
    .string()
    .trim()
    .transform((value) => cascadeUiToDomain[value.toUpperCase()] ?? cascadeLabels[value.toUpperCase()] ?? value.toUpperCase())
    .pipe(z.enum(['CEO', 'DIRECTOR', 'MANAGER', 'TEAM'])),
  code: z.string().trim().min(1, 'Código é obrigatório').max(20),
  baselineValue: z.number().optional(),
  targetValue: z.number(),
  unit: z.string().trim().min(1).max(50),
  weight: z.number().min(0).max(100).default(1),
  polarity: z.enum(['UP', 'DOWN']).optional(),
  ownerUserId: z.string().trim().uuid().optional(),
  ownerBranchId: z.number().optional(),
  parentGoalId: z.string().trim().uuid().optional(),
  startDate: z
    .string()
    .trim()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'startDate must be a valid date' })
    .transform((s) => new Date(s)),
  dueDate: z
    .string()
    .trim()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'dueDate must be a valid date' })
    .transform((s) => new Date(s))
    .optional(),
  endDate: z
    .string()
    .trim()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'endDate must be a valid date' })
    .transform((s) => new Date(s))
    .optional(),
});

const goalsQuerySchema = queryGoalsSchema.and(
  z.object({
    perspectiveId: z.string().trim().uuid().optional(),
    parentGoalId: z.string().trim().uuid().optional(),
    cascadeLevel: z.string().trim().optional(),
  })
);

// GET /api/strategic/goals
export const GET = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = goalsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      page,
      pageSize,
      status,
      perspectiveId,
      perspective, // ✅ CORREÇÃO BUG: Capturar perspective para resolver → perspectiveId
      responsibleId: ownerUserId,
      parentGoalId,
      cascadeLevel,
      strategyId,
    } = validation.data;

    // =========================================================================
    // RESOLUÇÃO CANÔNICA: effectiveStrategyId e effectivePerspectiveId
    // =========================================================================
    // Estas variáveis são as únicas usadas após a resolução.
    // Evita bugs onde strategyId/perspectiveId crus são usados por engano.
    // =========================================================================

    const strategyRepository = container.resolve<IStrategyRepository>(
      STRATEGIC_TOKENS.StrategyRepository
    );

    // 1. Resolver effectiveStrategyId
    let effectiveStrategyId: string | undefined = strategyId;

    // 1a. Se strategyId foi passado, validar que pertence ao tenant
    if (strategyId) {
      const strategyExists = await strategyRepository.findById(
        strategyId,
        context.organizationId,
        context.branchId
      );
      if (!strategyExists) {
        return NextResponse.json(
          {
            error: 'Strategy not found',
            details: {
              strategyId: ['Invalid strategyId for this tenant or strategy does not exist'],
            },
          },
          { status: 404 }
        );
      }
    }

    // 1b. Se perspective foi passado sem strategyId, resolver strategy ativa
    if (!effectiveStrategyId && perspective) {
      const activeStrategy = await strategyRepository.findActive(
        context.organizationId,
        context.branchId
      );
      if (!activeStrategy) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: {
              strategyId: [
                'strategyId is required when filtering by perspective (no ACTIVE strategy found for this tenant)',
              ],
            },
          },
          { status: 400 }
        );
      }
      effectiveStrategyId = activeStrategy.id;
    }

    // 2. Resolver effectivePerspectiveId
    let effectivePerspectiveId: string | undefined = perspectiveId;

    // 2a. Se perspective enum foi passado, resolver para perspectiveId
    if (perspective) {
      const perspectiveCode = perspectiveEnumToCode[perspective];
      if (!perspectiveCode) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: {
              perspective: [`Unknown perspective: ${perspective}`],
            },
          },
          { status: 400 }
        );
      }

      // Neste ponto, effectiveStrategyId é garantido (validação 1b acima)
      const perspectiveRow = await db
        .select({ id: bscPerspectiveTable.id })
        .from(bscPerspectiveTable)
        .where(
          and(
            eq(bscPerspectiveTable.strategyId, effectiveStrategyId!),
            eq(bscPerspectiveTable.code, perspectiveCode)
          )
        );

      if (perspectiveRow.length === 0) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: {
              perspective: [
                `Perspective '${perspective}' (code: ${perspectiveCode}) does not exist for strategy ${effectiveStrategyId}`,
              ],
            },
          },
          { status: 400 }
        );
      }

      const resolvedFromEnum = perspectiveRow[0].id;

      // 2b. Se perspectiveId também foi passado, validar consistência
      if (perspectiveId && perspectiveId !== resolvedFromEnum) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: {
              perspectiveId: [
                `Conflict: perspectiveId (${perspectiveId}) does not match perspective enum (${perspective} → ${resolvedFromEnum})`,
              ],
            },
          },
          { status: 400 }
        );
      }

      effectivePerspectiveId = resolvedFromEnum;
    }

    // 3. Validar que perspectiveId pertence à effectiveStrategyId (se ambos existem)
    // Evita bypass onde alguém passa perspectiveId de outra strategy
    if (effectivePerspectiveId && effectiveStrategyId && !perspective) {
      const perspectiveBelongsToStrategy = await db
        .select({ id: bscPerspectiveTable.id })
        .from(bscPerspectiveTable)
        .where(
          and(
            eq(bscPerspectiveTable.id, effectivePerspectiveId),
            eq(bscPerspectiveTable.strategyId, effectiveStrategyId)
          )
        );

      if (perspectiveBelongsToStrategy.length === 0) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: {
              perspectiveId: [
                `perspectiveId (${effectivePerspectiveId}) does not belong to strategy (${effectiveStrategyId})`,
              ],
            },
          },
          { status: 400 }
        );
      }
    }

    // =========================================================================
    // QUERY: Usar SOMENTE effectiveStrategyId e effectivePerspectiveId
    // =========================================================================

    const repository = container.resolve<IStrategicGoalRepository>(
      STRATEGIC_TOKENS.StrategicGoalRepository
    );

    const result = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      strategyId: effectiveStrategyId, // ✅ Usa valor canônico
      perspectiveId: effectivePerspectiveId, // ✅ Usa valor canônico
      parentGoalId,
      cascadeLevel,
      status,
      ownerUserId,
      page,
      pageSize,
    });

    // ✅ CORREÇÃO BUG 1: dueDate é NOT NULL no schema - enforçar integridade
    const serializedItems = result.items.map((g) => {
      // Validação de integridade: dueDate NUNCA deve ser null (schema NOT NULL)
      if (!g.dueDate) {
        console.error(
          `[GET /api/strategic/goals] Violação de integridade: goal.id=${g.id} tem dueDate=null. ` +
            `orgId=${context.organizationId}, branchId=${context.branchId}. ` +
            `Schema declara dueDate NOT NULL - verifique dados corrompidos.`
        );
        throw new Error(
          `Data integrity violation: goal ${g.id} has null dueDate (schema requires NOT NULL)`
        );
      }

      return {
        id: g.id,
        perspectiveId: g.perspectiveId,
        parentGoalId: g.parentGoalId,
        code: g.code,
        description: g.description,
        cascadeLevel: g.cascadeLevel.value,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        baselineValue: g.baselineValue,
        unit: g.unit,
        polarity: g.polarity,
        weight: g.weight,
        ownerUserId: g.ownerUserId,
        ownerBranchId: g.ownerBranchId,
        status: g.status.value,
        statusColor: g.status.color,
        progress: g.progress,
        mapPositionX: g.mapPositionX,
        mapPositionY: g.mapPositionY,
        startDate: g.startDate.toISOString(),
        dueDate: g.dueDate.toISOString(), // ✅ Sempre string (schema NOT NULL)
        createdAt: g.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      items: serializedItems,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/goals error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// POST /api/strategic/goals
const safeJson = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
};

export const POST = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedBody = createGoalSchema.safeParse(await safeJson<unknown>(request));

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    // ✅ Resolve strategyId de forma determinística:
    // - se veio no body, VALIDA no tenant e usa
    // - senão tenta buscar a estratégia ativa do tenant
    const strategyRepository = container.resolve<IStrategyRepository>(
      STRATEGIC_TOKENS.StrategyRepository
    );

    let resolvedStrategyId: string | undefined;

    // ✅ CORREÇÃO BUG: Se strategyId veio no body, validar que pertence ao tenant
    if (parsedBody.data.strategyId) {
      const strategyExists = await strategyRepository.findById(
        parsedBody.data.strategyId,
        context.organizationId,
        context.branchId
      );

      if (!strategyExists) {
        return NextResponse.json(
          {
            error: 'Strategy not found',
            details: {
              strategyId: ['Invalid strategyId for this tenant or strategy does not exist'],
            },
          },
          { status: 404 }
        );
      }

      resolvedStrategyId = parsedBody.data.strategyId;
    } else {
      // Fallback: buscar estratégia ativa do tenant
      const activeStrategy = await strategyRepository.findActive(
        context.organizationId,
        context.branchId
      );
      resolvedStrategyId = activeStrategy?.id;
    }

    if (!resolvedStrategyId) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: {
            strategyId: [
              'strategyId is required (no ACTIVE strategy found for this tenant). Create/activate a strategy or send strategyId explicitly.',
            ],
          },
        },
        { status: 400 }
      );
    }

    let perspectiveId = parsedBody.data.perspectiveId;
    let ownerUserId = parsedBody.data.ownerUserId;
    let ownerBranchId = parsedBody.data.ownerBranchId;

    const {
      endDate,
      dueDate,
      perspectiveCode,
      description,
      ...data
    } = parsedBody.data;

    const ensuredDescription = description ?? '';

    // Resolver ownerUserId/ownerBranchId se não enviados
    ownerUserId = ownerUserId ?? context.userId;
    ownerBranchId = ownerBranchId ?? context.branchId;

    // Resolver dueDate a partir de endDate (UI)
    const resolvedDueDate = dueDate ?? endDate;
    if (!resolvedDueDate) {
      return NextResponse.json(
        { error: 'Invalid request body', details: { dueDate: ['dueDate/endDate is required'] } },
        { status: 400 }
      );
    }

    // Resolver perspectiveId se não informado (usa strategyId resolvido)
    if (!perspectiveId && perspectiveCode) {
      // ✅ FIX 1: Normalizar perspectiveCode (uppercase + trim) para evitar erros de case sensitivity
      const normalizedPerspectiveCode = perspectiveCode.trim().toUpperCase();

      const perspectiveRow = await db
        .select()
        .from(bscPerspectiveTable)
        .where(
          and(
            eq(bscPerspectiveTable.strategyId, resolvedStrategyId),
            eq(bscPerspectiveTable.code, normalizedPerspectiveCode)
          )
        );

      if (perspectiveRow.length > 0) {
        perspectiveId = perspectiveRow[0].id;
      } else {
        return NextResponse.json(
          {
            error: `Perspective not found for code ${perspectiveCode} (normalized: ${normalizedPerspectiveCode}) and strategy ${resolvedStrategyId}`,
          },
          { status: 400 }
        );
      }
    }

    if (!perspectiveId) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: { perspectiveId: ['perspectiveId or perspectiveCode is required'] },
        },
        { status: 400 }
      );
    }

    // ✅ BUG-001 FIX: Validar que perspectiveId pertence ao tenant (via strategyId)
    // Isso previne bypass onde alguém passa perspectiveId de outro tenant
    if (perspectiveId) {
      const perspectiveBelongsToStrategy = await db
        .select({ id: bscPerspectiveTable.id })
        .from(bscPerspectiveTable)
        .where(
          and(
            eq(bscPerspectiveTable.id, perspectiveId),
            eq(bscPerspectiveTable.strategyId, resolvedStrategyId)
          )
        );

      if (perspectiveBelongsToStrategy.length === 0) {
        return NextResponse.json(
          {
            error: 'Invalid perspectiveId',
            details: {
              perspectiveId: [
                `perspectiveId (${perspectiveId}) does not belong to the resolved strategy (${resolvedStrategyId}) for this tenant`,
              ],
            },
          },
          { status: 400 }
        );
      }
    }

    const useCase = container.resolve(CreateStrategicGoalUseCase);

    // ✅ PRINCIPAL CORREÇÃO: REPASSAR strategyId pro UseCase
    const result = await useCase.execute(
      {
        ...data,
        strategyId: resolvedStrategyId,
        description: ensuredDescription,
        perspectiveId,
        ownerUserId,
        ownerBranchId,
        dueDate: resolvedDueDate,
      },
      context
    );

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const message = getErrorMessage(error);
    console.error('POST /api/strategic/goals error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});