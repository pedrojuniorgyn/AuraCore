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

import { logger } from '@/shared/infrastructure/logging';
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
 * Bug Fix: Usar reconstitute() ao invés de create() para preservar estado completo
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

  // Bug Fix: Usar reconstitute() para migração (preserva estado completo)
  // create() gera novos IDs, inicializa keyResults=[], progress=0, status='draft'
  // reconstitute() aceita TODAS as propriedades (id, keyResults, progress, status, timestamps)
  return OKR.reconstitute({
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
    keyResults, // reconstitute() aceita keyResults
    progress: mockOkr.progress, // reconstitute() aceita progress
    status: mockOkr.status as OKRStatus, // reconstitute() aceita status
    organizationId: mockOkr.organizationId,
    branchId: mockOkr.branchId,
    createdBy: mockOkr.createdBy,
    createdAt: new Date(mockOkr.createdAt), // reconstitute() aceita createdAt
    updatedAt: new Date(mockOkr.updatedAt), // reconstitute() aceita updatedAt
  });
}

/**
 * Executa migração de dados
 */
async function migrateOkrsToDb() {
  logger.info('🚀 Starting OKRs migration from Mock Store to SQL Server...\n');

  // 1. Conectar ao banco de dados
  logger.info('🔌 Connecting to SQL Server...');
  const { ensureConnection } = await import('../../../../../../lib/db');
  await ensureConnection();
  logger.info('✅ Connected to SQL Server\n');

  // 2. Registrar DI Container
  logger.info('📦 Registering DI Container...');
  registerStrategicModule();
  logger.info('✅ DI Container registered\n');

  // 3. Resolver Repository
  const repository = container.resolve<IOkrRepository>(OKR_TOKENS.OkrRepository);

  // 4. Carregar OKRs do Mock Store
  const mockOkrs = getAllOkrs();
  logger.info(`📄 Found ${mockOkrs.length} OKRs in Mock Store\n`);

  // 5. Migrar cada OKR
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ title: string; error: string }> = [];

  for (const mockOkr of mockOkrs) {
    try {
      logger.info(`📦 Migrating: "${mockOkr.title}" (${mockOkr.level})...`);

      // Converter para Domain Entity
      const okrResult = convertOkr(mockOkr);
      if (Result.isFail(okrResult)) {
        logger.error(`  ❌ Conversion failed: ${okrResult.error}`);
        errors.push({ title: mockOkr.title, error: okrResult.error });
        errorCount++;
        continue;
      }

      const okr = okrResult.value;

      // Salvar via Repository
      const saveResult = await repository.save(okr);
      if (Result.isFail(saveResult)) {
        logger.error(`  ❌ Save failed: ${saveResult.error}`);
        errors.push({ title: mockOkr.title, error: saveResult.error });
        errorCount++;
        continue;
      }

      logger.info(`  ✅ Saved: ${okr.id} (${okr.keyResults.length} Key Results, ${okr.progress}% progress)`);
      successCount++;
    } catch (error) {
      logger.error(`  ❌ Unexpected error:`, error);
      errors.push({ 
        title: mockOkr.title, 
        error: error instanceof Error ? error.message : String(error) 
      });
      errorCount++;
    }
  }

  // 6. Resumo
  logger.info('\n' + '='.repeat(60));
  logger.info('📊 MIGRATION SUMMARY');
  logger.info('='.repeat(60));
  logger.info(`Total OKRs: ${mockOkrs.length}`);
  logger.info(`✅ Success: ${successCount}`);
  logger.info(`❌ Errors: ${errorCount}`);

  if (errors.length > 0) {
    logger.info('\n❌ ERRORS:');
    errors.forEach((e, i) => {
      logger.info(`${i + 1}. "${e.title}"`);
      logger.info(`   ${e.error}\n`);
    });
  }

  logger.info('='.repeat(60));

  if (errorCount === 0) {
    logger.info('\n🎉 Migration completed successfully!');
    logger.info('\n📋 Next Steps:');
    logger.info('1. Validate data in SQL Server');
    logger.info('2. Update APIs to use Repository (Task 04)');
    logger.info('3. Delete Mock Store + JSON (Task 05)');
  } else {
    logger.info('\n⚠️  Migration completed with errors. Check logs above.');
    process.exit(1);
  }
}

// Execute migration
migrateOkrsToDb()
  .then(() => {
    logger.info('\n👋 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n💥 Fatal error:', error);
    logger.error('Error occurred', error.stack);
    process.exit(1);
  });
