/**
 * REFLECT METADATA POLYFILL
 * 
 * Este arquivo DEVE ser importado ANTES de qualquer módulo que use decorators.
 * Garante que reflect-metadata está disponível globalmente.
 * 
 * @module shared/infrastructure/di
 * @since E14.8
 */
import 'reflect-metadata';

// Verificação de sanidade
if (typeof Reflect === 'undefined' || !Reflect.getMetadata) {
  console.error('[DI] FATAL: reflect-metadata não carregou corretamente!');
}
