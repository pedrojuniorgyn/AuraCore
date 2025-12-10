# 🤝 Guia de Contribuição - Aura Core

Obrigado por considerar contribuir com o Aura Core! Este documento fornece diretrizes para contribuir com o projeto.

---

## 📋 Código de Conduta

- Seja respeitoso e profissional
- Aceite críticas construtivas
- Foque no que é melhor para a comunidade
- Mostre empatia com outros membros

---

## 🚀 Como Contribuir

### Reportando Bugs

**Antes de criar um issue:**
1. Verifique se o bug já não foi reportado
2. Colete o máximo de informações possível
3. Tente reproduzir o bug de forma consistente

**Ao criar um bug report, inclua:**
- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs atual
- Screenshots (se aplicável)
- Ambiente (OS, navegador, versão do Node)
- Logs de erro

### Sugerindo Features

**Antes de sugerir uma feature:**
1. Verifique se já não existe um issue similar
2. Pense se a feature se alinha com os objetivos do projeto

**Ao sugerir uma feature, inclua:**
- Descrição clara da feature
- Problema que ela resolve
- Benefícios para os usuários
- Exemplos de uso (se possível)
- Mockups ou wireframes (opcional)

### Pull Requests

1. **Fork** o repositório
2. **Clone** seu fork
3. **Crie uma branch** para sua feature/fix
4. **Faça suas mudanças**
5. **Teste** suas mudanças
6. **Commit** com mensagens descritivas
7. **Push** para seu fork
8. **Abra um Pull Request**

---

## 💻 Setup de Desenvolvimento

### Pré-requisitos

```bash
- Node.js 18+
- npm ou yarn
- MS SQL Server
- Git
```

### Instalação

```bash
# Clone seu fork
git clone https://github.com/seu-usuario/AuraCore.git
cd AuraCore

# Adicione o upstream
git remote add upstream https://github.com/pedrojuniorgyn/AuraCore.git

# Instale dependências
npm install --legacy-peer-deps

# Configure o ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Execute migrations
npm run db:push

# Inicie o dev server
npm run dev
```

---

## 📝 Padrões de Código

### TypeScript

```typescript
// ✅ BOM
interface User {
  id: number;
  name: string;
  email: string;
}

function getUserById(id: number): Promise<User> {
  // ...
}

// ❌ RUIM
function getUser(id: any): any {
  // ...
}
```

### React Components

```tsx
// ✅ BOM
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} className={`btn-${variant}`}>
      {label}
    </button>
  );
}

// ❌ RUIM
export function Button(props: any) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### Naming Conventions

```typescript
// Componentes: PascalCase
Button.tsx
UserProfile.tsx

// Hooks: useCamelCase
useAuth.ts
useDebounce.ts

// Utils/Services: camelCase
formatCurrency.ts
apiClient.ts

// Constantes: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// Arquivos de tipos: kebab-case.d.ts
next-auth.d.ts
global.d.ts
```

### Estrutura de Pastas

```
src/
├── app/              # Next.js App Router (pages & API)
├── components/       # Componentes React
│   ├── ui/          # Componentes base (Shadcn)
│   ├── layout/      # Layout components
│   └── [modulo]/    # Componentes específicos
├── lib/             # Bibliotecas e configurações
├── services/        # Business logic
├── contexts/        # React contexts
└── types/           # Type definitions
```

---

## 🎨 Padrões de UI/UX

### Componentes

- Use **Shadcn/UI** como base
- Mantenha **consistência visual**
- Aplique **animações suaves** (Framer Motion)
- Siga a **paleta de cores** por módulo

### Acessibilidade

- Use **labels** apropriados
- Adicione **aria-labels** quando necessário
- Garanta **contraste** adequado
- Teste com **keyboard navigation**

---

## 🧪 Testes

### Executar Testes

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Escrever Testes

```typescript
// Teste de componente
describe('Button', () => {
  it('should render with correct label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});

// Teste de API
describe('GET /api/users', () => {
  it('should return list of users', async () => {
    const response = await fetch('/api/users');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});
```

---

## 📦 Commits

### Convenção de Commits (Conventional Commits)

```
<tipo>(<escopo>): <descrição curta>

<descrição longa (opcional)>

<footer (opcional)>
```

### Tipos

- `feat`: Nova feature
- `fix`: Bug fix
- `docs`: Documentação
- `style`: Formatação
- `refactor`: Refatoração
- `test`: Adição de testes
- `chore`: Manutenção

### Exemplos

```bash
# Feature
git commit -m "feat(financial): add DDA smart match algorithm"

# Bug fix
git commit -m "fix(fiscal): correct ICMS calculation for interstate"

# Documentation
git commit -m "docs: update README with deployment instructions"

# Refactoring
git commit -m "refactor(components): extract common form logic to hook"
```

---

## 🔄 Git Workflow

### Branches

```
main          # Produção (sempre estável)
develop       # Desenvolvimento (integração)
feature/*     # Features novas
fix/*         # Bug fixes
hotfix/*      # Correções urgentes
```

### Processo

1. **Crie uma branch** a partir de `develop`:
```bash
git checkout develop
git pull upstream develop
git checkout -b feature/minha-feature
```

2. **Faça suas mudanças** e commit:
```bash
git add .
git commit -m "feat: minha nova feature"
```

3. **Sincronize com upstream**:
```bash
git fetch upstream
git rebase upstream/develop
```

4. **Push para seu fork**:
```bash
git push origin feature/minha-feature
```

5. **Abra um Pull Request** no GitHub

---

## ✅ Checklist do Pull Request

Antes de abrir um PR, verifique:

- [ ] Código segue os padrões do projeto
- [ ] Testes foram adicionados/atualizados
- [ ] Documentação foi atualizada (se necessário)
- [ ] Commits seguem a convenção
- [ ] Build está passando
- [ ] Não há warnings de lint
- [ ] PR está linkado a um issue (se aplicável)
- [ ] Descrição do PR está clara

---

## 📚 Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)

---

## 💬 Dúvidas?

- Abra uma [Discussion](https://github.com/pedrojuniorgyn/AuraCore/discussions)
- Envie um email para suporte@auracore.com
- Entre no nosso Slack (link em breve)

---

**Obrigado por contribuir! 🙏**







