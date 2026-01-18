import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { listContracts, getContract } from './resources/contracts.js';
import { listADRs, getADR } from './resources/adrs.js';
import { checkCursorIssues, IssueCheckResult } from './tools/check-cursor-issues.js';
import { getEpicStatus } from './tools/get-epic-status.js';
import { getContractTool } from './tools/get-contract-tool.js';
import { searchPatterns } from './tools/search-patterns.js';
import { proposePattern } from './tools/propose-pattern.js';
import { validateCode } from './tools/validate-code.js';
import { checkCompliance } from './tools/check-compliance.js';
import { registerCorrection } from './tools/register-correction.js';
import { validateFiscalCompliance } from './tools/validate-fiscal-compliance.js';
import { calculateTaxScenario } from './tools/calculate-tax-scenario.js';

export class AuraCoreMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'auracore-knowledge',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'ping',
          description: 'Test tool - responds with pong',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'check_cursor_issues',
          description: 'Verifica issues identificados pelo Cursor apos operacoes criticas',
          inputSchema: {
            type: 'object',
            properties: {
              context: {
                type: 'string',
                description: 'Contexto da verificacao',
              },
              scope: {
                type: 'string',
                description: 'Escopo da verificacao',
                default: '.',
              },
            },
            required: ['context'],
          },
        },
        {
          name: 'get_epic_status',
          description: 'Retorna status e detalhes de um epico especifico',
          inputSchema: {
            type: 'object',
            properties: {
              epic_id: {
                type: 'string',
                description: 'ID do epico (E0, E1, E2, etc)',
                pattern: '^E[0-9]$',
              },
            },
            required: ['epic_id'],
          },
        },
        {
          name: 'get_contract',
          description: 'Retorna contrato completo por ID',
          inputSchema: {
            type: 'object',
            properties: {
              contract_id: {
                type: 'string',
                description: 'ID do contrato (ex: api-contract, rbac-contract)',
              },
            },
            required: ['contract_id'],
          },
        },
        {
          name: 'search_patterns',
          description: 'Busca padroes de codigo aprovados baseado em query',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Texto para buscar em padroes',
              },
              status: {
                type: 'string',
                description: 'Filtrar por status',
                enum: ['approved', 'proposed', 'all'],
                default: 'approved',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'propose_pattern',
          description: 'Propoe novo padrao de codigo para aprovacao',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID do padrao (lowercase-hyphen)',
              },
              name: {
                type: 'string',
                description: 'Nome do padrao',
              },
              category: {
                type: 'string',
                description: 'Categoria',
              },
              description: {
                type: 'string',
                description: 'Descricao',
              },
              example: {
                type: 'string',
                description: 'Exemplo de codigo',
              },
              rules: {
                type: 'array',
                description: 'Regras',
                items: { type: 'string' },
              },
              tags: {
                type: 'array',
                description: 'Tags',
                items: { type: 'string' },
              },
            },
            required: ['id', 'name', 'category', 'description'],
          },
        },
        {
          name: 'validate_code',
          description: 'Valida codigo contra regras de contratos especificos',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Codigo a ser validado',
              },
              contract_ids: {
                type: 'array',
                description: 'IDs dos contratos para validar',
                items: { type: 'string' },
              },
              language: {
                type: 'string',
                description: 'Linguagem do codigo',
                enum: ['typescript', 'javascript', 'sql'],
                default: 'typescript',
              },
            },
            required: ['code', 'contract_ids'],
          },
        },
        {
          name: 'check_compliance',
          description: 'Verifica compliance geral de um arquivo contra contratos e padroes',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Caminho do arquivo a ser verificado',
              },
            },
            required: ['file_path'],
          },
        },
        {
          name: 'register_correction',
          description: 'Registra uma correção de issue para evitar reincidência. Use SEMPRE após corrigir uma issue do Agent Review ou qualquer erro encontrado.',
          inputSchema: {
            type: 'object',
            properties: {
              epic: {
                type: 'string',
                description: 'Épico atual (ex: E0.1, E2, E3)',
              },
              error_description: {
                type: 'string',
                description: 'Descrição clara do erro/issue encontrado',
              },
              correction_applied: {
                type: 'string',
                description: 'Descrição de como o erro foi corrigido',
              },
              files_affected: {
                type: 'array',
                items: { type: 'string' },
                description: 'Lista de arquivos que foram corrigidos',
              },
              pattern_name: {
                type: 'string',
                description: 'Nome do padrão criado, se aplicável (opcional)',
              },
            },
            required: ['epic', 'error_description', 'correction_applied', 'files_affected'],
          },
        },
        {
          name: 'validate_fiscal_compliance',
          description: 'Valida código de features fiscais contra legislação brasileira (ICMS, PIS/COFINS, Reforma 2026, ISS). Verifica campos obrigatórios, alíquotas e layout XML.',
          inputSchema: {
            type: 'object',
            properties: {
              feature_type: {
                type: 'string',
                description: 'Tipo de feature fiscal',
                enum: ['nfe', 'cte', 'mdfe', 'sped', 'nfse'],
              },
              code_path: {
                type: 'string',
                description: 'Caminho do arquivo ou diretório a ser validado (ex: src/modules/fiscal/...)',
              },
              legislation: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['icms', 'pis_cofins', 'reforma_2026', 'iss'],
                },
                description: 'Legislações a serem verificadas',
              },
            },
            required: ['feature_type', 'code_path', 'legislation'],
          },
        },
        {
          name: 'calculate_tax_scenario',
          description: 'Calcula impostos para cenários de operação no Brasil. Suporta ICMS, PIS/COFINS, ISS e preview da Reforma 2026 (IBS/CBS).',
          inputSchema: {
            type: 'object',
            properties: {
              operation_type: {
                type: 'string',
                description: 'Tipo de operação',
                enum: ['venda', 'compra', 'transferencia', 'devolucao', 'servico'],
              },
              origin_uf: {
                type: 'string',
                description: 'UF de origem (ex: SP, RJ, MG)',
              },
              dest_uf: {
                type: 'string',
                description: 'UF de destino (ex: SP, RJ, MG)',
              },
              product_ncm: {
                type: 'string',
                description: 'NCM do produto (8 dígitos, opcional)',
              },
              service_code: {
                type: 'string',
                description: 'Código do serviço conforme LC 116/03 (opcional)',
              },
              value: {
                type: 'number',
                description: 'Valor da operação em reais',
              },
              is_simples_nacional: {
                type: 'boolean',
                description: 'Se a empresa é optante pelo Simples Nacional',
              },
              include_2026_preview: {
                type: 'boolean',
                description: 'Incluir preview dos impostos da Reforma 2026 (IBS/CBS)',
              },
            },
            required: ['operation_type', 'origin_uf', 'dest_uf', 'value', 'is_simples_nacional'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'ping') {
        return {
          content: [
            {
              type: 'text',
              text: 'PONG! AuraCore MCP Server is working!',
            },
          ],
        };
      }

      if (name === 'check_cursor_issues') {
        // Validar argumentos
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for check_cursor_issues');
        }

        const typedArgs = args as { context?: unknown; scope?: unknown };
        const context = typedArgs.context;

        if (!context || typeof context !== 'string' || context.trim() === '') {
          throw new Error('check_cursor_issues requires non-empty context parameter');
        }

        const scope = typeof typedArgs.scope === 'string' ? typedArgs.scope : '.';

        const result = await checkCursorIssues(context, scope);

        return {
          content: [
            {
              type: 'text',
              text: formatIssueCheckResult(result),
            },
          ],
        };
      }

      if (name === 'get_epic_status') {
        // Validar argumentos (LESSON LEARNED #9)
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for get_epic_status');
        }

        const typedArgs = args as { epic_id?: unknown };
        const epicId = typedArgs.epic_id;

        if (!epicId || typeof epicId !== 'string') {
          throw new Error('get_epic_status requires epic_id parameter');
        }

        try {
          const status = await getEpicStatus(epicId);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(status, null, 2),
              },
            ],
          };
        } catch (error: unknown) {
          const errorMessage = error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Unknown error';

          throw new Error(`Failed to get epic status: ${errorMessage}`);
        }
      }

      if (name === 'get_contract') {
        // Validar argumentos
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for get_contract');
        }

        const typedArgs = args as { contract_id?: unknown };
        const contractId = typedArgs.contract_id;

        if (!contractId || typeof contractId !== 'string') {
          throw new Error('get_contract requires contract_id parameter');
        }

        try {
          const contract = await getContractTool(contractId);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(contract, null, 2),
              },
            ],
          };
        } catch (error: unknown) {
          const errorMessage = error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Unknown error';

          throw new Error(`Failed to get contract: ${errorMessage}`);
        }
      }

      if (name === 'search_patterns') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for search_patterns');
        }

        const typedArgs = args as { query?: unknown; status?: unknown };
        const query = typedArgs.query;

        if (!query || typeof query !== 'string') {
          throw new Error('search_patterns requires query parameter');
        }

        const status = typedArgs.status && typeof typedArgs.status === 'string'
          ? (typedArgs.status as 'approved' | 'proposed' | 'all')
          : 'approved';

        try {
          const result = await searchPatterns(query, status);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: unknown) {
          const errorMessage = error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Unknown error';

          throw new Error(`Failed to search patterns: ${errorMessage}`);
        }
      }

      if (name === 'propose_pattern') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for propose_pattern');
        }

        const typedArgs = args as {
          id?: unknown;
          name?: unknown;
          category?: unknown;
          description?: unknown;
          example?: unknown;
          rules?: unknown;
          tags?: unknown;
        };

        // Validacao explicita de campos obrigatorios (SEM type assertions)
        const id = typedArgs.id;
        const nameField = typedArgs.name;
        const category = typedArgs.category;
        const description = typedArgs.description;

        if (!id || typeof id !== 'string') {
          throw new Error('propose_pattern requires id (string)');
        }
        if (!nameField || typeof nameField !== 'string') {
          throw new Error('propose_pattern requires name (string)');
        }
        if (!category || typeof category !== 'string') {
          throw new Error('propose_pattern requires category (string)');
        }
        if (!description || typeof description !== 'string') {
          throw new Error('propose_pattern requires description (string)');
        }

        // Montar input com tipos validados
        const input: {
          id: string;
          name: string;
          category: string;
          description: string;
          example?: string;
          rules?: string[];
          tags?: string[];
        } = {
          id,
          name: nameField,
          category,
          description
        };

        // Campos opcionais - validar antes de adicionar
        if (typedArgs.example !== undefined) {
          if (typeof typedArgs.example !== 'string') {
            throw new Error('example must be a string if provided');
          }
          input.example = typedArgs.example;
        }

        if (typedArgs.rules !== undefined) {
          if (!Array.isArray(typedArgs.rules)) {
            throw new Error('rules must be an array if provided');
          }
          // Filtrar apenas strings validas
          input.rules = typedArgs.rules.filter(r => typeof r === 'string');
        }

        if (typedArgs.tags !== undefined) {
          if (!Array.isArray(typedArgs.tags)) {
            throw new Error('tags must be an array if provided');
          }
          // Filtrar apenas strings validas
          input.tags = typedArgs.tags.filter(t => typeof t === 'string');
        }

        try {
          const pattern = await proposePattern(input);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(pattern, null, 2),
              },
            ],
          };
        } catch (error: unknown) {
          const errorMessage = error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Unknown error';

          throw new Error(`Failed to propose pattern: ${errorMessage}`);
        }
      }

      if (name === 'validate_code') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for validate_code');
        }

        const typedArgs = args as {
          code?: unknown;
          contract_ids?: unknown;
          language?: unknown;
        };

        const code = typedArgs.code;
        const contractIds = typedArgs.contract_ids;
        const language = typedArgs.language;

        // Validacao code
        if (!code || typeof code !== 'string') {
          throw new Error('validate_code requires code (string)');
        }

        // Validacao contract_ids (array + element types)
        if (!Array.isArray(contractIds)) {
          throw new Error('validate_code requires contract_ids (array)');
        }

        if (contractIds.length === 0) {
          throw new Error('contract_ids must contain at least one contract ID');
        }

        const invalidElements = contractIds.filter(id => typeof id !== 'string');
        if (invalidElements.length > 0) {
          throw new Error(
            `contract_ids must contain only strings. Found ${invalidElements.length} non-string element(s): ${JSON.stringify(invalidElements.slice(0, 3))}`
          );
        }

        // Validar strings nao vazias
        const emptyStrings = contractIds.filter(id => 
          typeof id === 'string' && id.trim() === ''
        );
        if (emptyStrings.length > 0) {
          throw new Error(
            `contract_ids must contain non-empty strings. Found ${emptyStrings.length} empty string(s)`
          );
        }

        // Validar que ha pelo menos 1 ID valido apos filtros
        const validIds = contractIds.filter(id => 
          typeof id === 'string' && id.trim() !== ''
        );
        if (validIds.length === 0) {
          throw new Error('contract_ids must contain at least one valid non-empty string');
        }

        // Validacao language
        const lang = language && typeof language === 'string'
          ? language as 'typescript' | 'javascript' | 'sql'
          : 'typescript';

        if (!['typescript', 'javascript', 'sql'].includes(lang)) {
          throw new Error('language must be typescript, javascript, or sql');
        }

        try {
          const result = await validateCode(code, contractIds, lang);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: unknown) {
          const errorMessage = error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Unknown error';

          throw new Error(`Failed to validate code: ${errorMessage}`);
        }
      }

      if (name === 'check_compliance') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for check_compliance');
        }

        const typedArgs = args as {
          file_path?: unknown;
        };

        const filePath = typedArgs.file_path;

        // Validacao file_path
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('check_compliance requires file_path (string)');
        }

        if (filePath.trim() === '') {
          throw new Error('file_path must be a non-empty string');
        }

        try {
          const report = await checkCompliance(filePath);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(report, null, 2),
              },
            ],
          };
        } catch (error: unknown) {
          const errorMessage = error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Unknown error';

          throw new Error(`Failed to check compliance: ${errorMessage}`);
        }
      }

      if (name === 'register_correction') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for register_correction');
        }

        const input = args as {
          epic?: unknown;
          error_description?: unknown;
          correction_applied?: unknown;
          files_affected?: unknown;
          pattern_name?: unknown;
        };

        // Validar campos obrigatórios
        if (!input.epic || typeof input.epic !== 'string') {
          throw new Error('epic é obrigatório e deve ser string');
        }
        if (!input.error_description || typeof input.error_description !== 'string') {
          throw new Error('error_description é obrigatório e deve ser string');
        }
        if (!input.correction_applied || typeof input.correction_applied !== 'string') {
          throw new Error('correction_applied é obrigatório e deve ser string');
        }
        if (!Array.isArray(input.files_affected) || input.files_affected.length === 0) {
          throw new Error('files_affected é obrigatório e deve ser array não vazio');
        }

        // Validar que todos elementos de files_affected são strings
        const invalidFiles = input.files_affected.filter(f => typeof f !== 'string');
        if (invalidFiles.length > 0) {
          throw new Error('files_affected deve conter apenas strings');
        }

        // pattern_name é opcional
        const patternName = input.pattern_name && typeof input.pattern_name === 'string'
          ? input.pattern_name
          : undefined;

        try {
          const result = await registerCorrection({
            epic: input.epic,
            error_description: input.error_description,
            correction_applied: input.correction_applied,
            files_affected: input.files_affected as string[],
            pattern_name: patternName,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: unknown) {
          const errorMessage = error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Unknown error';

          throw new Error(`Failed to register correction: ${errorMessage}`);
        }
      }

      if (name === 'validate_fiscal_compliance') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for validate_fiscal_compliance');
        }

        const typedArgs = args as {
          feature_type?: unknown;
          code_path?: unknown;
          legislation?: unknown;
        };

        // Validar feature_type
        const featureType = typedArgs.feature_type;
        if (!featureType || typeof featureType !== 'string') {
          throw new Error('feature_type é obrigatório e deve ser string');
        }

        const validFeatureTypes = ['nfe', 'cte', 'mdfe', 'sped', 'nfse'];
        if (!validFeatureTypes.includes(featureType)) {
          throw new Error(
            `feature_type inválido: ${featureType}. Valores válidos: ${validFeatureTypes.join(', ')}`
          );
        }

        // Validar code_path
        const codePath = typedArgs.code_path;
        if (!codePath || typeof codePath !== 'string') {
          throw new Error('code_path é obrigatório e deve ser string');
        }

        // Validar legislation
        const legislation = typedArgs.legislation;
        if (!Array.isArray(legislation) || legislation.length === 0) {
          throw new Error('legislation é obrigatório e deve ser array não vazio');
        }

        const validLegislation = ['icms', 'pis_cofins', 'reforma_2026', 'iss'];
        const invalidLegislation = legislation.filter(
          l => typeof l !== 'string' || !validLegislation.includes(l)
        );
        if (invalidLegislation.length > 0) {
          throw new Error(
            `Legislação inválida: ${JSON.stringify(invalidLegislation)}. ` +
            `Valores válidos: ${validLegislation.join(', ')}`
          );
        }

        try {
          const result = await validateFiscalCompliance({
            feature_type: featureType as 'nfe' | 'cte' | 'mdfe' | 'sped' | 'nfse',
            code_path: codePath,
            legislation: legislation as ('icms' | 'pis_cofins' | 'reforma_2026' | 'iss')[],
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: unknown) {
          const errorMessage = error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Unknown error';

          throw new Error(`Failed to validate fiscal compliance: ${errorMessage}`);
        }
      }

      if (name === 'calculate_tax_scenario') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for calculate_tax_scenario');
        }

        const typedArgs = args as {
          operation_type?: unknown;
          origin_uf?: unknown;
          dest_uf?: unknown;
          product_ncm?: unknown;
          service_code?: unknown;
          value?: unknown;
          is_simples_nacional?: unknown;
          include_2026_preview?: unknown;
        };

        // Validar operation_type
        const operationType = typedArgs.operation_type;
        if (!operationType || typeof operationType !== 'string') {
          throw new Error('operation_type é obrigatório e deve ser string');
        }

        const validOperations = ['venda', 'compra', 'transferencia', 'devolucao', 'servico'];
        if (!validOperations.includes(operationType)) {
          throw new Error(
            `operation_type inválido: ${operationType}. Valores válidos: ${validOperations.join(', ')}`
          );
        }

        // Validar origin_uf
        const originUf = typedArgs.origin_uf;
        if (!originUf || typeof originUf !== 'string') {
          throw new Error('origin_uf é obrigatório e deve ser string');
        }

        // Validar dest_uf
        const destUf = typedArgs.dest_uf;
        if (!destUf || typeof destUf !== 'string') {
          throw new Error('dest_uf é obrigatório e deve ser string');
        }

        // Validar value
        const value = typedArgs.value;
        if (typeof value !== 'number' || isNaN(value)) {
          throw new Error('value é obrigatório e deve ser número');
        }

        // Validar is_simples_nacional
        const isSimplesNacional = typedArgs.is_simples_nacional;
        if (typeof isSimplesNacional !== 'boolean') {
          throw new Error('is_simples_nacional é obrigatório e deve ser boolean');
        }

        // Campos opcionais
        const productNcm = typedArgs.product_ncm && typeof typedArgs.product_ncm === 'string'
          ? typedArgs.product_ncm
          : undefined;

        const serviceCode = typedArgs.service_code && typeof typedArgs.service_code === 'string'
          ? typedArgs.service_code
          : undefined;

        const include2026Preview = typedArgs.include_2026_preview === true;

        try {
          const result = await calculateTaxScenario({
            operation_type: operationType as 'venda' | 'compra' | 'transferencia' | 'devolucao' | 'servico',
            origin_uf: originUf,
            dest_uf: destUf,
            product_ncm: productNcm,
            service_code: serviceCode,
            value,
            is_simples_nacional: isSimplesNacional,
            include_2026_preview: include2026Preview,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: unknown) {
          const errorMessage = error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Unknown error';

          throw new Error(`Failed to calculate tax scenario: ${errorMessage}`);
        }
      }

      throw new Error(`Unknown tool: ${name}`);
    });

    // Resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const contracts = await listContracts();
      const adrs = await listADRs();
      
      return {
        resources: [...contracts, ...adrs],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        // Parse URI (contract://api-contract ou adr://0001-sqlserver-only)
        const [protocol, id] = uri.split('://');

        if (!id) {
          throw new Error(`Invalid URI format: ${uri}. Expected protocol://id`);
        }

        if (protocol === 'contract') {
          const content = await getContract(id);
          return {
            contents: [
              {
                uri,
                // CORRECAO: text/plain para conteudo texto (nao application/json)
                mimeType: 'text/plain',
                text: content,
              },
            ],
          };
        }

        if (protocol === 'adr') {
          const content = await getADR(id);
          return {
            contents: [
              {
                uri,
                // CORRECAO: text/plain para conteudo texto
                mimeType: 'text/plain',
                text: content,
              },
            ],
          };
        }

        throw new Error(`Unknown resource protocol: ${protocol}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error reading resource ${uri}:`, errorMessage);
        throw new Error(`Failed to read resource: ${errorMessage}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AuraCore MCP Server v1.0.0 running');
  }
}

function formatIssueCheckResult(result: IssueCheckResult): string {
  let output = `VERIFICACAO DE ISSUES - ${result.context}\n\n`;
  output += `Timestamp: ${result.timestamp}\n`;
  output += `Escopo: ${result.scope}\n`;
  output += `Total: ${result.totalIssues}\n\n`;

  if (result.critical.length > 0) {
    output += `CRITICO (${result.critical.length}):\n`;
    result.critical.forEach(issue => {
      output += `  ${issue.file}:${issue.line} - ${issue.message}\n`;
    });
    output += '\n';
  }

  if (result.high.length > 0) {
    output += `ALTA (${result.high.length}):\n`;
    result.high.forEach(issue => {
      output += `  ${issue.file}:${issue.line} - ${issue.message}\n`;
    });
    output += '\n';
  }

  if (result.medium.length > 0) {
    output += `MEDIA (${result.medium.length}):\n`;
    result.medium.slice(0, 3).forEach(issue => {
      output += `  ${issue.file}:${issue.line} - ${issue.message}\n`;
    });
    if (result.medium.length > 3) {
      output += `  ... e mais ${result.medium.length - 3} issue(s)\n`;
    }
    output += '\n';
  }

  if (result.low.length > 0) {
    output += `BAIXA (${result.low.length}):\n`;
    result.low.slice(0, 3).forEach(issue => {
      output += `  ${issue.file}:${issue.line} - ${issue.message}\n`;
    });
    if (result.low.length > 3) {
      output += `  ... e mais ${result.low.length - 3} issue(s)\n`;
    }
    output += '\n';
  }

  output += `\nRECOMENDACAO: ${result.recommendation}`;
  return output;
}
