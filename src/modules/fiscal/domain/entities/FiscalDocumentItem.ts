import { Entity, Result, Money } from '@/shared/domain';
import { CFOP } from '../value-objects/CFOP';
import { IBSCBSGroup } from '../tax/value-objects/IBSCBSGroup';
import { InvalidItemValueError, InvalidNCMError } from '../errors/FiscalErrors';

/**
 * Props do item de documento fiscal
 */
export interface FiscalDocumentItemProps {
  id: string;
  documentId: string;
  itemNumber: number;
  productId?: string;
  productCode: string;
  description: string;
  ncm: string;
  cfop: CFOP;
  unit: string;
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
  discount?: Money;
  // Impostos calculados (simplificado para Semana 1)
  icmsBase?: Money;
  icmsValue?: Money;
  icmsRate?: number;
  ipiBase?: Money;
  ipiValue?: Money;
  ipiRate?: number;
  pisValue?: Money;
  cofinsValue?: Money;
  // Reforma Tributária (Week 3)
  ibsCbsGroup?: IBSCBSGroup;
}

/**
 * Entity: Item de Documento Fiscal
 * 
 * Extends Entity<string> per ARCH-007 / ENTITY-001
 */
export class FiscalDocumentItem extends Entity<string> {
  private readonly _props: FiscalDocumentItemProps;

  private constructor(props: FiscalDocumentItemProps, createdAt: Date) {
    super(props.id, createdAt);
    this._props = props;
  }

  // Getters
  // Note: id, createdAt inherited from Entity
  get documentId(): string { return this._props.documentId; }
  get itemNumber(): number { return this._props.itemNumber; }
  get productId(): string | undefined { return this._props.productId; }
  get productCode(): string { return this._props.productCode; }
  get description(): string { return this._props.description; }
  get ncm(): string { return this._props.ncm; }
  get cfop(): CFOP { return this._props.cfop; }
  get unit(): string { return this._props.unit; }
  get quantity(): number { return this._props.quantity; }
  get unitPrice(): Money { return this._props.unitPrice; }
  get totalPrice(): Money { return this._props.totalPrice; }
  get discount(): Money | undefined { return this._props.discount; }
  get icmsBase(): Money | undefined { return this._props.icmsBase; }
  get icmsValue(): Money | undefined { return this._props.icmsValue; }
  get icmsRate(): number | undefined { return this._props.icmsRate; }
  get ipiBase(): Money | undefined { return this._props.ipiBase; }
  get ipiValue(): Money | undefined { return this._props.ipiValue; }
  get ipiRate(): number | undefined { return this._props.ipiRate; }
  get pisValue(): Money | undefined { return this._props.pisValue; }
  get cofinsValue(): Money | undefined { return this._props.cofinsValue; }
  get ibsCbsGroup(): IBSCBSGroup | undefined { return this._props.ibsCbsGroup; }
  // createdAt inherited from Entity

  /**
   * Valor líquido (total - desconto)
   */
  get netValue(): Money {
    if (!this._props.discount) {
      return this._props.totalPrice;
    }
    const netAmount = this._props.totalPrice.amount - this._props.discount.amount;
    const result = Money.create(Math.max(0, netAmount), this._props.totalPrice.currency);
    if (Result.isOk(result)) {
      return result.value;
    }
    return this._props.totalPrice;
  }

  /**
   * Total de impostos do item (sistema atual + novo)
   * 
   * ⚠️ S1.3-FIX: Convertido de getter para método pois ibsCbsGroup.getTotalTax() retorna Result
   */
  getTotalTaxes(): Result<number, string> {
    let total = (this._props.icmsValue?.amount ?? 0) +
                (this._props.ipiValue?.amount ?? 0) +
                (this._props.pisValue?.amount ?? 0) +
                (this._props.cofinsValue?.amount ?? 0);
    
    // Adicionar impostos do novo sistema se existirem
    if (this._props.ibsCbsGroup) {
      const totalTaxResult = this._props.ibsCbsGroup.getTotalTax();
      if (Result.isFail(totalTaxResult)) {
        return Result.fail(`Failed to get IBS/CBS total tax: ${totalTaxResult.error}`);
      }
      total += totalTaxResult.value.amount;
    }
    
    return Result.ok(total);
  }

