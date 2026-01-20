# QA Agent

**Versão:** 1.0.0  
**Status:** Ativo  
**Risk Level:** LOW

## Visão Geral

O QA Agent é especializado em análise de qualidade do frontend do AuraCore. Ele combina análise estática de código, verificação visual e geração de relatórios para identificar problemas antes que afetem os usuários.

## Domínios de Conhecimento

- Análise estática de código React/TypeScript
- Detecção de problemas de UI/UX
- Verificação de handlers e eventos
- Geração de relatórios de qualidade
- Identificação de código incompleto (TODOs, FIXMEs)

## Tools Disponíveis

### 1. code_analyzer

Análise estática de código React/TypeScript.

| Atributo | Valor |
|----------|-------|
| **Risk Level** | LOW |
| **Ação** | Leitura apenas |

**Detecta:**
- `onClick={() => {}}` - Handlers vazios
- `onClick={() => console.log()}` - Apenas debug
- `onSubmit={() => {}}` - Formulários sem ação
- `onChange={() => {}}` - Inputs sem handler
- `href="#"` - Links quebrados
- `disabled={true}` - Elementos sempre desabilitados
- `// TODO` - Marcações pendentes
- `// FIXME` - Correções necessárias
- `debugger` - Código de debug

**Ações:**
- `analyze_file`: Analisa conteúdo de arquivo
- `analyze_pattern`: Busca padrão regex customizado

### 2. visual_auditor

Análise visual de interfaces usando Claude Vision.

| Atributo | Valor |
|----------|-------|
| **Risk Level** | LOW |
| **Ação** | Análise de imagem |

**Verifica:**
- Consistência de design (cores, fontes, espaçamentos)
- Problemas de layout (sobreposição, alinhamento)
- UX (feedback visual, clareza de ações)
- Acessibilidade básica (contraste, tamanho de texto)

**Parâmetros:**
- `image_base64`: Imagem em base64
- `image_url`: URL da imagem
- `page_name`: Nome da página
- `module`: Módulo do sistema
- `focus_areas`: design, ux, accessibility, layout

### 3. component_scanner

Scanner de componentes React para inventário.

| Atributo | Valor |
|----------|-------|
| **Risk Level** | LOW |
| **Ação** | Leitura apenas |

**Funcionalidades:**
- Listar componentes de um módulo
- Identificar componentes sem uso
- Verificar cobertura de testes
- Analisar dependências

**Ações:**
- `scan_module`: Lista componentes do módulo
- `scan_page`: Analisa página específica
- `list_unused`: Encontra não utilizados

### 4. report_generator

Geração de relatórios de qualidade.

| Atributo | Valor |
|----------|-------|
| **Risk Level** | LOW |
| **Ação** | Geração de relatório |

**Formatos:**
- `markdown`: Para documentação e PRs
- `json`: Para integração com ferramentas
- `html`: Para visualização web

**Parâmetros:**
- `title`: Título do relatório
- `summary`: Resumo executivo
- `sections`: Lista de seções
- `format`: Formato de saída
- `include_recommendations`: Incluir sugestões

## Exemplos de Uso

### Análise de Código

```
Usuário: "Analise o código da página de war-room e encontre problemas"

QA Agent:
1. Usa code_analyzer com o conteúdo do arquivo
2. Detecta handlers vazios, TODOs, etc
3. Retorna lista de issues com severidade
```

### Scanner de Módulo

```
Usuário: "Liste os componentes do módulo strategic"

QA Agent:
1. Usa component_scanner com action="scan_module"
2. Retorna lista de componentes com status de testes
3. Identifica issues por componente
```

### Relatório de Qualidade

```
Usuário: "Gere um relatório de qualidade do frontend"

QA Agent:
1. Escaneia múltiplos módulos
2. Agrega issues encontradas
3. Gera relatório em Markdown com recomendações
```

## Categorias de Issues

| Categoria | Severidade | Descrição |
|-----------|------------|-----------|
| EMPTY_ONCLICK | ERROR | onClick vazio |
| EMPTY_ONSUBMIT | ERROR | onSubmit vazio |
| DEBUGGER | ERROR | Statement debugger |
| CONSOLE_ONLY | WARNING | Handler com apenas console.log |
| TODO_HANDLER | WARNING | Handler com TODO |
| HREF_HASH | WARNING | Link com href="#" |
| EMPTY_ONCHANGE | WARNING | onChange vazio |
| FIXME_COMMENT | WARNING | Comentário FIXME |
| TODO_COMMENT | INFO | Comentário TODO |
| DISABLED_TRUE | INFO | Elemento sempre disabled |

## Fluxo de Trabalho Recomendado

1. **Pré-commit**: Rodar `code_analyzer` nos arquivos modificados
2. **Code Review**: Usar `component_scanner` para inventário
3. **Sprint Review**: Gerar `report_generator` com métricas
4. **Release**: Análise visual com `visual_auditor`

## Integração com Scripts

O QA Agent complementa os scripts de análise:

```bash
# Script bash rápido
./scripts/analyze-frontend.sh

# Análise via agente (mais detalhada)
curl -X POST /api/agents/chat \
  -d '{"message": "Analise o módulo strategic"}'
```

## Roadmap

- [ ] Integração com Claude Vision API
- [ ] Análise de acessibilidade WCAG
- [ ] Métricas de performance (Lighthouse)
- [ ] Integração com CI/CD
- [ ] Histórico de issues por arquivo
