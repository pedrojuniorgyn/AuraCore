import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import { Receipt, ReceiptProps, PaymentMethod, ReceiptStatus } from '../../../domain/entities/receipt/Receipt';
import { ReceiptType } from '../../../domain/value-objects/receipt/ReceiptType';
import { ReceiptParty, DocumentType, Address } from '../../../domain/value-objects/receipt/ReceiptParty';

/**
 * Interface Persistence - DEVE espelhar Schema completo
 */
export interface ReceiptPersistence {
  id: string;
  organizationId: number;
  branchId: number;
  
  tipo: string;
  numero: number;
  serie: string;
  
  pagadorNome: string;
  pagadorDocumento: string;
  pagadorTipoDocumento: string;
  pagadorEnderecoLogradouro: string | null;
  pagadorEnderecoNumero: string | null;
  pagadorEnderecoComplemento: string | null;
  pagadorEnderecoBairro: string | null;
  pagadorEnderecoCidade: string | null;
  pagadorEnderecoEstado: string | null;
  pagadorEnderecoCep: string | null;
  
  recebedorNome: string;
  recebedorDocumento: string;
  recebedorTipoDocumento: string;
  recebedorEnderecoLogradouro: string | null;
  recebedorEnderecoNumero: string | null;
  recebedorEnderecoComplemento: string | null;
  recebedorEnderecoBairro: string | null;
  recebedorEnderecoCidade: string | null;
  recebedorEnderecoEstado: string | null;
  recebedorEnderecoCep: string | null;
  
  valorAmount: string;
  valorCurrency: string;
  valorPorExtenso: string;
  
  descricao: string;
  formaPagamento: string;
  dataRecebimento: Date;
  localRecebimento: string | null;
  
  financialTransactionId: string | null;
  payableId: string | null;
  receivableId: string | null;
  tripId: string | null;
  expenseReportId: string | null;
  
  emitidoPor: string;
  emitidoEm: Date;
  
  status: string;
  canceladoEm: Date | null;
  canceladoPor: string | null;
  motivoCancelamento: string | null;
  
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  deletedAt: Date | null;
}

/**
 * Mapper: Receipt Domain ↔ Persistence
 * 
 * REGRAS OBRIGATÓRIAS (infrastructure-layer.json):
 * 1. toPersistence mapeia TODOS os campos (sem placeholders)
 * 2. toDomain usa reconstitute(), NÃO create()
 * 3. Money com 2 campos (amount + currency)
 * 4. Verificar Result.isFail() antes de .value
 */
export class ReceiptMapper {
  /**
   * Domain → Persistence
   */
  static toPersistence(receipt: Receipt): ReceiptPersistence {
    // Pagador
    const pagadorEndereco = receipt.pagador.endereco;
    
    // Recebedor
    const recebedorEndereco = receipt.recebedor.endereco;

    return {
      id: receipt.id,
      organizationId: receipt.organizationId,
      branchId: receipt.branchId,
      
      tipo: receipt.tipo,
      numero: receipt.numero,
      serie: receipt.serie,
      
      // Pagador
      pagadorNome: receipt.pagador.nome,
      pagadorDocumento: receipt.pagador.documento,
      pagadorTipoDocumento: receipt.pagador.tipoDocumento,
      pagadorEnderecoLogradouro: pagadorEndereco?.logradouro || null,
      pagadorEnderecoNumero: pagadorEndereco?.numero || null,
      pagadorEnderecoComplemento: pagadorEndereco?.complemento || null,
      pagadorEnderecoBairro: pagadorEndereco?.bairro || null,
      pagadorEnderecoCidade: pagadorEndereco?.cidade || null,
      pagadorEnderecoEstado: pagadorEndereco?.estado || null,
      pagadorEnderecoCep: pagadorEndereco?.cep || null,
      
      // Recebedor
      recebedorNome: receipt.recebedor.nome,
      recebedorDocumento: receipt.recebedor.documento,
      recebedorTipoDocumento: receipt.recebedor.tipoDocumento,
      recebedorEnderecoLogradouro: recebedorEndereco?.logradouro || null,
      recebedorEnderecoNumero: recebedorEndereco?.numero || null,
      recebedorEnderecoComplemento: recebedorEndereco?.complemento || null,
      recebedorEnderecoBairro: recebedorEndereco?.bairro || null,
      recebedorEnderecoCidade: recebedorEndereco?.cidade || null,
      recebedorEnderecoEstado: recebedorEndereco?.estado || null,
      recebedorEnderecoCep: recebedorEndereco?.cep || null,
      
      // Valores (Money com 2 campos)
      valorAmount: receipt.valor.amount.toFixed(2),
      valorCurrency: receipt.valor.currency,
      valorPorExtenso: receipt.valorPorExtenso,
      
      // Detalhes
      descricao: receipt.descricao,
      formaPagamento: receipt.formaPagamento,
      dataRecebimento: receipt.dataRecebimento,
      localRecebimento: receipt.localRecebimento || null,
      
      // Vinculações
      financialTransactionId: receipt.financialTransactionId || null,
      payableId: receipt.payableId || null,
      receivableId: receipt.receivableId || null,
      tripId: receipt.tripId || null,
      expenseReportId: receipt.expenseReportId || null,
      
      // Emissão
      emitidoPor: receipt.emitidoPor,
      emitidoEm: receipt.emitidoEm,
      
      // Cancelamento
      status: receipt.status,
      canceladoEm: receipt.canceladoEm || null,
      canceladoPor: receipt.canceladoPor || null,
      motivoCancelamento: receipt.motivoCancelamento || null,
      
      // Auditoria
      createdAt: receipt.createdAt,
      createdBy: receipt.createdBy,
      updatedAt: receipt.updatedAt,
      updatedBy: receipt.updatedBy,
      deletedAt: null,
    };
  }

