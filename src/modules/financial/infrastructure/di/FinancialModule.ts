import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IPayableRepository } from '../../domain/ports/output/IPayableRepository';
import { DrizzlePayableRepository } from '../persistence/DrizzlePayableRepository';
import { DomainEventDispatcher, PaymentCompletedHandler, type IEventDispatcher } from '../events/DomainEventDispatcher';
import { CreatePayableUseCase } from '../../application/use-cases/CreatePayableUseCase';
import { PayAccountPayableUseCase } from '../../application/use-cases/PayAccountPayableUseCase';
import { CancelPayableUseCase } from '../../application/use-cases/CancelPayableUseCase';
import { ListPayablesUseCase } from '../../application/use-cases/ListPayablesUseCase';
import { GetPayableByIdUseCase } from '../../application/use-cases/GetPayableByIdUseCase';

/**
 * Registra todas as dependências do módulo Financial
 */
export function registerFinancialModule(): void {
  // Repositories
  container.registerSingleton<IPayableRepository>(
    TOKENS.PayableRepository,
    DrizzlePayableRepository
  );

  // Event Dispatcher
  container.registerSingleton<IEventDispatcher>(
    TOKENS.EventDispatcher,
    DomainEventDispatcher
  );

  // Event Handlers
  container.registerSingleton(PaymentCompletedHandler);

  // Use Cases
  container.registerSingleton(CreatePayableUseCase);
  container.registerSingleton(PayAccountPayableUseCase);
  container.registerSingleton(CancelPayableUseCase);
  container.registerSingleton(ListPayablesUseCase);
  container.registerSingleton(GetPayableByIdUseCase);

  // Registrar handlers de eventos
  const dispatcher = container.resolve<IEventDispatcher>(TOKENS.EventDispatcher);
  const paymentHandler = container.resolve(PaymentCompletedHandler);
  dispatcher.register('PaymentCompleted', paymentHandler);
}

