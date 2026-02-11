/**
 * WORKFLOW AUTOMATOR SERVICE
 *
 * Automatiza a conversão entre módulos:
 * Cotação → Ordem de Coleta → CTe → Viagem → MDFe → Financeiro
 *
 * @deprecated Este arquivo está deprecated desde 20/01/2026 e será removido em versão futura.
 * A funcionalidade foi migrada para o módulo DDD: `src/modules/tms/`
 *
 * @see E7 DDD Migration
 * @since 2026-01-20
 */

import { db } from "@/lib/db";
import {
  freightQuotes,
  pickupOrders,
  cteHeader,
  cteValueComponents,
  trips,
  mdfeHeader,
  accountsReceivable,
  accountsPayable,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { queryFirst, insertReturning } from "@/lib/db/query-helpers";

// ==========================================
// FASE 1: COTAÇÃO → ORDEM DE COLETA
// ==========================================

/**
 * Quando uma cotação é aprovada, cria automaticamente uma Ordem de Coleta
 */
export async function createPickupOrderFromQuote(
  quoteId: number,
  createdBy: string
): Promise<typeof pickupOrders.$inferSelect> {
  // Buscar cotação
  const [quote] = await db
    .select()
    .from(freightQuotes)
    .where(eq(freightQuotes.id, quoteId));

  if (!quote) {
    throw new Error(`Cotação #${quoteId} não encontrada`);
  }

  if (quote.status !== "ACCEPTED") {
    throw new Error("Apenas cotações aceitas podem virar ordem de coleta");
  }

  // Gerar número da ordem
  const orderNumber = await generateOrderNumber(quote.branchId);

  // Criar Ordem de Coleta
  const insertQuery = db
    .insert(pickupOrders)
    .values({
      organizationId: quote.organizationId,
      branchId: quote.branchId,
      orderNumber,
      quoteId: quote.id,
      customerId: quote.customerId,
      originUf: quote.originUf,
      originCityId: quote.originCityId,
      originAddress: quote.originAddress,
      destinationUf: quote.destinationUf,
      destinationCityId: quote.destinationCityId,
      destinationAddress: quote.destinationAddress,
      cargoDescription: quote.cargoDescription,
      weightKg: quote.weightKg,
      volumeM3: quote.volumeM3,
      invoiceValue: quote.invoiceValue,
      agreedPrice: quote.quotedPrice,
      scheduledPickupDate: quote.pickupDate,
      status: "PENDING_ALLOCATION",
      createdBy,
    });

  const createdOrderId = await insertReturning(insertQuery, { id: pickupOrders.id }) as Array<{ id: number }>;

  const pickupOrderId = createdOrderId[0]?.id;
  const pickupOrder = pickupOrderId
    ? await queryFirst<typeof pickupOrders.$inferSelect>(
        db.select().from(pickupOrders).where(eq(pickupOrders.id, pickupOrderId))
      )
    : null;
  if (!pickupOrder) {
    throw new Error("Falha ao criar ordem de coleta");
  }

  // Atualizar cotação com link para a ordem
  await db
    .update(freightQuotes)
    .set({ pickupOrderId: pickupOrder.id })
    .where(eq(freightQuotes.id, quoteId));

  return pickupOrder;
}

// ==========================================
// FASE 2: ORDEM DE COLETA → CTe
// ==========================================

/**
 * Quando uma ordem é alocada (veículo + motorista), permite gerar CTe
 */
export async function createCteFromPickupOrder(
  orderId: number,
  createdBy: string
): Promise<typeof cteHeader.$inferSelect> {
  // Buscar ordem
  const [order] = await db
    .select()
    .from(pickupOrders)
    .where(eq(pickupOrders.id, orderId));

  if (!order) {
    throw new Error(`Ordem de Coleta #${orderId} não encontrada`);
  }

  if (order.status !== "ALLOCATED" && order.status !== "COLLECTED") {
    throw new Error("Ordem precisa estar alocada para gerar CTe");
  }

  // Validar averbação de seguro
  if (!order.insurancePolicy || !order.insuranceCertificate) {
    throw new Error("Informe a averbação de seguro antes de gerar o CTe");
  }

  // TODO: Buscar Tax Matrix e calcular ICMS
  // TODO: Usar cte-builder.ts para gerar XML

  // Criar CTe (simplificado por enquanto)
  const cteNumber = await getNextCteNumber(order.branchId);

  const insertCteQuery = db
    .insert(cteHeader)
    .values({
      organizationId: order.organizationId,
      branchId: order.branchId,
      cteNumber,
      serie: "1",
      model: "57",
      issueDate: new Date(),
      pickupOrderId: order.id,
      takerId: order.customerId,
      takerType: "SENDER",
      originUf: order.originUf,
      destinationUf: order.destinationUf,
      serviceValue: order.agreedPrice || "0",
      cargoValue: order.invoiceValue || "0",
      totalValue: order.agreedPrice || "0",
      insurancePolicy: order.insurancePolicy,
      insuranceCertificate: order.insuranceCertificate,
      insuranceCompany: order.insuranceCompany,
      status: "DRAFT",
      createdBy,
    });

  const createdCteId = await insertReturning(insertCteQuery, { id: cteHeader.id }) as Array<{ id: number }>;

  const cteId = createdCteId[0]?.id;
  const cte = cteId
    ? await queryFirst<typeof cteHeader.$inferSelect>(
        db.select().from(cteHeader).where(eq(cteHeader.id, cteId))
      )
    : null;
  if (!cte) {
    throw new Error("Falha ao criar CTe");
  }

  // Atualizar ordem com link para CTe
  await db
    .update(pickupOrders)
    .set({
      cteId,
      status: "CTE_ISSUED",
    })
    .where(eq(pickupOrders.id, orderId));

  return cte;
}

// ==========================================
// FASE 3: CTe AUTORIZADO → CONTA A RECEBER
// ==========================================

/**
 * Quando CTe é autorizado pela SEFAZ, cria automaticamente Conta a Receber
 */
export async function createReceivableFromCte(
  cteId: number
): Promise<void> {
  const [cte] = await db
    .select()
    .from(cteHeader)
    .where(eq(cteHeader.id, cteId));

  if (!cte) {
    throw new Error(`CTe #${cteId} não encontrado`);
  }

  if (cte.status !== "AUTHORIZED") {
    throw new Error("Apenas CTes autorizados geram contas a receber");
  }

  // TODO: Buscar IDs corretos de categoria e conta contábil
  const FREIGHT_REVENUE_CATEGORY_ID = 1; // Temporário
  const FREIGHT_REVENUE_ACCOUNT_ID = 1; // Temporário

  // Criar Conta a Receber
  await db.insert(accountsReceivable).values({
    id: crypto.randomUUID(), // char(36) UUID — no longer auto-generated
    organizationId: cte.organizationId,
    branchId: cte.branchId,
    partnerId: cte.takerId,
    categoryId: FREIGHT_REVENUE_CATEGORY_ID,
    chartAccountId: FREIGHT_REVENUE_ACCOUNT_ID,
    // costCenterId: vinculado ao veículo (via trip)
    description: `Frete CTe-${cte.cteNumber}`,
    documentNumber: cte.cteKey || "",
    issueDate: cte.issueDate,
    dueDate: new Date(cte.issueDate.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 dias
    amount: cte.totalValue || "0",
    status: "OPEN",
    origin: "FISCAL_CTE",
    createdBy: "system",
  });
}

// ==========================================
// FASE 4: VIAGEM ENCERRADA → CONTA A PAGAR (CIOT)
// ==========================================

/**
 * Quando viagem com agregado é encerrada, cria Conta a Pagar (CIOT)
 */
export async function createPayableFromTrip(
  tripId: number
): Promise<void> {
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, tripId));

  if (!trip) {
    throw new Error(`Viagem #${tripId} não encontrada`);
  }

  if (trip.status !== "COMPLETED") {
    throw new Error("Apenas viagens concluídas geram contas a pagar");
  }

  // Apenas para terceiros/agregados com CIOT
  if (trip.driverType === "AGGREGATE" && trip.ciotValue) {
    const THIRD_PARTY_FREIGHT_CATEGORY_ID = 2; // Temporário
    const THIRD_PARTY_FREIGHT_ACCOUNT_ID = 2; // Temporário

    await db.insert(accountsPayable).values({
      id: crypto.randomUUID(), // char(36) UUID — no longer auto-generated
      organizationId: trip.organizationId,
      branchId: trip.branchId,
      partnerId: trip.driverId, // Motorista agregado
      categoryId: THIRD_PARTY_FREIGHT_CATEGORY_ID,
      chartAccountId: THIRD_PARTY_FREIGHT_ACCOUNT_ID,
      description: `Pagamento Agregado ${trip.tripNumber}`,
      documentNumber: trip.ciotNumber || "",
      issueDate: trip.actualEnd || new Date(),
      dueDate: new Date((trip.actualEnd?.getTime() || Date.now()) + 7 * 24 * 60 * 60 * 1000), // +7 dias
      amount: trip.ciotValue,
      status: "OPEN",
      origin: "TMS_TRIP",
      createdBy: "system",
    });
  }
}

// ==========================================
// HELPERS
// ==========================================

async function generateOrderNumber(branchId: number): Promise<string> {
  const year = new Date().getFullYear();
  const lastOrders = await db
    .select({ orderNumber: pickupOrders.orderNumber })
    .from(pickupOrders)
    .where(eq(pickupOrders.branchId, branchId))
    .orderBy(pickupOrders.id);

  const lastNumber = lastOrders.length;
  return `OC-${year}-${String(lastNumber + 1).padStart(4, "0")}`;
}

async function getNextCteNumber(branchId: number): Promise<number> {
  const lastCtes = await db
    .select({ cteNumber: cteHeader.cteNumber })
    .from(cteHeader)
    .where(eq(cteHeader.branchId, branchId))
    .orderBy(cteHeader.cteNumber);

  const lastNumber = lastCtes.length > 0 ? lastCtes[lastCtes.length - 1].cteNumber : 0;
  return lastNumber + 1;
}

















