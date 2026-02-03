# useDeleteResource

Hook reutilizável para deletar recursos Strategic com confirmação, feedback e refresh automático.

## 🎯 Objetivo

Padronizar a funcionalidade de exclusão em todas as telas Strategic, garantindo:
- Confirmação antes de deletar
- Toast de feedback (sucesso/erro)
- Router refresh automático
- Loading state durante operação
- Callbacks customizáveis

## 📦 Instalação

O hook já está disponível em `src/hooks/useDeleteResource.ts`.

## 🚀 Uso Básico

```tsx
import { useDeleteResource } from '@/hooks/useDeleteResource';

function MyComponent() {
  const { handleDelete, isDeleting } = useDeleteResource('action-plans');

  return (
    <button 
      onClick={() => handleDelete('abc-123')}
      disabled={isDeleting}
    >
      {isDeleting ? 'Excluindo...' : 'Excluir'}
    </button>
  );
}
```

## 📋 API

### `useDeleteResource(resourceType: string)`

**Parâmetros:**
- `resourceType` (string): Tipo do recurso Strategic (ex: `'action-plans'`, `'goals'`, `'kpis'`)

**Retorna:**
```typescript
{
  handleDelete: (id: string, options?: UseDeleteResourceOptions) => Promise<void>;
  isDeleting: boolean;
}
```

### `UseDeleteResourceOptions`

```typescript
interface UseDeleteResourceOptions {
  // Mensagem de confirmação customizada
  // Default: "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
  confirmMessage?: string;

  // Callback executado após sucesso
  onSuccess?: () => void;

  // Callback executado em caso de erro
  onError?: (error: Error) => void;

  // Desabilitar confirmação (não recomendado)
  // Default: false
  skipConfirmation?: boolean;
}
```

## 🎨 Exemplos

### Exemplo 1: Uso Simples

```tsx
const { handleDelete, isDeleting } = useDeleteResource('action-plans');

<button onClick={() => handleDelete('abc-123')}>
  Excluir
</button>
```

### Exemplo 2: Mensagem Customizada

```tsx
const { handleDelete } = useDeleteResource('goals');

<button onClick={() => handleDelete('goal-456', {
  confirmMessage: 'Deletar este objetivo? Isso afetará os KPIs relacionados.',
})}>
  Excluir Objetivo
</button>
```

### Exemplo 3: Com Callbacks

```tsx
const { handleDelete } = useDeleteResource('kpis');

<button onClick={() => handleDelete('kpi-789', {
  onSuccess: () => {
    console.log('KPI deletado!');
    // Redirecionar para lista
    router.push('/strategic/kpis');
  },
  onError: (error) => {
    console.error('Erro ao deletar KPI:', error);
  },
})}>
  Excluir KPI
</button>
```

### Exemplo 4: Sem Confirmação (não recomendado)

```tsx
const { handleDelete } = useDeleteResource('ideas');

// Use apenas para ações que já tiveram confirmação prévia
<button onClick={() => handleDelete('idea-999', {
  skipConfirmation: true,
})}>
  Excluir (já confirmado)
</button>
```

### Exemplo 5: Loading State

```tsx
const { handleDelete, isDeleting } = useDeleteResource('strategies');

<button 
  onClick={() => handleDelete('str-111')}
  disabled={isDeleting}
  className={isDeleting ? 'opacity-50 cursor-not-allowed' : ''}
>
  {isDeleting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Excluindo...
    </>
  ) : (
    <>
      <Trash2 className="mr-2 h-4 w-4" />
      Excluir
    </>
  )}
</button>
```

## 🔄 Fluxo de Execução

1. **Confirmação** - Exibe `window.confirm()` (a menos que `skipConfirmation: true`)
2. **Loading** - Define `isDeleting = true`
3. **DELETE Request** - Envia `DELETE /api/strategic/{resourceType}/{id}`
4. **Toast de Feedback** - Sucesso ou erro
5. **Router Refresh** - Atualiza dados da página
6. **Callbacks** - Executa `onSuccess` ou `onError`
7. **Loading** - Define `isDeleting = false`

## ✅ Recursos Compatíveis

Todos os recursos Strategic com endpoint DELETE:

- `action-plans`
- `anomalies`
- `comments`
- `control-items`
- `dashboards`
- `goals`
- `ideas`
- `integrations`
- `kpis`
- `notifications`
- `okrs`
- `pdca`
- `reports`
- `roles`
- `standard-procedures`
- `strategies`
- `templates`
- `war-room`
- `webhooks`

## 🧪 Testes

Execute os testes com:

```bash
npm test -- src/hooks/__tests__/useDeleteResource.test.ts --run
```

**Cobertura de Testes:**
- ✅ Construção de URL da API
- ✅ Opções de configuração
- ✅ Lógica de confirmação
- ✅ Manipulação de resposta da API
- ✅ Contrato de retorno do hook
- ✅ Validação de fetch configuration

**22/22 testes passando** ✅

## ⚠️ Boas Práticas

### ✅ DO

- Use confirmação padrão (não skip)
- Desabilite botão durante `isDeleting`
- Mostre feedback visual de loading
- Use callbacks para navegação pós-delete
- Trate erros de forma amigável

### ❌ DON'T

- Não use `skipConfirmation: true` sem motivo forte
- Não ignore o estado `isDeleting`
- Não deixe usuário clicar múltiplas vezes
- Não confie apenas no toast (use callbacks)

## 🐛 Troubleshooting

### Erro 404 - Item não encontrado
```
❌ Erro ao excluir: 404
```
**Solução:** Verifique se o ID existe no banco de dados.

### Erro 403 - Sem permissão
```
❌ Erro ao excluir: 403
```
**Solução:** Usuário não tem permissão para deletar. Verifique RBAC.

### Erro 500 - Erro interno
```
❌ Erro ao excluir: 500
```
**Solução:** Verifique logs do servidor. Pode ser violação de constraint (FK).

### Toast não aparece
**Solução:** Verifique se `<Toaster />` do Sonner está no layout:
```tsx
import { Toaster } from 'sonner';

<Toaster position="top-right" />
```

### Refresh não funciona
**Solução:** Certifique-se de usar Server Components ou `router.refresh()` do Next.js 15.

## 🔗 Links Relacionados

- [Sonner Toast Documentation](https://sonner.emilkowal.ski/)
- [Next.js 15 Router](https://nextjs.org/docs/app/api-reference/functions/use-router)
- [Strategic Module Endpoints](../../app/api/strategic/)

## 📝 Changelog

### v1.0.0 (2026-02-03)
- ✨ Criação inicial do hook
- ✅ 22 testes unitários
- 📚 Documentação completa
- 🎯 Suporte a todos os recursos Strategic

---

**Criado em:** 2026-02-03  
**Autor:** AgenteAura ⚡  
**Fase 12 - Task 01**
