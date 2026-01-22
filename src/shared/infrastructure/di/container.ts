import 'reflect-metadata';
import { container, injectable, inject, singleton, autoInjectable, registry, delay } from 'tsyringe';

/**
 * DI Container Configuration
 * 
 * Este arquivo exporta o container e decoradores do tsyringe.
 * NÃO deve importar módulos de negócio para evitar dependências circulares.
 * 
 * A inicialização dos módulos deve ser feita em:
 * - src/instrumentation.ts (para Next.js)
 * - src/shared/infrastructure/di/bootstrap.ts (para scripts/testes)
 */

export { container, injectable, inject, singleton, autoInjectable, registry, delay };
