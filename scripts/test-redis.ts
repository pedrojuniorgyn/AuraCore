import redis from '../src/lib/redis';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message?: string;
  duration?: number;
}

async function testRedis() {
  const results: TestResult[] = [];
  const startTime = Date.now();

  console.log('🔍 Starting Redis connection tests...\n');

  try {
    // Test 1: Connect
    const connectStart = Date.now();
    await redis.connect();
    results.push({
      test: 'Connection',
      status: 'PASS',
      duration: Date.now() - connectStart,
    });
    console.log('✅ Test 1: Connection - PASS');

    // Test 2: SET operation
    const setStart = Date.now();
    await redis.set('test:key', 'Hello Redis!', 'EX', 10);
    results.push({
      test: 'SET operation',
      status: 'PASS',
      duration: Date.now() - setStart,
    });
    console.log('✅ Test 2: SET operation - PASS');

    // Test 3: GET operation
    const getStart = Date.now();
    const value = await redis.get('test:key');
    if (value === 'Hello Redis!') {
      results.push({
        test: 'GET operation',
        status: 'PASS',
        duration: Date.now() - getStart,
        message: `Retrieved: ${value}`,
      });
      console.log('✅ Test 3: GET operation - PASS');
    } else {
      throw new Error(`Expected "Hello Redis!", got "${value}"`);
    }

    // Test 4: TTL check
    const ttlStart = Date.now();
    const ttl = await redis.ttl('test:key');
    if (ttl > 0 && ttl <= 10) {
      results.push({
        test: 'TTL check',
        status: 'PASS',
        duration: Date.now() - ttlStart,
        message: `TTL: ${ttl}s`,
      });
      console.log('✅ Test 4: TTL check - PASS');
    } else {
      throw new Error(`Invalid TTL: ${ttl}`);
    }

    // Test 5: DELETE operation
    const delStart = Date.now();
    const deleted = await redis.del('test:key');
    if (deleted === 1) {
      results.push({
        test: 'DELETE operation',
        status: 'PASS',
        duration: Date.now() - delStart,
      });
      console.log('✅ Test 5: DELETE operation - PASS');
    } else {
      throw new Error(`Failed to delete key`);
    }

    // Test 6: Server info
    const infoStart = Date.now();
    const info = await redis.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    results.push({
      test: 'Server info',
      status: 'PASS',
      duration: Date.now() - infoStart,
      message: `Redis version: ${version}`,
    });
    console.log('✅ Test 6: Server info - PASS');

    // Summary
    const totalDuration = Date.now() - startTime;
    console.log('\n📊 Test Summary:');
    console.log(`   Total tests: ${results.length}`);
    console.log(`   Passed: ${results.filter(r => r.status === 'PASS').length}`);
    console.log(`   Failed: ${results.filter(r => r.status === 'FAIL').length}`);
    console.log(`   Total time: ${totalDuration}ms`);

    await redis.quit();
    console.log('\n✅ All tests passed! Redis is ready to use.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Redis test failed:', error);
    results.push({
      test: 'Overall',
      status: 'FAIL',
      message: error instanceof Error ? error.message : String(error),
    });
    
    try {
      await redis.quit();
    } catch (quitError) {
      console.error('Failed to close Redis connection:', quitError);
    }
    
    process.exit(1);
  }
}

testRedis();
