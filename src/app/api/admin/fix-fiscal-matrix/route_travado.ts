import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { readFileSync } from "fs";
import { join } from "path";

import { logger } from '@/shared/infrastructure/logging';
export async function POST(request: NextRequest) {
  try {
    // Migration 1: fiscal_tax_matrix
    const migration1Path = join(
      process.cwd(),
      "drizzle/migrations/0030_fix_fiscal_tax_matrix.sql"
    );
    const migration1SQL = readFileSync(migration1Path, "utf-8");
    await pool.query(migration1SQL);

    // Migration 2: financial_cost_centers
    const migration2Path = join(
      process.cwd(),
      "drizzle/migrations/0031_fix_cost_centers_class.sql"
    );
    const migration2SQL = readFileSync(migration2Path, "utf-8");
    await pool.query(migration2SQL);

    return NextResponse.json({
      success: true,
      message: "✅ Estrutura corrigida com sucesso!",
      details: {
        migration1: "fiscal_tax_matrix.is_active ✅",
        migration2: "financial_cost_centers.class ✅"
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Erro ao executar migrations:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        hint: "Verifique se as tabelas existem.",
      },
      { status: 500 }
    );
  }
}

