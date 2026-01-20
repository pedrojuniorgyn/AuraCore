/**
 * DacteGeneratorService - Domain Service para geração de estrutura DACTE
 *
 * Gera a estrutura de dados do DACTE (Documento Auxiliar do CTe).
 * NÃO gera o PDF diretamente - isso é responsabilidade da infraestrutura.
 *
 * Padrões DDD:
 * - 100% Stateless (métodos estáticos)
 * - Constructor privado
 * - ZERO dependências de infraestrutura
 * - Result pattern em todas operações
 *
 * @module fiscal/domain/services
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 * @since E8 Fase 2.3
 */

import { Result } from '@/shared/domain';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DE ENTRADA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Endereço para DACTE
 */
export interface DacteEndereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  nomeMunicipio: string;
  uf: string;
  cep: string;
}

/**
 * Dados do emitente (transportadora)
 */
export interface DacteEmitente {
  cnpj: string;
  inscricaoEstadual: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco: DacteEndereco;
  telefone?: string;
  email?: string;
}

/**
 * Dados de um participante (remetente, destinatário, expedidor, recebedor)
 */
export interface DacteParticipante {
  cpfCnpj: string;
  inscricaoEstadual?: string;
  razaoSocial: string;
  endereco: DacteEndereco;
  telefone?: string;
}

/**
 * Dados do ICMS
 */
export interface DacteIcms {
  cst: string;
  baseCalculo: number;
  aliquota: number;
  valor: number;
  reducaoBaseCalculo?: number;
}

/**
 * Documento originário (NFe vinculada ao CTe)
 */
export interface DacteDocumentoOriginario {
  tipo: 'NFE' | 'NFSE' | 'OUTROS';
  chaveAcesso?: string;
  numero?: string;
  serie?: string;
  dataEmissao?: Date;
  valor?: number;
}

/**
 * Componente do valor do frete
 */
export interface DacteComponenteValor {
  nome: string;
  valor: number;
}

/**
 * Dados de entrada para geração do DACTE
 */
export interface DacteInput {
  // Dados do CTe
  chaveAcesso: string;
  numero: number;
  serie: number;
  modelo: '57';
  dataEmissao: Date;
  dataAutorizacao?: Date;
  protocoloAutorizacao?: string;

  // Modal
  modal: 'RODOVIARIO' | 'AEREO' | 'AQUAVIARIO' | 'FERROVIARIO' | 'DUTOVIARIO';
  tipoServico: 'NORMAL' | 'SUBCONTRATACAO' | 'REDESPACHO' | 'REDESPACHO_INTERMEDIARIO';
  tipoCte: 'NORMAL' | 'COMPLEMENTO' | 'ANULACAO' | 'SUBSTITUTO';

  // Emitente (Transportadora)
  emitente: DacteEmitente;

  // Participantes
  remetente: DacteParticipante;
  destinatario: DacteParticipante;
  expedidor?: DacteParticipante;
  recebedor?: DacteParticipante;
  tomador: 'REMETENTE' | 'DESTINATARIO' | 'EXPEDIDOR' | 'RECEBEDOR' | 'OUTROS';

  // Percurso
  ufInicio: string;
  ufFim: string;
  municipioInicio: string;
  municipioFim: string;

  // Valores
  valorTotalServico: number;
  valorReceber: number;
  valorCarga: number;
  componentes?: DacteComponenteValor[];

  // Carga
  produtoPredominante: string;
  pesoBruto: number;
  pesoAferido?: number;
  volumes?: number;
  unidadeMedida?: string;

  // ICMS
  icms: DacteIcms;

  // Documentos vinculados
  documentosOriginarios: DacteDocumentoOriginario[];

