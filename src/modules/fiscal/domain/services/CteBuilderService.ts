/**
 * CteBuilderService - Domain Service para construção de XML CTe
 *
 * Constrói o XML do CTe 4.0 conforme especificação da SEFAZ.
 * 100% puro - sem dependências de infraestrutura.
 *
 * @module fiscal/domain/services
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 * @since E8 Fase 2.1
 */

import { Result } from '@/shared/domain';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DE ENTRADA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Endereço completo para CTe
 */
export interface CteEndereco {
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
export interface CteEmitente {
  cnpj: string;
  inscricaoEstadual: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco: CteEndereco;
}

/**
 * Dados do remetente
 */
export interface CteRemetente {
  cnpjCpf: string;
  inscricaoEstadual?: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco: CteEndereco;
}

/**
 * Dados do destinatário
 */
export interface CteDestinatario {
  cnpjCpf: string;
  inscricaoEstadual?: string;
  razaoSocial: string;
  endereco: CteEndereco;
}

/**
 * Dados de ICMS
 */
export interface CteIcms {
  cst: string;
  baseCalculo: number;
  aliquota: number;
  valor: number;
}

/**
 * Dados da carga
 */
export interface CteCarga {
  valorCarga: number;
  produtoPredominante: string;
  quantidadeCarga: number;
  unidadeMedida: string; // 00=M3, 01=KG, 02=TON, 03=UN, 04=LT, 05=MMBTU
}

/**
 * Documento vinculado (NFe)
 */
export interface CteDocumentoVinculado {
  chaveNfe: string;
  pin?: string;
}

/**
 * Seguro da carga
 */
export interface CteSeguro {
  responsavel: number; // 0=Remetente, 1=Expedidor, 2=Recebedor, 3=Destinatário, 4=Emitente, 5=Tomador
  seguradora?: string;
  numeroApolice?: string;
  numeroAverbacao?: string;
}

/**
 * Input completo para construção do CTe
 */
export interface CteBuilderInput {
  // Identificação
  serie: number;
  numero: number;
  dataEmissao: Date;
  cfop: string;
  naturezaOperacao: string;
  tipoServico: number; // 0=Normal, 1=Subcontratação, 2=Redespacho, 3=Redespacho Intermediário, 4=Serviço Vinculado a Multimodal
  modal: string; // 01=Rodoviário, 02=Aéreo, 03=Aquaviário, 04=Ferroviário, 05=Dutoviário, 06=Multimodal
  ambiente: '1' | '2'; // 1=Produção, 2=Homologação

  // Participantes
  emitente: CteEmitente;
  remetente: CteRemetente;
  destinatario: CteDestinatario;

  // Valores
  valorServico: number;
  valorReceber: number;

  // Componentes do valor
  componentes?: Array<{
    nome: string;
    valor: number;
  }>;

  // Impostos
  icms: CteIcms;

  // Carga
  carga: CteCarga;

  // Documentos vinculados (NFes)
  documentosVinculados?: CteDocumentoVinculado[];

  // Seguro
  seguro?: CteSeguro;

  // Informações adicionais
  informacoesAdicionaisFisco?: string;
  informacoesComplementares?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DE SAÍDA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resultado da construção do CTe
 */
export interface CteXmlResult {
  xml: string;
  chaveAcesso: string;
  digitoVerificador: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOMAIN SERVICE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Domain Service para construção de XML CTe
 *
 * Regras DDD:
 * - DOMAIN-SVC-001: 100% Stateless (métodos estáticos)
 * - DOMAIN-SVC-002: Constructor privado
 * - DOMAIN-SVC-003: Retorna Result<T, string>
 * - DOMAIN-SVC-004: NUNCA faz throw
 * - DOMAIN-SVC-005: ZERO dependências de infraestrutura
 * - DOMAIN-SVC-006: ZERO acesso a banco de dados
 */
export class CteBuilderService {
  // Constructor privado - impede instanciação
  private constructor() {}

