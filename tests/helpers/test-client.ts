/**
 * E7.11 - Test Client Real com Supertest
 * 
 * Fornece cliente HTTP para testes E2E que executa contra
 * o servidor Next.js real.
 * 
 * IMPORTANTE: Requer setup explícito nos testes:
 * 
 *   beforeAll(async () => { await setupTestServer(); });
 *   afterAll(async () => { await teardownTestServer(); });
 * 
 * API chainable compatível com supertest:
 *   await testClient.post('/api/test').set('Header', 'value').send(data);
 */

import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import next from 'next';
import supertest from 'supertest';

let server: Server | null = null;
let app: ReturnType<typeof next> | null = null;

/**
 * Inicializa o servidor Next.js para testes
 * DEVE ser chamado em beforeAll() dos testes E2E
 */
export async function setupTestServer(): Promise<Server> {
  if (server) {
    return server;
  }

  app = next({
    dev: true, // Usar modo development para testes (não requer build)
    dir: process.cwd(),
  });

  await app.prepare();
  const handle = app.getRequestHandler();

  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    handle(req, res);
  });

  await new Promise<void>((resolve) => {
    server!.listen(0, () => resolve());
  });

  return server;
}

/**
 * Encerra o servidor de teste
 * DEVE ser chamado em afterAll() dos testes E2E
 */
export async function teardownTestServer(): Promise<void> {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    server = null;
  }
  
  if (app) {
    await app.close();
    app = null;
  }
}

/**
 * Retorna o servidor para uso com supertest
 * Lança erro se servidor não foi inicializado
 */
function getTestServer(): Server {
  if (!server) {
    throw new Error(
      'Test server not initialized.\n\n' +
      'Add this to your test file:\n\n' +
      '  beforeAll(async () => { await setupTestServer(); });\n' +
      '  afterAll(async () => { await teardownTestServer(); });\n\n' +
      'Import from: tests/helpers/test-client'
    );
  }
  return server;
}

/**
 * Test Client com API chainable SÍNCRONA
 * 
 * Setup (uma vez por arquivo de teste):
 *   beforeAll(async () => { await setupTestServer(); });
 *   afterAll(async () => { await teardownTestServer(); });
 * 
 * Uso nos testes:
 *   const response = await testClient
 *     .post('/api/test')
 *     .set('Authorization', 'Bearer token')
 *     .send({ data: 'test' })
 *     .expect(200);
 */
export const testClient = {
  /**
   * GET request - retorna Test chainable (síncrono)
   */
  get(url: string) {
    return supertest(getTestServer()).get(url);
  },

  /**
   * POST request - retorna Test chainable (síncrono)
   */
  post(url: string) {
    return supertest(getTestServer()).post(url);
  },

  /**
   * PUT request - retorna Test chainable (síncrono)
   */
  put(url: string) {
    return supertest(getTestServer()).put(url);
  },

  /**
   * PATCH request - retorna Test chainable (síncrono)
   */
  patch(url: string) {
    return supertest(getTestServer()).patch(url);
  },

  /**
   * DELETE request - retorna Test chainable (síncrono)
   */
  delete(url: string) {
    return supertest(getTestServer()).delete(url);
  },
};

// Alias para compatibilidade
export const createTestClient = () => testClient;

// Export default
export default testClient;
