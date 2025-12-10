/**
 * 🏦 BTG PACTUAL - SERVIÇO DE AUTENTICAÇÃO
 * 
 * Gerencia autenticação OAuth2 com BTG Pactual
 * Documentação: https://developers.empresas.btgpactual.com/docs/autenticacao
 */

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

/**
 * Obter token de acesso via Client Credentials
 * (para operações server-to-server)
 */
export async function getBTGAccessToken(): Promise<string> {
  // Verificar se temos token válido em cache
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    console.log("🔑 Usando token BTG em cache");
    return tokenCache.accessToken;
  }

  console.log("🔑 Obtendo novo token BTG...");

  const clientId = process.env.BTG_CLIENT_ID;
  const clientSecret = process.env.BTG_CLIENT_SECRET;
  const authBaseUrl = process.env.BTG_AUTH_BASE_URL || "https://id.sandbox.btgpactual.com";

  if (!clientId || !clientSecret) {
    throw new Error("BTG_CLIENT_ID e BTG_CLIENT_SECRET devem estar configurados no .env");
  }

  // Encode credentials em Base64
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const response = await fetch(`${authBaseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "openid", // Ajustar scopes conforme necessário
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao obter token BTG: ${response.status} - ${error}`);
    }

    const data: TokenResponse = await response.json();

    // Cache do token (expira 5 min antes do tempo real para segurança)
    tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + ((data.expires_in - 300) * 1000),
    };

    console.log(`✅ Token BTG obtido com sucesso! Expira em ${data.expires_in}s`);

    return data.access_token;
  } catch (error) {
    console.error("❌ Erro ao obter token BTG:", error);
    throw error;
  }
}

/**
 * Invalidar cache de token (forçar renovação)
 */
export function invalidateBTGToken() {
  tokenCache = null;
  console.log("🔄 Cache de token BTG invalidado");
}

/**
 * Verificar se token está válido
 */
export function isBTGTokenValid(): boolean {
  return tokenCache !== null && tokenCache.expiresAt > Date.now();
}