  // Informações adicionais
  observacoes?: string;
  informacoesComplementares?: string;
  informacoesFisco?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DE SAÍDA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cabeçalho do DACTE
 */
export interface DacteHeader {
  modelo: '57';
  serie: string;
  numero: string;
  folha: string;
  dataHoraEmissao: string;
  tipoServico: string;
  tipoCte: string;
  modal: string;
}

/**
 * Dados do código de barras
 */
export interface DacteBarcodeData {
  chaveAcesso: string;
  chaveFormatada: string;
  protocolo: string;
  dataHoraAutorizacao: string;
}

/**
 * Seção do emitente
 */
export interface DacteEmitenteSection {
  cnpj: string;
  cnpjFormatado: string;
  inscricaoEstadual: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco: string;
  telefone?: string;
  email?: string;
}

/**
 * Seção de participante
 */
export interface DacteParticipanteSection {
  tipo: 'REMETENTE' | 'DESTINATARIO' | 'EXPEDIDOR' | 'RECEBEDOR';
  cpfCnpj: string;
  cpfCnpjFormatado: string;
  inscricaoEstadual?: string;
  razaoSocial: string;
  endereco: string;
  municipioUf: string;
  telefone?: string;
  isTomador: boolean;
}

/**
 * Seção do percurso
 */
export interface DactePercursoSection {
  origem: string;
  destino: string;
  ufOrigem: string;
  ufDestino: string;
}

/**
 * Seção de componentes do valor
 */
export interface DacteComponentesSection {
  itens: Array<{ nome: string; valor: string }>;
  valorTotal: string;
  valorReceber: string;
}

/**
 * Seção de impostos
 */
export interface DacteImpostosSection {
  situacaoTributaria: string;
  baseCalculo: string;
  aliquota: string;
  valorIcms: string;
  reducaoBaseCalculo?: string;
}

/**
 * Seção de carga
 */
export interface DacteCargaSection {
  produtoPredominante: string;
  valorCarga: string;
  pesoBruto: string;
  pesoAferido?: string;
  volumes?: string;
  unidadeMedida?: string;
}

/**
 * Seção de documentos originários
 */
export interface DacteDocumentosSection {
  titulo: string;
  documentos: Array<{
    tipo: string;
    chave?: string;
    numero?: string;
    valor?: string;
  }>;
  totalDocumentos: number;
}

/**
 * Seção de observações
 */
export interface DacteObservacoesSection {
  observacoes?: string;
  informacoesComplementares?: string;
  informacoesFisco?: string;
}

/**
 * Rodapé do DACTE
 */
export interface DacteFooter {
  mensagemFiscal: string;
  versaoLayout: string;
}

/**
 * Estrutura completa do DACTE
 */
export interface DacteData {
  header: DacteHeader;
  barcode: DacteBarcodeData;
  emitente: DacteEmitenteSection;
  percurso: DactePercursoSection;
  remetente: DacteParticipanteSection;
  destinatario: DacteParticipanteSection;
  expedidor?: DacteParticipanteSection;
  recebedor?: DacteParticipanteSection;
  componentes: DacteComponentesSection;
  impostos: DacteImpostosSection;
  carga: DacteCargaSection;
  documentos: DacteDocumentosSection;
  observacoes: DacteObservacoesSection;
  footer: DacteFooter;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOMAIN SERVICE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DacteGeneratorService
 *
 * Gera estrutura de dados do DACTE para renderização em PDF.
 * O PDF físico é gerado por um adapter de infraestrutura.
 *
 * @example
 * ```typescript
 * const result = DacteGeneratorService.generate(input);
 * if (Result.isOk(result)) {
 *   // Usar result.value com adapter de PDF
 *   const pdfResult = await pdfAdapter.generatePdf(result.value);
 * }
 * ```
 */
export class DacteGeneratorService {
  /**
   * Constructor privado - impede instanciação
   * @see DOMAIN-SVC-002
   */
  private constructor() {}

