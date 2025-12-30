import { NFSeDocument, NFSeAddress, NFSeService } from '../../../domain/nfse/entities/NFSeDocument';
import { GrupoIBSCBS } from '../../xml/builders/GrupoIBSCBS';

/**
 * XML Builder: NFS-e Nacional (ABRASF 2.04)
 * 
 * Gera XML conforme padrão ABRASF 2.04 com suporte à Reforma Tributária
 * 
 * Estrutura XML:
 * <GerarNfseEnvio>
 *   <Rps>
 *     <InfDeclaracaoPrestacaoServico>
 *       <Rps> (identificação)
 *       <Competencia>
 *       <Prestador>
 *       <Tomador>
 *       <Servico>
 *         <Valores>
 *         <IssRetido>
 *         <ItemListaServico>
 *         <Discriminacao>
 *         <CodigoMunicipio>
 *       </Servico>
 *     </InfDeclaracaoPrestacaoServico>
 *   </Rps>
 * </GerarNfseEnvio>
 * 
 * Base Legal:
 * - ABRASF 2.04
 * - NT 2025.001/002 (Reforma Tributária)
 */
export class NFSeXmlBuilder {
  /**
   * Gera XML completo do RPS (Recibo Provisório de Serviços)
   */
  static buildRps(nfse: NFSeDocument): string {
    const xml: string[] = [];
    
    xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push('<GerarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">');
    xml.push('  <Rps>');
    xml.push('    <InfDeclaracaoPrestacaoServico>');
    
    // Identificação do RPS
    xml.push('      <Rps>');
    xml.push(`        <IdentificacaoRps>`);
    xml.push(`          <Numero>${nfse.numero}</Numero>`);
    xml.push(`          <Serie>${nfse.serie || '1'}</Serie>`);
    xml.push(`          <Tipo>1</Tipo>`); // 1 = RPS
    xml.push(`        </IdentificacaoRps>`);
    xml.push(`        <DataEmissao>${this.formatDateTime(nfse.dataEmissao)}</DataEmissao>`);
    xml.push(`        <Status>1</Status>`); // 1 = Normal
    xml.push('      </Rps>');
    
    // Competência
    xml.push(`      <Competencia>${this.formatDate(nfse.competencia)}</Competencia>`);
    
    // Prestador
    xml.push('      <Prestador>');
    xml.push(`        <CpfCnpj>`);
    xml.push(`          <Cnpj>${nfse.prestador.cnpj}</Cnpj>`);
    xml.push(`        </CpfCnpj>`);
    xml.push(`        <InscricaoMunicipal>${nfse.prestador.inscricaoMunicipal}</InscricaoMunicipal>`);
    xml.push('      </Prestador>');
    
    // Tomador
    xml.push('      <Tomador>');
    xml.push('        <IdentificacaoTomador>');
    xml.push(`          <CpfCnpj>`);
    if (nfse.tomador.cpfCnpj.length === 11) {
      xml.push(`            <Cpf>${nfse.tomador.cpfCnpj}</Cpf>`);
    } else {
      xml.push(`            <Cnpj>${nfse.tomador.cpfCnpj}</Cnpj>`);
    }
    xml.push(`          </CpfCnpj>`);
    xml.push(`        </IdentificacaoTomador>`);
    xml.push(`        <RazaoSocial>${this.escapeXml(nfse.tomador.razaoSocial)}</RazaoSocial>`);
    
    // Endereço do tomador (se existir)
    if (nfse.tomador.endereco) {
      xml.push(...this.buildEndereco(nfse.tomador.endereco));
    }
    
    // Contato do tomador
    if (nfse.tomador.email || nfse.tomador.telefone) {
      xml.push('        <Contato>');
      if (nfse.tomador.telefone) {
        xml.push(`          <Telefone>${nfse.tomador.telefone}</Telefone>`);
      }
      if (nfse.tomador.email) {
        xml.push(`          <Email>${this.escapeXml(nfse.tomador.email)}</Email>`);
      }
      xml.push('        </Contato>');
    }
    
    xml.push('      </Tomador>');
    
    // Intermediário (se existir)
    if (nfse.intermediario) {
      xml.push('      <Intermediario>');
      xml.push('        <IdentificacaoIntermediario>');
      xml.push(`          <CpfCnpj>`);
      if (nfse.intermediario.cpfCnpj.length === 11) {
        xml.push(`            <Cpf>${nfse.intermediario.cpfCnpj}</Cpf>`);
      } else {
        xml.push(`            <Cnpj>${nfse.intermediario.cpfCnpj}</Cnpj>`);
      }
      xml.push(`          </CpfCnpj>`);
      xml.push(`        </IdentificacaoIntermediario>`);
      xml.push(`        <RazaoSocial>${this.escapeXml(nfse.intermediario.razaoSocial)}</RazaoSocial>`);
      xml.push('      </Intermediario>');
    }
    
    // Serviço
    xml.push('      <Servico>');
    xml.push('        <Valores>');
    xml.push(`          <ValorServicos>${this.formatDecimal(nfse.servico.valorServicos.amount)}</ValorServicos>`);
    
    if (nfse.servico.valorDeducoes) {
      xml.push(`          <ValorDeducoes>${this.formatDecimal(nfse.servico.valorDeducoes.amount)}</ValorDeducoes>`);
    }
    if (nfse.servico.valorPis) {
      xml.push(`          <ValorPis>${this.formatDecimal(nfse.servico.valorPis.amount)}</ValorPis>`);
    }
    if (nfse.servico.valorCofins) {
      xml.push(`          <ValorCofins>${this.formatDecimal(nfse.servico.valorCofins.amount)}</ValorCofins>`);
    }
    if (nfse.servico.valorInss) {
      xml.push(`          <ValorInss>${this.formatDecimal(nfse.servico.valorInss.amount)}</ValorInss>`);
    }
    if (nfse.servico.valorIr) {
      xml.push(`          <ValorIr>${this.formatDecimal(nfse.servico.valorIr.amount)}</ValorIr>`);
    }
    if (nfse.servico.valorCsll) {
      xml.push(`          <ValorCsll>${this.formatDecimal(nfse.servico.valorCsll.amount)}</ValorCsll>`);
    }
    
    // IssRetido deve estar FORA de <Valores> conforme ABRASF 2.04
    xml.push(`          <ValorIss>${this.formatDecimal(nfse.iss.valorIss.amount)}</ValorIss>`);
    
    if (nfse.iss.valorIssRetido) {
      xml.push(`          <ValorIssRetido>${this.formatDecimal(nfse.iss.valorIssRetido.amount)}</ValorIssRetido>`);
    }
    
    if (nfse.servico.outrasRetencoes) {
      xml.push(`          <OutrasRetencoes>${this.formatDecimal(nfse.servico.outrasRetencoes.amount)}</OutrasRetencoes>`);
    }
    if (nfse.servico.descontoIncondicionado) {
      xml.push(`          <DescontoIncondicionado>${this.formatDecimal(nfse.servico.descontoIncondicionado.amount)}</DescontoIncondicionado>`);
    }
    if (nfse.servico.descontoCondicionado) {
      xml.push(`          <DescontoCondicionado>${this.formatDecimal(nfse.servico.descontoCondicionado.amount)}</DescontoCondicionado>`);
    }
    
    xml.push(`          <BaseCalculo>${this.formatDecimal(nfse.iss.baseCalculo.amount)}</BaseCalculo>`);
    xml.push(`          <Aliquota>${this.formatDecimal(nfse.iss.aliquota)}</Aliquota>`);
    xml.push(`          <ValorLiquidoNfse>${this.formatDecimal(nfse.valorLiquido.amount)}</ValorLiquidoNfse>`);
    
    xml.push('        </Valores>');
    
    xml.push(`        <IssRetido>${nfse.iss.issRetido ? '1' : '2'}</IssRetido>`);
    xml.push(`        <ItemListaServico>${nfse.servico.codigoServico}</ItemListaServico>`);
    xml.push(`        <CodigoCnae>${nfse.servico.codigoCnae}</CodigoCnae>`);
    
    if (nfse.servico.codigoTributacaoMunicipio) {
      xml.push(`        <CodigoTributacaoMunicipio>${nfse.servico.codigoTributacaoMunicipio}</CodigoTributacaoMunicipio>`);
    }
    
    xml.push(`        <Discriminacao>${this.escapeXml(nfse.servico.discriminacao)}</Discriminacao>`);
    
    if (nfse.iss.codigoMunicipioIncidencia) {
      xml.push(`        <CodigoMunicipio>${nfse.iss.codigoMunicipioIncidencia}</CodigoMunicipio>`);
    }
    
    // IBS/CBS (Reforma Tributária)
    if (nfse.ibsCbsGroup) {
      xml.push(GrupoIBSCBS.build(nfse.ibsCbsGroup));
    }
    
    xml.push('      </Servico>');
    
    // Observações
    if (nfse.observacoes) {
      xml.push(`      <Observacoes>${this.escapeXml(nfse.observacoes)}</Observacoes>`);
    }
    
    xml.push('    </InfDeclaracaoPrestacaoServico>');
    xml.push('  </Rps>');
    xml.push('</GerarNfseEnvio>');
    
    return xml.join('\n');
  }

