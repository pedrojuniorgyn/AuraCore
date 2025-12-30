import { Result, Money } from '@/shared/domain';
import { 
  NFSeDocument, 
  NFSeDocumentProps,
  NFSeProvider,
  NFSeTaker,
  NFSeAddress,
  NFSeService,
  NFSeIss
} from '../../../domain/nfse/entities/NFSeDocument';
import { DocumentStatus } from '../../../domain/value-objects/DocumentType';
import { TaxRegime, TaxRegimeType } from '../../../domain/tax/value-objects/TaxRegime';

/**
 * Persistence model types (from Drizzle)
 */
export interface NFSePersistence {
  id: string;
  organizationId: number;
  branchId: number;
  status: string;
  numero: string;
  serie: string | null;
  dataEmissao: Date;
  competencia: Date;
  // Prestador
  prestadorCnpj: string;
  prestadorRazaoSocial: string;
  prestadorNomeFantasia: string | null;
  prestadorInscricaoMunicipal: string;
  prestadorLogradouro: string;
  prestadorNumero: string;
  prestadorComplemento: string | null;
  prestadorBairro: string;
  prestadorCodigoMunicipio: string;
  prestadorUf: string;
  prestadorCep: string;
  prestadorTelefone: string | null;
  prestadorEmail: string | null;
  // Tomador
  tomadorCpfCnpj: string;
  tomadorRazaoSocial: string;
  tomadorLogradouro: string | null;
  tomadorNumero: string | null;
  tomadorComplemento: string | null;
  tomadorBairro: string | null;
  tomadorCodigoMunicipio: string | null;
  tomadorUf: string | null;
  tomadorCep: string | null;
  tomadorTelefone: string | null;
  tomadorEmail: string | null;
  // Intermediário
  intermediarioCpfCnpj: string | null;
  intermediarioRazaoSocial: string | null;
  // Serviço
  servicoCodigoServico: string;
  servicoCodigoCnae: string;
  servicoCodigoTributacaoMunicipio: string | null;
  servicoDiscriminacao: string;
  servicoValorServicos: string;
  servicoValorServicosCurrency: string;
  servicoValorDeducoes: string | null;
  servicoValorDeducoesCurrency: string | null;
  servicoValorPis: string | null;
  servicoValorPisCurrency: string | null;
  servicoValorCofins: string | null;
  servicoValorCofinsCurrency: string | null;
  servicoValorInss: string | null;
  servicoValorInssCurrency: string | null;
  servicoValorIr: string | null;
  servicoValorIrCurrency: string | null;
  servicoValorCsll: string | null;
  servicoValorCsllCurrency: string | null;
  servicoOutrasRetencoes: string | null;
  servicoOutrasRetencoesCurrency: string | null;
  servicoDescontoCondicionado: string | null;
  servicoDescontoCondicionadoCurrency: string | null;
  servicoDescontoIncondicionado: string | null;
  servicoDescontoIncondicionadoCurrency: string | null;
  // ISS
  issRetido: number;
  issValorIss: string;
  issValorIssCurrency: string;
  issAliquota: string;
  issBaseCalculo: string;
  issBaseCalculoCurrency: string;
  issValorIssRetido: string | null;
  issValorIssRetidoCurrency: string | null;
  issCodigoMunicipioIncidencia: string | null;
  // Valores
  valorLiquido: string;
  valorLiquidoCurrency: string;
  taxRegime: string;
  observacoes: string | null;
  // Controle
  numeroNfse: string | null;
  codigoVerificacao: string | null;
  protocoloEnvio: string | null;
  protocoloCancelamento: string | null;
  motivoCancelamento: string | null;
  authorizedAt: Date | null;
  cancelledAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Mapper: NFSeDocument <-> Persistence
 * 
 * REGRAS OBRIGATORIAS (infrastructure-layer.json):
 * 1. toPersistence mapeia TODOS os campos
 * 2. toDomain usa reconstitute(), NAO create()
 * 3. Money.create(amount, currency) - SEMPRE 2 parametros
 * 4. Verificar Result.isFail() antes de acessar .value
 */
export class NFSeMapper {
  /**
   * Domain → Persistence
   */
  static toPersistence(nfse: NFSeDocument): NFSePersistence {
    return {
      id: nfse.id,
      organizationId: nfse.organizationId,
      branchId: nfse.branchId,
      status: nfse.status,
      numero: nfse.numero,
      serie: nfse.serie ?? null,
      dataEmissao: nfse.dataEmissao,
      competencia: nfse.competencia,
      // Prestador
      prestadorCnpj: nfse.prestador.cnpj,
      prestadorRazaoSocial: nfse.prestador.razaoSocial,
      prestadorNomeFantasia: nfse.prestador.nomeFantasia ?? null,
      prestadorInscricaoMunicipal: nfse.prestador.inscricaoMunicipal,
      prestadorLogradouro: nfse.prestador.endereco.logradouro,
      prestadorNumero: nfse.prestador.endereco.numero,
      prestadorComplemento: nfse.prestador.endereco.complemento ?? null,
      prestadorBairro: nfse.prestador.endereco.bairro,
      prestadorCodigoMunicipio: nfse.prestador.endereco.codigoMunicipio,
      prestadorUf: nfse.prestador.endereco.uf,
      prestadorCep: nfse.prestador.endereco.cep,
      prestadorTelefone: nfse.prestador.telefone ?? null,
      prestadorEmail: nfse.prestador.email ?? null,
      // Tomador
      tomadorCpfCnpj: nfse.tomador.cpfCnpj,
      tomadorRazaoSocial: nfse.tomador.razaoSocial,
      tomadorLogradouro: nfse.tomador.endereco?.logradouro ?? null,
      tomadorNumero: nfse.tomador.endereco?.numero ?? null,
      tomadorComplemento: nfse.tomador.endereco?.complemento ?? null,
      tomadorBairro: nfse.tomador.endereco?.bairro ?? null,
      tomadorCodigoMunicipio: nfse.tomador.endereco?.codigoMunicipio ?? null,
      tomadorUf: nfse.tomador.endereco?.uf ?? null,
      tomadorCep: nfse.tomador.endereco?.cep ?? null,
      tomadorTelefone: nfse.tomador.telefone ?? null,
      tomadorEmail: nfse.tomador.email ?? null,
      // Intermediário
      intermediarioCpfCnpj: nfse.intermediario?.cpfCnpj ?? null,
      intermediarioRazaoSocial: nfse.intermediario?.razaoSocial ?? null,
      // Serviço
      servicoCodigoServico: nfse.servico.codigoServico,
      servicoCodigoCnae: nfse.servico.codigoCnae,
      servicoCodigoTributacaoMunicipio: nfse.servico.codigoTributacaoMunicipio ?? null,
      servicoDiscriminacao: nfse.servico.discriminacao,
      servicoValorServicos: String(nfse.servico.valorServicos.amount),
      servicoValorServicosCurrency: nfse.servico.valorServicos.currency,
      servicoValorDeducoes: nfse.servico.valorDeducoes ? String(nfse.servico.valorDeducoes.amount) : null,
      servicoValorDeducoesCurrency: nfse.servico.valorDeducoes?.currency ?? null,
      servicoValorPis: nfse.servico.valorPis ? String(nfse.servico.valorPis.amount) : null,
      servicoValorPisCurrency: nfse.servico.valorPis?.currency ?? null,
      servicoValorCofins: nfse.servico.valorCofins ? String(nfse.servico.valorCofins.amount) : null,
      servicoValorCofinsCurrency: nfse.servico.valorCofins?.currency ?? null,
      servicoValorInss: nfse.servico.valorInss ? String(nfse.servico.valorInss.amount) : null,
      servicoValorInssCurrency: nfse.servico.valorInss?.currency ?? null,
      servicoValorIr: nfse.servico.valorIr ? String(nfse.servico.valorIr.amount) : null,
      servicoValorIrCurrency: nfse.servico.valorIr?.currency ?? null,
      servicoValorCsll: nfse.servico.valorCsll ? String(nfse.servico.valorCsll.amount) : null,
      servicoValorCsllCurrency: nfse.servico.valorCsll?.currency ?? null,
      servicoOutrasRetencoes: nfse.servico.outrasRetencoes ? String(nfse.servico.outrasRetencoes.amount) : null,
      servicoOutrasRetencoesCurrency: nfse.servico.outrasRetencoes?.currency ?? null,
      servicoDescontoCondicionado: nfse.servico.descontoCondicionado ? String(nfse.servico.descontoCondicionado.amount) : null,
      servicoDescontoCondicionadoCurrency: nfse.servico.descontoCondicionado?.currency ?? null,
      servicoDescontoIncondicionado: nfse.servico.descontoIncondicionado ? String(nfse.servico.descontoIncondicionado.amount) : null,
      servicoDescontoIncondicionadoCurrency: nfse.servico.descontoIncondicionado?.currency ?? null,
      // ISS
      issRetido: nfse.iss.issRetido ? 1 : 0,
      issValorIss: String(nfse.iss.valorIss.amount),
      issValorIssCurrency: nfse.iss.valorIss.currency,
      issAliquota: String(nfse.iss.aliquota),
      issBaseCalculo: String(nfse.iss.baseCalculo.amount),
      issBaseCalculoCurrency: nfse.iss.baseCalculo.currency,
      issValorIssRetido: nfse.iss.valorIssRetido ? String(nfse.iss.valorIssRetido.amount) : null,
      issValorIssRetidoCurrency: nfse.iss.valorIssRetido?.currency ?? null,
      issCodigoMunicipioIncidencia: nfse.iss.codigoMunicipioIncidencia ?? null,
      // Valores
      valorLiquido: String(nfse.valorLiquido.amount),
      valorLiquidoCurrency: nfse.valorLiquido.currency,
      taxRegime: nfse.taxRegime.toString(),
      observacoes: nfse.observacoes ?? null,
      // TODO: ibsCbsGroup - Deve ser persistido separadamente via FiscalDocumentIbsCbsMapper
      // Se necessário, criar método toPersistenceWithIbsCbs() que retorna array com ambos
      // Por enquanto, NFSeDocument não usa ibsCbsGroup (apenas FiscalDocument usa)
      // Controle
      numeroNfse: nfse.numeroNfse ?? null,
      codigoVerificacao: nfse.codigoVerificacao ?? null,
      protocoloEnvio: nfse.protocoloEnvio ?? null,
      protocoloCancelamento: nfse.protocoloCancelamento ?? null,
      motivoCancelamento: nfse.motivoCancelamento ?? null,
      authorizedAt: nfse.authorizedAt ?? null,
      cancelledAt: nfse.cancelledAt ?? null,
      version: nfse.version,
      createdAt: nfse.createdAt,
      updatedAt: nfse.updatedAt,
      deletedAt: null,
    };
  }

