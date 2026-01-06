import 'reflect-metadata';
import { container } from 'tsyringe';
import { TOKENS } from './tokens';
import { CryptoUuidGenerator } from '../adapters/CryptoUuidGenerator';

// Registros globais
container.registerSingleton(TOKENS.UuidGenerator, CryptoUuidGenerator);

export { container };

