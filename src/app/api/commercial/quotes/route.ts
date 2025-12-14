import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { freightQuotes } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { calculateFreight } from "@/services/pricing/freight-calculator";

/**
 * GET /api/commercial/quotes
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    const quotes = await db
      .select()
      .from(freightQuotes)
      .where(
        and(
          eq(freightQuotes.organizationId, organizationId),
          isNull(freightQuotes.deletedAt)
        )
      )
      .orderBy(desc(freightQuotes.createdAt));

    return NextResponse.json({
      success: true,
      data: quotes,
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar cotações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cotações", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/commercial/quotes
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
      branchId = 1,
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
          originUf,
          destinationUf,
          weightKg: parseFloat(weightKg),
          volumeM3: volumeM3 ? parseFloat(volumeM3) : undefined,
          invoiceValue: invoiceValue ? parseFloat(invoiceValue) : undefined,
        });

        calculatedPrice = calculation.total.toString();
        priceBreakdown = JSON.stringify(calculation);
      } catch (calcError: any) {
        console.warn("⚠️ Erro ao calcular frete:", calcError.message);
        // Continua mesmo sem cálculo
      }
    }

    // Criar cotação
    const [newQuote] = await db
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
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Cotação criada com sucesso!",
      data: newQuote,
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar cotação:", error);
    return NextResponse.json(
      { error: "Erro ao criar cotação", details: error.message },
      { status: 500 }
    );
  }
}
















