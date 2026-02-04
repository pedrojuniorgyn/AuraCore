/**
 * Migration Script: OKRs Mock Store → SQL Server
 * Migrates data from src/lib/okrs/mock-store to SQL Server using DDD Repository
 * 
 * @module strategic/okr/infrastructure/persistence/scripts
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { registerStrategicModule } from '../../../../infrastructure/di/StrategicModule';
import type { IOkrRepository } from '../../../domain/ports/output/IOkrRepository';
import { OKR, type OKRLevel, type OKRStatus, type OKRPeriodType } from '../../../domain/entities/OKR';
import { KeyResult, type KeyResultMetricType, type KeyResultStatus } from '../../../domain/entities/KeyResult';
import { OKR_TOKENS } from '../../di/tokens';
import { Result } from '../../../../../../shared/domain/types/Result';

// Mock Store (interface antiga - será deletada na Task 05)
import type { OKR as MockOKR, KeyResult as MockKeyResult } from '../../../../../../lib/okrs/okr-types';
import { getAllOkrs } from '../../../../../../lib/okrs/mock-store';

/**
 * Converte KeyResult do Mock Store para Domain Entity
 */
function convertKeyResult(mockKr: MockKeyResult): Result<KeyResult, string> {
  return KeyResult.create({
    id: mockKr.id, // Preservar ID original
    title: mockKr.title,
    description: mockKr.description || undefined,
    metricType: mockKr.metricType as KeyResultMetricType,
    startValue: mockKr.startValue,
    targetValue: mockKr.targetValue,
    currentValue: mockKr.currentValue,
    unit: mockKr.unit || undefined,
    status: mockKr.status as KeyResultStatus,
    weight: mockKr.weight,
    order: mockKr.order,
    linkedKpiId: mockKr.linkedKpiId,
    linkedActionPlanId: mockKr.linkedActionPlanId,
  });
}

/**
 * Converte OKR do Mock Store para Domain Entity
 */
function convertOkr(mockOkr: MockOKR): Result<OKR, string> {
  // Converter Key Results primeiro
  const keyResults: KeyResult[] = [];
  const krErrors: string[] = [];

  for (const mockKr of mockOkr.keyResults || []) {
    const krResult = convertKeyResult(mockKr);
    if (Result.isOk(krResult)) {
      keyResults.push(krResult.value);
    } else {
      krErrors.push(`KR "${mockKr.title}": ${krResult.error}`);
    }
  }

  if (krErrors.length > 0) {
    return Result.fail(`Failed to convert Key Results:\n${krErrors.join('\n')}`);
  }

  // Converter OKR
  return OKR.create({
    id: mockOkr.id, // Preservar ID original (UUIDs do mock)
    title: mockOkr.title,
    description: mockOkr.description || undefined,
    level: mockOkr.level as OKRLevel,
    parentId: mockOkr.parentId,
    periodType: mockOkr.periodType as OKRPeriodType,
    periodLabel: mockOkr.periodLabel,
    startDate: new Date(mockOkr.startDate),
    endDate: new Date(mockOkr.endDate),
    ownerId: mockOkr.ownerId,
    ownerName: mockOkr.ownerName,
    ownerType: mockOkr.ownerType,
    keyResults,
    progress: mockOkr.progress,
    status: mockOkr.status as OKRStatus,
    organizationId: mockOkr.organizationId,
    branchId: mockOkr.branchId,
    createdBy: mockOkr.createdBy,
    createdAt: new Date(mockOkr.createdAt),
    updatedAt: new Date(mockOkr.updatedAt),
  });
}

/**
 * Executa migração de dados
 */
async function migrateOkrsToDb() {
  console.log('🚀 Starting OKRs migration from Mock Store to SQL Server...\n');

  // 1. Conectar ao banco de dados
  console.log('🔌 Connecting to SQL Server...');
  const { ensureConnection } = await import('../../../../../../lib/db');
  await ensureConnection();
  console.log('✅ Connected to SQL Server\n');

  // 2. Registrar DI Container
  console.log('📦 Registering DI Container...');
  registerStrategicModule();
  console.log('✅ DI Container registered\n');

  // 3. Resolver Repository
  const repository = container.resolve<IOkrRepository>(OKR_TOKENS.OkrRepository);

  // 4. Carregar OKRs do Mock Store
  const mockOkrs = getAllOkrs();
  console.log(`📄 Found ${mockOkrs.length} OKRs in Mock Store\n`);

  // 5. Migrar cada OKR
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ title: string; error: string }> = [];

  for (const mockOkr of mockOkrs) {
    try {
      console.log(`📦 Migrating: "${mockOkr.title}" (${mockOkr.level})...`);

      // Converter para Domain Entity
      const okrResult = convertOkr(mockOkr);
      if (Result.isFail(okrResult)) {
        console.error(`  ❌ Conversion failed: ${okrResult.error}`);
        errors.push({ title: mockOkr.title, error: okrResult.error });
        errorCount++;
        continue;
      }

      const okr = okrResult.value;

      // Salvar via Repository
      const saveResult = await repository.save(okr);
      if (Result.isFail(saveResult)) {
        console.error(`  ❌ Save failed: ${saveResult.error}`);
        errors.push({ title: mockOkr.title, error: saveResult.error });
        errorCount++;
        continue;
      }

      console.log(`  ✅ Saved: ${okr.id} (${okr.keyResults.length} Key Results, ${okr.progress}% progress)`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Unexpected error:`, error);
      errors.push({ 
        title: mockOkr.title, 
        error: error instanceof Error ? error.message : String(error) 
      });
      errorCount++;
    }
  }

  // 6. Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total OKRs: ${mockOkrs.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach((e, i) => {
      console.log(`${i + 1}. "${e.title}"`);
      console.log(`   ${e.error}\n`);
    });
  }

  console.log('='.repeat(60));

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Validate data in SQL Server');
    console.log('2. Update APIs to use Repository (Task 04)');
    console.log('3. Delete Mock Store + JSON (Task 05)');
  } else {
    console.log('\n⚠️  Migration completed with errors. Check logs above.');
    process.exit(1);
  }
}

// Execute migration
migrateOkrsToDb()
  .then(() => {
    console.log('\n👋 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  });