  // ═══════════════════════════════════════════════════════════════════════
  // MÉTODOS PÚBLICOS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Gera estrutura de dados completa do DACTE
   *
   * @param input Dados do CTe autorizado
   * @returns Result com estrutura do DACTE ou erro
   */
  static generate(input: DacteInput): Result<DacteData, string> {
    // 1. Validar input
    const validationResult = this.validate(input);
    if (Result.isFail(validationResult)) {
      return Result.fail(validationResult.error);
    }

    // 2. Gerar cada seção
    const header = this.buildHeader(input);
    const barcode = this.buildBarcode(input);
    const emitente = this.buildEmitenteSection(input.emitente);
    const percurso = this.buildPercursoSection(input);
    const remetente = this.buildParticipanteSection(input.remetente, 'REMETENTE', input.tomador === 'REMETENTE');
    const destinatario = this.buildParticipanteSection(input.destinatario, 'DESTINATARIO', input.tomador === 'DESTINATARIO');
    const expedidor = input.expedidor
      ? this.buildParticipanteSection(input.expedidor, 'EXPEDIDOR', input.tomador === 'EXPEDIDOR')
      : undefined;
    const recebedor = input.recebedor
      ? this.buildParticipanteSection(input.recebedor, 'RECEBEDOR', input.tomador === 'RECEBEDOR')
      : undefined;
    const componentes = this.buildComponentesSection(input);
    const impostos = this.buildImpostosSection(input.icms);
    const carga = this.buildCargaSection(input);
    const documentos = this.buildDocumentosSection(input.documentosOriginarios);
    const observacoes = this.buildObservacoesSection(input);
    const footer = this.buildFooter();

    // 3. Montar estrutura completa
    const dacteData: DacteData = {
      header,
      barcode,
      emitente,
      percurso,
      remetente,
      destinatario,
      expedidor,
      recebedor,
      componentes,
      impostos,
      carga,
      documentos,
      observacoes,
      footer,
    };

    return Result.ok(dacteData);
  }

  /**
   * Valida dados de entrada do DACTE
   */
  static validate(input: DacteInput): Result<void, string> {
    // Validar chave de acesso (44 dígitos)
    if (!input.chaveAcesso || input.chaveAcesso.length !== 44) {
      return Result.fail('Chave de acesso deve ter 44 dígitos');
    }

    if (!/^\d{44}$/.test(input.chaveAcesso)) {
      return Result.fail('Chave de acesso deve conter apenas números');
    }

    // Validar número e série
    if (input.numero <= 0) {
      return Result.fail('Número do CTe deve ser maior que zero');
    }

    if (input.serie < 0) {
      return Result.fail('Série do CTe não pode ser negativa');
    }

    // Validar emitente
    if (!input.emitente.cnpj || input.emitente.cnpj.replace(/\D/g, '').length !== 14) {
      return Result.fail('CNPJ do emitente inválido');
    }

    if (!input.emitente.razaoSocial || input.emitente.razaoSocial.trim().length === 0) {
      return Result.fail('Razão social do emitente é obrigatória');
    }

    // Validar remetente
    const remetenteCpfCnpj = input.remetente.cpfCnpj.replace(/\D/g, '');
    if (!remetenteCpfCnpj || (remetenteCpfCnpj.length !== 11 && remetenteCpfCnpj.length !== 14)) {
      return Result.fail('CPF/CNPJ do remetente inválido');
    }

    // Validar destinatário
    const destinatarioCpfCnpj = input.destinatario.cpfCnpj.replace(/\D/g, '');
    if (!destinatarioCpfCnpj || (destinatarioCpfCnpj.length !== 11 && destinatarioCpfCnpj.length !== 14)) {
      return Result.fail('CPF/CNPJ do destinatário inválido');
    }

    // Validar valores
    if (input.valorTotalServico < 0) {
      return Result.fail('Valor total do serviço não pode ser negativo');
    }

    if (input.valorCarga < 0) {
      return Result.fail('Valor da carga não pode ser negativo');
    }

    // Validar peso
    if (input.pesoBruto <= 0) {
      return Result.fail('Peso bruto deve ser maior que zero');
    }

    // Validar UFs
    const ufsValidas = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
    if (!ufsValidas.includes(input.ufInicio)) {
      return Result.fail(`UF de início inválida: ${input.ufInicio}`);
    }
    if (!ufsValidas.includes(input.ufFim)) {
      return Result.fail(`UF de fim inválida: ${input.ufFim}`);
    }

    // Validar ICMS
    if (input.icms.aliquota < 0 || input.icms.aliquota > 100) {
      return Result.fail('Alíquota de ICMS deve estar entre 0 e 100');
    }

    return Result.ok(undefined);
  }

  /**
   * Formata chave de acesso para exibição
   */
  static formatAccessKey(chave: string): Result<string, string> {
    if (chave.length !== 44) {
      return Result.fail('Chave deve ter 44 dígitos');
    }

    const formatted = chave.match(/.{1,4}/g)?.join(' ') ?? chave;
    return Result.ok(formatted);
  }

