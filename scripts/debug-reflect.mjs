/**
 * Diagnóstico de reflect-metadata e tsyringe
 * 
 * Execute com: node scripts/debug-reflect.mjs
 */
import 'reflect-metadata';

console.log('🔍 Diagnóstico Reflect-Metadata\n');

// 1. Reflect global
console.log('1. Reflect global:', typeof Reflect !== 'undefined' ? '✅' : '❌');

// 2. Reflect.metadata
console.log('2. Reflect.metadata:', typeof Reflect?.metadata === 'function' ? '✅' : '❌');

// 3. Reflect.getMetadata
console.log('3. Reflect.getMetadata:', typeof Reflect?.getMetadata === 'function' ? '✅' : '❌');

// 4. Testar tsyringe
try {
  const { injectable, container } = await import('tsyringe');
  
  const TestDecorator = injectable();
  
  class TestService {
    test() { return 'ok'; }
  }
  
  TestDecorator(TestService);
  
  container.registerSingleton('TestService', TestService);
  const instance = container.resolve('TestService');
  
  console.log('4. tsyringe DI:', instance.test() === 'ok' ? '✅' : '❌');
  
} catch (error) {
  console.log('4. tsyringe DI: ❌', error.message);
}

console.log('\n✅ Diagnóstico completo');