  /**
   * Persistence → Domain
   * REGRA: Usar reconstitute(), NAO create()
   */
  static toDomain(persistence: NFSePersistence): Result<NFSeDocument, string> {
    // Parse Money fields
    const valorServicosResult = Money.create(
      parseFloat(persistence.servicoValorServicos),
      persistence.servicoValorServicosCurrency
    );
    if (Result.isFail(valorServicosResult)) {
      return Result.fail(`Invalid valorServicos: ${valorServicosResult.error}`);
    }

    const valorIssResult = Money.create(
      parseFloat(persistence.issValorIss),
      persistence.issValorIssCurrency
    );
    if (Result.isFail(valorIssResult)) {
      return Result.fail(`Invalid valorIss: ${valorIssResult.error}`);
    }

    const baseCalculoResult = Money.create(
      parseFloat(persistence.issBaseCalculo),
      persistence.issBaseCalculoCurrency
    );
    if (Result.isFail(baseCalculoResult)) {
      return Result.fail(`Invalid baseCalculo: ${baseCalculoResult.error}`);
    }

    const valorLiquidoResult = Money.create(
      parseFloat(persistence.valorLiquido),
      persistence.valorLiquidoCurrency
    );
    if (Result.isFail(valorLiquidoResult)) {
      return Result.fail(`Invalid valorLiquido: ${valorLiquidoResult.error}`);
    }

    // Parse optional Money fields
    let valorDeducoes: Money | undefined;
    if (persistence.servicoValorDeducoes && persistence.servicoValorDeducoesCurrency) {
      const result = Money.create(parseFloat(persistence.servicoValorDeducoes), persistence.servicoValorDeducoesCurrency);
      if (Result.isFail(result)) {
        return Result.fail(`Invalid valorDeducoes: ${result.error}`);
      }
      valorDeducoes = result.value;
    }

    let valorPis: Money | undefined;
    if (persistence.servicoValorPis && persistence.servicoValorPisCurrency) {
      const result = Money.create(parseFloat(persistence.servicoValorPis), persistence.servicoValorPisCurrency);
      if (Result.isFail(result)) {
        return Result.fail(`Invalid valorPis: ${result.error}`);
      }
      valorPis = result.value;
    }

    let valorCofins: Money | undefined;
    if (persistence.servicoValorCofins && persistence.servicoValorCofinsCurrency) {
      const result = Money.create(parseFloat(persistence.servicoValorCofins), persistence.servicoValorCofinsCurrency);
      if (Result.isFail(result)) {
        return Result.fail(`Invalid valorCofins: ${result.error}`);
      }
      valorCofins = result.value;
    }

    let valorInss: Money | undefined;
    if (persistence.servicoValorInss && persistence.servicoValorInssCurrency) {
      const result = Money.create(parseFloat(persistence.servicoValorInss), persistence.servicoValorInssCurrency);
      if (Result.isFail(result)) {
        return Result.fail(`Invalid valorInss: ${result.error}`);
      }
      valorInss = result.value;
    }

    let valorIr: Money | undefined;
    if (persistence.servicoValorIr && persistence.servicoValorIrCurrency) {
      const result = Money.create(parseFloat(persistence.servicoValorIr), persistence.servicoValorIrCurrency);
      if (Result.isFail(result)) {
        return Result.fail(`Invalid valorIr: ${result.error}`);
      }
      valorIr = result.value;
    }

    let valorCsll: Money | undefined;
    if (persistence.servicoValorCsll && persistence.servicoValorCsllCurrency) {
      const result = Money.create(parseFloat(persistence.servicoValorCsll), persistence.servicoValorCsllCurrency);
      if (Result.isFail(result)) {
        return Result.fail(`Invalid valorCsll: ${result.error}`);
      }
      valorCsll = result.value;
    }

    let outrasRetencoes: Money | undefined;
    if (persistence.servicoOutrasRetencoes && persistence.servicoOutrasRetencoesCurrency) {
      const result = Money.create(parseFloat(persistence.servicoOutrasRetencoes), persistence.servicoOutrasRetencoesCurrency);
      if (Result.isFail(result)) {
        return Result.fail(`Invalid outrasRetencoes: ${result.error}`);
      }
      outrasRetencoes = result.value;
    }

    let descontoCondicionado: Money | undefined;
    if (persistence.servicoDescontoCondicionado && persistence.servicoDescontoCondicionadoCurrency) {
      const result = Money.create(parseFloat(persistence.servicoDescontoCondicionado), persistence.servicoDescontoCondicionadoCurrency);
      if (Result.isFail(result)) {
        return Result.fail(`Invalid descontoCondicionado: ${result.error}`);
      }
      descontoCondicionado = result.value;
    }

    let descontoIncondicionado: Money | undefined;
    if (persistence.servicoDescontoIncondicionado && persistence.servicoDescontoIncondicionadoCurrency) {
      const result = Money.create(parseFloat(persistence.servicoDescontoIncondicionado), persistence.servicoDescontoIncondicionadoCurrency);
      if (Result.isFail(result)) {
        return Result.fail(`Invalid descontoIncondicionado: ${result.error}`);
      }
      descontoIncondicionado = result.value;
    }

    let valorIssRetido: Money | undefined;
    if (persistence.issValorIssRetido && persistence.issValorIssRetidoCurrency) {
      const result = Money.create(parseFloat(persistence.issValorIssRetido), persistence.issValorIssRetidoCurrency);
      if (Result.isFail(result)) {
        return Result.fail(`Invalid valorIssRetido: ${result.error}`);
      }
      valorIssRetido = result.value;
    }

    // Parse TaxRegime
    const taxRegimeStr = persistence.taxRegime as 'CURRENT' | 'TRANSITION' | 'NEW';
    if (!['CURRENT', 'TRANSITION', 'NEW'].includes(taxRegimeStr)) {
      return Result.fail(`Invalid tax regime: ${persistence.taxRegime}`);
    }
    
    const taxRegimeResult = TaxRegime.create(TaxRegimeType[taxRegimeStr]);
    if (Result.isFail(taxRegimeResult)) {
      return Result.fail(`Failed to create tax regime: ${taxRegimeResult.error}`);
    }

    // Build domain objects
    const prestadorEndereco: NFSeAddress = {
      logradouro: persistence.prestadorLogradouro,
      numero: persistence.prestadorNumero,
      complemento: persistence.prestadorComplemento ?? undefined,
      bairro: persistence.prestadorBairro,
      codigoMunicipio: persistence.prestadorCodigoMunicipio,
      uf: persistence.prestadorUf,
      cep: persistence.prestadorCep,
    };

    const prestador: NFSeProvider = {
      cnpj: persistence.prestadorCnpj,
      razaoSocial: persistence.prestadorRazaoSocial,
      nomeFantasia: persistence.prestadorNomeFantasia ?? undefined,
      inscricaoMunicipal: persistence.prestadorInscricaoMunicipal,
      endereco: prestadorEndereco,
      telefone: persistence.prestadorTelefone ?? undefined,
      email: persistence.prestadorEmail ?? undefined,
    };

    let tomadorEndereco: NFSeAddress | undefined;
    if (persistence.tomadorLogradouro && persistence.tomadorNumero && 
        persistence.tomadorBairro && persistence.tomadorCodigoMunicipio &&
        persistence.tomadorUf && persistence.tomadorCep) {
      tomadorEndereco = {
        logradouro: persistence.tomadorLogradouro,
        numero: persistence.tomadorNumero,
        complemento: persistence.tomadorComplemento ?? undefined,
        bairro: persistence.tomadorBairro,
        codigoMunicipio: persistence.tomadorCodigoMunicipio,
        uf: persistence.tomadorUf,
        cep: persistence.tomadorCep,
      };
    }

    const tomador: NFSeTaker = {
      cpfCnpj: persistence.tomadorCpfCnpj,
      razaoSocial: persistence.tomadorRazaoSocial,
      endereco: tomadorEndereco,
      telefone: persistence.tomadorTelefone ?? undefined,
      email: persistence.tomadorEmail ?? undefined,
    };

    let intermediario: NFSeTaker | undefined;
    if (persistence.intermediarioCpfCnpj && persistence.intermediarioRazaoSocial) {
      intermediario = {
        cpfCnpj: persistence.intermediarioCpfCnpj,
        razaoSocial: persistence.intermediarioRazaoSocial,
      };
    }

    const servico: NFSeService = {
      codigoServico: persistence.servicoCodigoServico,
      codigoCnae: persistence.servicoCodigoCnae,
      codigoTributacaoMunicipio: persistence.servicoCodigoTributacaoMunicipio ?? undefined,
      discriminacao: persistence.servicoDiscriminacao,
      valorServicos: valorServicosResult.value,
      valorDeducoes,
      valorPis,
      valorCofins,
      valorInss,
      valorIr,
      valorCsll,
      outrasRetencoes,
      descontoCondicionado,
      descontoIncondicionado,
    };

    const iss: NFSeIss = {
      issRetido: persistence.issRetido === 1,
      valorIss: valorIssResult.value,
      aliquota: parseFloat(persistence.issAliquota),
      baseCalculo: baseCalculoResult.value,
      valorIssRetido,
      codigoMunicipioIncidencia: persistence.issCodigoMunicipioIncidencia ?? undefined,
    };

    const props: NFSeDocumentProps = {
      id: persistence.id,
      organizationId: persistence.organizationId,
      branchId: persistence.branchId,
      status: persistence.status as DocumentStatus,
      numero: persistence.numero,
      serie: persistence.serie ?? undefined,
      dataEmissao: persistence.dataEmissao,
      competencia: persistence.competencia,
      prestador,
      tomador,
      intermediario,
      servico,
      iss,
      valorLiquido: valorLiquidoResult.value,
      taxRegime: taxRegimeResult.value,
      observacoes: persistence.observacoes ?? undefined,
      numeroNfse: persistence.numeroNfse ?? undefined,
      codigoVerificacao: persistence.codigoVerificacao ?? undefined,
      protocoloEnvio: persistence.protocoloEnvio ?? undefined,
      protocoloCancelamento: persistence.protocoloCancelamento ?? undefined,
      motivoCancelamento: persistence.motivoCancelamento ?? undefined,
      authorizedAt: persistence.authorizedAt ?? undefined,
      cancelledAt: persistence.cancelledAt ?? undefined,
      version: persistence.version,
    };

    // TODO: ibsCbsGroup - Carregado separadamente via FiscalDocumentIbsCbsMapper
    // Se necessário, passar como parâmetro opcional e reconstituir aqui
    // Por enquanto, NFSeDocument não usa ibsCbsGroup (apenas FiscalDocument usa)

    // REGRA: Usar reconstitute() para preservar timestamps
    return Result.ok(NFSeDocument.reconstitute(props, persistence.createdAt, persistence.updatedAt));
  }
}

