/**
 * MCP Tool: validate_fiscal_compliance
 * 
 * Valida código de features fiscais contra legislação brasileira
 * (ICMS, PIS/COFINS, Reforma 2026, ISS)
 * 
 * @see Lei Complementar 87/96 (ICMS)
 * @see Leis 10.637/02 e 10.833/03 (PIS/COFINS)
 * @see EC 132/2023 (Reforma Tributária)
 * @see LC 116/03 (ISS)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================================================
// TIPOS
// ============================================================================

export type FeatureType = 'nfe' | 'cte' | 'mdfe' | 'sped' | 'nfse';
export type LegislationType = 'icms' | 'pis_cofins' | 'reforma_2026' | 'iss';

export interface ValidateFiscalComplianceInput {
  feature_type: FeatureType;
  code_path: string;
  legislation: LegislationType[];
}

export interface ChecklistItem {
  item: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
}

export interface ValidateFiscalComplianceOutput {
  compliant: boolean;
  checklist: ChecklistItem[];
  aliquotas_corretas: boolean;
  campos_obrigatorios: boolean;
  layout_xml_compativel: boolean;
  warnings_reforma_2026: string[];
}

// ============================================================================
// REGRAS DE VALIDAÇÃO POR FEATURE TYPE
// ============================================================================

interface FeatureRules {
  required_fields: string[];
  required_patterns: RegExp[];
  forbidden_patterns: RegExp[];
  xml_elements?: string[];
}

const FEATURE_RULES: Record<FeatureType, FeatureRules> = {
  nfe: {
    required_fields: [
      'chaveAcesso', 'natOp', 'CFOP', 'CST', 'NCM', 
      'vProd', 'vBC', 'pICMS', 'vICMS'
    ],
    required_patterns: [
      /chave(?:Acesso|NFe)/i,
      /(?:natureza|natOp)(?:Operacao)?/i,
      /CFOP/i,
    ],
    forbidden_patterns: [
      /hardcoded.*aliquota/i,
      /icms\s*=\s*\d+/i, // alíquota hardcoded
    ],
    xml_elements: ['infNFe', 'emit', 'dest', 'det', 'total'],
  },
  cte: {
    required_fields: [
      'chave', 'RNTRC', 'modal', 'CFOP', 'CST',
      'vTPrest', 'vRec', 'xMunIni', 'xMunFim'
    ],
    required_patterns: [
      /RNTRC/i,
      /modal/i,
      /(?:municipio|xMun)(?:Ini|Fim)/i,
    ],
    forbidden_patterns: [
      /hardcoded.*frete/i,
    ],
    xml_elements: ['infCte', 'emit', 'rem', 'dest', 'vPrest'],
  },
  mdfe: {
    required_fields: [
      'chave', 'UFIni', 'UFFim', 'infMunCarrega', 'infMunDescarga'
    ],
    required_patterns: [
      /UF(?:Ini|Fim)/i,
      /infMun(?:Carrega|Descarga)/i,
    ],
    forbidden_patterns: [],
    xml_elements: ['infMDFe', 'emit', 'infModal', 'infDoc'],
  },
  sped: {
    required_fields: [
      'registro', 'organizationId', 'branchId', 'periodo',
      'VL_OPR', 'VL_BC', 'ALIQ', 'VL_IMPOSTO'
    ],
    required_patterns: [
      /registro\s*[A-Z]\d{3}/i,
      /(?:VL_BC|baseCalculo)/i,
      /(?:ALIQ|aliquota)/i,
    ],
    forbidden_patterns: [
      /skip.*validacao/i,
    ],
    xml_elements: [],
  },
  nfse: {
    required_fields: [
      'codigoServico', 'aliquotaISS', 'baseCalculo',
      'valorServicos', 'municipioPrestacao'
    ],
    required_patterns: [
      /(?:codigo|item)Servico/i,
      /ISS/i,
      /municipio(?:Prestacao)?/i,
    ],
    forbidden_patterns: [
      /iss\s*=\s*\d+/i, // alíquota ISS hardcoded
    ],
    xml_elements: ['InfNfse', 'Servico', 'Prestador', 'Tomador'],
  },
};

// ============================================================================
// REGRAS POR LEGISLAÇÃO
// ============================================================================

interface LegislationRules {
  name: string;
  patterns_required: RegExp[];
  patterns_forbidden: RegExp[];
  warnings: string[];
}

const LEGISLATION_RULES: Record<LegislationType, LegislationRules> = {
  icms: {
    name: 'ICMS (LC 87/96)',
    patterns_required: [
      /CST(?:ICMS)?/i,
      /(?:aliquota|pICMS)/i,
      /(?:baseCalculo|vBC)/i,
    ],
    patterns_forbidden: [
      /icms\s*=\s*(?:18|12|7|4)\s*[;%]/i, // alíquota fixa sem lookup
    ],
    warnings: [
      'ICMS deve considerar operação interna vs interestadual',
      'Alíquotas interestaduais: 12% ou 7% (origem Sul/Sudeste para Norte/Nordeste/Centro-Oeste)',
      'FCP (Fundo de Combate à Pobreza) pode ser adicional de até 2%',
    ],
  },
  pis_cofins: {
    name: 'PIS/COFINS (Leis 10.637/02 e 10.833/03)',
    patterns_required: [
      /CST(?:PIS|COFINS)/i,
      /(?:pPIS|pCOFINS|aliquota(?:PIS|COFINS))/i,
    ],
    patterns_forbidden: [
      /pis\s*=\s*(?:0\.65|1\.65)\s*[;%]/i, // hardcoded
      /cofins\s*=\s*(?:3|7\.6)\s*[;%]/i, // hardcoded
    ],
    warnings: [
      'PIS/COFINS tem regime cumulativo (0,65%/3%) e não-cumulativo (1,65%/7,6%)',
      'Alguns produtos têm alíquota zero ou isenção',
      'Créditos de PIS/COFINS devem ser tratados separadamente',
    ],
  },
  reforma_2026: {
    name: 'Reforma Tributária 2026 (EC 132/2023)',
    patterns_required: [],
    patterns_forbidden: [],
    warnings: [
      '⚠️ IBS (Imposto sobre Bens e Serviços) substituirá ICMS+ISS gradualmente',
      '⚠️ CBS (Contribuição sobre Bens e Serviços) substituirá PIS/COFINS',
      '⚠️ Período de transição: 2026-2032',
      '⚠️ Preparar estrutura para campos IBS/CBS em paralelo',
      '⚠️ IS (Imposto Seletivo) para produtos específicos',
    ],
  },
  iss: {
    name: 'ISS (LC 116/03)',
    patterns_required: [
      /(?:codigoServico|itemListaServico)/i,
      /aliquota(?:ISS)?/i,
      /(?:municipio|localPrestacao)/i,
    ],
    patterns_forbidden: [
      /iss\s*=\s*[2-5]\s*[;%]/i, // alíquota fixa
    ],
    warnings: [
      'ISS varia de 2% a 5% dependendo do município',
      'Verificar local de prestação vs local do prestador',
      'Alguns serviços têm retenção obrigatória',
    ],
  },
};

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export async function validateFiscalCompliance(
  input: ValidateFiscalComplianceInput
): Promise<ValidateFiscalComplianceOutput> {
  // Validar input
  if (!input.feature_type || !isValidFeatureType(input.feature_type)) {
    throw new Error(
      `feature_type inválido: ${input.feature_type}. ` +
      `Valores válidos: nfe, cte, mdfe, sped, nfse`
    );
  }

  if (!input.code_path || typeof input.code_path !== 'string') {
    throw new Error('code_path é obrigatório e deve ser string');
  }

  if (!Array.isArray(input.legislation) || input.legislation.length === 0) {
    throw new Error('legislation é obrigatório e deve ser array não vazio');
  }

  // Validar cada legislação
  const invalidLegislation = input.legislation.filter(l => !isValidLegislation(l));
  if (invalidLegislation.length > 0) {
    throw new Error(
      `Legislação inválida: ${invalidLegislation.join(', ')}. ` +
      `Valores válidos: icms, pis_cofins, reforma_2026, iss`
    );
  }

  // Ler código do arquivo ou diretório
  let codeContent: string;
  try {
    codeContent = await readCodeContent(input.code_path);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao ler código: ${errorMessage}`);
  }

  // Inicializar resultado
  const checklist: ChecklistItem[] = [];
  const warningsReforma2026: string[] = [];
  let aliquotasCorretas = true;
  let camposObrigatorios = true;
  let layoutXmlCompativel = true;

  // Aplicar regras do feature type
  const featureRules = FEATURE_RULES[input.feature_type];
  
  // Verificar campos obrigatórios
  for (const field of featureRules.required_fields) {
    const hasField = codeContent.toLowerCase().includes(field.toLowerCase());
    checklist.push({
      item: `Campo obrigatório: ${field}`,
      status: hasField ? 'pass' : 'fail',
      details: hasField 
        ? `Campo ${field} encontrado no código`
        : `Campo ${field} NÃO encontrado - OBRIGATÓRIO para ${input.feature_type.toUpperCase()}`,
    });
    if (!hasField) {
      camposObrigatorios = false;
    }
  }

  // Verificar padrões obrigatórios
  for (const pattern of featureRules.required_patterns) {
    const hasPattern = pattern.test(codeContent);
    checklist.push({
      item: `Padrão obrigatório: ${pattern.source}`,
      status: hasPattern ? 'pass' : 'warning',
      details: hasPattern
        ? 'Padrão encontrado'
        : 'Padrão não encontrado - verificar implementação',
    });
  }

  // Verificar padrões proibidos (anti-patterns fiscais)
  for (const pattern of featureRules.forbidden_patterns) {
    const hasPattern = pattern.test(codeContent);
    if (hasPattern) {
      checklist.push({
        item: `Anti-pattern fiscal: ${pattern.source}`,
        status: 'fail',
        details: 'Código contém padrão proibido - possível alíquota hardcoded',
      });
      aliquotasCorretas = false;
    }
  }

  // Verificar elementos XML (se aplicável)
  if (featureRules.xml_elements && featureRules.xml_elements.length > 0) {
    for (const element of featureRules.xml_elements) {
      const hasElement = codeContent.includes(element);
      if (!hasElement) {
        checklist.push({
          item: `Elemento XML: ${element}`,
          status: 'warning',
          details: `Elemento ${element} não referenciado - verificar se necessário`,
        });
      }
    }
  }

  // Aplicar regras de cada legislação
  for (const legislation of input.legislation) {
    const legislationRules = LEGISLATION_RULES[legislation];
    
    // Verificar padrões obrigatórios da legislação
    for (const pattern of legislationRules.patterns_required) {
      const hasPattern = pattern.test(codeContent);
      checklist.push({
        item: `${legislationRules.name}: ${pattern.source}`,
        status: hasPattern ? 'pass' : 'warning',
        details: hasPattern
          ? `Conformidade com ${legislationRules.name}`
          : `Verificar conformidade com ${legislationRules.name}`,
      });
    }

    // Verificar padrões proibidos
    for (const pattern of legislationRules.patterns_forbidden) {
      const hasPattern = pattern.test(codeContent);
      if (hasPattern) {
        checklist.push({
          item: `VIOLAÇÃO ${legislationRules.name}`,
          status: 'fail',
          details: 'Alíquota hardcoded detectada - usar matriz tributária',
        });
        aliquotasCorretas = false;
      }
    }

    // Adicionar warnings (especialmente para Reforma 2026)
    if (legislation === 'reforma_2026') {
      warningsReforma2026.push(...legislationRules.warnings);
    }
  }

  // Verificações adicionais de layout XML
  if (['nfe', 'cte', 'mdfe', 'nfse'].includes(input.feature_type)) {
    const hasXmlHandling = /xml|parseXml|buildXml|xmlBuilder/i.test(codeContent);
    const hasSchemaValidation = /schema|xsd|validate(?:Xml|Schema)/i.test(codeContent);
    
    if (!hasXmlHandling) {
      checklist.push({
        item: 'Manipulação de XML',
        status: 'warning',
        details: 'Nenhuma referência a XML encontrada - verificar se feature manipula documentos fiscais',
      });
    }

    if (!hasSchemaValidation) {
      checklist.push({
        item: 'Validação de Schema XSD',
        status: 'warning',
        details: 'Sem validação de schema - recomendado para documentos fiscais',
      });
      layoutXmlCompativel = false;
    }
  }

  // Verificar multi-tenancy (obrigatório em todas as features fiscais)
  const hasMultiTenancy = /organizationId.*branchId|branchId.*organizationId/i.test(codeContent);
  checklist.push({
    item: 'Multi-tenancy (organizationId + branchId)',
    status: hasMultiTenancy ? 'pass' : 'fail',
    details: hasMultiTenancy
      ? 'Multi-tenancy implementado corretamente'
      : 'CRÍTICO: Multi-tenancy não detectado - dados fiscais podem vazar entre tenants',
  });

  // Calcular compliance geral
  const failures = checklist.filter(c => c.status === 'fail').length;
  const compliant = failures === 0;

  return {
    compliant,
    checklist,
    aliquotas_corretas: aliquotasCorretas,
    campos_obrigatorios: camposObrigatorios,
    layout_xml_compativel: layoutXmlCompativel,
    warnings_reforma_2026: warningsReforma2026,
  };
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function isValidFeatureType(value: string): value is FeatureType {
  return ['nfe', 'cte', 'mdfe', 'sped', 'nfse'].includes(value);
}

function isValidLegislation(value: string): value is LegislationType {
  return ['icms', 'pis_cofins', 'reforma_2026', 'iss'].includes(value);
}

async function readCodeContent(codePath: string): Promise<string> {
  const stats = await fs.stat(codePath);
  
  if (stats.isFile()) {
    return fs.readFile(codePath, 'utf-8');
  }
  
  if (stats.isDirectory()) {
    // Ler todos os arquivos .ts e .tsx do diretório
    const files = await fs.readdir(codePath);
    const contents: string[] = [];
    
    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const filePath = path.join(codePath, file);
        const fileStats = await fs.stat(filePath);
        if (fileStats.isFile()) {
          const content = await fs.readFile(filePath, 'utf-8');
          contents.push(`// === ${file} ===\n${content}`);
        }
      }
    }
    
    if (contents.length === 0) {
      throw new Error(`Nenhum arquivo .ts ou .tsx encontrado em ${codePath}`);
    }
    
    return contents.join('\n\n');
  }
  
  throw new Error(`Caminho inválido: ${codePath}`);
}