  /**
   * Gera XML de cancelamento
   */
  static buildCancelamento(nfse: NFSeDocument, motivo: string): string {
    if (!nfse.numeroNfse) {
      throw new Error('NFS-e deve estar autorizada para gerar XML de cancelamento');
    }

    const xml: string[] = [];
    
    xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push('<CancelarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">');
    xml.push('  <Pedido>');
    xml.push('    <InfPedidoCancelamento>');
    xml.push('      <IdentificacaoNfse>');
    xml.push(`        <Numero>${nfse.numeroNfse}</Numero>`);
    xml.push(`        <CpfCnpj>`);
    xml.push(`          <Cnpj>${nfse.prestador.cnpj}</Cnpj>`);
    xml.push(`        </CpfCnpj>`);
    xml.push(`        <InscricaoMunicipal>${nfse.prestador.inscricaoMunicipal}</InscricaoMunicipal>`);
    xml.push(`        <CodigoMunicipio>${nfse.prestador.endereco.codigoMunicipio}</CodigoMunicipio>`);
    xml.push('      </IdentificacaoNfse>');
    xml.push(`      <CodigoCancelamento>1</CodigoCancelamento>`); // 1 = Cancelamento normal
    xml.push(`      <MotivoCancelamento>${this.escapeXml(motivo)}</MotivoCancelamento>`);
    xml.push('    </InfPedidoCancelamento>');
    xml.push('  </Pedido>');
    xml.push('</CancelarNfseEnvio>');
    
    return xml.join('\n');
  }

