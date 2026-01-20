import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// In-memory storage for development
const reportsStore = new Map<string, Record<string, unknown>>();

// Initialize with some mock data
const mockReports = [
  {
    id: 'r1',
    name: 'Relatório Executivo Semanal',
    type: 'executive',
    frequency: 'weekly',
    dayOfWeek: 1,
    time: '08:00',
    sections: ['summary', 'healthScore', 'perspectives', 'topActions'],
    recipients: ['diretoria@empresa.com', 'ceo@empresa.com'],
    isActive: true,
    nextRun: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    lastRun: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    includePdf: true,
    sendCopy: true,
  },
  {
    id: 'r2',
    name: 'BSC Mensal',
    type: 'bsc',
    frequency: 'monthly',
    dayOfMonth: 1,
    time: '00:00',
    sections: ['summary', 'perspectives', 'criticalKpis', 'swotAnalysis'],
    recipients: ['gerentes@empresa.com'],
    isActive: true,
    nextRun: new Date(2026, 1, 1).toISOString(),
    includePdf: true,
    sendCopy: false,
  },
  {
    id: 'r3',
    name: 'Status de Ações',
    type: 'actions',
    frequency: 'weekly',
    dayOfWeek: 1,
    time: '08:00',
    sections: ['topActions', 'pdcaCycles'],
    recipients: ['gestores@empresa.com', 'operacao@empresa.com'],
    isActive: true,
    nextRun: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    includePdf: true,
    sendCopy: true,
  },
];

// Initialize store with mock data
mockReports.forEach(report => reportsStore.set(report.id, report));

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reports = Array.from(reportsStore.values());

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await request.json();
    
    const id = `r${Date.now()}`;
    const newReport = {
      id,
      ...config,
      isActive: true,
      nextRun: calculateNextRun(config),
      createdAt: new Date().toISOString(),
    };
    
    reportsStore.set(id, newReport);
    
    console.log('Created report:', newReport);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateNextRun(config: Record<string, unknown>): string | null {
  if (config.frequency === 'manual') return null;
  
  const now = new Date();
  const [hours, minutes] = (config.time as string || '08:00').split(':').map(Number);
  
  if (config.frequency === 'daily') {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }
  
  if (config.frequency === 'weekly') {
    const dayOfWeek = config.dayOfWeek as number || 1;
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    const daysUntil = (dayOfWeek - now.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntil);
    return next.toISOString();
  }
  
  if (config.frequency === 'monthly') {
    const dayOfMonth = config.dayOfMonth as number || 1;
    const next = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth, hours, minutes);
    return next.toISOString();
  }
  
  return null;
}
