/**
 * API: GET/POST /api/strategic/reports
 * Gerencia configurações de relatórios agendados
 * 
 * @module app/api/strategic/reports
 */
import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';

export const dynamic = 'force-dynamic';

// In-memory storage temporário até implementar persistência
// Cada organização terá seu próprio store
const reportsStoreByOrg = new Map<number, Map<string, Record<string, unknown>>>();

function getOrgStore(orgId: number): Map<string, Record<string, unknown>> {
  if (!reportsStoreByOrg.has(orgId)) {
    reportsStoreByOrg.set(orgId, new Map());
  }
  return reportsStoreByOrg.get(orgId)!;
}

export async function GET() {
  try {
    const ctx = await getTenantContext();

    const store = getOrgStore(ctx.organizationId);
    const reports = Array.from(store.values());

    // Retornar lista vazia se não houver relatórios configurados
    // A UI deve exibir empty state
    return NextResponse.json({ reports });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();

    const config = await request.json();
    
    const id = `r${Date.now()}`;
    const newReport = {
      id,
      ...config,
      organizationId: ctx.organizationId,
      createdBy: ctx.userId,
      isActive: true,
      nextRun: calculateNextRun(config),
      createdAt: new Date().toISOString(),
    };
    
    const store = getOrgStore(ctx.organizationId);
    store.set(id, newReport);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
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
