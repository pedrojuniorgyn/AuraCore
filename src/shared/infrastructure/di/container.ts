import 'reflect-metadata';
import { container, injectable, inject, singleton, autoInjectable, registry, delay } from 'tsyringe';
import { TOKENS } from './tokens';
import { CryptoUuidGenerator } from '../adapters/CryptoUuidGenerator';

// Registros globais
container.registerSingleton(TOKENS.UuidGenerator, CryptoUuidGenerator);

// Re-exportar tudo do tsyringe após garantir que reflect-metadata foi carregado
export { container, injectable, inject, singleton, autoInjectable, registry, delay };