  /**
   * Constrói XML de CTe a partir dos dados de entrada
   *
   * @param input Dados completos do CTe
   * @returns Result com XML gerado ou erro de validação
   */
  static build(input: CteBuilderInput): Result<CteXmlResult, string> {
    // 1. Validar dados obrigatórios
    const validationResult = this.validate(input);
    if (Result.isFail(validationResult)) {
      return Result.fail(validationResult.error);
    }

    // 2. Gerar chave de acesso
    const chaveResult = this.generateAccessKey(input);
    if (Result.isFail(chaveResult)) {
      return Result.fail(chaveResult.error);
    }

    const chaveAcesso = chaveResult.value;
    const digitoVerificador = chaveAcesso.substring(43);
    const codigoCte = chaveAcesso.substring(35, 43);

    // 3. Montar estrutura XML
    const xmlResult = this.buildXmlStructure(input, chaveAcesso, codigoCte);
    if (Result.isFail(xmlResult)) {
      return Result.fail(xmlResult.error);
    }

    return Result.ok({
      xml: xmlResult.value,
      chaveAcesso,
      digitoVerificador,
    });
  }

  /**
   * Valida dados de entrada do CTe
   */
  static validate(input: CteBuilderInput): Result<void, string> {
    // Validar emitente
    if (!input.emitente.cnpj) {
      return Result.fail('CNPJ do emitente é obrigatório');
    }
    if (!this.isValidCnpj(input.emitente.cnpj)) {
      return Result.fail('CNPJ do emitente inválido');
    }
    if (!input.emitente.inscricaoEstadual) {
      return Result.fail('Inscrição Estadual do emitente é obrigatória');
    }

    // Validar remetente
    if (!input.remetente.cnpjCpf) {
      return Result.fail('CNPJ/CPF do remetente é obrigatório');
    }

    // Validar destinatário
    if (!input.destinatario.cnpjCpf) {
      return Result.fail('CNPJ/CPF do destinatário é obrigatório');
    }

    // Validar valores
    if (input.valorServico <= 0) {
      return Result.fail('Valor do serviço deve ser maior que zero');
    }

    // Validar ICMS
    if (input.icms.aliquota < 0 || input.icms.aliquota > 100) {
      return Result.fail('Alíquota ICMS inválida (deve ser entre 0 e 100)');
    }

    // Validar carga
    if (!input.carga.produtoPredominante) {
      return Result.fail('Produto predominante da carga é obrigatório');
    }
    if (input.carga.valorCarga < 0) {
      return Result.fail('Valor da carga não pode ser negativo');
    }

    // Validar seguro (se presente)
    if (input.seguro) {
      if (input.seguro.responsavel < 0 || input.seguro.responsavel > 5) {
        return Result.fail('Responsável pelo seguro inválido (deve ser 0-5)');
      }
    }

    // Validar UFs
    if (!this.getCodigoUF(input.emitente.endereco.uf)) {
      return Result.fail(`UF do emitente inválida: ${input.emitente.endereco.uf}`);
    }
    if (!this.getCodigoUF(input.remetente.endereco.uf)) {
      return Result.fail(`UF do remetente inválida: ${input.remetente.endereco.uf}`);
    }
    if (!this.getCodigoUF(input.destinatario.endereco.uf)) {
      return Result.fail(`UF do destinatário inválida: ${input.destinatario.endereco.uf}`);
    }

    return Result.ok(undefined);
  }

