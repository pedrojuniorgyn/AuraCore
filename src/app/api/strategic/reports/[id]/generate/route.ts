import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { logger } from '@/shared/infrastructure/logging';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const POST = withDI(async (request: Request, context: RouteContext) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // TODO: Implement actual PDF generation using jspdf
    // TODO: Send emails to recipients using email service

    logger.info('Generating report:', id);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock response
    const result = {
      success: true,
      reportId: id,
      pdfUrl: `/reports/generated/report-${id}-${Date.now()}.pdf`,
      emailsSent: 3,
      generatedAt: new Date().toISOString(),
    };

    // Log for history
    logger.info('Report generated:', result);

    return NextResponse.json(result);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error generating report:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      success: false 
    }, { status: 500 });
  }
});
