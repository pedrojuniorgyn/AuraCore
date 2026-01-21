/**
 * SEFAZ Endpoints Configuration
 *
 * Centraliza URLs dos webservices SEFAZ por UF e ambiente.
 * Migrado de src/services/fiscal/sefaz-client.ts e sefaz-cte-client.ts
 *
 * @module integrations/infrastructure/adapters/sefaz
 * @see E10 Fase 3: Migração SEFAZ
 */

// ═══════════════════════════════════════════════════════════════════════════
// CTe/MDFe ENDPOINTS (ex sefaz-client.ts)
// ═══════════════════════════════════════════════════════════════════════════

export const SEFAZ_CTE_MDFE_ENDPOINTS = {
  production: {
    SP: {
      cte: 'https://nfe.fazenda.sp.gov.br/cteWEB/services/CTeRecepcaoV4.asmx',
      mdfe: 'https://mdfe.fazenda.sp.gov.br/ws/MDFeRecepcao/MDFeRecepcao.asmx',
    },
    RJ: {
      cte: 'https://cte.svrs.rs.gov.br/ws/cterecepcao/CTeRecepcaoV4.asmx',
      mdfe: 'https://mdfe.svrs.rs.gov.br/ws/MDFeRecepcao/MDFeRecepcao.asmx',
    },
    // Outros estados usam SVRS (Sefaz Virtual RS) por padrão
    SVRS: {
      cte: 'https://cte.svrs.rs.gov.br/ws/cterecepcao/CTeRecepcaoV4.asmx',
      mdfe: 'https://mdfe.svrs.rs.gov.br/ws/MDFeRecepcao/MDFeRecepcao.asmx',
    },
  },
  homologation: {
    SP: {
      cte: 'https://homologacao.nfe.fazenda.sp.gov.br/cteWEB/services/CTeRecepcaoV4.asmx',
      mdfe: 'https://homologacao.mdfe.fazenda.sp.gov.br/ws/MDFeRecepcao/MDFeRecepcao.asmx',
    },
    SVRS: {
      cte: 'https://cte-homologacao.svrs.rs.gov.br/ws/cterecepcao/CTeRecepcaoV4.asmx',
      mdfe: 'https://mdfe-homologacao.svrs.rs.gov.br/ws/MDFeRecepcao/MDFeRecepcao.asmx',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CTe WEBSERVICE ENDPOINTS (ex sefaz-cte-client.ts)
// ═══════════════════════════════════════════════════════════════════════════

export const SEFAZ_CTE_WEBSERVICE_URLS = {
  // SVRS (Sefaz Virtual do Rio Grande do Sul - atende vários estados)
  SVRS: {
    production: {
      recepcao: 'https://cte.svrs.rs.gov.br/ws/cterecepcao/CteRecepcao.asmx?wsdl',
      retRecepcao: 'https://cte.svrs.rs.gov.br/ws/cteretrecepcao/CTeRetRecepcao.asmx?wsdl',
      consulta: 'https://cte.svrs.rs.gov.br/ws/cteconsulta/CteConsulta.asmx?wsdl',
      cancelamento: 'https://cte.svrs.rs.gov.br/ws/cterecepcaoevento/cterecepcaoevento.asmx?wsdl',
      inutilizacao: 'https://cte.svrs.rs.gov.br/ws/cteinutilizacao/cteinutilizacao.asmx?wsdl',
    },
    homologacao: {
      recepcao: 'https://cte-homologacao.svrs.rs.gov.br/ws/cterecepcao/CteRecepcao.asmx?wsdl',
      retRecepcao: 'https://cte-homologacao.svrs.rs.gov.br/ws/cteretrecepcao/CTeRetRecepcao.asmx?wsdl',
      consulta: 'https://cte-homologacao.svrs.rs.gov.br/ws/cteconsulta/CteConsulta.asmx?wsdl',
      cancelamento: 'https://cte-homologacao.svrs.rs.gov.br/ws/cterecepcaoevento/cterecepcaoevento.asmx?wsdl',
      inutilizacao: 'https://cte-homologacao.svrs.rs.gov.br/ws/cteinutilizacao/cteinutilizacao.asmx?wsdl',
    },
  },
  // SP (São Paulo)
  SP: {
    production: {
      recepcao: 'https://cte.fazenda.sp.gov.br/ws/cterecepcao.asmx?wsdl',
      retRecepcao: 'https://cte.fazenda.sp.gov.br/ws/cteretrecepcao.asmx?wsdl',
      consulta: 'https://cte.fazenda.sp.gov.br/ws/cteconsulta.asmx?wsdl',
      cancelamento: 'https://cte.fazenda.sp.gov.br/ws/cterecepcaoevento.asmx?wsdl',
      inutilizacao: 'https://cte.fazenda.sp.gov.br/ws/cteinutilizacao.asmx?wsdl',
    },
    homologacao: {
      recepcao: 'https://homologacao.cte.fazenda.sp.gov.br/ws/cterecepcao.asmx?wsdl',
      retRecepcao: 'https://homologacao.cte.fazenda.sp.gov.br/ws/cteretrecepcao.asmx?wsdl',
      consulta: 'https://homologacao.cte.fazenda.sp.gov.br/ws/cteconsulta.asmx?wsdl',
      cancelamento: 'https://homologacao.cte.fazenda.sp.gov.br/ws/cterecepcaoevento.asmx?wsdl',
      inutilizacao: 'https://homologacao.cte.fazenda.sp.gov.br/ws/cteinutilizacao.asmx?wsdl',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// NFe DistribuicaoDFe ENDPOINTS (ex sefaz-service.ts)
// ═══════════════════════════════════════════════════════════════════════════

export const SEFAZ_NFE_DISTRIBUICAO_URLS = {
  HOMOLOGATION: 'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
  PRODUCTION: 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
};

// ═══════════════════════════════════════════════════════════════════════════
// MAPEAMENTO UF → WEBSERVICE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mapa de UF para webservice CTe
 * SP tem webservice próprio, demais usam SVRS
 */
export const UF_TO_WEBSERVICE: Record<string, 'SP' | 'SVRS'> = {
  AC: 'SVRS',
  AL: 'SVRS',
  AM: 'SVRS',
  AP: 'SVRS',
  BA: 'SVRS',
  CE: 'SVRS',
  DF: 'SVRS',
  ES: 'SVRS',
  GO: 'SVRS',
  MA: 'SVRS',
  MG: 'SVRS',
  MS: 'SVRS',
  MT: 'SVRS',
  PA: 'SVRS',
  PB: 'SVRS',
  PE: 'SVRS',
  PI: 'SVRS',
  PR: 'SVRS',
  RJ: 'SVRS',
  RN: 'SVRS',
  RO: 'SVRS',
  RR: 'SVRS',
  RS: 'SVRS',
  SC: 'SVRS',
  SE: 'SVRS',
  SP: 'SP',
  TO: 'SVRS',
};

// ═══════════════════════════════════════════════════════════════════════════
// MAPEAMENTO UF ↔ CÓDIGO IBGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mapa de código IBGE para sigla UF
 */
export const IBGE_CODE_TO_UF: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
  '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS',
  '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

/**
 * Mapa de sigla UF para código IBGE
 */
export const UF_TO_IBGE_CODE: Record<string, string> = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17',
  MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27', SE: '28', BA: '29',
  MG: '31', ES: '32', RJ: '33', SP: '35',
  PR: '41', SC: '42', RS: '43',
  MS: '50', MT: '51', GO: '52', DF: '53',
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtém UF a partir da chave de acesso (44 dígitos)
 * Os 2 primeiros dígitos são o código IBGE da UF
 */
export function getUfFromAccessKey(accessKey: string): string {
  const ibgeCode = accessKey.substring(0, 2);
  return IBGE_CODE_TO_UF[ibgeCode] || 'SP';
}

/**
 * Obtém código IBGE da UF
 */
export function getIbgeCodeFromUf(uf: string): string {
  return UF_TO_IBGE_CODE[uf.toUpperCase()] || '35'; // Default SP
}

/**
 * Obtém URL do webservice CTe para UF e ambiente
 */
export function getCteWebserviceUrl(
  uf: string,
  environment: 'production' | 'homologation',
  service: 'recepcao' | 'consulta' | 'cancelamento' | 'inutilizacao'
): string {
  const webservice = UF_TO_WEBSERVICE[uf.toUpperCase()] || 'SVRS';
  const envKey = environment === 'production' ? 'production' : 'homologacao';
  return SEFAZ_CTE_WEBSERVICE_URLS[webservice][envKey][service];
}
