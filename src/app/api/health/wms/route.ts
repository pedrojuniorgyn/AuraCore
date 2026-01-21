/**
 * WMS Health Check Endpoint
 * E7.8 WMS Semana 4
 * 
 * Verifica saúde do módulo WMS
 * GET /api/health/wms
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
    };
    tables: {
      locations: boolean;
      stockItems: boolean;
      movements: boolean;
      inventoryCounts: boolean;
    };
    metrics: {
      totalLocations: number;
      totalStockItems: number;
      totalMovements: number;
      pendingInventoryCounts: number;
    };
  };
  version: string;
}

export async function GET() {
  const startTime = Date.now();

  try {
    // 1. Verificar conexão com banco
    const dbStart = Date.now();
    await db.execute('SELECT 1');
    const dbResponseTime = Date.now() - dbStart;

    // 2. Verificar existência das tabelas WMS
    const tablesCheck = {
      locations: false,
      stockItems: false,
      movements: false,
      inventoryCounts: false,
    };

    try {
      // Verificar tabela locations
      await db.execute(`
        SELECT TOP 1 id FROM wms_locations
      `);
      tablesCheck.locations = true;
    } catch (e) {
      console.error('WMS health check: locations table error', e);
    }

    try {
      // Verificar tabela stock_items
      await db.execute(`
        SELECT TOP 1 id FROM wms_stock_items
      `);
      tablesCheck.stockItems = true;
    } catch (e) {
      console.error('WMS health check: stock_items table error', e);
    }

    try {
      // Verificar tabela movements
      await db.execute(`
        SELECT TOP 1 id FROM wms_stock_movements
      `);
      tablesCheck.movements = true;
    } catch (e) {
      console.error('WMS health check: movements table error', e);
    }

    try {
      // Verificar tabela inventory_counts
      await db.execute(`
        SELECT TOP 1 id FROM wms_inventory_counts
      `);
      tablesCheck.inventoryCounts = true;
    } catch (e) {
      console.error('WMS health check: inventory_counts table error', e);
    }

    // 3. Coletar métricas básicas
    const metrics = {
      totalLocations: 0,
      totalStockItems: 0,
      totalMovements: 0,
      pendingInventoryCounts: 0,
    };

    try {
      // Contar locations
      const locationsResult = await db.execute(`
        SELECT COUNT(*) as count 
        FROM wms_locations 
        WHERE deleted_at IS NULL
      `);
      metrics.totalLocations = Number(
        (locationsResult.recordset?.[0] as Record<string, unknown>)?.count ?? 0
      );

      // Contar stock items
      const stockResult = await db.execute(`
        SELECT COUNT(*) as count 
        FROM wms_stock_items 
        WHERE deleted_at IS NULL
      `);
      metrics.totalStockItems = Number(
        (stockResult.recordset?.[0] as Record<string, unknown>)?.count ?? 0
      );

      // Contar movements (últimas 24h)
      const movementsResult = await db.execute(`
        SELECT COUNT(*) as count 
        FROM wms_stock_movements 
        WHERE created_at >= DATEADD(hour, -24, GETDATE())
      `);
      metrics.totalMovements = Number(
        (movementsResult.recordset?.[0] as Record<string, unknown>)?.count ?? 0
      );

      // Contar inventory counts pendentes
      const inventoryResult = await db.execute(`
        SELECT COUNT(*) as count 
        FROM wms_inventory_counts 
        WHERE status = 'PENDING'
      `);
      metrics.pendingInventoryCounts = Number(
        (inventoryResult.recordset?.[0] as Record<string, unknown>)?.count ?? 0
      );
    } catch (e) {
      console.error('WMS health check: metrics error', e);
    }

    // 4. Determinar status geral
    const allTablesHealthy = Object.values(tablesCheck).every((v) => v === true);
    const dbHealthy = dbResponseTime < 100; // <100ms é considerado saudável

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (allTablesHealthy && dbHealthy) {
      status = 'healthy';
    } else if (!allTablesHealthy) {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    const result: HealthCheckResult = {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: 'up',
          responseTime: dbResponseTime,
        },
        tables: tablesCheck,
        metrics,
      },
      version: '1.0.0',
    };

    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

    return NextResponse.json(result, { status: httpStatus });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('WMS health check failed:', error);

    const errorResult: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: 'down',
        },
        tables: {
          locations: false,
          stockItems: false,
          movements: false,
          inventoryCounts: false,
        },
        metrics: {
          totalLocations: 0,
          totalStockItems: 0,
          totalMovements: 0,
          pendingInventoryCounts: 0,
        },
      },
      version: '1.0.0',
    };

    return NextResponse.json(errorResult, { status: 503 });
  }
}

