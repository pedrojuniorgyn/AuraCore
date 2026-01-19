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
import { generateEntity } from './tools/generate-entity.js';
import { generateUseCase } from './tools/generate-use-case.js';
import { analyzeModuleDependencies } from './tools/analyze-module-dependencies.js';
import { generateModuleDocs } from './tools/generate-module-docs.js';
import { createFeature } from './tools/create-feature.js';
import { migrateLegacyService } from './tools/migrate-legacy-service.js';
import { checkMigrationStatus } from './tools/check-migration-status.js';
import { generateRepository } from './tools/generate-repository.js';
import { generateApiRoute } from './tools/generate-api-route.js';
import { validateSchema } from './tools/validate-schema.js';

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
                enum: ['nfe', 'nfce', 'cte', 'mdfe', 'sped', 'nfse'],
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
        {
          name: 'generate_entity',
          description: 'Gera Entity DDD completa seguindo padrões AuraCore. Inclui create() com validações, reconstitute() sem validações, getters e behaviors.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Nome da Entity em PascalCase (ex: FreightContract)',
              },
              module: {
                type: 'string',
                description: 'Nome do módulo em lowercase (ex: tms, fiscal, wms)',
              },
              properties: {
                type: 'array',
                description: 'Lista de propriedades da Entity',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Nome da propriedade' },
                    type: { type: 'string', description: 'Tipo TypeScript (ex: string, number, Money, Date)' },
                    required: { type: 'boolean', description: 'Se é obrigatório' },
                    description: { type: 'string', description: 'Descrição opcional' },
                  },
                  required: ['name', 'type', 'required'],
                },
              },
              behaviors: {
                type: 'array',
                description: 'Lista de behaviors/métodos (ex: approve, cancel, submit)',
                items: { type: 'string' },
              },
              isAggregateRoot: {
                type: 'boolean',
                description: 'Se true, extends AggregateRoot; se false, extends Entity',
              },
              hasMultiTenancy: {
                type: 'boolean',
                description: 'Se true, inclui organizationId + branchId',
              },
            },
            required: ['name', 'module', 'properties', 'behaviors', 'isAggregateRoot', 'hasMultiTenancy'],
          },
        },
        {
          name: 'generate_use_case',
          description: 'Gera Use Case (Command ou Query) seguindo padrões DDD do AuraCore. Inclui Input Port e Use Case com DI.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Nome do Use Case em PascalCase (ex: ApproveFreightContract)',
              },
              type: {
                type: 'string',
                description: 'Tipo do Use Case',
                enum: ['command', 'query'],
              },
              module: {
                type: 'string',
                description: 'Nome do módulo em lowercase (ex: tms, fiscal, wms)',
              },
              description: {
                type: 'string',
                description: 'Descrição do que o Use Case faz',
              },
              inputFields: {
                type: 'array',
                description: 'Campos do input',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Nome do campo' },
                    type: { type: 'string', description: 'Tipo TypeScript' },
                    required: { type: 'boolean', description: 'Se é obrigatório' },
                    description: { type: 'string', description: 'Descrição opcional' },
                  },
                  required: ['name', 'type', 'required'],
                },
              },
              outputFields: {
                type: 'array',
                description: 'Campos do output',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Nome do campo' },
                    type: { type: 'string', description: 'Tipo TypeScript' },
                    description: { type: 'string', description: 'Descrição opcional' },
                  },
                  required: ['name', 'type'],
                },
              },
              repositories: {
                type: 'array',
                description: 'Lista de repositories necessários (ex: IFreightContractRepository)',
                items: { type: 'string' },
              },
              domainServices: {
                type: 'array',
                description: 'Lista de domain services (opcional)',
                items: { type: 'string' },
              },
            },
            required: ['name', 'type', 'module', 'description', 'inputFields', 'outputFields', 'repositories'],
          },
        },
        {
          name: 'analyze_module_dependencies',
          description: 'Analisa dependências entre camadas de um módulo DDD/Hexagonal. Detecta violações de arquitetura (ARCH-001 a ARCH-005).',
          inputSchema: {
            type: 'object',
            properties: {
              module: {
                type: 'string',
                description: 'Nome do módulo em lowercase (ex: fiscal, tms, wms)',
              },
              check_violations: {
                type: 'boolean',
                description: 'Se true, verifica violações de arquitetura DDD',
              },
              include_external: {
                type: 'boolean',
                description: 'Se true, inclui dependências externas (npm packages)',
              },
            },
            required: ['module', 'check_violations', 'include_external'],
          },
        },
        {
          name: 'generate_module_docs',
          description: 'Gera documentação automática de um módulo DDD. Inclui README, diagramas Mermaid, e API reference.',
          inputSchema: {
            type: 'object',
            properties: {
              module: {
                type: 'string',
                description: 'Nome do módulo em lowercase (ex: fiscal, tms, wms)',
              },
              format: {
                type: 'string',
                description: 'Formato de saída',
                enum: ['markdown', 'html'],
              },
              include_diagrams: {
                type: 'boolean',
                description: 'Se true, gera diagramas Mermaid (classes, fluxo)',
              },
              include_api: {
                type: 'boolean',
                description: 'Se true, documenta API routes do módulo',
              },
            },
            required: ['module', 'format', 'include_diagrams', 'include_api'],
          },
        },
        {
          name: 'create_feature',
          description: 'Cria uma feature DDD completa: Entity + Repository + Mapper + Schema + Use Cases + API Routes (opcional) + Testes (opcional).',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Nome da feature em PascalCase (ex: FreightQuote)',
              },
              module: {
                type: 'string',
                description: 'Nome do módulo em lowercase (ex: tms, fiscal, wms)',
              },
              description: {
                type: 'string',
                description: 'Descrição da feature',
              },
              entity: {
                type: 'object',
                description: 'Configuração da Entity',
                properties: {
                  properties: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        type: { type: 'string' },
                        required: { type: 'boolean' },
                        description: { type: 'string' },
                      },
                      required: ['name', 'type', 'required'],
                    },
                  },
                  behaviors: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Behaviors da entity (ex: approve, cancel)',
                  },
                },
                required: ['properties', 'behaviors'],
              },
              useCases: {
                type: 'array',
                description: 'Use Cases a criar',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Nome do Use Case' },
                    type: { type: 'string', enum: ['command', 'query'] },
                    description: { type: 'string' },
                  },
                  required: ['name', 'type', 'description'],
                },
              },
              options: {
                type: 'object',
                description: 'Opções de geração',
                properties: {
                  createApiRoute: { type: 'boolean', description: 'Criar API routes' },
                  createTests: { type: 'boolean', description: 'Criar testes unitários' },
                  isAggregateRoot: { type: 'boolean', description: 'Entity é Aggregate Root' },
                },
                required: ['createApiRoute', 'createTests', 'isAggregateRoot'],
              },
            },
            required: ['name', 'module', 'description', 'entity', 'useCases', 'options'],
          },
        },
        {
          name: 'migrate_legacy_service',
          description: 'Analisa serviço legado em src/services/ e gera plano de migração para arquitetura DDD.',
          inputSchema: {
            type: 'object',
            properties: {
              servicePath: {
                type: 'string',
                description: 'Caminho do serviço legado (ex: src/services/fiscal/tax-calculator.ts)',
              },
              targetModule: {
                type: 'string',
                description: 'Nome do módulo DDD destino (ex: fiscal, tms)',
              },
              options: {
                type: 'object',
                properties: {
                  generateCode: {
                    type: 'boolean',
                    description: 'Se true, gera código migrado; se false, só plano',
                  },
                  preserveInterface: {
                    type: 'boolean',
                    description: 'Manter interface pública compatível',
                  },
                  dryRun: {
                    type: 'boolean',
                    description: 'Simular sem criar arquivos',
                  },
                },
                required: ['generateCode', 'preserveInterface', 'dryRun'],
              },
            },
            required: ['servicePath', 'targetModule', 'options'],
          },
        },
        {
          name: 'check_migration_status',
          description: 'Verifica status geral da migração DDD do projeto AuraCore.',
          inputSchema: {
            type: 'object',
            properties: {
              verbose: {
                type: 'boolean',
                description: 'Incluir detalhes por arquivo',
              },
              includeMetrics: {
                type: 'boolean',
                description: 'Incluir métricas de código',
              },
            },
            required: ['verbose', 'includeMetrics'],
          },
        },
        {
          name: 'generate_repository',
          description: 'Gera Repository DDD completo: Interface, Implementação Drizzle, Mapper e Schema.',
          inputSchema: {
            type: 'object',
            properties: {
              entityName: {
                type: 'string',
                description: 'Nome da Entity em PascalCase (ex: FreightContract)',
              },
              module: {
                type: 'string',
                description: 'Nome do módulo em lowercase (ex: tms)',
              },
              entity: {
                type: 'object',
                properties: {
                  properties: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        type: { type: 'string' },
                        isNullable: { type: 'boolean' },
                        isUnique: { type: 'boolean' },
                        hasIndex: { type: 'boolean' },
                        dbColumnName: { type: 'string' },
                      },
                      required: ['name', 'type', 'isNullable', 'isUnique', 'hasIndex'],
                    },
                  },
                  hasMultiTenancy: {
                    type: 'boolean',
                    description: 'Se true, inclui organizationId e branchId',
                  },
                },
                required: ['properties', 'hasMultiTenancy'],
              },
              options: {
                type: 'object',
                properties: {
                  includeSoftDelete: { type: 'boolean' },
                  includePagination: { type: 'boolean' },
                  includeSearch: { type: 'boolean' },
                  customMethods: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        parameters: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              type: { type: 'string' },
                            },
                          },
                        },
                        returnType: { type: 'string', enum: ['single', 'array', 'paginated'] },
                        description: { type: 'string' },
                      },
                    },
                  },
                },
                required: ['includeSoftDelete', 'includePagination', 'includeSearch', 'customMethods'],
              },
            },
            required: ['entityName', 'module', 'entity', 'options'],
          },
        },
        {
          name: 'generate_api_route',
          description: 'Gera API Route Next.js 15 completa com validação Zod e autenticação.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Nome em kebab-case (ex: freight-contracts)',
              },
              module: {
                type: 'string',
                description: 'Nome do módulo (ex: tms)',
              },
              basePath: {
                type: 'string',
                description: 'Base path da API (ex: /api/tms/freight-contracts)',
              },
              entity: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  properties: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        type: { type: 'string' },
                        required: { type: 'boolean' },
                        description: { type: 'string' },
                      },
                      required: ['name', 'type', 'required'],
                    },
                  },
                },
                required: ['name', 'properties'],
              },
              endpoints: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
                    path: { type: 'string' },
                    action: { type: 'string' },
                    useCaseName: { type: 'string' },
                    description: { type: 'string' },
                    requestBody: {
                      type: 'object',
                      properties: {
                        properties: { type: 'array' },
                      },
                    },
                    responseType: { type: 'string', enum: ['single', 'array', 'paginated', 'void'] },
                  },
                  required: ['method', 'path', 'action', 'useCaseName', 'description', 'responseType'],
                },
              },
              options: {
                type: 'object',
                properties: {
                  includeOpenAPI: { type: 'boolean' },
                  includeRateLimit: { type: 'boolean' },
                  includeCache: { type: 'boolean' },
                },
                required: ['includeOpenAPI', 'includeRateLimit', 'includeCache'],
              },
            },
            required: ['name', 'module', 'basePath', 'entity', 'endpoints', 'options'],
          },
        },
        {
          name: 'validate_schema',
          description: 'Valida se um schema Drizzle segue os padrões SCHEMA-001 a SCHEMA-010 do AuraCore.',
          inputSchema: {
            type: 'object',
            properties: {
              schemaPath: {
                type: 'string',
                description: 'Caminho do arquivo de schema (ex: src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts)',
              },
              entityPath: {
                type: 'string',
                description: 'Caminho opcional da Entity para comparar campos',
              },
            },
            required: ['schemaPath'],
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

        const validFeatureTypes = ['nfe', 'nfce', 'cte', 'mdfe', 'sped', 'nfse'];
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

      if (name === 'generate_entity') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for generate_entity');
        }

        const typedArgs = args as {
          name?: unknown;
          module?: unknown;
          properties?: unknown;
          behaviors?: unknown;
          isAggregateRoot?: unknown;
          hasMultiTenancy?: unknown;
        };

        // Validar name
        if (!typedArgs.name || typeof typedArgs.name !== 'string') {
          throw new Error('name é obrigatório e deve ser string');
        }

        // Validar module
        if (!typedArgs.module || typeof typedArgs.module !== 'string') {
          throw new Error('module é obrigatório e deve ser string');
        }

        // Validar properties
        if (!Array.isArray(typedArgs.properties)) {
          throw new Error('properties é obrigatório e deve ser array');
        }

        // Validar behaviors
        if (!Array.isArray(typedArgs.behaviors)) {
          throw new Error('behaviors é obrigatório e deve ser array');
        }

        // Validar isAggregateRoot
        if (typeof typedArgs.isAggregateRoot !== 'boolean') {
          throw new Error('isAggregateRoot é obrigatório e deve ser boolean');
        }

        // Validar hasMultiTenancy
        if (typeof typedArgs.hasMultiTenancy !== 'boolean') {
          throw new Error('hasMultiTenancy é obrigatório e deve ser boolean');
        }

        // Validar cada property
        const properties = typedArgs.properties.map((prop: unknown) => {
          if (!prop || typeof prop !== 'object') {
            throw new Error('Cada property deve ser objeto');
          }
          const p = prop as { name?: unknown; type?: unknown; required?: unknown; description?: unknown };
          if (!p.name || typeof p.name !== 'string') {
            throw new Error('Cada property deve ter name (string)');
          }
          if (!p.type || typeof p.type !== 'string') {
            throw new Error('Cada property deve ter type (string)');
          }
          if (typeof p.required !== 'boolean') {
            throw new Error('Cada property deve ter required (boolean)');
          }
          return {
            name: p.name,
            type: p.type,
            required: p.required,
            description: p.description && typeof p.description === 'string' ? p.description : undefined,
          };
        });

        // Validar behaviors são strings
        const behaviors = typedArgs.behaviors.filter(
          (b: unknown): b is string => typeof b === 'string'
        );

        try {
          const result = await generateEntity({
            name: typedArgs.name,
            module: typedArgs.module,
            properties,
            behaviors,
            isAggregateRoot: typedArgs.isAggregateRoot,
            hasMultiTenancy: typedArgs.hasMultiTenancy,
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

          throw new Error(`Failed to generate entity: ${errorMessage}`);
        }
      }

      if (name === 'generate_use_case') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for generate_use_case');
        }

        const typedArgs = args as {
          name?: unknown;
          type?: unknown;
          module?: unknown;
          description?: unknown;
          inputFields?: unknown;
          outputFields?: unknown;
          repositories?: unknown;
          domainServices?: unknown;
        };

        // Validar name
        if (!typedArgs.name || typeof typedArgs.name !== 'string') {
          throw new Error('name é obrigatório e deve ser string');
        }

        // Validar type
        if (!typedArgs.type || typeof typedArgs.type !== 'string') {
          throw new Error('type é obrigatório e deve ser string');
        }
        if (!['command', 'query'].includes(typedArgs.type)) {
          throw new Error('type deve ser "command" ou "query"');
        }

        // Validar module
        if (!typedArgs.module || typeof typedArgs.module !== 'string') {
          throw new Error('module é obrigatório e deve ser string');
        }

        // Validar description
        if (!typedArgs.description || typeof typedArgs.description !== 'string') {
          throw new Error('description é obrigatório e deve ser string');
        }

        // Validar inputFields
        if (!Array.isArray(typedArgs.inputFields)) {
          throw new Error('inputFields é obrigatório e deve ser array');
        }

        // Validar outputFields
        if (!Array.isArray(typedArgs.outputFields)) {
          throw new Error('outputFields é obrigatório e deve ser array');
        }

        // Validar repositories
        if (!Array.isArray(typedArgs.repositories)) {
          throw new Error('repositories é obrigatório e deve ser array');
        }

        // Processar inputFields
        const inputFields = typedArgs.inputFields.map((field: unknown) => {
          if (!field || typeof field !== 'object') {
            throw new Error('Cada inputField deve ser objeto');
          }
          const f = field as { name?: unknown; type?: unknown; required?: unknown; description?: unknown };
          if (!f.name || typeof f.name !== 'string') {
            throw new Error('Cada inputField deve ter name (string)');
          }
          if (!f.type || typeof f.type !== 'string') {
            throw new Error('Cada inputField deve ter type (string)');
          }
          if (typeof f.required !== 'boolean') {
            throw new Error('Cada inputField deve ter required (boolean)');
          }
          return {
            name: f.name,
            type: f.type,
            required: f.required,
            description: f.description && typeof f.description === 'string' ? f.description : undefined,
          };
        });

        // Processar outputFields
        const outputFields = typedArgs.outputFields.map((field: unknown) => {
          if (!field || typeof field !== 'object') {
            throw new Error('Cada outputField deve ser objeto');
          }
          const f = field as { name?: unknown; type?: unknown; description?: unknown };
          if (!f.name || typeof f.name !== 'string') {
            throw new Error('Cada outputField deve ter name (string)');
          }
          if (!f.type || typeof f.type !== 'string') {
            throw new Error('Cada outputField deve ter type (string)');
          }
          return {
            name: f.name,
            type: f.type,
            description: f.description && typeof f.description === 'string' ? f.description : undefined,
          };
        });

        // Processar repositories
        const repositories = typedArgs.repositories.filter(
          (r: unknown): r is string => typeof r === 'string'
        );

        // Processar domainServices (opcional)
        const domainServices = Array.isArray(typedArgs.domainServices)
          ? typedArgs.domainServices.filter((s: unknown): s is string => typeof s === 'string')
          : undefined;

        try {
          const result = await generateUseCase({
            name: typedArgs.name,
            type: typedArgs.type as 'command' | 'query',
            module: typedArgs.module,
            description: typedArgs.description,
            inputFields,
            outputFields,
            repositories,
            domainServices,
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

          throw new Error(`Failed to generate use case: ${errorMessage}`);
        }
      }

      if (name === 'analyze_module_dependencies') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for analyze_module_dependencies');
        }

        const typedArgs = args as {
          module?: unknown;
          check_violations?: unknown;
          include_external?: unknown;
        };

        // Validar module
        if (!typedArgs.module || typeof typedArgs.module !== 'string') {
          throw new Error('module é obrigatório e deve ser string');
        }

        // Validar check_violations
        if (typeof typedArgs.check_violations !== 'boolean') {
          throw new Error('check_violations é obrigatório e deve ser boolean');
        }

        // Validar include_external
        if (typeof typedArgs.include_external !== 'boolean') {
          throw new Error('include_external é obrigatório e deve ser boolean');
        }

        try {
          const result = await analyzeModuleDependencies({
            module: typedArgs.module,
            check_violations: typedArgs.check_violations,
            include_external: typedArgs.include_external,
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

          throw new Error(`Failed to analyze module dependencies: ${errorMessage}`);
        }
      }

      if (name === 'generate_module_docs') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for generate_module_docs');
        }

        const typedArgs = args as {
          module?: unknown;
          format?: unknown;
          include_diagrams?: unknown;
          include_api?: unknown;
        };

        // Validar module
        if (!typedArgs.module || typeof typedArgs.module !== 'string') {
          throw new Error('module é obrigatório e deve ser string');
        }

        // Validar format
        if (!typedArgs.format || typeof typedArgs.format !== 'string') {
          throw new Error('format é obrigatório e deve ser string');
        }
        if (!['markdown', 'html'].includes(typedArgs.format)) {
          throw new Error('format deve ser "markdown" ou "html"');
        }

        // Validar include_diagrams
        if (typeof typedArgs.include_diagrams !== 'boolean') {
          throw new Error('include_diagrams é obrigatório e deve ser boolean');
        }

        // Validar include_api
        if (typeof typedArgs.include_api !== 'boolean') {
          throw new Error('include_api é obrigatório e deve ser boolean');
        }

        try {
          const result = await generateModuleDocs({
            module: typedArgs.module,
            format: typedArgs.format as 'markdown' | 'html',
            include_diagrams: typedArgs.include_diagrams,
            include_api: typedArgs.include_api,
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

          throw new Error(`Failed to generate module docs: ${errorMessage}`);
        }
      }

      if (name === 'create_feature') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for create_feature');
        }

        const typedArgs = args as {
          name?: unknown;
          module?: unknown;
          description?: unknown;
          entity?: unknown;
          useCases?: unknown;
          options?: unknown;
        };

        // Validar name
        if (!typedArgs.name || typeof typedArgs.name !== 'string') {
          throw new Error('name é obrigatório e deve ser string');
        }

        // Validar module
        if (!typedArgs.module || typeof typedArgs.module !== 'string') {
          throw new Error('module é obrigatório e deve ser string');
        }

        // Validar description
        if (!typedArgs.description || typeof typedArgs.description !== 'string') {
          throw new Error('description é obrigatório e deve ser string');
        }

        // Validar entity
        if (!typedArgs.entity || typeof typedArgs.entity !== 'object') {
          throw new Error('entity é obrigatório e deve ser objeto');
        }

        const entity = typedArgs.entity as {
          properties?: unknown;
          behaviors?: unknown;
        };

        if (!Array.isArray(entity.properties)) {
          throw new Error('entity.properties é obrigatório e deve ser array');
        }

        if (!Array.isArray(entity.behaviors)) {
          throw new Error('entity.behaviors é obrigatório e deve ser array');
        }

        // Validar useCases
        if (!Array.isArray(typedArgs.useCases)) {
          throw new Error('useCases é obrigatório e deve ser array');
        }

        // Validar options
        if (!typedArgs.options || typeof typedArgs.options !== 'object') {
          throw new Error('options é obrigatório e deve ser objeto');
        }

        const options = typedArgs.options as {
          createApiRoute?: unknown;
          createTests?: unknown;
          isAggregateRoot?: unknown;
        };

        if (typeof options.createApiRoute !== 'boolean') {
          throw new Error('options.createApiRoute é obrigatório e deve ser boolean');
        }

        if (typeof options.createTests !== 'boolean') {
          throw new Error('options.createTests é obrigatório e deve ser boolean');
        }

        if (typeof options.isAggregateRoot !== 'boolean') {
          throw new Error('options.isAggregateRoot é obrigatório e deve ser boolean');
        }

        try {
          const result = await createFeature({
            name: typedArgs.name,
            module: typedArgs.module,
            description: typedArgs.description,
            entity: {
              properties: entity.properties as { name: string; type: string; required: boolean; description?: string }[],
              behaviors: entity.behaviors as string[],
            },
            useCases: typedArgs.useCases as { name: string; type: 'command' | 'query'; description: string }[],
            options: {
              createApiRoute: options.createApiRoute,
              createTests: options.createTests,
              isAggregateRoot: options.isAggregateRoot,
            },
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

          throw new Error(`Failed to create feature: ${errorMessage}`);
        }
      }

      if (name === 'migrate_legacy_service') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for migrate_legacy_service');
        }

        const typedArgs = args as {
          servicePath?: unknown;
          targetModule?: unknown;
          options?: unknown;
        };

        // Validar servicePath
        if (!typedArgs.servicePath || typeof typedArgs.servicePath !== 'string') {
          throw new Error('servicePath é obrigatório e deve ser string');
        }

        // Validar targetModule
        if (!typedArgs.targetModule || typeof typedArgs.targetModule !== 'string') {
          throw new Error('targetModule é obrigatório e deve ser string');
        }

        // Validar options
        if (!typedArgs.options || typeof typedArgs.options !== 'object') {
          throw new Error('options é obrigatório e deve ser objeto');
        }

        const options = typedArgs.options as {
          generateCode?: unknown;
          preserveInterface?: unknown;
          dryRun?: unknown;
        };

        if (typeof options.generateCode !== 'boolean') {
          throw new Error('options.generateCode é obrigatório e deve ser boolean');
        }

        if (typeof options.preserveInterface !== 'boolean') {
          throw new Error('options.preserveInterface é obrigatório e deve ser boolean');
        }

        if (typeof options.dryRun !== 'boolean') {
          throw new Error('options.dryRun é obrigatório e deve ser boolean');
        }

        try {
          const result = await migrateLegacyService({
            servicePath: typedArgs.servicePath,
            targetModule: typedArgs.targetModule,
            options: {
              generateCode: options.generateCode,
              preserveInterface: options.preserveInterface,
              dryRun: options.dryRun,
            },
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

          throw new Error(`Failed to migrate legacy service: ${errorMessage}`);
        }
      }

      if (name === 'check_migration_status') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for check_migration_status');
        }

        const typedArgs = args as {
          verbose?: unknown;
          includeMetrics?: unknown;
        };

        // Validar verbose
        if (typeof typedArgs.verbose !== 'boolean') {
          throw new Error('verbose é obrigatório e deve ser boolean');
        }

        // Validar includeMetrics
        if (typeof typedArgs.includeMetrics !== 'boolean') {
          throw new Error('includeMetrics é obrigatório e deve ser boolean');
        }

        try {
          const result = await checkMigrationStatus({
            verbose: typedArgs.verbose,
            includeMetrics: typedArgs.includeMetrics,
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

          throw new Error(`Failed to check migration status: ${errorMessage}`);
        }
      }

      if (name === 'generate_repository') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for generate_repository');
        }

        const typedArgs = args as {
          entityName?: unknown;
          module?: unknown;
          entity?: unknown;
          options?: unknown;
        };

        // Validar entityName
        if (!typedArgs.entityName || typeof typedArgs.entityName !== 'string') {
          throw new Error('entityName é obrigatório e deve ser string');
        }

        // Validar module
        if (!typedArgs.module || typeof typedArgs.module !== 'string') {
          throw new Error('module é obrigatório e deve ser string');
        }

        // Validar entity
        if (!typedArgs.entity || typeof typedArgs.entity !== 'object') {
          throw new Error('entity é obrigatório e deve ser objeto');
        }

        const entity = typedArgs.entity as {
          properties?: unknown;
          hasMultiTenancy?: unknown;
        };

        if (!Array.isArray(entity.properties)) {
          throw new Error('entity.properties é obrigatório e deve ser array');
        }

        if (typeof entity.hasMultiTenancy !== 'boolean') {
          throw new Error('entity.hasMultiTenancy é obrigatório e deve ser boolean');
        }

        // Validar options
        if (!typedArgs.options || typeof typedArgs.options !== 'object') {
          throw new Error('options é obrigatório e deve ser objeto');
        }

        const options = typedArgs.options as {
          includeSoftDelete?: unknown;
          includePagination?: unknown;
          includeSearch?: unknown;
          customMethods?: unknown;
        };

        if (typeof options.includeSoftDelete !== 'boolean') {
          throw new Error('options.includeSoftDelete é obrigatório e deve ser boolean');
        }

        if (typeof options.includePagination !== 'boolean') {
          throw new Error('options.includePagination é obrigatório e deve ser boolean');
        }

        if (typeof options.includeSearch !== 'boolean') {
          throw new Error('options.includeSearch é obrigatório e deve ser boolean');
        }

        if (!Array.isArray(options.customMethods)) {
          throw new Error('options.customMethods é obrigatório e deve ser array');
        }

        try {
          const result = await generateRepository({
            entityName: typedArgs.entityName,
            module: typedArgs.module,
            entity: {
              properties: entity.properties as Array<{
                name: string;
                type: string;
                isNullable: boolean;
                isUnique: boolean;
                hasIndex: boolean;
                dbColumnName?: string;
              }>,
              hasMultiTenancy: entity.hasMultiTenancy,
            },
            options: {
              includeSoftDelete: options.includeSoftDelete,
              includePagination: options.includePagination,
              includeSearch: options.includeSearch,
              customMethods: options.customMethods as Array<{
                name: string;
                parameters: Array<{ name: string; type: string }>;
                returnType: 'single' | 'array' | 'paginated';
                description: string;
              }>,
            },
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

          throw new Error(`Failed to generate repository: ${errorMessage}`);
        }
      }

      if (name === 'generate_api_route') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for generate_api_route');
        }

        const typedArgs = args as {
          name?: unknown;
          module?: unknown;
          basePath?: unknown;
          entity?: unknown;
          endpoints?: unknown;
          options?: unknown;
        };

        // Validar name
        if (!typedArgs.name || typeof typedArgs.name !== 'string') {
          throw new Error('name é obrigatório e deve ser string');
        }

        // Validar module
        if (!typedArgs.module || typeof typedArgs.module !== 'string') {
          throw new Error('module é obrigatório e deve ser string');
        }

        // Validar basePath
        if (!typedArgs.basePath || typeof typedArgs.basePath !== 'string') {
          throw new Error('basePath é obrigatório e deve ser string');
        }

        // Validar entity
        if (!typedArgs.entity || typeof typedArgs.entity !== 'object') {
          throw new Error('entity é obrigatório e deve ser objeto');
        }

        const entity = typedArgs.entity as {
          name?: unknown;
          properties?: unknown;
        };

        if (!entity.name || typeof entity.name !== 'string') {
          throw new Error('entity.name é obrigatório e deve ser string');
        }

        if (!Array.isArray(entity.properties)) {
          throw new Error('entity.properties é obrigatório e deve ser array');
        }

        // Validar endpoints
        if (!Array.isArray(typedArgs.endpoints)) {
          throw new Error('endpoints é obrigatório e deve ser array');
        }

        // Validar options
        if (!typedArgs.options || typeof typedArgs.options !== 'object') {
          throw new Error('options é obrigatório e deve ser objeto');
        }

        const options = typedArgs.options as {
          includeOpenAPI?: unknown;
          includeRateLimit?: unknown;
          includeCache?: unknown;
        };

        if (typeof options.includeOpenAPI !== 'boolean') {
          throw new Error('options.includeOpenAPI é obrigatório e deve ser boolean');
        }

        if (typeof options.includeRateLimit !== 'boolean') {
          throw new Error('options.includeRateLimit é obrigatório e deve ser boolean');
        }

        if (typeof options.includeCache !== 'boolean') {
          throw new Error('options.includeCache é obrigatório e deve ser boolean');
        }

        try {
          const result = await generateApiRoute({
            name: typedArgs.name,
            module: typedArgs.module,
            basePath: typedArgs.basePath,
            entity: {
              name: entity.name,
              properties: entity.properties as Array<{
                name: string;
                type: string;
                required: boolean;
                description?: string;
              }>,
            },
            endpoints: typedArgs.endpoints as Array<{
              method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
              path: string;
              action: string;
              useCaseName: string;
              description: string;
              requestBody?: {
                properties: Array<{
                  name: string;
                  type: string;
                  required: boolean;
                }>;
              };
              responseType: 'single' | 'array' | 'paginated' | 'void';
            }>,
            options: {
              includeOpenAPI: options.includeOpenAPI,
              includeRateLimit: options.includeRateLimit,
              includeCache: options.includeCache,
            },
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

          throw new Error(`Failed to generate api route: ${errorMessage}`);
        }
      }

      if (name === 'validate_schema') {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for validate_schema');
        }

        const typedArgs = args as {
          schemaPath?: unknown;
          entityPath?: unknown;
        };

        // Validar schemaPath
        if (!typedArgs.schemaPath || typeof typedArgs.schemaPath !== 'string') {
          throw new Error('schemaPath é obrigatório e deve ser string');
        }

        try {
          const result = await validateSchema({
            schemaPath: typedArgs.schemaPath,
            entityPath: typeof typedArgs.entityPath === 'string' ? typedArgs.entityPath : undefined,
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

          throw new Error(`Failed to validate schema: ${errorMessage}`);
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
