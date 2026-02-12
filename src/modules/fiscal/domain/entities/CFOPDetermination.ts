/**
 * 📋 CFOPDetermination - Entity DDD
 * 
 * Mapeia operação fiscal → CFOP correto.
 * Cada registro define: operationType + direction + scope → cfop
 * 
 * F3.3: CFOP Determination
 * 
 * @see ENTITY-001 a ENTITY-012
 */
import { Result, Entity } from '@/shared/domain';

export interface CFOPDeterminationProps {
  organizationId: number;
  /** Tipo de operação: VENDA, COMPRA, DEVOLUCAO, TRANSFERENCIA, FRETE, etc */
  operationType: string;
  /** Direção: ENTRY (entrada) ou EXIT (saída) */
  direction: 'ENTRY' | 'EXIT';
  /** Escopo geográfico: INTRASTATE (estadual), INTERSTATE (interestadual), FOREIGN (exterior) */
  scope: 'INTRASTATE' | 'INTERSTATE' | 'FOREIGN';
  /** Regime tributário: NORMAL, SIMPLES, ST (Substituição Tributária) */
  taxRegime?: string;
  /** Tipo de documento: NFE, CTE, MDFE, NFSE */
  documentType?: string;
  /** CFOP determinado */
  cfopCode: string;
  /** Descrição do CFOP */
  cfopDescription: string;
  /** Se é regra padrão (default) ou customizada por organização */
  isDefault: boolean;
  /** Prioridade (menor = maior prioridade, para resolver conflitos) */
  priority: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CFOPDetermination extends Entity<string> {
  private constructor(id: string, private readonly props: CFOPDeterminationProps) {
    super(id);
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get operationType(): string { return this.props.operationType; }
  get direction(): string { return this.props.direction; }
  get scope(): string { return this.props.scope; }
  get taxRegime(): string | undefined { return this.props.taxRegime; }
  get documentType(): string | undefined { return this.props.documentType; }
  get cfopCode(): string { return this.props.cfopCode; }
  get cfopDescription(): string { return this.props.cfopDescription; }
  get isDefault(): boolean { return this.props.isDefault; }
  get priority(): number { return this.props.priority; }
  get status(): string { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // Factory: create() COM validações (ENTITY-002)
  static create(props: Omit<CFOPDeterminationProps, 'createdAt' | 'updatedAt' | 'status'>): Result<CFOPDetermination, string> {
    if (!props.operationType?.trim()) return Result.fail('Tipo de operação obrigatório');
    if (!props.cfopCode?.trim()) return Result.fail('Código CFOP obrigatório');

    // Validar CFOP (4 dígitos, primeiro 1-7)
    const cleanCfop = props.cfopCode.replace(/\D/g, '');
    if (cleanCfop.length !== 4) {
      return Result.fail('CFOP deve ter 4 dígitos');
    }
    const firstDigit = parseInt(cleanCfop[0], 10);
    if (![1, 2, 3, 5, 6, 7].includes(firstDigit)) {
      return Result.fail('Primeiro dígito do CFOP deve ser 1, 2, 3, 5, 6 ou 7');
    }

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    return Result.ok(new CFOPDetermination(id, {
      ...props,
      cfopCode: cleanCfop,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    }));
  }

  // Factory: reconstitute() SEM validações (ENTITY-003)
  static reconstitute(props: CFOPDeterminationProps & { id: string }): Result<CFOPDetermination, string> {
    return Result.ok(new CFOPDetermination(props.id, props));
  }
}
