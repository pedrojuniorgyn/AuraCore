/**
 * Script de teste para Redis Cache
 * Uso: npx tsx scripts/test-redis-cache.ts
 */
import { redisCache } from '../src/lib/cache';

interface TestData {
  id: string;
  name: string;
  timestamp: Date;
}

async function testRedisCache() {
  console.log('🧪 === TESTE DE REDIS CACHE ===\n');

  try {
    // 1. Conectar ao Redis
    console.log('1️⃣ Conectando ao Redis...');
    redisCache.connect();
    
    // Aguardar conexão
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!redisCache.isConnected()) {
      throw new Error('Falha ao conectar ao Redis. Verifique se o Redis está rodando.');
    }
    console.log('✅ Redis conectado\n');

    // 2. Teste de escrita
    console.log('2️⃣ Testando SET...');
    const testData: TestData = {
      id: '123',
      name: 'Teste Cache',
      timestamp: new Date(),
    };
    
    await redisCache.set('test-key', testData, { ttl: 60, prefix: 'test:' });
    console.log('✅ Dados escritos no cache\n');

    // 3. Teste de leitura
    console.log('3️⃣ Testando GET...');
    const cached = await redisCache.get<TestData>('test-key', 'test:');
    
    if (!cached) {
      throw new Error('Cache retornou null - dados não foram escritos');
    }
    
    console.log('✅ Dados lidos do cache:');
    console.log('  ID:', cached.id);
    console.log('  Name:', cached.name);
    console.log('  Timestamp:', cached.timestamp);
    console.log('');

    // 4. Teste de remember (cache-aside)
    console.log('4️⃣ Testando REMEMBER (cache-aside)...');
    let dbCallCount = 0;
    
    const fetchData = async () => {
      dbCallCount++;
      console.log(`  📊 Simulando query ao banco (call #${dbCallCount})...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id: '456', name: 'From Database', timestamp: new Date() };
    };

    // Primeira chamada: cache miss
    const result1 = await redisCache.remember('remember-test', fetchData, { ttl: 60, prefix: 'test:' });
    console.log(`  ✅ Primeira chamada (cache miss): ${result1.name}`);
    
    // Segunda chamada: cache hit
    const result2 = await redisCache.remember('remember-test', fetchData, { ttl: 60, prefix: 'test:' });
    console.log(`  ✅ Segunda chamada (cache hit): ${result2.name}`);
    console.log(`  📈 Chamadas ao banco: ${dbCallCount} (esperado: 1)\n`);

    // 5. Teste de invalidação por padrão
    console.log('5️⃣ Testando INVALIDATE (pattern matching)...');
    
    // Criar múltiplas chaves
    await redisCache.set('org:1:branch:1:data', { test: 1 }, { ttl: 60, prefix: 'test:' });
    await redisCache.set('org:1:branch:2:data', { test: 2 }, { ttl: 60, prefix: 'test:' });
    await redisCache.set('org:2:branch:1:data', { test: 3 }, { ttl: 60, prefix: 'test:' });
    
    // Invalidar org:1:*
    const deleted = await redisCache.invalidate('org:1:*', 'test:');
    console.log(`  ✅ Invalidadas ${deleted} chaves (esperado: 2)\n`);

    // 6. Teste de delete
    console.log('6️⃣ Testando DELETE...');
    await redisCache.delete('test-key', 'test:');
    
    const afterDelete = await redisCache.get<TestData>('test-key', 'test:');
    if (afterDelete === null) {
      console.log('  ✅ Chave deletada com sucesso\n');
    } else {
      throw new Error('Chave ainda existe após delete');
    }

    // 7. Estatísticas do Redis
    console.log('7️⃣ Estatísticas do Redis:');
    const stats = await redisCache.getStats();
    if (stats) {
      console.log('  Total commands:', stats.total_commands_processed || 'N/A');
      console.log('  Used memory:', stats.used_memory || 'N/A');
      console.log('  Connected clients:', stats.connected_clients || 'N/A');
    }
    console.log('');

    // 8. Limpeza
    console.log('8️⃣ Limpando cache de teste...');
    await redisCache.invalidate('*', 'test:');
    await redisCache.delete('remember-test', 'test:');
    console.log('  ✅ Cache limpo\n');

    // 9. Desconectar
    console.log('9️⃣ Desconectando...');
    await redisCache.disconnect();
    console.log('  ✅ Desconectado\n');

    console.log('🎉 === TODOS OS TESTES PASSARAM ===');
    process.exit(0);

  } catch (error) {
    console.error('❌ === ERRO NO TESTE ===');
    console.error(error);
    
    // Tentar desconectar mesmo em caso de erro
    try {
      await redisCache.disconnect();
    } catch {
      // Ignorar erro de desconexão
    }
    
    process.exit(1);
  }
}

// Executar testes
testRedisCache();
