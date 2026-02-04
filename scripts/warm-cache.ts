/**
 * Cache Warming Script
 * Pré-carrega dados essenciais no Redis após startup
 * 
 * Reduz "thundering herd" e melhora primeiras requisições
 * 
 * Uso:
 * - npm run warm:cache (manual)
 * - Automático via instrumentation.ts (se CACHE_WARMING_ENABLED=true)
 */
import 'reflect-metadata';
import { fileURLToPath } from 'url';
import { CacheService, CacheTTL } from '../src/services/cache.service';
import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { log } from '../src/lib/observability/logger';

interface WarmingResult {
  entity: string;
  success: boolean;
  count: number;
  durationMs: number;
  error?: string;
}

/**
 * Busca organizações/filiais existentes
 */
async function getOrganizationsAndBranches(): Promise<Array<{ organizationId: number; branchId: number }>> {
  try {
    const { ensureConnection } = await import('../src/lib/db');
    await ensureConnection();

    // Buscar organizações/branches distintas dos usuários
    const result = await db
      .selectDistinct({
        organizationId: users.organizationId,
        defaultBranchId: users.defaultBranchId,
      })
      .from(users)
      .where(isNull(users.deletedAt));

    // Filtrar apenas registros válidos
    return result
      .filter(r => r.organizationId && r.defaultBranchId)
      .map(r => ({
        organizationId: r.organizationId!,
        branchId: r.defaultBranchId!,
      }));
  } catch (error) {
    log('error', 'warm-cache: failed to get orgs/branches', { error });
    return [];
  }
}

// Departments warming desabilitado - schema não está disponível
// Para reativar: importar schema correto e implementar lógica

/**
 * Warm users cache
 */
async function warmUsers(): Promise<WarmingResult> {
  const start = Date.now();
  try {
    const orgs = await getOrganizationsAndBranches();
    
    if (orgs.length === 0) {
      return {
        entity: 'users',
        success: true,
        count: 0,
        durationMs: Date.now() - start,
      };
    }

    let totalCount = 0;

    // Agrupar por organizationId (users cache é por org, não por branch)
    const uniqueOrgs = Array.from(new Set(orgs.map(o => o.organizationId)));

    for (const organizationId of uniqueOrgs) {
      try {
        // Buscar usuários da organização
        const usersData = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            organizationId: users.organizationId,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.organizationId, organizationId));

        // Cachear (formato simplificado - API retorna mais dados)
        const cacheKey = `org:${organizationId}`;
        const response = {
          success: true,
          users: usersData,
          total: usersData.length,
        };
        await CacheService.set(cacheKey, response, CacheTTL.MEDIUM, 'users:');
        
        totalCount += usersData.length;
      } catch (error) {
        log('warn', 'warm-cache: failed to warm users for org', {
          organizationId,
          error,
        });
      }
    }

    return {
      entity: 'users',
      success: true,
      count: totalCount,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    return {
      entity: 'users',
      success: false,
      count: 0,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Warm cache summary
 */
async function warmSummary(results: WarmingResult[]): Promise<void> {
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
  const successCount = results.filter(r => r.success).length;
  const totalRecords = results.reduce((sum, r) => sum + r.count, 0);

  log('info', 'warm-cache: summary', {
    totalEntities: results.length,
    successful: successCount,
    failed: results.length - successCount,
    recordsCached: totalRecords,
    totalTimeMs: totalDuration,
  });

  // Log individual results
  results.forEach(r => {
    if (r.success) {
      log('info', `warm-cache: ${r.entity}`, {
        count: r.count,
        durationMs: r.durationMs,
      });
    } else {
      log('error', `warm-cache: ${r.entity} failed`, {
        error: r.error,
        durationMs: r.durationMs,
      });
    }
  });
}

/**
 * Execute cache warming
 */
export async function warmCache(): Promise<void> {
  const startTotal = Date.now();
  log('info', 'warm-cache: starting', {});

  const results: WarmingResult[] = [];

  try {
    // Garantir conexão com banco de dados
    const { ensureConnection } = await import('../src/lib/db');
    await ensureConnection();

    // Aguardar Redis estar pronto (importante!)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Executar warming
    const usersResult = await warmUsers();
    results.push(usersResult);
  } catch (error) {
    log('error', 'warm-cache: fatal error', { error });
    throw error;
  } finally {
    const totalDuration = Date.now() - startTotal;
    await warmSummary(results);
    log('info', 'warm-cache: complete', { totalDurationMs: totalDuration });
  }
}

// Se executado diretamente (não via import)
// ES modules: verificar se é o script principal
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  warmCache()
    .then(() => {
      console.log('[Cache Warming] Success!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Cache Warming] Fatal error:', error);
      process.exit(1);
    });
}