  /**
   * Persistence → Domain
   */
  static toDomain(persistence: ReceiptPersistence): Result<Receipt, string> {
    // Reconstruir Money (verificar Result.isFail antes de .value)
    const valorResult = Money.create(
      parseFloat(persistence.valorAmount),
      persistence.valorCurrency
    );
    if (Result.isFail(valorResult)) {
      return Result.fail(`Failed to create valor: ${valorResult.error}`);
    }

    // Reconstruir pagador endereco
    let pagadorEndereco: Address | undefined;
    if (
      persistence.pagadorEnderecoLogradouro &&
      persistence.pagadorEnderecoCidade &&
      persistence.pagadorEnderecoEstado
    ) {
      pagadorEndereco = {
        logradouro: persistence.pagadorEnderecoLogradouro,
        numero: persistence.pagadorEnderecoNumero || '',
        complemento: persistence.pagadorEnderecoComplemento || undefined,
        bairro: persistence.pagadorEnderecoBairro || '',
        cidade: persistence.pagadorEnderecoCidade,
        estado: persistence.pagadorEnderecoEstado,
        cep: persistence.pagadorEnderecoCep || '',
      };
    }

    // Reconstruir pagador
    const pagadorResult = ReceiptParty.reconstitute({
      nome: persistence.pagadorNome,
      documento: persistence.pagadorDocumento,
      tipoDocumento: persistence.pagadorTipoDocumento as DocumentType,
      endereco: pagadorEndereco,
    });
    if (Result.isFail(pagadorResult)) {
      return Result.fail(`Failed to reconstitute pagador: ${pagadorResult.error}`);
    }

    // Reconstruir recebedor endereco
    let recebedorEndereco: Address | undefined;
    if (
      persistence.recebedorEnderecoLogradouro &&
      persistence.recebedorEnderecoCidade &&
      persistence.recebedorEnderecoEstado
    ) {
      recebedorEndereco = {
        logradouro: persistence.recebedorEnderecoLogradouro,
        numero: persistence.recebedorEnderecoNumero || '',
        complemento: persistence.recebedorEnderecoComplemento || undefined,
        bairro: persistence.recebedorEnderecoBairro || '',
        cidade: persistence.recebedorEnderecoCidade,
        estado: persistence.recebedorEnderecoEstado,
        cep: persistence.recebedorEnderecoCep || '',
      };
    }

    // Reconstruir recebedor
    const recebedorResult = ReceiptParty.reconstitute({
      nome: persistence.recebedorNome,
      documento: persistence.recebedorDocumento,
      tipoDocumento: persistence.recebedorTipoDocumento as DocumentType,
      endereco: recebedorEndereco,
    });
    if (Result.isFail(recebedorResult)) {
      return Result.fail(`Failed to reconstitute recebedor: ${recebedorResult.error}`);
    }

    // Reconstruir Receipt (usar reconstitute, NÃO create)
    const props: ReceiptProps = {
      id: persistence.id,
      organizationId: persistence.organizationId,
      branchId: persistence.branchId,
      tipo: persistence.tipo as ReceiptType,
      numero: persistence.numero,
      serie: persistence.serie,
      pagador: pagadorResult.value,
      recebedor: recebedorResult.value,
      valor: valorResult.value,
      valorPorExtenso: persistence.valorPorExtenso,
      descricao: persistence.descricao,
      formaPagamento: persistence.formaPagamento as PaymentMethod,
      dataRecebimento: persistence.dataRecebimento,
      localRecebimento: persistence.localRecebimento || undefined,
      financialTransactionId: persistence.financialTransactionId || undefined,
      payableId: persistence.payableId || undefined,
      receivableId: persistence.receivableId || undefined,
      tripId: persistence.tripId || undefined,
      expenseReportId: persistence.expenseReportId || undefined,
      emitidoPor: persistence.emitidoPor,
      emitidoEm: persistence.emitidoEm,
      status: persistence.status as ReceiptStatus,
      canceladoEm: persistence.canceladoEm || undefined,
      canceladoPor: persistence.canceladoPor || undefined,
      motivoCancelamento: persistence.motivoCancelamento || undefined,
      createdAt: persistence.createdAt,
      createdBy: persistence.createdBy,
      updatedAt: persistence.updatedAt,
      updatedBy: persistence.updatedBy,
    };

    return Receipt.reconstitute(props);
  }
}

