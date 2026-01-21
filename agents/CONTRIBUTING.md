# 🤝 Contributing to AuraCore

Obrigado pelo interesse em contribuir para o AuraCore!

## Code of Conduct

Este projeto adota o [Contributor Covenant](https://www.contributor-covenant.org/).
Seja respeitoso e inclusivo em todas as interações.

## Como Contribuir

### Reportando Bugs

1. Verifique se já não existe uma [issue similar](https://github.com/pedrojuniorgyn/AuraCore/issues)
2. Crie uma nova issue usando o template de bug report
3. Inclua:
   - Versão do AuraCore
   - Passos para reproduzir
   - Comportamento esperado vs comportamento atual
   - Logs relevantes (sem secrets!)
   - Ambiente (OS, Python version, etc)

### Sugerindo Features

1. Verifique o [roadmap](https://github.com/pedrojuniorgyn/AuraCore/projects) e issues existentes
2. Crie uma issue usando o template de feature request
3. Descreva claramente:
   - O problema que a feature resolve
   - Casos de uso
   - Comportamento esperado

### Pull Requests

1. Fork o repositório
2. Crie uma branch descritiva: `git checkout -b feature/minha-feature`
3. Faça commits semânticos (veja abaixo)
4. Execute os testes: `make test`
5. Execute os linters: `make lint`
6. Abra um PR para `main`

## Setup de Desenvolvimento

```bash
# Clone seu fork
git clone https://github.com/SEU_USER/AuraCore.git
cd AuraCore/agents

# Instalar Poetry (se não tiver)
pip install poetry

# Instalar dependências
poetry install

# Copiar configuração
cp .env.example .env
# Edite .env com suas credenciais de desenvolvimento

# Executar testes
make test

# Executar linters
make lint

# Iniciar em modo desenvolvimento
make dev
```

## Estrutura do Projeto

```
agents/
├── src/
│   ├── agents/          # Agentes IA especializados
│   │   ├── fiscal/      # Agente fiscal
│   │   ├── financial/   # Agente financeiro
│   │   └── ...
│   ├── api/             # Endpoints FastAPI
│   │   ├── routes/      # Rotas da API
│   │   └── middleware/  # Middlewares
│   ├── services/        # Serviços de infraestrutura
│   │   ├── cache.py     # Redis cache
│   │   ├── voice.py     # STT/TTS
│   │   └── rag.py       # RAG service
│   └── tools/           # Tools dos agentes
├── tests/
│   ├── unit/            # Testes unitários
│   ├── integration/     # Testes de integração
│   ├── e2e/             # Testes end-to-end
│   └── fixtures/        # Fixtures compartilhados
├── docs/                # Documentação
├── k8s/                 # Manifests Kubernetes
└── scripts/             # Scripts de automação
```

## Padrões de Código

### Python

- Seguir [PEP 8](https://peps.python.org/pep-0008/)
- Type hints obrigatórios em todas as funções
- Docstrings em todas as funções/classes públicas
- Máximo 100 caracteres por linha
- Usar `ruff` para linting

```python
# ✅ Bom
def calculate_icms(
    origin: str,
    destination: str,
    value: float,
) -> ICMSResult:
    """
    Calcula ICMS para operação interestadual.
    
    Args:
        origin: UF de origem (ex: "SP")
        destination: UF de destino (ex: "RJ")
        value: Valor da operação em reais
        
    Returns:
        ICMSResult com alíquota e valor do imposto
        
    Raises:
        InvalidUFError: Se UF for inválida
    """
    ...

# ❌ Ruim
def calc(o, d, v):
    ...
```

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

#### Tipos

| Tipo | Descrição |
|------|-----------|
| `feat` | Nova feature |
| `fix` | Correção de bug |
| `docs` | Apenas documentação |
| `style` | Formatação (sem mudança de código) |
| `refactor` | Refatoração (sem mudança de comportamento) |
| `test` | Adição/correção de testes |
| `chore` | Manutenção (build, CI, etc) |
| `perf` | Melhoria de performance |

#### Exemplos

```bash
feat(agents): adiciona agente TMS para gestão de transporte
fix(fiscal): corrige cálculo de ICMS para operações com MG
docs(api): atualiza exemplos de uso da API de voice
test(agents): adiciona testes para FiscalAgent
refactor(cache): simplifica lógica de invalidação
```

### Testes

- Cobertura mínima: 80%
- Testes unitários para toda lógica de negócio
- Testes de integração para fluxos críticos
- Mocks para dependências externas (APIs, banco, etc)

```python
# tests/unit/agents/test_fiscal_agent.py

import pytest
from unittest.mock import AsyncMock, patch

from src.agents.fiscal import FiscalAgent


class TestFiscalAgent:
    """Testes para FiscalAgent."""
    
    @pytest.fixture
    def agent(self):
        """Fixture do agente fiscal."""
        return FiscalAgent()
    
    @pytest.mark.asyncio
    async def test_calculate_icms_sp_to_rj(self, agent):
        """Deve calcular ICMS corretamente para SP -> RJ."""
        result = await agent.calculate_icms(
            origin="SP",
            destination="RJ",
            value=1000.0
        )
        
        assert result.rate == 0.12
        assert result.tax == 120.0
    
    @pytest.mark.asyncio
    async def test_calculate_icms_invalid_uf(self, agent):
        """Deve lançar erro para UF inválida."""
        with pytest.raises(InvalidUFError):
            await agent.calculate_icms(
                origin="XX",
                destination="RJ",
                value=1000.0
            )
```

## Review Process

1. **Automated Checks**: CI deve passar (tests, lint, build)
2. **Code Review**: Pelo menos 1 aprovação necessária
3. **Coverage**: Cobertura não pode diminuir
4. **Documentation**: PRs que alteram API devem atualizar docs

### Checklist do Reviewer

- [ ] Código segue os padrões do projeto
- [ ] Testes adequados foram adicionados
- [ ] Documentação foi atualizada (se necessário)
- [ ] Não há secrets ou dados sensíveis
- [ ] Performance não foi degradada
- [ ] Erros são tratados adequadamente

## Releases

Seguimos [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Mudanças incompatíveis com versões anteriores
- **MINOR** (0.x.0): Novas features compatíveis
- **PATCH** (0.0.x): Bug fixes compatíveis

### Processo de Release

1. Criar branch `release/vX.Y.Z`
2. Atualizar CHANGELOG.md
3. Bump version em pyproject.toml
4. Criar PR para main
5. Após merge, criar tag e GitHub Release

## Dúvidas?

- 📧 Email: dev@auracore.com.br
- 💬 Discord: [AuraCore Community](https://discord.gg/auracore)
- 📖 Docs: https://docs.auracore.com.br
- 🐛 Issues: https://github.com/pedrojuniorgyn/AuraCore/issues
