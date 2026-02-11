/**
 * API: POST /api/reports/generate
 * Gera relatórios PDF avançados
 * 
 * @module app/api/reports
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import { ReportGeneratorService, type ReportType } from '@/modules/strategic/application/services/reports/ReportGeneratorService';
import { Result } from '@/shared/domain';

import { logger } from '@/shared/infrastructure/logging';
const GenerateReportSchema = z.object({
  type: z.enum(['BSC_COMPLETE', 'PERFORMANCE', 'APPROVALS']),
  period: z.object({
    from: z.string().transform((str) => new Date(str)),
    to: z.string().transform((str) => new Date(str)),
  }),
  options: z.object({
    includeCharts: z.boolean().optional(),
    includeComments: z.boolean().optional(),
    orientation: z.enum(['portrait', 'landscape']).optional(),
  }).optional(),
});

export const POST = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    // Validar input
    const body = await request.json();
    const validation = GenerateReportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Input inválido', details: validation.error.issues },
        { status: 400 }
      );
    }

    const input = validation.data;

    // Resolver service do DI
    const service = container.resolve<ReportGeneratorService>(
      STRATEGIC_TOKENS.ReportGeneratorService
    );

    // Gerar relatório
    const result = await service.generateReport(
      {
        type: input.type as ReportType,
        period: {
          from: input.period.from,
          to: input.period.to,
        },
        options: input.options,
      },
      context
    );

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const report = result.value;

    // Retornar PDF
    return new NextResponse(new Uint8Array(report.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${report.filename}"`,
        'X-Generated-At': report.generatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('POST /api/reports/generate error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});

// Enable dynamic rendering
export const dynamic = 'force-dynamic';