  /**
   * Valida NCM (8 dígitos)
   */
  private static validateNCM(ncm: string): Result<string, string> {
    const cleanNCM = ncm.replace(/\D/g, '');
    if (cleanNCM.length !== 8) {
      return Result.fail(new InvalidNCMError(ncm).message);
    }
    return Result.ok(cleanNCM);
  }

  /**
   * Factory method
   */
  static create(props: {
    id: string;
    documentId: string;
    itemNumber: number;
    productId?: string;
    productCode: string;
    description: string;
    ncm: string;
    cfop: CFOP;
    unit: string;
    quantity: number;
    unitPrice: Money;
    discount?: Money;
    icmsBase?: Money;
    icmsValue?: Money;
    icmsRate?: number;
    ipiBase?: Money;
    ipiValue?: Money;
    ipiRate?: number;
    pisValue?: Money;
    cofinsValue?: Money;
    ibsCbsGroup?: IBSCBSGroup;
  }): Result<FiscalDocumentItem, string> {
    // Validações
    if (!props.id || props.id.trim() === '') {
      return Result.fail('Item ID is required');
    }

    if (!props.documentId || props.documentId.trim() === '') {
      return Result.fail('Document ID is required');
    }

    if (props.itemNumber <= 0) {
      return Result.fail(
        new InvalidItemValueError(props.itemNumber, 'Item number must be positive').message
      );
    }

    if (!props.productCode || props.productCode.trim() === '') {
      return Result.fail('Product code is required');
    }

    if (!props.description || props.description.trim() === '') {
      return Result.fail('Description is required');
    }

    // Validar NCM
    const ncmResult = FiscalDocumentItem.validateNCM(props.ncm);
    if (Result.isFail(ncmResult)) {
      return Result.fail(ncmResult.error);
    }

    if (props.quantity <= 0) {
      return Result.fail(
        new InvalidItemValueError(props.itemNumber, 'Quantity must be positive').message
      );
    }

    if (props.unitPrice.amount < 0) {
      return Result.fail(
        new InvalidItemValueError(props.itemNumber, 'Unit price cannot be negative').message
      );
    }

    // Calcular total
    const totalAmount = props.quantity * props.unitPrice.amount;
    const totalPriceResult = Money.create(totalAmount, props.unitPrice.currency);
    if (Result.isFail(totalPriceResult)) {
      return Result.fail(`Invalid total price: ${totalPriceResult.error}`);
    }

    return Result.ok(new FiscalDocumentItem(
      {
        id: props.id,
        documentId: props.documentId,
        itemNumber: props.itemNumber,
        productId: props.productId,
        productCode: props.productCode,
        description: props.description,
        ncm: ncmResult.value,
        cfop: props.cfop,
        unit: props.unit,
        quantity: props.quantity,
        unitPrice: props.unitPrice,
        totalPrice: totalPriceResult.value,
        discount: props.discount,
        icmsBase: props.icmsBase,
        icmsValue: props.icmsValue,
        icmsRate: props.icmsRate,
        ipiBase: props.ipiBase,
        ipiValue: props.ipiValue,
        ipiRate: props.ipiRate,
        pisValue: props.pisValue,
        cofinsValue: props.cofinsValue,
        ibsCbsGroup: props.ibsCbsGroup,
      },
      new Date()
    ));
  }

  /**
   * Reconstitui do banco
   */
  static reconstitute(
    props: FiscalDocumentItemProps,
    createdAt: Date
  ): FiscalDocumentItem {
    return new FiscalDocumentItem(props, createdAt);
  }
}

