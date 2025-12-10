/**
 * 🏦 BTG PACTUAL - CLIENT HTTP BASE
 * 
 * Cliente HTTP configurado para todas as chamadas à API BTG
 */

import { getBTGAccessToken } from "./btg-auth";

const BTG_API_BASE_URL = process.env.BTG_API_BASE_URL || "https://api.sandbox.empresas.btgpactual.com";

export interface BTGRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
  skipAuth?: boolean; // Para endpoints públicos
}

/**
 * Cliente HTTP genérico para API BTG
 */
export async function btgRequest<T = any>(
  endpoint: string,
  options: BTGRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, skipAuth = false } = options;

  // Obter token de acesso (a menos que seja público)
  let authHeaders = {};
  if (!skipAuth) {
    const token = await getBTGAccessToken();
    authHeaders = {
      "Authorization": `Bearer ${token}`,
    };
  }

  const url = `${BTG_API_BASE_URL}${endpoint}`;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...authHeaders,
    ...headers,
  };

  console.log(`🌐 BTG ${method} ${endpoint}`);

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Log da resposta
    const responseText = await response.text();
    let data: T;

    try {
      data = JSON.parse(responseText) as T;
    } catch {
      data = responseText as T;
    }

    if (!response.ok) {
      console.error(`❌ BTG ${method} ${endpoint} - ${response.status}`, data);
      throw new Error(
        `BTG API Error: ${response.status} - ${JSON.stringify(data)}`
      );
    }

    console.log(`✅ BTG ${method} ${endpoint} - ${response.status}`);

    return data;
  } catch (error) {
    console.error(`❌ Erro na requisição BTG ${method} ${endpoint}:`, error);
    throw error;
  }
}

/**
 * GET request
 */
export async function btgGet<T = any>(endpoint: string, headers?: Record<string, string>): Promise<T> {
  return btgRequest<T>(endpoint, { method: "GET", headers });
}

/**
 * POST request
 */
export async function btgPost<T = any>(
  endpoint: string,
  body: any,
  headers?: Record<string, string>
): Promise<T> {
  return btgRequest<T>(endpoint, { method: "POST", body, headers });
}

/**
 * PUT request
 */
export async function btgPut<T = any>(
  endpoint: string,
  body: any,
  headers?: Record<string, string>
): Promise<T> {
  return btgRequest<T>(endpoint, { method: "PUT", body, headers });
}

/**
 * DELETE request
 */
export async function btgDelete<T = any>(
  endpoint: string,
  headers?: Record<string, string>
): Promise<T> {
  return btgRequest<T>(endpoint, { method: "DELETE", headers });
}

/**
 * PATCH request
 */
export async function btgPatch<T = any>(
  endpoint: string,
  body: any,
  headers?: Record<string, string>
): Promise<T> {
  return btgRequest<T>(endpoint, { method: "PATCH", body, headers });
}

/**
 * Health check da API BTG
 */
export async function btgHealthCheck(): Promise<boolean> {
  try {
    // Testar autenticação
    await getBTGAccessToken();
    console.log("✅ BTG API está acessível e autenticação funcionando");
    return true;
  } catch (error) {
    console.error("❌ BTG API não está acessível:", error);
    return false;
  }
}

