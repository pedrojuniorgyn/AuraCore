import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/products/:id/unit-conversions
 * Lista conversões de unidade do produto
 */
export const GET = withDI(async (
  _request: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const productId = parseInt(resolvedParams.id);

    await ensureConnection();

    const result = await pool.request().query(`
      SELECT * FROM product_unit_conversions
      WHERE product_id = ${productId}
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      conversions: result.recordset,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao listar conversões:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
});

/**
 * POST /api/products/:id/unit-conversions
 * Cria nova conversão de unidade
 */
export const POST = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const productId = parseInt(resolvedParams.id);

    const body = await request.json();
    const { fromUnit, toUnit, factor } = body;

    if (!fromUnit || !toUnit || !factor) {
      return NextResponse.json(
        { error: "fromUnit, toUnit e factor são obrigatórios" },
        { status: 400 }
      );
    }

    await ensureConnection();

    // Verificar se já existe
    const existing = await pool.request().query(`
      SELECT * FROM product_unit_conversions
      WHERE product_id = ${productId}
      AND from_unit = '${fromUnit}'
      AND to_unit = '${toUnit}'
    `);

    if (existing.recordset.length > 0) {
      // Atualizar
      await pool.request().query(`
        UPDATE product_unit_conversions
        SET factor = ${factor}
        WHERE product_id = ${productId}
        AND from_unit = '${fromUnit}'
        AND to_unit = '${toUnit}'
      `);

      return NextResponse.json({
        success: true,
        message: "Conversão atualizada com sucesso",
      });
    }

    // Criar nova
    const result = await pool.request().query(`
      INSERT INTO product_unit_conversions (
        product_id, from_unit, to_unit, factor, created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        ${productId}, '${fromUnit}', '${toUnit}', ${factor}, GETDATE()
      )
    `);

    // Também atualizar o produto para habilitar conversão
    await pool.request().query(`
      UPDATE products
      SET 
        unit_conversion_enabled = 'S',
        primary_unit = '${toUnit}',
        secondary_unit = '${fromUnit}',
        unit_conversion_factor = ${factor}
      WHERE id = ${productId}
    `);

    return NextResponse.json({
      success: true,
      message: "Conversão criada com sucesso",
      conversion: result.recordset[0],
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao criar conversão:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
});

