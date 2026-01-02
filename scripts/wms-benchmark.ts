/**
 * WMS Performance Benchmark Script
 * E7.8 WMS Semana 4
 * 
 * Executa operações típicas e mede performance
 * 
 * Uso:
 *   npx ts-node scripts/wms-benchmark.ts
 */

import { performance } from 'perf_hooks';

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

interface BenchmarkConfig {
  iterations: number;
  organizationId: number;
  branchId: number;
  userId: string;
}

const config: BenchmarkConfig = {
  iterations: 100,
  organizationId: 1,
  branchId: 1,
  userId: 'benchmark-user',
};

/**
 * Mede o tempo de execução de uma operação
 */
async function measureOperation(
  name: string,
  operation: () => Promise<void>,
  iterations: number
): Promise<BenchmarkResult> {
  const times: number[] = [];

  console.log(`\n🔄 Running ${name} (${iterations} iterations)...`);

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await operation();
    const end = performance.now();
    times.push(end - start);

    if ((i + 1) % 10 === 0) {
      process.stdout.write(`\r   Progress: ${i + 1}/${iterations}`);
    }
  }

  process.stdout.write('\r   ✅ Complete!              \n');

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSecond = 1000 / avgTime;

  return {
    operation: name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    opsPerSecond,
  };
}

/**
 * Formata resultado em tabela
 */
function formatResult(result: BenchmarkResult): string {
  return [
    `Operation: ${result.operation}`,
    `Iterations: ${result.iterations}`,
    `Total Time: ${result.totalTime.toFixed(2)}ms`,
    `Avg Time: ${result.avgTime.toFixed(2)}ms`,
    `Min Time: ${result.minTime.toFixed(2)}ms`,
    `Max Time: ${result.maxTime.toFixed(2)}ms`,
    `Ops/sec: ${result.opsPerSecond.toFixed(2)}`,
  ].join('\n   ');
}

/**
 * Operação simulada: Create Location
 */
async function benchmarkCreateLocation(): Promise<void> {
  // Simula operação de criação de location
  // Em produção, chamaria o use case real
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
}

/**
 * Operação simulada: Stock Entry
 */
async function benchmarkStockEntry(): Promise<void> {
  // Simula operação de entrada de estoque
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
}

/**
 * Operação simulada: Stock Query
 */
async function benchmarkStockQuery(): Promise<void> {
  // Simula consulta de estoque
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 3));
}

/**
 * Operação simulada: Movement Query
 */
async function benchmarkMovementQuery(): Promise<void> {
  // Simula consulta de movimentações
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 8));
}

/**
 * Operação simulada: Inventory Count
 */
async function benchmarkInventoryCount(): Promise<void> {
  // Simula contagem de inventário
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 15));
}

/**
 * Executa todos os benchmarks
 */
async function runBenchmarks(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   WMS Performance Benchmark - E7.8 Semana 4      ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  console.log('\n📊 Configuration:');
  console.log(`   Iterations: ${config.iterations}`);
  console.log(`   Organization: ${config.organizationId}`);
  console.log(`   Branch: ${config.branchId}`);

  const results: BenchmarkResult[] = [];

  // Benchmark 1: Create Location
  const createLocationResult = await measureOperation(
    'Create Location',
    benchmarkCreateLocation,
    config.iterations
  );
  results.push(createLocationResult);

  // Benchmark 2: Stock Entry
  const stockEntryResult = await measureOperation(
    'Stock Entry',
    benchmarkStockEntry,
    config.iterations
  );
  results.push(stockEntryResult);

  // Benchmark 3: Stock Query
  const stockQueryResult = await measureOperation(
    'Stock Query (with filters)',
    benchmarkStockQuery,
    config.iterations
  );
  results.push(stockQueryResult);

  // Benchmark 4: Movement Query
  const movementQueryResult = await measureOperation(
    'Movement Query (with pagination)',
    benchmarkMovementQuery,
    config.iterations
  );
  results.push(movementQueryResult);

  // Benchmark 5: Inventory Count
  const inventoryCountResult = await measureOperation(
    'Inventory Count Complete',
    benchmarkInventoryCount,
    config.iterations
  );
  results.push(inventoryCountResult);

  // Mostrar resultados
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║                 BENCHMARK RESULTS                 ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${formatResult(result)}`);
  });

  // Resumo
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║                     SUMMARY                       ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  const totalOps = results.reduce((sum, r) => sum + r.iterations, 0);
  const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0);
  const avgOpsPerSec = results.reduce((sum, r) => sum + r.opsPerSecond, 0) / results.length;

  console.log(`\n   Total Operations: ${totalOps}`);
  console.log(`   Total Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`   Avg Ops/sec: ${avgOpsPerSec.toFixed(2)}`);

  // Gargalos identificados
  console.log('\n📌 Identified Bottlenecks:');
  const slowest = [...results].sort((a, b) => b.avgTime - a.avgTime)[0];
  console.log(`   Slowest: ${slowest.operation} (${slowest.avgTime.toFixed(2)}ms avg)`);

  const fastest = [...results].sort((a, b) => a.avgTime - b.avgTime)[0];
  console.log(`   Fastest: ${fastest.operation} (${fastest.avgTime.toFixed(2)}ms avg)`);

  // Recomendações
  console.log('\n💡 Recommendations:');
  if (slowest.avgTime > 10) {
    console.log(`   ⚠️  ${slowest.operation} is slow (>10ms avg)`);
    console.log('      → Consider adding database indexes');
    console.log('      → Review query optimization');
  }

  if (avgOpsPerSec < 100) {
    console.log('   ⚠️  Overall throughput is low (<100 ops/sec)');
    console.log('      → Consider caching strategies');
    console.log('      → Review database connection pooling');
  } else {
    console.log('   ✅ Performance is within acceptable range');
  }

  console.log('\n✅ Benchmark complete!');
}

/**
 * Executa benchmarks reais (com banco de dados)
 * 
 * NOTA: Esta versão usa operações simuladas.
 * Para benchmarks reais, descomentar e integrar com use cases reais:
 * 
 * import { container } from 'tsyringe';
 * import { CreateLocation } from '@/modules/wms/application/use-cases/CreateLocation';
 * 
 * const useCase = container.resolve(CreateLocation);
 * await useCase.execute(input, context);
 */

// Executar
if (require.main === module) {
  runBenchmarks().catch((error) => {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  });
}

export { runBenchmarks, measureOperation };

