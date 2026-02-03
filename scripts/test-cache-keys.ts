/**
 * Script para testar keys do Redis Cache
 * Verifica se o prefix está sendo aplicado corretamente
 */
import { redisCache } from '../src/lib/cache';

async function testCacheKeys() {
  console.log('🧪 TESTE DE CACHE KEYS\n');

  try {
    // Conectar ao Redis
    redisCache.connect();
    
    // Aguardar conexão
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('1️⃣ SET com prefix "departments:"');
    await redisCache.set('tree:1:1:all', { test: 'data' }, { 
      ttl: 60, 
      prefix: 'departments:' 
    });
    console.log('   ✅ SET executado\n');

    console.log('2️⃣ Listar TODAS as keys no Redis:');
    const client = (redisCache as unknown as { client: { keys: (pattern: string) => Promise<string[]> } }).client;
    const allKeys = await client.keys('*');
    console.log(`   Total de keys: ${allKeys.length}`);
    
    const relevantKeys = allKeys.filter((k: string) => 
      k.includes('tree:1:1:all') || k.includes('departments')
    );
    
    console.log(`   Keys relevantes:`);
    relevantKeys.forEach((k: string) => console.log(`   - ${k}`));
    console.log('');

    console.log('3️⃣ GET com prefix "departments:"');
    const data = await redisCache.get('tree:1:1:all', 'departments:');
    console.log(`   Resultado: ${data ? 'ENCONTRADO ✅' : 'NÃO ENCONTRADO ❌'}`);
    console.log('');

    console.log('4️⃣ INVALIDATE com pattern "*" e prefix "departments:"');
    const deleted = await redisCache.invalidate('*', 'departments:');
    console.log(`   Keys deletadas: ${deleted}`);
    console.log('');

    console.log('5️⃣ Verificar se key ainda existe:');
    const dataAfter = await redisCache.get('tree:1:1:all', 'departments:');
    console.log(`   Resultado: ${dataAfter ? 'AINDA EXISTE ❌' : 'DELETADA ✅'}`);
    console.log('');

    // Cleanup
    await redisCache.disconnect();
    
    console.log('✅ TESTE CONCLUÍDO');
  } catch (error) {
    console.error('❌ ERRO:', error);
    process.exit(1);
  }
}

testCacheKeys();