  /**
   * Calcula dígito verificador da chave de acesso (Módulo 11)
   */
  static calculateCheckDigit(chave43: string): Result<string, string> {
    if (chave43.length !== 43) {
      return Result.fail('Chave sem DV deve ter 43 dígitos');
    }

    const weights = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 43; i++) {
      sum += parseInt(chave43[i], 10) * weights[i];
    }

    const remainder = sum % 11;
    const dv = remainder < 2 ? 0 : 11 - remainder;

    return Result.ok(dv.toString());
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS - BUILDERS DE SEÇÃO
  // ═══════════════════════════════════════════════════════════════════════

  private static buildHeader(input: DacteInput): DacteHeader {
    const tipoServicoLabels: Record<string, string> = {
      NORMAL: 'Normal',
      SUBCONTRATACAO: 'Subcontratação',
      REDESPACHO: 'Redespacho',
      REDESPACHO_INTERMEDIARIO: 'Redespacho Intermediário',
    };

    const tipoCteLabels: Record<string, string> = {
      NORMAL: 'Normal',
      COMPLEMENTO: 'CT-e de Complemento de Valores',
      ANULACAO: 'CT-e de Anulação',
      SUBSTITUTO: 'CT-e de Substituição',
    };

    const modalLabels: Record<string, string> = {
      RODOVIARIO: 'Rodoviário',
      AEREO: 'Aéreo',
      AQUAVIARIO: 'Aquaviário',
      FERROVIARIO: 'Ferroviário',
      DUTOVIARIO: 'Dutoviário',
    };

    return {
      modelo: '57',
      serie: input.serie.toString().padStart(3, '0'),
      numero: input.numero.toString().padStart(9, '0'),
      folha: '1/1',
      dataHoraEmissao: this.formatDateTime(input.dataEmissao),
      tipoServico: tipoServicoLabels[input.tipoServico] || input.tipoServico,
      tipoCte: tipoCteLabels[input.tipoCte] || input.tipoCte,
      modal: modalLabels[input.modal] || input.modal,
    };
  }

  private static buildBarcode(input: DacteInput): DacteBarcodeData {
    const chaveFormatada = input.chaveAcesso.match(/.{1,4}/g)?.join(' ') ?? input.chaveAcesso;

    return {
      chaveAcesso: input.chaveAcesso,
      chaveFormatada,
      protocolo: input.protocoloAutorizacao ?? '',
      dataHoraAutorizacao: input.dataAutorizacao
        ? this.formatDateTime(input.dataAutorizacao)
        : '',
    };
  }

  private static buildEmitenteSection(emitente: DacteEmitente): DacteEmitenteSection {
    return {
      cnpj: emitente.cnpj.replace(/\D/g, ''),
      cnpjFormatado: this.formatCnpj(emitente.cnpj),
      inscricaoEstadual: emitente.inscricaoEstadual,
      razaoSocial: emitente.razaoSocial,
      nomeFantasia: emitente.nomeFantasia,
      endereco: this.formatEndereco(emitente.endereco),
      telefone: emitente.telefone ? this.formatTelefone(emitente.telefone) : undefined,
      email: emitente.email,
    };
  }

  private static buildPercursoSection(input: DacteInput): DactePercursoSection {
    return {
      origem: `${input.municipioInicio}/${input.ufInicio}`,
      destino: `${input.municipioFim}/${input.ufFim}`,
      ufOrigem: input.ufInicio,
      ufDestino: input.ufFim,
    };
  }

  private static buildParticipanteSection(
    participante: DacteParticipante,
    tipo: 'REMETENTE' | 'DESTINATARIO' | 'EXPEDIDOR' | 'RECEBEDOR',
    isTomador: boolean
  ): DacteParticipanteSection {
    const cpfCnpjLimpo = participante.cpfCnpj.replace(/\D/g, '');
    const isJuridico = cpfCnpjLimpo.length === 14;

    return {
      tipo,
      cpfCnpj: cpfCnpjLimpo,
      cpfCnpjFormatado: isJuridico
        ? this.formatCnpj(cpfCnpjLimpo)
        : this.formatCpf(cpfCnpjLimpo),
      inscricaoEstadual: participante.inscricaoEstadual,
      razaoSocial: participante.razaoSocial,
      endereco: this.formatEndereco(participante.endereco),
      municipioUf: `${participante.endereco.nomeMunicipio}/${participante.endereco.uf}`,
      telefone: participante.telefone ? this.formatTelefone(participante.telefone) : undefined,
      isTomador,
    };
  }