  /**
   * Gera chave de acesso do CTe (44 dígitos)
   * Formato: cUF + AAMM + CNPJ + mod + serie + nCT + tpEmis + cCT + cDV
   */
  static generateAccessKey(input: CteBuilderInput): Result<string, string> {
    const cUF = this.getCodigoUF(input.emitente.endereco.uf);
    if (!cUF) {
      return Result.fail(`UF inválida: ${input.emitente.endereco.uf}`);
    }

    const aamm = this.formatAAMM(input.dataEmissao);
    const cnpj = input.emitente.cnpj.replace(/\D/g, '').padStart(14, '0');
    const mod = '57'; // Modelo CTe
    const serie = input.serie.toString().padStart(3, '0');
    const nCT = input.numero.toString().padStart(9, '0');
    const tpEmis = '1'; // Normal
    const cCT = this.generateNumericCode(8);

    const chaveBase = `${cUF}${aamm}${cnpj}${mod}${serie}${nCT}${tpEmis}${cCT}`;

    // Validar tamanho
    if (chaveBase.length !== 43) {
      return Result.fail(`Chave base inválida: esperado 43 dígitos, obtido ${chaveBase.length}`);
    }

    const cDV = this.calculateMod11(chaveBase);

    return Result.ok(`${chaveBase}${cDV}`);
  }