  /**
   * Constrói tag de endereço
   */
  private static buildEndereco(endereco: NFSeAddress): string[] {
    const xml: string[] = [];
    
    xml.push('        <Endereco>');
    xml.push(`          <Endereco>${this.escapeXml(endereco.logradouro)}</Endereco>`);
    xml.push(`          <Numero>${endereco.numero}</Numero>`);
    if (endereco.complemento) {
      xml.push(`          <Complemento>${this.escapeXml(endereco.complemento)}</Complemento>`);
    }
    xml.push(`          <Bairro>${this.escapeXml(endereco.bairro)}</Bairro>`);
    xml.push(`          <CodigoMunicipio>${endereco.codigoMunicipio}</CodigoMunicipio>`);
    xml.push(`          <Uf>${endereco.uf}</Uf>`);
    xml.push(`          <Cep>${endereco.cep}</Cep>`);
    xml.push('        </Endereco>');
    
    return xml;
  }

  /**
   * Formata número decimal (2 casas decimais)
   */
  private static formatDecimal(value: number): string {
    return value.toFixed(2);
  }

  /**
   * Formata data (YYYY-MM-DD)
   */
  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formata data/hora (YYYY-MM-DDTHH:MM:SS)
   */
  private static formatDateTime(date: Date): string {
    const datePart = this.formatDate(date);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${datePart}T${hours}:${minutes}:${seconds}`;
  }

  /**
   * Escapa caracteres especiais XML
   */
  private static escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Valida campos obrigatórios
   */
  static validate(nfse: NFSeDocument): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!nfse.numero || nfse.numero.trim() === '') {
      errors.push('Número do RPS é obrigatório');
    }
    
    if (!nfse.prestador || !nfse.prestador.cnpj) {
      errors.push('CNPJ do prestador é obrigatório');
    }
    
    if (!nfse.prestador.inscricaoMunicipal) {
      errors.push('Inscrição municipal do prestador é obrigatória');
    }
    
    if (!nfse.tomador || !nfse.tomador.cpfCnpj) {
      errors.push('CPF/CNPJ do tomador é obrigatório');
    }
    
    if (!nfse.servico.discriminacao || nfse.servico.discriminacao.trim() === '') {
      errors.push('Discriminação do serviço é obrigatória');
    } else if (nfse.servico.discriminacao.trim().length < 3) {
      errors.push('Discriminação do serviço deve ter no mínimo 3 caracteres');
    }
    
    if (nfse.servico.valorServicos.amount <= 0) {
      errors.push('Valor dos serviços deve ser maior que zero');
    }
    
    if (nfse.valorLiquido.amount <= 0) {
      errors.push('Valor líquido deve ser maior que zero');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