  private static buildComponentesSection(input: DacteInput): DacteComponentesSection {
    const itens = input.componentes?.map((c) => ({
      nome: c.nome,
      valor: this.formatCurrency(c.valor),
    })) ?? [{ nome: 'Frete', valor: this.formatCurrency(input.valorTotalServico) }];

    return {
      itens,
      valorTotal: this.formatCurrency(input.valorTotalServico),
      valorReceber: this.formatCurrency(input.valorReceber),
    };
  }

  private static buildImpostosSection(icms: DacteIcms): DacteImpostosSection {
    const cstLabels: Record<string, string> = {
      '00': '00 - Tributação Normal',
      '20': '20 - Redução de Base de Cálculo',
      '40': '40 - Isenta',
      '41': '41 - Não Tributada',
      '51': '51 - Diferimento',
      '60': '60 - ICMS cobrado anteriormente por ST',
      '90': '90 - Outros',
    };

    return {
      situacaoTributaria: cstLabels[icms.cst] || icms.cst,
      baseCalculo: this.formatCurrency(icms.baseCalculo),
      aliquota: `${icms.aliquota.toFixed(2)}%`,
      valorIcms: this.formatCurrency(icms.valor),
      reducaoBaseCalculo: icms.reducaoBaseCalculo
        ? `${icms.reducaoBaseCalculo.toFixed(2)}%`
        : undefined,
    };
  }

  private static buildCargaSection(input: DacteInput): DacteCargaSection {
    return {
      produtoPredominante: input.produtoPredominante,
      valorCarga: this.formatCurrency(input.valorCarga),
      pesoBruto: `${input.pesoBruto.toFixed(3)} kg`,
      pesoAferido: input.pesoAferido ? `${input.pesoAferido.toFixed(3)} kg` : undefined,
      volumes: input.volumes?.toString(),
      unidadeMedida: input.unidadeMedida,
    };
  }

  private static buildDocumentosSection(documentos: DacteDocumentoOriginario[]): DacteDocumentosSection {
    const tipoLabels: Record<string, string> = {
      NFE: 'NF-e',
      NFSE: 'NFS-e',
      OUTROS: 'Outros',
    };

    return {
      titulo: 'DOCUMENTOS ORIGINÁRIOS',
      documentos: documentos.map((doc) => ({
        tipo: tipoLabels[doc.tipo] || doc.tipo,
        chave: doc.chaveAcesso,
        numero: doc.numero,
        valor: doc.valor ? this.formatCurrency(doc.valor) : undefined,
      })),
      totalDocumentos: documentos.length,
    };
  }

  private static buildObservacoesSection(input: DacteInput): DacteObservacoesSection {
    return {
      observacoes: input.observacoes,
      informacoesComplementares: input.informacoesComplementares,
      informacoesFisco: input.informacoesFisco,
    };
  }

  private static buildFooter(): DacteFooter {
    return {
      mensagemFiscal: 'Documento emitido por sistema eletrônico conforme legislação vigente.',
      versaoLayout: '4.00',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS - FORMATADORES
  // ═══════════════════════════════════════════════════════════════════════

  private static formatDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const d = date;
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  private static formatCnpj(cnpj: string): string {
    const cleaned = cnpj.replace(/\D/g, '');
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  private static formatCpf(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  private static formatTelefone(tel: string): string {
    const cleaned = tel.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  private static formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  private static formatEndereco(endereco: DacteEndereco): string {
    const parts = [
      endereco.logradouro,
      endereco.numero,
      endereco.complemento,
      endereco.bairro,
      `${endereco.nomeMunicipio}/${endereco.uf}`,
      `CEP: ${this.formatCep(endereco.cep)}`,
    ].filter(Boolean);

    return parts.join(', ');
  }

  private static formatCep(cep: string): string {
    const cleaned = cep.replace(/\D/g, '');
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
}
