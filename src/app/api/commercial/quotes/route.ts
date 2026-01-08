import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { freightQuotes } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { calculateFreight } from "@/services/pricing/freight-calculator";
import { getTenantContext, hasAccessToBranch, getBranchScopeFilter } from "@/lib/auth/context";

/**
 * GET /api/commercial/quotes
 */
export async function GET(_req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;

    const quotes = await db
      .select()
      .from(freightQuotes)
      .where(
        and(
          eq(freightQuotes.organizationId, organizationId),
          isNull(freightQuotes.deletedAt),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(getBranchScopeFilter(ctx, freightQuotes.branchId) as any[])
        )
      )
      .orderBy(desc(freightQuotes.createdAt));

    return NextResponse.json({
      success: true,
      data: quotes,
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao buscar cotações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cotações", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/commercial/quotes
 */
export async function POST(req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const organizationId = ctx.organizationId;
    const createdBy = ctx.userId;

    const body = await req.json();
    const {
      branchId: branchIdRaw,
      customerId,
      contactName,
      contactPhone,
      contactEmail,
      originUf,
      originCityId,
      originAddress,
      destinationUf,
      destinationCityId,
      destinationAddress,
      cargoDescription,
      weightKg,
      volumeM3,
      invoiceValue,
      transportType,
      serviceLevel,
      pickupDate,
      deliveryDeadline,
      customerTargetPrice,
      autoCalculate = true,
    } = body;

    const branchIdCandidate = branchIdRaw ?? ctx.defaultBranchId;
    if (branchIdCandidate === null || branchIdCandidate === undefined) {
      return NextResponse.json(
        { error: "branchId é obrigatório", code: "BRANCH_REQUIRED" },
        { status: 400 }
      );
    }
    const branchId = Number(branchIdCandidate);
    if (!Number.isFinite(branchId)) {
      return NextResponse.json(
        { error: "branchId inválido", code: "BRANCH_INVALID" },
        { status: 400 }
      );
    }
    if (!hasAccessToBranch(ctx, branchId)) {
      return NextResponse.json(
        { error: "Sem permissão para a filial", code: "BRANCH_FORBIDDEN" },
        { status: 403 }
      );
    }

    // Validações
    if (!customerId || !originUf || !destinationUf || !weightKg) {
      return NextResponse.json(
        { error: "Cliente, UFs e Peso são obrigatórios" },
        { status: 400 }
      );
    }

    // Gerar número da cotação
    const lastQuotes = await db
      .select({ quoteNumber: freightQuotes.quoteNumber })
      .from(freightQuotes)
      .where(eq(freightQuotes.organizationId, organizationId))
      .orderBy(desc(freightQuotes.id));

    const lastNumber = lastQuotes.length;
    const year = new Date().getFullYear();
    const quoteNumber = `COT-${year}-${String(lastNumber + 1).padStart(4, "0")}`;

    // Auto-calcular preço se solicitado
    let calculatedPrice = null;
    let priceBreakdown = null;

    if (autoCalculate) {
      try {
        const calculation = await calculateFreight({
          organizationId,
          customerId,
          realWeight: parseFloat(weightKg),
          volume: volumeM3 ? parseFloat(volumeM3) : undefined,
          invoiceValue: invoiceValue ? parseFloat(invoiceValue) : 0,
          originState: originUf,
          destinationState: destinationUf,
          transportType: transportType || "LTL_FRACIONADO",
        });

        calculatedPrice = calculation.total.toString();
        priceBreakdown = JSON.stringify(calculation);
      } catch (calcError: unknown) {
        const msg = calcError instanceof Error ? calcError.message : String(calcError);
        console.warn("⚠️ Erro ao calcular frete:", msg);
        // Continua mesmo sem cálculo
      }
    }

    // Criar cotação
     
    const result = await (db
      .insert(freightQuotes)
       
      .values({
        organizationId,
        branchId,
        quoteNumber,
        customerId,
        contactName,
        contactPhone,
        contactEmail,
        originUf: originUf.toUpperCase(),
        originCityId,
        originAddress,
        destinationUf: destinationUf.toUpperCase(),
        destinationCityId,
        destinationAddress,
        cargoDescription,
        weightKg: weightKg.toString(),
        volumeM3: volumeM3?.toString(),
        invoiceValue: invoiceValue?.toString(),
        transportType,
        serviceLevel,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        deliveryDeadline: deliveryDeadline ? new Date(deliveryDeadline) : null,
        customerTargetPrice: customerTargetPrice?.toString(),
        calculatedPrice,
        priceBreakdown,
        status: "NEW",
        createdBy,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any) as any).$returningId();

    const createdId = result[0] as Record<string, unknown> | undefined;
    const quoteId = createdId?.id;
    if (!quoteId) {
      return NextResponse.json(
        { error: "Falha ao criar cotação (id não retornado)" },
        { status: 500 }
      );
    }

    const [newQuote] = await db
      .select()
      .from(freightQuotes)
      .where(and(eq(freightQuotes.id, Number(quoteId)), eq(freightQuotes.organizationId, organizationId)));

    if (!newQuote) {
      return NextResponse.json(
        { error: "Falha ao criar cotação (registro não encontrado após insert)" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Cotação criada com sucesso!",
      data: newQuote,
    }, { status: 201 });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao criar cotação:", error);
    return NextResponse.json(
      { error: "Erro ao criar cotação", details: errorMessage },
      { status: 500 }
    );
  }
}

















