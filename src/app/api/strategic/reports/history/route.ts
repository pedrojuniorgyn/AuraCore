import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Fetch from database
    // Mock history data
    const history = [
      {
        id: 'h1',
        reportId: 'r1',
        reportName: 'Relatório Executivo Semanal',
        reportType: 'executive',
        generatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'success',
        pdfUrl: '/reports/generated/report-r1-exec.pdf',
        emailsSent: 5,
      },
      {
        id: 'h2',
        reportId: 'r3',
        reportName: 'Status de Ações',
        reportType: 'actions',
        generatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'success',
        pdfUrl: '/reports/generated/report-r3-actions.pdf',
        emailsSent: 8,
      },
      {
        id: 'h3',
        reportId: 'r1',
        reportName: 'Relatório Executivo Semanal',
        reportType: 'executive',
        generatedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'success',
        pdfUrl: '/reports/generated/report-r1-exec-old.pdf',
        emailsSent: 5,
      },
      {
        id: 'h4',
        reportId: 'r2',
        reportName: 'BSC Mensal',
        reportType: 'bsc',
        generatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'success',
        pdfUrl: '/reports/generated/report-r2-bsc.pdf',
        emailsSent: 3,
      },
    ];

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching report history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
