/**
 * 🏦 BTG PACTUAL - SERVICE DE DDA (DÉBITO DIRETO AUTORIZADO)
 * 
 * Gerencia consulta e pagamento de boletos via DDA
 * Documentação: https://developers.empresas.btgpactual.com/reference/getdda
 */

import { btgGet, btgPatch } from "./btg-client";

export interface DDAAuthorized {
  id: string;
  companyId: string;
  creditorName: string;
  creditorDocument: string;
  status: string;
  createdAt: string;
}

export interface DDADebit {
  id: string;
  barcode: string;
  digitableLine: string;
  amount: number;
  dueDate: string;
  creditorName: string;
  creditorDocument: string;
  status: string;
  description?: string;
}

/**
 * Listar DDAs autorizados
 */
export async function listBTGDDAs(companyId: string): Promise<DDAAuthorized[]> {
  try {
    console.log("📋 Listando DDAs BTG...", { companyId });

    const response = await btgGet<any>(
      `/v1/companies/${companyId}/authorized-direct-debits`
    );

    console.log(`✅ ${response.data?.length || 0} DDAs encontrados`);

    return response.data || [];
  } catch (error) {
    console.error("❌ Erro ao listar DDAs BTG:", error);
    throw error;
  }
}

/**
 * Listar débitos de um DDA específico
 */
export async function listBTGDDADebits(
  companyId: string,
  ddaId: string,
  filters?: {
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    status?: string;
  }
): Promise<DDADebit[]> {
  try {
    console.log("💰 Listando débitos DDA BTG...", { companyId, ddaId, filters });

    // Construir query params
    const params = new URLSearchParams();
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.status) params.append("status", filters.status);

    const queryString = params.toString();
    const url = `/v1/companies/${companyId}/authorized-direct-debits/${ddaId}/debits${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await btgGet<any>(url);

    console.log(`✅ ${response.data?.length || 0} débitos encontrados`);

    return response.data || [];
  } catch (error) {
    console.error("❌ Erro ao listar débitos DDA BTG:", error);
    throw error;
  }
}

/**
 * Modificar status de um DDA
 */
export async function updateBTGDDA(
  companyId: string,
  ddaId: string,
  data: {
    status?: string;
    autoPayment?: boolean;
  }
): Promise<void> {
  try {
    console.log("🔄 Atualizando DDA BTG...", { companyId, ddaId, data });

    await btgPatch(`/v1/companies/${companyId}/authorized-direct-debits/${ddaId}`, data);

    console.log("✅ DDA atualizado com sucesso");
  } catch (error) {
    console.error("❌ Erro ao atualizar DDA BTG:", error);
    throw error;
  }
}

/**
 * Obter resumo de débitos
 */
export async function getBTGDDADebitsummary(companyId: string): Promise<any> {
  try {
    console.log("📊 Obtendo resumo de débitos DDA BTG...", { companyId });

    const response = await btgGet<any>(
      `/v1/companies/${companyId}/authorized-direct-debits/debits/summary`
    );

    console.log("✅ Resumo obtido:", response);

    return response.data || {};
  } catch (error) {
    console.error("❌ Erro ao obter resumo DDA BTG:", error);
    throw error;
  }
}


















