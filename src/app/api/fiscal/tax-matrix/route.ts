import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taxMatrix } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/fiscal/tax-matrix
 * Lista todas as regras da matriz tributária
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    const rules = await db
      .select()
      .from(taxMatrix)
      .where(
        and(
          eq(taxMatrix.organizationId, organizationId),
          isNull(taxMatrix.deletedAt)
        )
      )
      .orderBy(taxMatrix.originUf, taxMatrix.destinationUf);

    return NextResponse.json({
      success: true,
      data: rules,
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar matriz tributária:", error);
    return NextResponse.json(
      { error: "Erro ao buscar matriz tributária", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fiscal/tax-matrix
 * Cria uma nova regra fiscal
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const createdBy = session.user.email || "system";

    const body = await req.json();
    const {
      originUf,
      destinationUf,
      icmsRate,
      icmsStRate,
      icmsReduction,
      fcpRate,
      cfopInternal,
      cfopInterstate,
      cst,
      regime,
      validFrom,
      validTo,
      notes,
    } = body;

    // Validações
    if (!originUf || !destinationUf || icmsRate === undefined || !validFrom) {
      return NextResponse.json(
        { error: "Origem, Destino, ICMS e Vigência Inicial são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar duplicata
    const existing = await db
      .select()
      .from(taxMatrix)
      .where(
        and(
          eq(taxMatrix.organizationId, organizationId),
          eq(taxMatrix.originUf, originUf.toUpperCase()),
          eq(taxMatrix.destinationUf, destinationUf.toUpperCase()),
          eq(taxMatrix.regime, regime || "NORMAL"),
          isNull(taxMatrix.deletedAt)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Regra fiscal para ${originUf} → ${destinationUf} (${regime}) já existe` },
        { status: 400 }
      );
    }

    // Criar
    const [newRule] = await db
      .insert(taxMatrix)
      .values({
        organizationId,
        originUf: originUf.toUpperCase(),
        destinationUf: destinationUf.toUpperCase(),
        icmsRate: icmsRate.toString(),
        icmsStRate: icmsStRate ? icmsStRate.toString() : null,
        icmsReduction: icmsReduction ? icmsReduction.toString() : "0.00",
        fcpRate: fcpRate ? fcpRate.toString() : "0.00",
        cfopInternal: cfopInternal || null,
        cfopInterstate: cfopInterstate || null,
        cst: cst || "00",
        regime: regime || "NORMAL",
        validFrom: new Date(validFrom),
        validTo: validTo ? new Date(validTo) : null,
        notes: notes || null,
        status: "ACTIVE",
        createdBy,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Regra fiscal criada com sucesso!",
      data: newRule,
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar regra fiscal:", error);
    return NextResponse.json(
      { error: "Erro ao criar regra fiscal", details: error.message },
      { status: 500 }
    );
  }
}

