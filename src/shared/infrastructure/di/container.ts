import 'reflect-metadata';
import { container, injectable, inject, singleton, autoInjectable, registry, delay } from 'tsyringe';
import { TOKENS } from './tokens';
import { CryptoUuidGenerator } from '../adapters/CryptoUuidGenerator';
import { DoclingClient } from '../docling';
import { ImportDANFeUseCase } from '@/modules/fiscal/application/commands/import-danfe';
import { ImportDACTeUseCase } from '@/modules/fiscal/application/commands/import-dacte';

// Registros globais
container.registerSingleton(TOKENS.UuidGenerator, CryptoUuidGenerator);

// Docling Integration (E-Agent-Fase-D1/D2/D3)
container.registerSingleton(TOKENS.DoclingClient, DoclingClient);
container.register(TOKENS.ImportDANFeUseCase, { useClass: ImportDANFeUseCase });
container.register(TOKENS.ImportDACTeUseCase, { useClass: ImportDACTeUseCase });

// Re-exportar tudo do tsyringe após garantir que reflect-metadata foi carregado
export { container, injectable, inject, singleton, autoInjectable, registry, delay };

