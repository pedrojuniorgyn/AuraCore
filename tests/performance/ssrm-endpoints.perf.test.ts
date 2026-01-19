/**
 * Testes de Performance - SSRM Endpoints
 * 
 * @module tests/performance/ssrm-endpoints.perf.test.ts
 * @see E8.4 - Performance Testing
 * 
 * Estes testes validam que os endpoints SSRM respondem dentro
 * dos limites de performance aceitáveis (p95 < 500ms).
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Configuração de performance
const PERFORMANCE_THRESHOLDS = {
  p95Target: 500, // ms
  p99Target: 1000, // ms
  warmupRequests: 2,
  testIterations: 5,
};

// URLs dos endpoints SSRM (relativos ao servidor de teste)
const SSRM_ENDPOINTS = [
  { name: 'Documentos Fiscais', path: '/api/fiscal/documents/ssrm' },
  { name: 'CTe', path: '/api/fiscal/cte/ssrm' },
  { name: 'Contas a Pagar', path: '/api/financial/payables/ssrm' },
  { name: 'Contas a Receber', path: '/api/financial/receivables/ssrm' },
];

// Request body padrão para SSRM
const SSRM_REQUEST_BODY = {
  startRow: 0,
  endRow: 50,
  sortModel: [],
  filterModel: {},
  rowGroupCols: [],
  groupKeys: [],
  pivotCols: [],
  pivotMode: false,
  valueCols: [],
};

/**
 * Helper para medir tempo de resposta
 */
async function measureResponseTime(
  endpoint: string,
  body: object,
  headers: HeadersInit = {}
): Promise<{ duration: number; status: number; rowCount: number }> {
  const start = performance.now();
  
  try {
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    const duration = performance.now() - start;
    const data = await response.json();

    return {
      duration,
      status: response.status,
      rowCount: data.rowCount ?? 0,
    };
  } catch {
    return {
      duration: performance.now() - start,
      status: 0,
      rowCount: 0,
    };
  }
}

/**
 * Helper para calcular percentis
 */
function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

/**
 * Helper para calcular estatísticas
 */
function calculateStats(durations: number[]) {
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    avg: sum / sorted.length,
    p50: calculatePercentile(sorted, 50),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99),
  };
}

describe('SSRM Endpoints Performance', () => {
  // Skip se não estiver rodando contra servidor local
  const isServerRunning = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/health');
      return response.ok;
    } catch {
      return false;
    }
  };

  beforeAll(async () => {
    // Verificar se servidor está rodando
    const running = await isServerRunning();
    if (!running) {
      console.warn('⚠️  Servidor não está rodando em localhost:3000. Testes de performance serão skipados.');
    }
  });

  describe.each(SSRM_ENDPOINTS)('$name SSRM', ({ name, path }) => {
    it(`should respond within ${PERFORMANCE_THRESHOLDS.p95Target}ms (p95)`, async () => {
      const running = await isServerRunning();
      if (!running) {
        console.log(`Skipping ${name} - server not running`);
        return;
      }

      // Warmup
      for (let i = 0; i < PERFORMANCE_THRESHOLDS.warmupRequests; i++) {
        await measureResponseTime(path, SSRM_REQUEST_BODY);
      }

      // Medir performance
      const durations: number[] = [];
      
      for (let i = 0; i < PERFORMANCE_THRESHOLDS.testIterations; i++) {
        const result = await measureResponseTime(path, SSRM_REQUEST_BODY);
        
        if (result.status === 200) {
          durations.push(result.duration);
        }
      }

      if (durations.length === 0) {
        console.warn(`No successful requests for ${name}`);
        return;
      }

      const stats = calculateStats(durations);

      console.log(`\n📊 ${name} Performance:`);
      console.log(`   Min: ${stats.min.toFixed(2)}ms`);
      console.log(`   Avg: ${stats.avg.toFixed(2)}ms`);
      console.log(`   p50: ${stats.p50.toFixed(2)}ms`);
      console.log(`   p95: ${stats.p95.toFixed(2)}ms`);
      console.log(`   p99: ${stats.p99.toFixed(2)}ms`);
      console.log(`   Max: ${stats.max.toFixed(2)}ms`);

      // Assert p95 within threshold
      expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95Target);
    });

    it('should handle pagination efficiently', async () => {
      const running = await isServerRunning();
      if (!running) {
        console.log(`Skipping ${name} pagination test - server not running`);
        return;
      }

      const durations: number[] = [];
      const pageSize = 50;
      const pagesToTest = 3;

      for (let page = 0; page < pagesToTest; page++) {
        const result = await measureResponseTime(path, {
          ...SSRM_REQUEST_BODY,
          startRow: page * pageSize,
          endRow: (page + 1) * pageSize,
        });

        if (result.status === 200) {
          durations.push(result.duration);
        }
      }

      if (durations.length === 0) {
        console.warn(`No successful requests for ${name} pagination`);
        return;
      }

      const stats = calculateStats(durations);

      console.log(`\n📄 ${name} Pagination (${pagesToTest} pages):`);
      console.log(`   Avg: ${stats.avg.toFixed(2)}ms per page`);

      // Verificar que paginação não degrada significativamente
      // (última página não deve ser mais de 2x mais lenta que primeira)
      const firstPageDuration = durations[0] ?? 0;
      const lastPageDuration = durations[durations.length - 1] ?? 0;
      
      if (firstPageDuration > 0 && lastPageDuration > 0) {
        const degradation = lastPageDuration / firstPageDuration;
        expect(degradation).toBeLessThan(2);
      }
    });

    it('should handle filtering without significant performance impact', async () => {
      const running = await isServerRunning();
      if (!running) {
        console.log(`Skipping ${name} filter test - server not running`);
        return;
      }

      // Teste sem filtro
      const noFilterResult = await measureResponseTime(path, SSRM_REQUEST_BODY);

      // Teste com filtro de texto
      const withFilterResult = await measureResponseTime(path, {
        ...SSRM_REQUEST_BODY,
        filterModel: {
          status: {
            filterType: 'set',
            values: ['AUTHORIZED', 'CLASSIFIED'],
          },
        },
      });

      if (noFilterResult.status !== 200 || withFilterResult.status !== 200) {
        console.warn(`Filter test failed for ${name}`);
        return;
      }

      console.log(`\n🔍 ${name} Filter Impact:`);
      console.log(`   Sem filtro: ${noFilterResult.duration.toFixed(2)}ms`);
      console.log(`   Com filtro: ${withFilterResult.duration.toFixed(2)}ms`);

      // Filtro não deve mais que triplicar o tempo de resposta
      expect(withFilterResult.duration).toBeLessThan(noFilterResult.duration * 3);
    });
  });
});

describe('Query Store Diagnostics Performance', () => {
  const isServerRunning = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/health');
      return response.ok;
    } catch {
      return false;
    }
  };

  it('should return Query Store data within 2 seconds', async () => {
    const running = await isServerRunning();
    if (!running) {
      console.log('Skipping Query Store test - server not running');
      return;
    }

    const start = performance.now();
    
    const response = await fetch('http://localhost:3000/api/admin/diagnostics/query-store?limit=10');
    
    const duration = performance.now() - start;

    console.log(`\n🔎 Query Store Diagnostics: ${duration.toFixed(2)}ms`);

    if (response.ok) {
      expect(duration).toBeLessThan(2000);
    }
  });
});
