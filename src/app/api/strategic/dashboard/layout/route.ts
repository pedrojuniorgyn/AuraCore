/**
 * API Route: Dashboard Layout Persistence
 * 
 * GET /api/strategic/dashboard/layout - Load saved layout
 * PUT /api/strategic/dashboard/layout - Save layout
 * 
 * @module api/strategic/dashboard/layout
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/auth/context';
import { sql } from 'drizzle-orm';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
// Table name for dashboard layouts
const LAYOUTS_TABLE = 'strategic_dashboard_layouts';

export const GET = withDI(async () => {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if table exists first
    const tableExists = await db.execute(sql`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = ${LAYOUTS_TABLE}
    `);

    const tableRows = Array.isArray(tableExists) ? tableExists : (tableExists as { recordset?: unknown[] }).recordset || [];
    
    if (tableRows.length === 0) {
      // Table doesn't exist, return empty layout
      return NextResponse.json({ layout: [] });
    }

    // Query layout
    const result = await db.execute(sql`
      SELECT widgets FROM strategic_dashboard_layouts
      WHERE user_id = ${ctx.userId}
        AND dashboard_type = 'strategic'
        AND deleted_at IS NULL
    `);

    const rows = Array.isArray(result) ? result : (result as { recordset?: unknown[] }).recordset || [];
    
    if (rows.length === 0) {
      return NextResponse.json({ layout: [] });
    }

    const layout = rows[0] as { widgets: string };
    return NextResponse.json({ 
      layout: layout.widgets ? JSON.parse(layout.widgets) : [] 
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Erro ao carregar layout:', error);
    // Return empty layout on error (table might not exist)
    return NextResponse.json({ layout: [] });
  }
});

export const PUT = withDI(async (request: Request) => {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const widgetsJson = JSON.stringify(body.layout || []);

    // Check if table exists
    const tableExists = await db.execute(sql`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = ${LAYOUTS_TABLE}
    `);

    const tableRows = Array.isArray(tableExists) ? tableExists : (tableExists as { recordset?: unknown[] }).recordset || [];

    if (tableRows.length === 0) {
      // Create table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE strategic_dashboard_layouts (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          organization_id INT NOT NULL,
          branch_id INT NOT NULL,
          dashboard_type VARCHAR(50) NOT NULL DEFAULT 'strategic',
          widgets NVARCHAR(MAX) NOT NULL,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          deleted_at DATETIME2 NULL
        )
      `);

      // Create unique index
      await db.execute(sql`
        CREATE UNIQUE INDEX idx_layout_user_type 
        ON strategic_dashboard_layouts (user_id, dashboard_type)
        WHERE deleted_at IS NULL
      `);
    }

    // Check if layout exists for this user
    const existing = await db.execute(sql`
      SELECT id FROM strategic_dashboard_layouts
      WHERE user_id = ${ctx.userId}
        AND dashboard_type = 'strategic'
        AND deleted_at IS NULL
    `);

    const existingRows = Array.isArray(existing) ? existing : (existing as { recordset?: unknown[] }).recordset || [];

    if (existingRows.length > 0) {
      // Update existing
      const row = existingRows[0] as { id: string };
      await db.execute(sql`
        UPDATE strategic_dashboard_layouts
        SET widgets = ${widgetsJson},
            updated_at = GETDATE()
        WHERE id = ${row.id}
      `);
    } else {
      // Insert new
      const id = crypto.randomUUID();
      await db.execute(sql`
        INSERT INTO strategic_dashboard_layouts 
        (id, user_id, organization_id, branch_id, dashboard_type, widgets, created_at, updated_at)
        VALUES (
          ${id}, 
          ${ctx.userId}, 
          ${ctx.organizationId}, 
          ${ctx.branchId}, 
          'strategic', 
          ${widgetsJson}, 
          GETDATE(), 
          GETDATE()
        )
      `);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Erro ao salvar layout:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
});
