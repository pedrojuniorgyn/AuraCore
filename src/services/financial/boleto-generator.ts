import axios from "axios";

/**
 * Serviço para geração de boletos via Banco Inter API
 * Documentação: https://developers.inter.co/docs/
 */

export interface BoletoData {
  customerId: number;
  customerName: string;
  customerCnpj: string;
  dueDate: Date;
  value: number;
  invoiceNumber: string;
  description: string;
}

export interface BoletoResult {
  success: boolean;
  barcodeNumber?: string;
  pixKey?: string;
  pdfUrl?: string;
  nossoNumero?: string;
  linhaDigitavel?: string;
  error?: string;
}

/**
 * Gerador de boletos Banco Inter
 */
export class BoletoGenerator {
  private apiUrl: string;
  private clientId: string;
  private clientSecret: string;
  private certificate: string; // Base64 do certificado
  private key: string; // Base64 da chave privada

  constructor() {
    // Configurações do Banco Inter
    this.apiUrl = process.env.INTER_API_URL || "https://cdpj.partners.bancointer.com.br";
    this.clientId = process.env.INTER_CLIENT_ID || "";
    this.clientSecret = process.env.INTER_CLIENT_SECRET || "";
    this.certificate = process.env.INTER_CERTIFICATE || "";
    this.key = process.env.INTER_KEY || "";
  }

  /**
   * Obter token de autenticação OAuth2
   */
  private async getAccessToken(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/oauth/v2/token`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: "boleto-cobranca.read boleto-cobranca.write",
          grant_type: "client_credentials",
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      return response.data.access_token;
    } catch (error: any) {
      console.error("❌ Erro ao obter token:", error.response?.data || error.message);
      throw new Error("Falha na autenticação com Banco Inter");
    }
  }

  /**
   * Gerar boleto
   */
  public async gerarBoleto(data: BoletoData): Promise<BoletoResult> {
    try {
      console.log(`💰 Gerando boleto para ${data.customerName}...`);

      // 1. Obter token
      const token = await getAccessToken();

      // 2. Preparar payload
      const payload = {
        seuNumero: data.invoiceNumber, // Número da fatura
        valorNominal: data.value.toFixed(2),
        dataVencimento: this.formatDate(data.dueDate),
        numDiasAgenda: "30",
        pagador: {
          cpfCnpj: data.customerCnpj.replace(/\D/g, ""),
          nome: data.customerName.substring(0, 100),
          email: "", // TODO: buscar do cliente
          telefone: "", // TODO: buscar do cliente
          endereco: {
            logradouro: "",
            numero: "",
            bairro: "",
            cidade: "",
            uf: "",
            cep: "",
          },
        },
        mensagem: {
          linha1: data.description,
        },
        desconto1: {
          codigoDesconto: "NAOTEMDESCONTO",
        },
        multa: {
          codigoMulta: "NAOTEMMULTA",
        },
        mora: {
          codigoMora: "ISENTO",
        },
      };

      // 3. Enviar para Banco Inter
      const response = await axios.post(
        `${this.apiUrl}/cobranca/v2/boletos`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("✅ Boleto gerado com sucesso!");

      return {
        success: true,
        nossoNumero: response.data.nossoNumero,
        linhaDigitavel: response.data.linhaDigitavel,
        barcodeNumber: response.data.codigoBarras,
        pixKey: response.data.pixCopiaECola,
        pdfUrl: response.data.linkBoleto,
      };
    } catch (error: any) {
      console.error("❌ Erro ao gerar boleto:", error.response?.data || error.message);

      // Retornar erro detalhado
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Consultar boleto
   */
  public async consultarBoleto(nossoNumero: string): Promise<any> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.apiUrl}/cobranca/v2/boletos/${nossoNumero}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("❌ Erro ao consultar boleto:", error);
      throw error;
    }
  }

  /**
   * Baixar/Cancelar boleto
   */
  public async baixarBoleto(nossoNumero: string, motivoBaixa: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();

      await axios.post(
        `${this.apiUrl}/cobranca/v2/boletos/${nossoNumero}/baixar`,
        { motivoCancelamento: motivoBaixa },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("✅ Boleto baixado com sucesso!");
      return true;
    } catch (error: any) {
      console.error("❌ Erro ao baixar boleto:", error);
      return false;
    }
  }

  /**
   * Formatar data para formato aceito pelo Banco Inter (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

// Singleton
export const boletoGenerator = new BoletoGenerator();

/**
 * Helper para obter token (reutilizado)
 */
async function getAccessToken(): Promise<string> {
  const apiUrl = process.env.INTER_API_URL || "https://cdpj.partners.bancointer.com.br";
  const clientId = process.env.INTER_CLIENT_ID || "";
  const clientSecret = process.env.INTER_CLIENT_SECRET || "";

  try {
    const response = await axios.post(
      `${apiUrl}/oauth/v2/token`,
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "boleto-cobranca.read boleto-cobranca.write",
        grant_type: "client_credentials",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;
  } catch (error: any) {
    console.error("❌ Erro ao obter token:", error.response?.data || error.message);
    throw new Error("Falha na autenticação com Banco Inter");
  }
}






