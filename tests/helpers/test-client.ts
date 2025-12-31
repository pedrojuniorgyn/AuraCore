/**
 * Test Client Helper
 * 
 * Mock simplificado de cliente HTTP para testes E2E
 * Em produção real, usar supertest ou similar
 */

interface RequestConfig {
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

interface Response {
  status: number;
  body: {
    success: boolean;
    data?: Record<string, any>;
    error?: string;
    code?: string;
  };
}

class TestClientMock {
  private lastConfig: RequestConfig | null = null;

  post(url: string) {
    this.lastConfig = {
      method: 'POST',
      headers: {},
    };
    return this;
  }

  get(url: string) {
    this.lastConfig = {
      method: 'GET',
      headers: {},
    };
    return this;
  }

  set(headers: Record<string, string>) {
    if (this.lastConfig) {
      this.lastConfig.headers = { ...this.lastConfig.headers, ...headers };
    }
    return this;
  }

  send(body: unknown) {
    if (this.lastConfig) {
      this.lastConfig.body = body;
    }
    return this.execute();
  }

  /**
   * STUB: Returns hardcoded success for structural E2E testing.
   * This validates test structure, not actual API behavior.
   * Replace with real HTTP client (e.g., supertest) for full integration testing.
   */
  private async execute(): Promise<Response> {
    // Mock: retorna sucesso por padrão
    // Em testes reais, fazer requisição HTTP de verdade
    return {
      status: 200,
      body: {
        success: true,
        data: {},
      },
    };
  }
}

export const testClient = new TestClientMock();