  /**
   * Monta estrutura XML do CTe 4.0
   */
  private static buildXmlStructure(
    input: CteBuilderInput,
    chaveAcesso: string,
    codigoCte: string
  ): Result<string, string> {
    const cUF = this.getCodigoUF(input.emitente.endereco.uf);
    const dhEmi = this.formatDateTime(input.dataEmissao);

    // Montar XML seguindo layout SEFAZ CTe 4.0
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CTe xmlns="http://www.portalfiscal.inf.br/cte">
  <infCte versao="4.00" Id="CTe${chaveAcesso}">
    <ide>
      <cUF>${cUF}</cUF>
      <cCT>${codigoCte}</cCT>
      <CFOP>${this.escapeXml(input.cfop)}</CFOP>
      <natOp>${this.escapeXml(input.naturezaOperacao)}</natOp>
      <mod>57</mod>
      <serie>${input.serie}</serie>
      <nCT>${input.numero}</nCT>
      <dhEmi>${dhEmi}</dhEmi>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${chaveAcesso.substring(43)}</cDV>
      <tpAmb>${input.ambiente}</tpAmb>
      <tpCTe>0</tpCTe>
      <procEmi>0</procEmi>
      <verProc>AuraCore</verProc>
      <cMunEnv>${input.emitente.endereco.codigoMunicipio}</cMunEnv>
      <xMunEnv>${this.escapeXml(input.emitente.endereco.nomeMunicipio)}</xMunEnv>
      <UFEnv>${input.emitente.endereco.uf}</UFEnv>
      <modal>${input.modal}</modal>
      <tpServ>${input.tipoServico}</tpServ>
      <cMunIni>${input.remetente.endereco.codigoMunicipio}</cMunIni>
      <xMunIni>${this.escapeXml(input.remetente.endereco.nomeMunicipio)}</xMunIni>
      <UFIni>${input.remetente.endereco.uf}</UFIni>
      <cMunFim>${input.destinatario.endereco.codigoMunicipio}</cMunFim>
      <xMunFim>${this.escapeXml(input.destinatario.endereco.nomeMunicipio)}</xMunFim>
      <UFFim>${input.destinatario.endereco.uf}</UFFim>
      <retira>0</retira>
      <indIEToma>1</indIEToma>
    </ide>
    ${this.buildEmitente(input.emitente)}
    ${this.buildRemetente(input.remetente)}
    ${this.buildDestinatario(input.destinatario)}
    ${this.buildValoresPrestacao(input)}
    ${this.buildImpostos(input.icms)}
    <infCTeNorm>
      ${this.buildInfoCarga(input.carga)}
      ${this.buildDocumentosVinculados(input.documentosVinculados)}
      ${input.seguro ? this.buildSeguro(input.seguro) : ''}
    </infCTeNorm>
    ${this.buildInformacoesAdicionais(input)}
  </infCte>
</CTe>`;

    return Result.ok(xml);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILDERS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  private static buildEmitente(emit: CteEmitente): string {
    return `<emit>
      <CNPJ>${emit.cnpj.replace(/\D/g, '')}</CNPJ>
      <IE>${emit.inscricaoEstadual.replace(/\D/g, '')}</IE>
      <xNome>${this.escapeXml(emit.razaoSocial)}</xNome>
      ${emit.nomeFantasia ? `<xFant>${this.escapeXml(emit.nomeFantasia)}</xFant>` : ''}
      <enderEmit>
        <xLgr>${this.escapeXml(emit.endereco.logradouro)}</xLgr>
        <nro>${this.escapeXml(emit.endereco.numero)}</nro>
        ${emit.endereco.complemento ? `<xCpl>${this.escapeXml(emit.endereco.complemento)}</xCpl>` : ''}
        <xBairro>${this.escapeXml(emit.endereco.bairro)}</xBairro>
        <cMun>${emit.endereco.codigoMunicipio}</cMun>
        <xMun>${this.escapeXml(emit.endereco.nomeMunicipio)}</xMun>
        <CEP>${emit.endereco.cep.replace(/\D/g, '')}</CEP>
        <UF>${emit.endereco.uf}</UF>
      </enderEmit>
    </emit>`;
  }

  private static buildRemetente(rem: CteRemetente): string {
    const doc = rem.cnpjCpf.replace(/\D/g, '');
    const docTag = doc.length === 14 ? 'CNPJ' : 'CPF';

    return `<rem>
      <${docTag}>${doc}</${docTag}>
      ${rem.inscricaoEstadual ? `<IE>${rem.inscricaoEstadual.replace(/\D/g, '')}</IE>` : ''}
      <xNome>${this.escapeXml(rem.razaoSocial)}</xNome>
      ${rem.nomeFantasia ? `<xFant>${this.escapeXml(rem.nomeFantasia)}</xFant>` : ''}
      <enderReme>
        <xLgr>${this.escapeXml(rem.endereco.logradouro)}</xLgr>
        <nro>${this.escapeXml(rem.endereco.numero)}</nro>
        ${rem.endereco.complemento ? `<xCpl>${this.escapeXml(rem.endereco.complemento)}</xCpl>` : ''}
        <xBairro>${this.escapeXml(rem.endereco.bairro)}</xBairro>
        <cMun>${rem.endereco.codigoMunicipio}</cMun>
        <xMun>${this.escapeXml(rem.endereco.nomeMunicipio)}</xMun>
        <CEP>${rem.endereco.cep.replace(/\D/g, '')}</CEP>
        <UF>${rem.endereco.uf}</UF>
      </enderReme>
    </rem>`;
  }

  private static buildDestinatario(dest: CteDestinatario): string {
    const doc = dest.cnpjCpf.replace(/\D/g, '');
    const docTag = doc.length === 14 ? 'CNPJ' : 'CPF';

    return `<dest>
      <${docTag}>${doc}</${docTag}>
      ${dest.inscricaoEstadual ? `<IE>${dest.inscricaoEstadual.replace(/\D/g, '')}</IE>` : ''}
      <xNome>${this.escapeXml(dest.razaoSocial)}</xNome>
      <enderDest>
        <xLgr>${this.escapeXml(dest.endereco.logradouro)}</xLgr>
        <nro>${this.escapeXml(dest.endereco.numero)}</nro>
        ${dest.endereco.complemento ? `<xCpl>${this.escapeXml(dest.endereco.complemento)}</xCpl>` : ''}
        <xBairro>${this.escapeXml(dest.endereco.bairro)}</xBairro>
        <cMun>${dest.endereco.codigoMunicipio}</cMun>
        <xMun>${this.escapeXml(dest.endereco.nomeMunicipio)}</xMun>
        <CEP>${dest.endereco.cep.replace(/\D/g, '')}</CEP>
        <UF>${dest.endereco.uf}</UF>
      </enderDest>
    </dest>`;
  }

  private static buildValoresPrestacao(input: CteBuilderInput): string {
    let componentes = '';
    if (input.componentes && input.componentes.length > 0) {
      componentes = input.componentes
        .map(
          (c) => `<Comp>
        <xNome>${this.escapeXml(c.nome)}</xNome>
        <vComp>${c.valor.toFixed(2)}</vComp>
      </Comp>`
        )
        .join('\n      ');
    } else {
      // Componente padrão
      componentes = `<Comp>
        <xNome>FRETE</xNome>
        <vComp>${input.valorServico.toFixed(2)}</vComp>
      </Comp>`;
    }

    return `<vPrest>
      <vTPrest>${input.valorServico.toFixed(2)}</vTPrest>
      <vRec>${input.valorReceber.toFixed(2)}</vRec>
      ${componentes}
    </vPrest>`;
  }

  private static buildImpostos(icms: CteIcms): string {
    // Determinar grupo ICMS baseado no CST
    const cst = icms.cst.padStart(2, '0');
    let grupoIcms: string;

    switch (cst) {
      case '00':
        grupoIcms = `<ICMS00>
          <CST>${cst}</CST>
          <vBC>${icms.baseCalculo.toFixed(2)}</vBC>
          <pICMS>${icms.aliquota.toFixed(2)}</pICMS>
          <vICMS>${icms.valor.toFixed(2)}</vICMS>
        </ICMS00>`;
        break;
      case '20':
        grupoIcms = `<ICMS20>
          <CST>${cst}</CST>
          <pRedBC>0.00</pRedBC>
          <vBC>${icms.baseCalculo.toFixed(2)}</vBC>
          <pICMS>${icms.aliquota.toFixed(2)}</pICMS>
          <vICMS>${icms.valor.toFixed(2)}</vICMS>
        </ICMS20>`;
        break;
      case '40':
      case '41':
      case '51':
        grupoIcms = `<ICMS45>
          <CST>${cst}</CST>
        </ICMS45>`;
        break;
      case '60':
        grupoIcms = `<ICMS60>
          <CST>${cst}</CST>
          <vBCSTRet>0.00</vBCSTRet>
          <vICMSSTRet>0.00</vICMSSTRet>
          <pICMSSTRet>0.00</pICMSSTRet>
          <vCred>0.00</vCred>
        </ICMS60>`;
        break;
      case '90':
        grupoIcms = `<ICMS90>
          <CST>${cst}</CST>
          <pRedBC>0.00</pRedBC>
          <vBC>${icms.baseCalculo.toFixed(2)}</vBC>
          <pICMS>${icms.aliquota.toFixed(2)}</pICMS>
          <vICMS>${icms.valor.toFixed(2)}</vICMS>
          <vCred>0.00</vCred>
        </ICMS90>`;
        break;
      default:
        grupoIcms = `<ICMS00>
          <CST>${cst}</CST>
          <vBC>${icms.baseCalculo.toFixed(2)}</vBC>
          <pICMS>${icms.aliquota.toFixed(2)}</pICMS>
          <vICMS>${icms.valor.toFixed(2)}</vICMS>
        </ICMS00>`;
    }

    return `<imp>
      <ICMS>
        ${grupoIcms}
      </ICMS>
    </imp>`;
  }

  private static buildInfoCarga(carga: CteCarga): string {
    return `<infCarga>
      <vCarga>${carga.valorCarga.toFixed(2)}</vCarga>
      <proPred>${this.escapeXml(carga.produtoPredominante)}</proPred>
      <infQ>
        <cUnid>${carga.unidadeMedida}</cUnid>
        <tpMed>PESO</tpMed>
        <qCarga>${carga.quantidadeCarga.toFixed(4)}</qCarga>
      </infQ>
    </infCarga>`;
  }

  private static buildDocumentosVinculados(docs?: CteDocumentoVinculado[]): string {
    if (!docs || docs.length === 0) {
      return '';
    }

    const docsXml = docs
      .map(
        (doc) => `<infNFe>
        <chave>${doc.chaveNfe}</chave>
        ${doc.pin ? `<PIN>${doc.pin}</PIN>` : ''}
      </infNFe>`
      )
      .join('\n      ');

    return `<infDoc>
      ${docsXml}
    </infDoc>`;
  }

  private static buildSeguro(seguro: CteSeguro): string {
    return `<seg>
      <respSeg>${seguro.responsavel}</respSeg>
      ${seguro.seguradora ? `<xSeg>${this.escapeXml(seguro.seguradora)}</xSeg>` : ''}
      ${seguro.numeroApolice ? `<nApol>${this.escapeXml(seguro.numeroApolice)}</nApol>` : ''}
      ${seguro.numeroAverbacao ? `<nAver>${this.escapeXml(seguro.numeroAverbacao)}</nAver>` : ''}
    </seg>`;
  }

  private static buildInformacoesAdicionais(input: CteBuilderInput): string {
    if (!input.informacoesAdicionaisFisco && !input.informacoesComplementares) {
      return '';
    }

    return `<infAdic>
      ${input.informacoesAdicionaisFisco ? `<infAdFisco>${this.escapeXml(input.informacoesAdicionaisFisco)}</infAdFisco>` : ''}
      ${input.informacoesComplementares ? `<infCpl>${this.escapeXml(input.informacoesComplementares)}</infCpl>` : ''}
    </infAdic>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS PRIVADOS (todos estáticos e puros)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retorna o código IBGE da UF
   */
  private static getCodigoUF(uf: string): string | null {
    const codigos: Record<string, string> = {
      AC: '12',
      AL: '27',
      AM: '13',
      AP: '16',
      BA: '29',
      CE: '23',
      DF: '53',
      ES: '32',
      GO: '52',
      MA: '21',
      MG: '31',
      MS: '50',
      MT: '51',
      PA: '15',
      PB: '25',
      PE: '26',
      PI: '22',
      PR: '41',
      RJ: '33',
      RN: '24',
      RO: '11',
      RR: '14',
      RS: '43',
      SC: '42',
      SE: '28',
      SP: '35',
      TO: '17',
    };
    return codigos[uf.toUpperCase()] || null;
  }

  /**
   * Formata data para AAMM
   */
  private static formatAAMM(date: Date): string {
    const year = date.getFullYear().toString().substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}${month}`;
  }

  /**
   * Formata data/hora para ISO com timezone
   */
  private static formatDateTime(date: Date): string {
    return date.toISOString().replace('Z', '-03:00');
  }

  /**
   * Gera código numérico de N dígitos
   * Usa globalThis.crypto (permitido em Domain)
   */
  private static generateNumericCode(length: number): string {
    // Usar crypto.getRandomValues para gerar número seguro
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    const max = Math.pow(10, length);
    return (array[0] % max).toString().padStart(length, '0');
  }

  /**
   * Calcula dígito verificador Módulo 11
   */
  private static calculateMod11(key: string): string {
    let sum = 0;
    let multiplier = 2;

    for (let i = key.length - 1; i >= 0; i--) {
      sum += parseInt(key[i]) * multiplier;
      multiplier = multiplier === 9 ? 2 : multiplier + 1;
    }

    const remainder = sum % 11;
    const dv = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;

    return dv.toString();
  }

  /**
   * Escapa caracteres especiais para XML
   */
  private static escapeXml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Valida CNPJ (algoritmo básico)
   */
  private static isValidCnpj(cnpj: string): boolean {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return false;

    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(digits)) return false;

    // Calcular primeiro dígito verificador
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const dv1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    // Calcular segundo dígito verificador
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(digits[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const dv2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    return parseInt(digits[12]) === dv1 && parseInt(digits[13]) === dv2;
  }
}
