import 'reflect-metadata';

console.log('1. Testing imports...');

async function main() {
  try {
    console.log('2. Importing container...');
    const { container } = await import('@/shared/infrastructure/di/container');
    console.log('3. Container imported OK');
    
    console.log('4. Importing FinancialModule...');
    const { initializeFinancialModule } = await import('@/modules/financial/infrastructure/di/FinancialModule');
    console.log('5. FinancialModule imported OK');
    
    console.log('6. Calling initializeFinancialModule...');
    initializeFinancialModule();
    console.log('7. initializeFinancialModule completed OK!');
    
  } catch (e: unknown) {
    const err = e as Error;
    console.error('ERROR:', err.message);
    console.error('Stack:', err.stack);
  }
}

main();
