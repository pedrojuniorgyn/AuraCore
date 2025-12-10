/**
 * 🏦 BTG Pactual - DDA Service
 * 
 * Integração com API de Débito Direto Autorizado (DDA)
 * Busca boletos emitidos contra a empresa
 */

import https from "https";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { financialDdaInbox, accountsPayable, bankAccounts, businessPartners } from "@/lib/db/schema";
import { and, eq, isNull, sql, between } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

export interface DdaBoleto {
  externalId: string;
  beneficiaryName: string;
  beneficiaryDocument: string;
  amount: number;
  dueDate: Date;
  issueDate?: Date;
  barcode: string;
  digitableLine?: string;
}

export interface SmartMatchResult {
  matched: boolean;
  payableId?: number;
  score: number;
  reason: string;
}

// ============================================================================
// BTG DDA SERVICE
// ============================================================================

export class BtgDdaService {
  private organizationId: number;
  private bankAccountId: number;
  private certificatePath: string;
  private keyPath: string;

  constructor(organizationId: number, bankAccountId: number) {
    this.organizationId = organizationId;
    this.bankAccountId = bankAccountId;
    
    // Paths dos certificados (mesmo padrão do Sefaz)
    this.certificatePath = path.join(
      process.cwd(),
      "certificates",
      `org_${organizationId}_cert.pem`
    );
    this.keyPath = path.join(
      process.cwd(),
      "certificates",
      `org_${organizationId}_key.pem`
    );
  }

  /**
   * Busca boletos DDA do BTG Pactual
   */
  async fetchDdaBoletos(): Promise<DdaBoleto[]> {
    try {
      // === VERIFICAR CERTIFICADOS ===
      if (!fs.existsSync(this.certificatePath) || !fs.existsSync(this.keyPath)) {
        throw new Error("Certificado digital não configurado para esta conta");
      }

      const cert = fs.readFileSync(this.certificatePath);
      const key = fs.readFileSync(this.keyPath);

      // === CONFIGURAR HTTPS AGENT (mTLS) ===
      const httpsAgent = new https.Agent({
        cert,
        key,
        rejectUnauthorized: true, // Produção
      });

      // === BUSCAR DADOS DA CONTA ===
      const [bankAccount] = await db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.id, this.bankAccountId));

      if (!bankAccount) {
        throw new Error("Conta bancária não encontrada");
      }

      // === MONTAR REQUEST PARA BTG ===
      // NOTA: Esta é uma implementação simulada. 
      // A API real do BTG precisa de endpoints específicos e autenticação OAuth2 + mTLS
      const apiUrl = process.env.BTG_DDA_API_URL || "https://api.btgpactual.com/dda/v1/boletos";
      
      // Simular resposta (em produção, fazer fetch real)
      const mockBoletos: DdaBoleto[] = await this.mockFetchFromBtg(apiUrl, httpsAgent);

