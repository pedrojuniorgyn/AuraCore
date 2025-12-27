import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cargoDocuments, inboundInvoices, businessPartners } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, desc, sql } from "drizzle-orm";

/**
 * ✅ OPÇÃO A - BLOCO 2: API REPOSITÓRIO DE CARGAS
 * 
 * GET /api/tms/cargo-repository
 * Lista cargas disponíveis para alocação em viagens
 * 
 * Filtros:
 * - status: PENDING, ASSIGNED_TO_TRIP, IN_TRANSIT, DELIVERED
 * - destination_uf: UF de destino
 * - urgent: cargas com prazo < 48h
 */
export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const { searchParams } = new URL(request.url);

    // Filtros
    const statusFilter = searchParams.get("status") || "PENDING";
    const destinationUf = searchParams.get("destination_uf");
    const isUrgent = searchParams.get("urgent") === "true";

    // Construir filtros dinâmicos
    const filters: any[] = [
      eq(cargoDocuments.organizationId, ctx.organizationId),
      // Removido filtro de branchId - repositório é centralizado
      isNull(cargoDocuments.deletedAt),
    ];
    
    if (statusFilter !== "ALL") {
      filters.push(eq(cargoDocuments.status, statusFilter));
    }
    
    if (destinationUf) {
      filters.push(eq(cargoDocuments.destinationUf, destinationUf));
    }
    
    // Query com JOIN para pegar dados complementares
    const cargos = await db
      .select({
        // Cargo
        id: cargoDocuments.id,
        accessKey: cargoDocuments.accessKey,
        nfeNumber: cargoDocuments.nfeNumber,
        nfeSeries: cargoDocuments.nfeSeries,
        issuerCnpj: cargoDocuments.issuerCnpj,
        issuerName: cargoDocuments.issuerName,
        recipientCnpj: cargoDocuments.recipientCnpj,
        recipientName: cargoDocuments.recipientName,
        originUf: cargoDocuments.originUf,
        originCity: cargoDocuments.originCity,
        destinationUf: cargoDocuments.destinationUf,
        destinationCity: cargoDocuments.destinationCity,
        cargoValue: cargoDocuments.cargoValue,
        weight: cargoDocuments.weight,
        volume: cargoDocuments.volume,
        status: cargoDocuments.status,
        issueDate: cargoDocuments.issueDate,
        deliveryDeadline: cargoDocuments.deliveryDeadline,
        hasExternalCte: cargoDocuments.hasExternalCte,
        tripId: cargoDocuments.tripId,
        cteId: cargoDocuments.cteId,
        createdAt: cargoDocuments.createdAt,
      })
      .from(cargoDocuments)
      .where(and(...filters))
      .orderBy(desc(cargoDocuments.deliveryDeadline), desc(cargoDocuments.createdAt));

    // Filtrar urgentes (< 48h) se solicitado
    let filteredCargos = cargos;
    if (isUrgent) {
      const now = new Date();
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      filteredCargos = cargos.filter((cargo) => {
        if (!cargo.deliveryDeadline) return false;
        return new Date(cargo.deliveryDeadline) <= in48Hours;
      });
    }

    // Calcular KPIs
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    
    const kpis = {
      totalPending: filteredCargos.filter((c) => c.status === "PENDING").length,
      totalValue: filteredCargos.reduce((acc, c) => acc + parseFloat(c.cargoValue || "0"), 0),
      urgentCargos: filteredCargos.filter((c) => {
        if (!c.deliveryDeadline) return false;
        return new Date(c.deliveryDeadline) <= in48Hours;
      }).length,
      criticalCargos: filteredCargos.filter((c) => {
        if (!c.deliveryDeadline) return false;
        return new Date(c.deliveryDeadline) <= in24Hours;
      }).length,
    };

    return NextResponse.json({
      data: filteredCargos,
      kpis,
      total: filteredCargos.length,
    });
    
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error fetching cargo repository:", error);
    return NextResponse.json(
      { error: "Falha ao buscar repositório de cargas.", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tms/cargo-repository/[id]/assign
 * Vincula cargo a uma viagem (será criado como sub-rota)
 */


