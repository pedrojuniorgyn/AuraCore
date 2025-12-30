import { Result, Money, BaseDomainEvent } from '@/shared/domain';
import {
  DocumentStatus,
  canTransitionTo,
} from '../../value-objects/DocumentType';
import { TaxRegime } from '../../tax/value-objects/TaxRegime';
import { IBSCBSGroup } from '../../tax/value-objects/IBSCBSGroup';
import {
  DocumentAlreadyAuthorizedError,
  DocumentAlreadyCancelledError,
  InvalidStatusTransitionError,
} from '../../errors/FiscalErrors';

/**
 * Endereco para NFS-e
 */
export interface NFSeAddress {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string; // Código IBGE 7 dígitos
  uf: string; // 2 letras
  cep: string; // 8 dígitos
}

/**
 * Prestador do serviço
 */
export interface NFSeProvider {
  cnpj: string; // 14 dígitos
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoMunicipal: string;
  endereco: NFSeAddress;
  telefone?: string;
  email?: string;
}

/**
 * Tomador do serviço
 */
export interface NFSeTaker {
  cpfCnpj: string; // 11 ou 14 dígitos
  razaoSocial: string;
  endereco?: NFSeAddress;
  telefone?: string;
  email?: string;
}

/**
 * Informações do serviço prestado
 */
export interface NFSeService {
  codigoServico: string; // LC 116/2003
  codigoCnae: string; // 7 dígitos
  codigoTributacaoMunicipio?: string;
  discriminacao: string; // Descrição detalhada
  valorServicos: Money;
  valorDeducoes?: Money;
  valorPis?: Money;
  valorCofins?: Money;
  valorInss?: Money;
  valorIr?: Money;
  valorCsll?: Money;
  outrasRetencoes?: Money;
  descontoCondicionado?: Money;
  descontoIncondicionado?: Money;
}

/**
 * Informações de ISS
 */
export interface NFSeIss {
  issRetido: boolean; // ISS retido pelo tomador?
  valorIss: Money;
  aliquota: number; // Percentual (ex: 5.0 para 5%)
  baseCalculo: Money;
  valorIssRetido?: Money;
  codigoMunicipioIncidencia?: string; // Onde o ISS é devido
}

/**
 * Props do Documento NFS-e
 */
export interface NFSeDocumentProps {
  id: string;
  organizationId: number;
  branchId: number;
  status: DocumentStatus;
  
  // Identificação
  numero: string;
  serie?: string;
  dataEmissao: Date;
  competencia: Date; // Data de competência do serviço
  
  // Participantes
  prestador: NFSeProvider;
  tomador: NFSeTaker;
  intermediario?: NFSeTaker; // Intermediário da operação
  
  // Serviço
  servico: NFSeService;
  iss: NFSeIss;
  
  // Valores totais
  valorLiquido: Money; // Valor líquido após deduções
  
  // Reforma Tributária (Week 3)
  taxRegime: TaxRegime;
  ibsCbsGroup?: IBSCBSGroup;
  
  // Observações
  observacoes?: string;
  
  // Controle (após autorização)
  numeroNfse?: string; // Número da NFS-e autorizada
  codigoVerificacao?: string; // Código para consulta
  protocoloEnvio?: string;
  protocoloCancelamento?: string;
  motivoCancelamento?: string;
  
  // Timestamps
  authorizedAt?: Date;
  cancelledAt?: Date;
  
  version: number;
}

/**
 * Domain Events
 */
export class NFSeSubmittedEvent extends BaseDomainEvent {
  constructor(
    public readonly nfseId: string,
    public readonly numero: string,
    public readonly prestadorCnpj: string,
  ) {
    super(nfseId, 'NFSeDocument', 'NFSeSubmitted', { numero, prestadorCnpj });
  }
}

export class NFSeAuthorizedEvent extends BaseDomainEvent {
  constructor(
    public readonly nfseId: string,
    public readonly numeroNfse: string,
    public readonly codigoVerificacao: string,
  ) {
    super(nfseId, 'NFSeDocument', 'NFSeAuthorized', { numeroNfse, codigoVerificacao });
  }
}

export class NFSeCancelledEvent extends BaseDomainEvent {
  constructor(
    public readonly nfseId: string,
    public readonly numeroNfse: string,
    public readonly motivo: string,
  ) {
    super(nfseId, 'NFSeDocument', 'NFSeCancelled', { numeroNfse, motivo });
  }
}

/**
 * Aggregate Root: Documento NFS-e
 * 
 * Representa uma Nota Fiscal de Serviços Eletrônica conforme padrão ABRASF 2.04
 * 
 * Ciclo de vida:
 * 1. DRAFT → Criado, aguardando preenchimento
 * 2. PENDING → Submetido para transmissão
 * 3. AUTHORIZED → Autorizado pela prefeitura
 * 4. CANCELLED → Cancelado
 * 
 * Base Legal:
 * - LC 116/2003 (Lista de serviços)
 * - ABRASF 2.04 (Padrão técnico)
 * - Legislação municipal específica
 */