      console.log(`✅ ${mockBoletos.length} boletos DDA recuperados do BTG`);
      return mockBoletos;
    } catch (error) {
      console.error("❌ Erro ao buscar boletos DDA:", error);
      throw error;
    }
  }

  /**
   * Mock de integração real (substituir por fetch real em produção)
   */
  private async mockFetchFromBtg(apiUrl: string, httpsAgent: https.Agent): Promise<DdaBoleto[]> {
    // Em produção, fazer:
    // const response = await fetch(apiUrl, {
    //   method: "GET",
    //   headers: {
    //     "Authorization": `Bearer ${accessToken}`,
    //     "Content-Type": "application/json",
    //   },
    //   agent: httpsAgent,
    // });
    // return response.json();

    // Mock para desenvolvimento:
    return [
      {
        externalId: "BTG-BOL-001",
        beneficiaryName: "ENERGIA LIGHT S.A.",
        beneficiaryDocument: "12345678000190",
        amount: 1250.50,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 dias
        issueDate: new Date(),
        barcode: "23793381286000312300000123456700000000125050",
        digitableLine: "23793.38128 60003.123000 00012.345670 0 00000001250050",
      },
      {
        externalId: "BTG-BOL-002",
        beneficiaryName: "TELEFONICA BRASIL S.A.",
        beneficiaryDocument: "98765432000111",
        amount: 450.00,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // +10 dias
        issueDate: new Date(),
        barcode: "03399123456789012345678901234567890123456789",
        digitableLine: "03399.12345 67890.123456 78901.234567 8 90123456789",
      },
    ];
  }

  /**
   * Sincroniza boletos DDA com a inbox local
   */
  async syncDdaInbox(): Promise<number> {
    try {
      const boletos = await this.fetchDdaBoletos();
      let imported = 0;

      for (const boleto of boletos) {
        // Verificar se já existe
        const [existing] = await db
          .select()
          .from(financialDdaInbox)
          .where(
            and(
              eq(financialDdaInbox.externalId, boleto.externalId),
              eq(financialDdaInbox.bankAccountId, this.bankAccountId),
              isNull(financialDdaInbox.deletedAt)
            )
          );

        if (existing) {
          console.log(`⏭️  Boleto ${boleto.externalId} já existe, pulando...`);
          continue;
        }

        // Tentar Smart Match
        const matchResult = await this.smartMatch(boleto);

        // Inserir na inbox
        await db.insert(financialDdaInbox).values({
          organizationId: this.organizationId,
          bankAccountId: this.bankAccountId,
          externalId: boleto.externalId,
          beneficiaryName: boleto.beneficiaryName,
          beneficiaryDocument: boleto.beneficiaryDocument,
          amount: boleto.amount.toString(),
          dueDate: boleto.dueDate,
          issueDate: boleto.issueDate || new Date(),
          barcode: boleto.barcode,
          digitableLine: boleto.digitableLine,
          status: matchResult.matched ? "LINKED" : "PENDING",
          matchedPayableId: matchResult.payableId,
          matchScore: matchResult.score,
          notes: matchResult.reason,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Se matched, atualizar a conta a pagar com o barcode
        if (matchResult.matched && matchResult.payableId) {
          await db
            .update(accountsPayable)
            .set({
              barcode: boleto.barcode,
              documentNumber: boleto.externalId,
              updatedAt: new Date(),
            })
            .where(eq(accountsPayable.id, matchResult.payableId));
        }

        imported++;
        console.log(
          `✅ Boleto ${boleto.externalId} importado (${matchResult.matched ? "LINKED" : "PENDING"})`
        );
      }

      return imported;
    } catch (error) {
      console.error("❌ Erro ao sincronizar DDA inbox:", error);
      throw error;
    }
  }

  /**
   * Smart Match: Tenta vincular automaticamente um boleto a uma conta a pagar
   */
  private async smartMatch(boleto: DdaBoleto): Promise<SmartMatchResult> {
    try {
      // === CRITÉRIOS DE MATCHING ===
      // 1. Status OPEN
      // 2. Valor compatível (margem de R$ 0,10)
      // 3. Data de vencimento próxima (±5 dias)
      // 4. CNPJ do fornecedor compatível (se disponível)

      const marginAmount = 0.10;
      const minAmount = boleto.amount - marginAmount;
      const maxAmount = boleto.amount + marginAmount;

      const marginDays = 5;
      const minDate = new Date(boleto.dueDate);
      minDate.setDate(minDate.getDate() - marginDays);
      const maxDate = new Date(boleto.dueDate);
      maxDate.setDate(maxDate.getDate() + marginDays);

      // === BUSCAR CONTAS A PAGAR COMPATÍVEIS ===
      const candidates = await db
        .select({
          payable: accountsPayable,
          partner: businessPartners,
        })
        .from(accountsPayable)
        .leftJoin(
          businessPartners,
          eq(accountsPayable.partnerId, businessPartners.id)
        )
        .where(
          and(
            eq(accountsPayable.organizationId, this.organizationId),
            eq(accountsPayable.status, "OPEN"),
            isNull(accountsPayable.deletedAt),
            isNull(accountsPayable.barcode), // Ainda não vinculado
            sql`CAST(${accountsPayable.amount} AS FLOAT) BETWEEN ${minAmount} AND ${maxAmount}`,
            sql`${accountsPayable.dueDate} BETWEEN ${minDate} AND ${maxDate}`
          )
        );

      if (candidates.length === 0) {
        return {
          matched: false,
          score: 0,
          reason: "Nenhuma conta a pagar compatível encontrada",
        };
      }

      // === CALCULAR SCORE PARA CADA CANDIDATO ===
      let bestMatch: { payableId: number; score: number } | null = null;

      for (const candidate of candidates) {
        let score = 0;

        // Score por valor (max 50 pontos)
        const amountDiff = Math.abs(Number(candidate.payable.amount) - boleto.amount);
        const amountScore = Math.max(0, 50 - amountDiff * 100);
        score += amountScore;

        // Score por data (max 30 pontos)
        const dateDiff = Math.abs(
          new Date(candidate.payable.dueDate).getTime() - boleto.dueDate.getTime()
        );
        const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
        const dateScore = Math.max(0, 30 - daysDiff * 6);
        score += dateScore;

        // Score por CNPJ (max 20 pontos)
        if (candidate.partner && candidate.partner.document) {
          const cleanPartnerDoc = candidate.partner.document.replace(/\D/g, "");
          const cleanBoletoDoc = boleto.beneficiaryDocument.replace(/\D/g, "");
          if (cleanPartnerDoc === cleanBoletoDoc) {
            score += 20;
          }
        }

        // Atualizar melhor match
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            payableId: candidate.payable.id,
            score: Math.round(score),
          };
        }
      }

      // === RETORNAR RESULTADO ===
      if (bestMatch && bestMatch.score >= 70) {
        return {
          matched: true,
          payableId: bestMatch.payableId,
          score: bestMatch.score,
          reason: `Auto-vinculado com ${bestMatch.score}% de confiança`,
        };
      } else if (bestMatch) {
        return {
          matched: false,
          score: bestMatch.score,
          reason: `Match encontrado mas score baixo (${bestMatch.score}%). Revisar manualmente.`,
        };
      } else {
        return {
          matched: false,
          score: 0,
          reason: "Nenhum match encontrado",
        };
      }
    } catch (error) {
      console.error("❌ Erro no smart match:", error);
      return {
        matched: false,
        score: 0,
        reason: "Erro ao processar matching",
      };
    }
  }

  /**
   * Vincula manualmente um boleto DDA a uma conta a pagar
   */
  async linkDdaToPayable(ddaId: number, payableId: number): Promise<void> {
    try {
      // Buscar DDA
      const [dda] = await db
        .select()
        .from(financialDdaInbox)
        .where(eq(financialDdaInbox.id, ddaId));

      if (!dda) {
        throw new Error("Boleto DDA não encontrado");
      }

      // Atualizar DDA
      await db
        .update(financialDdaInbox)
        .set({
          status: "LINKED",
          matchedPayableId: payableId,
          matchScore: 100, // Match manual = 100%
          notes: "Vinculado manualmente",
          updatedAt: new Date(),
        })
        .where(eq(financialDdaInbox.id, ddaId));

      // Atualizar Conta a Pagar
      await db
        .update(accountsPayable)
        .set({
          barcode: dda.barcode,
          documentNumber: dda.externalId,
          updatedAt: new Date(),
        })
        .where(eq(accountsPayable.id, payableId));

      console.log(`✅ DDA ${ddaId} vinculado à Conta a Pagar ${payableId}`);
    } catch (error) {
      console.error("❌ Erro ao vincular DDA:", error);
      throw error;
    }
  }

  /**
   * Cria uma nova Conta a Pagar a partir de um boleto DDA
   */
  async createPayableFromDda(ddaId: number): Promise<number> {
    try {
      // Buscar DDA
      const [dda] = await db
        .select()
        .from(financialDdaInbox)
        .where(eq(financialDdaInbox.id, ddaId));

      if (!dda) {
        throw new Error("Boleto DDA não encontrado");
      }

      // Buscar ou criar parceiro (pelo CNPJ)
      let partnerId: number | null = null;
      const [partner] = await db
        .select()
        .from(businessPartners)
        .where(
          and(
            eq(businessPartners.document, dda.beneficiaryDocument),
            eq(businessPartners.organizationId, this.organizationId),
            isNull(businessPartners.deletedAt)
          )
        );

      if (partner) {
        partnerId = partner.id;
      }

      // Criar Conta a Pagar
      const [newPayable] = await db
        .insert(accountsPayable)
        .values({
          organizationId: this.organizationId,
          partnerId,
          description: `${dda.beneficiaryName} - ${dda.externalId}`,
          documentNumber: dda.externalId,
          barcode: dda.barcode,
          issueDate: dda.issueDate || new Date(),
          dueDate: dda.dueDate,
          amount: dda.amount.toString(),
          status: "OPEN",
          origin: "DDA_AUTOMATIC",
          createdBy: "system",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .$returningId();

      // Atualizar DDA
      await db
        .update(financialDdaInbox)
        .set({
          status: "LINKED",
          matchedPayableId: newPayable.id,
          matchScore: 100,
          notes: "Conta a Pagar criada automaticamente",
          updatedAt: new Date(),
        })
        .where(eq(financialDdaInbox.id, ddaId));

      console.log(`✅ Conta a Pagar ${newPayable.id} criada a partir de DDA ${ddaId}`);
      return newPayable.id;
    } catch (error) {
      console.error("❌ Erro ao criar conta a pagar:", error);
      throw error;
    }
  }
}








