# AuraCore — Arquitetura (como manter)

## Objetivo
Este diretório é a fonte de verdade da arquitetura do AuraCore:
- contratos (tenant/branch/rbac/api/erros/transações/performance)
- decisões arquiteturais (ADR)
- diagramas (Mermaid / draw.io)
- runbooks operacionais (Coolify/SQL Server/migrações/incidentes)

## Como navegar
- Índice: `docs/architecture/INDEX.md`
- Contratos: `docs/architecture/contracts/*`
- ADRs: `docs/architecture/adr/*`
- Domínios: `docs/architecture/domains/*`
- Diagramas: `docs/architecture/diagrams/*`
- Runbooks: `docs/architecture/runbooks/*`

## Portal opcional (Backstage / TechDocs)
Se você usar Backstage para catálogo e TechDocs, o manifesto está em `catalog-info.yaml` no root do repo.

## Regras de manutenção (anti-regressão)
1) Sempre que uma decisão mudar (ex.: “admin HTTP off em prod”), criar/atualizar um ADR.
2) Sempre que um endpoint novo for criado/alterado em domínios críticos (Financeiro/Contábil/Admin/TMS):
   - validar o Contract de API
   - atualizar o documento do domínio (seção “Riscos atuais & mitigação”, “Endpoints críticos”)
3) Sempre que um incidente ocorrer em produção:
   - registrar no runbook de incidentes (causa, impacto, correção, prevenção)
4) Diagramas:
   - preferir Mermaid quando possível (diagram-as-code)
   - quando usar draw.io, versionar o arquivo `.drawio` no repo

## Quando criar ADR
Crie ADR se a mudança for:
- de contrato/invariante (tenant/branch, userId, RBAC, transação)
- de política operacional (o que pode rodar em prod)
- de estratégia de performance (paginação, search)
- de arquitetura (separação de schemas, boundaries de domínio)

## Qualidade mínima (DoD para docs)
- O doc explica o “por quê” além do “o quê”.
- Links internos estão corretos.
- Não contradiz os contratos.