export class NFSeDocument {
  private _props: NFSeDocumentProps;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private readonly _domainEvents: BaseDomainEvent[] = [];

  private constructor(props: NFSeDocumentProps, createdAt: Date, updatedAt: Date) {
    this._props = props;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  // Getters obrigatórios
  get id(): string { return this._props.id; }
  get organizationId(): number { return this._props.organizationId; }
  get branchId(): number { return this._props.branchId; }
  get status(): DocumentStatus { return this._props.status; }
  get numero(): string { return this._props.numero; }
  get serie(): string | undefined { return this._props.serie; }
  get dataEmissao(): Date { return this._props.dataEmissao; }
  get competencia(): Date { return this._props.competencia; }
  get prestador(): NFSeProvider { return this._props.prestador; }
  get tomador(): NFSeTaker { return this._props.tomador; }
  get intermediario(): NFSeTaker | undefined { return this._props.intermediario; }
  get servico(): NFSeService { return this._props.servico; }
  get iss(): NFSeIss { return this._props.iss; }
  get valorLiquido(): Money { return this._props.valorLiquido; }
  get taxRegime(): TaxRegime { return this._props.taxRegime; }
  get ibsCbsGroup(): IBSCBSGroup | undefined { return this._props.ibsCbsGroup; }
  get observacoes(): string | undefined { return this._props.observacoes; }
  get numeroNfse(): string | undefined { return this._props.numeroNfse; }
  get codigoVerificacao(): string | undefined { return this._props.codigoVerificacao; }
  get protocoloEnvio(): string | undefined { return this._props.protocoloEnvio; }
  get protocoloCancelamento(): string | undefined { return this._props.protocoloCancelamento; }
  get motivoCancelamento(): string | undefined { return this._props.motivoCancelamento; }
  get authorizedAt(): Date | undefined { return this._props.authorizedAt; }
  get cancelledAt(): Date | undefined { return this._props.cancelledAt; }
  get version(): number { return this._props.version; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get domainEvents(): readonly BaseDomainEvent[] { return [...this._domainEvents]; }

  // Status checks
  get isDraft(): boolean { return this._props.status === 'DRAFT'; }
  get isPending(): boolean { return this._props.status === 'PENDING'; }
  get isAuthorized(): boolean { return this._props.status === 'AUTHORIZED'; }
  get isCancelled(): boolean { return this._props.status === 'CANCELLED'; }

  /**
   * Submete o documento para transmissão
   */
  submit(): Result<void, Error> {
    // Validar transição de estado (NFS-e específico)
    if (!canTransitionTo(this._props.status, 'PENDING', 'NFSE')) {
      return Result.fail(
        new InvalidStatusTransitionError(this._props.status, 'PENDING')
      );
    }

    if (this.isAuthorized) {
      return Result.fail(new DocumentAlreadyAuthorizedError(this.id));
    }

    if (this.isCancelled) {
      return Result.fail(new DocumentAlreadyCancelledError(this.id));
    }

    // Validar valor líquido > 0
    if (this._props.valorLiquido.amount <= 0) {
      return Result.fail(new Error('Valor líquido deve ser maior que zero'));
    }

    // Atualizar estado
    this._props = {
      ...this._props,
      status: 'PENDING',
      version: this._props.version + 1,
    };
    this._updatedAt = new Date();

    // Emitir evento
    this._domainEvents.push(
      new NFSeSubmittedEvent(
        this.id,
        this.numero,
        this.prestador.cnpj
      )
    );

    return Result.ok(undefined);
  }

  /**
   * Autoriza o documento após resposta da prefeitura
   */
  authorize(
    numeroNfse: string,
    codigoVerificacao: string,
    protocoloEnvio: string
  ): Result<void, Error> {
    // Validar transição de estado (NFS-e pode ir direto de PENDING para AUTHORIZED)
    if (!canTransitionTo(this._props.status, 'AUTHORIZED', 'NFSE')) {
      return Result.fail(
        new InvalidStatusTransitionError(this._props.status, 'AUTHORIZED')
      );
    }

    if (this.isAuthorized) {
      return Result.fail(new DocumentAlreadyAuthorizedError(this.id));
    }

    if (this.isCancelled) {
      return Result.fail(new DocumentAlreadyCancelledError(this.id));
    }

    // Validar parâmetros
    if (!numeroNfse || numeroNfse.trim() === '') {
      return Result.fail(new Error('Número da NFS-e é obrigatório'));
    }

    if (!codigoVerificacao || codigoVerificacao.trim() === '') {
      return Result.fail(new Error('Código de verificação é obrigatório'));
    }

    // Atualizar estado
    const now = new Date();
    this._props = {
      ...this._props,
      status: 'AUTHORIZED',
      numeroNfse,
      codigoVerificacao,
      protocoloEnvio,
      authorizedAt: now,
      version: this._props.version + 1,
    };
    this._updatedAt = now;

    // Emitir evento
    this._domainEvents.push(
      new NFSeAuthorizedEvent(
        this.id,
        numeroNfse,
        codigoVerificacao
      )
    );

    return Result.ok(undefined);
  }

  /**
   * Cancela o documento
   */
  cancel(motivo: string): Result<void, Error> {
    // Validar transição de estado (NFS-e específico)
    if (!canTransitionTo(this._props.status, 'CANCELLED', 'NFSE')) {
      return Result.fail(
        new InvalidStatusTransitionError(this._props.status, 'CANCELLED')
      );
    }

    if (this.isCancelled) {
      return Result.fail(new DocumentAlreadyCancelledError(this.id));
    }

    // Validar motivo (sem espaços extras)
    if (!motivo || motivo.trim() === '') {
      return Result.fail(new Error('Motivo do cancelamento é obrigatório'));
    }

    // Validar comprimento do texto ÚTIL (sem espaços)
    if (motivo.trim().length < 15) {
      return Result.fail(new Error('Motivo deve ter no mínimo 15 caracteres'));
    }

    // Atualizar estado
    const now = new Date();
    this._props = {
      ...this._props,
      status: 'CANCELLED',
      motivoCancelamento: motivo,
      cancelledAt: now,
      version: this._props.version + 1,
    };
    this._updatedAt = now;

    // Emitir evento
    this._domainEvents.push(
      new NFSeCancelledEvent(
        this.id,
        this._props.numeroNfse || this._props.numero,
        motivo
      )
    );

    return Result.ok(undefined);
  }

  /**
   * Limpa eventos de domínio após processamento
   */
  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  /**
   * Factory: Cria novo documento NFS-e (DRAFT)
   */
  static create(props: {
    id: string;
    organizationId: number;
    branchId: number;
    numero: string;
    serie?: string;
    dataEmissao: Date;
    competencia: Date;
    prestador: NFSeProvider;
    tomador: NFSeTaker;
    intermediario?: NFSeTaker;
    servico: NFSeService;
    iss: NFSeIss;
    valorLiquido: Money;
    taxRegime?: TaxRegime;
    ibsCbsGroup?: IBSCBSGroup;
    observacoes?: string;
  }): Result<NFSeDocument, string> {
    // Validações
    if (!props.id || props.id.trim() === '') {
      return Result.fail('ID é obrigatório');
    }

    if (!props.numero || props.numero.trim() === '') {
      return Result.fail('Número é obrigatório');
    }

    if (!props.prestador || !props.prestador.cnpj) {
      return Result.fail('Prestador é obrigatório');
    }

    if (!props.tomador || !props.tomador.cpfCnpj) {
      return Result.fail('Tomador é obrigatório');
    }

    if (!props.servico || !props.servico.discriminacao) {
      return Result.fail('Serviço é obrigatório');
    }

    if (props.valorLiquido.amount <= 0) {
      return Result.fail('Valor líquido deve ser maior que zero');
    }

    // Determinar regime tributário baseado na data de emissão
    let taxRegime = props.taxRegime;
    if (!taxRegime) {
      const regimeResult = TaxRegime.fromDate(props.dataEmissao);
      if (Result.isFail(regimeResult)) {
        return Result.fail(`Failed to determine tax regime: ${regimeResult.error}`);
      }
      taxRegime = regimeResult.value;
    }

    const now = new Date();

    return Result.ok(
      new NFSeDocument(
        {
          id: props.id,
          organizationId: props.organizationId,
          branchId: props.branchId,
          status: 'DRAFT',
          numero: props.numero,
          serie: props.serie,
          dataEmissao: props.dataEmissao,
          competencia: props.competencia,
          prestador: props.prestador,
          tomador: props.tomador,
          intermediario: props.intermediario,
          servico: props.servico,
          iss: props.iss,
          valorLiquido: props.valorLiquido,
          taxRegime,
          ibsCbsGroup: props.ibsCbsGroup,
          observacoes: props.observacoes,
          version: 1,
        },
        now,
        now
      )
    );
  }

  /**
   * Factory: Reconstitui documento existente do banco de dados
   */
  static reconstitute(props: NFSeDocumentProps, createdAt: Date, updatedAt: Date): NFSeDocument {
    return new NFSeDocument(props, createdAt, updatedAt);
  }
}

