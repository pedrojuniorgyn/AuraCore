# Padrões do Módulo Strategic

**Versão:** 1.0.0  
**Data:** 20/01/2026  
**Fonte:** Correções PROMPTS 16-19 + FIX

---

## 📋 Resumo

Este documento consolida os padrões de código identificados durante as correções do módulo Strategic. Cada padrão foi transformado em contrato MCP para prevenção automática.

| Prioridade | Contratos | Bugs Prevenidos |
|------------|-----------|-----------------|
| 🔴 Crítico | 3 | 7 |
| 🟡 Alto | 3 | 4 |
| 🟢 Médio | 1 | 4 |
| **Total** | **7** | **15** |

---

## 🔴 Contratos Críticos

### REACT-CLEANUP-001: Effect Cleanup for Async Operations

**Problema:** useEffect com fetch sem cleanup causa memory leak e warnings de setState em componente desmontado.

**Solução:**

```typescript
useEffect(() => {
  const controller = new AbortController();
  let isMounted = true;

  const load = async () => {
    try {
      const response = await fetch(url, { signal: controller.signal });
      const data = await response.json();
      if (isMounted) setState(data);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError' && isMounted) {
        console.error(error);
      }
    }
  };

  load();

  return () => {
    isMounted = false;
    controller.abort();
  };
}, [deps]);
```

**Checklist:**
- [ ] AbortController criado no início
- [ ] signal passado para fetch
- [ ] Verificação isMounted antes de setState
- [ ] AbortError ignorado no catch
- [ ] Cleanup com isMounted = false + abort()

---

### DATA-ARRAY-001: Empty Array Guard

**Problema:** Math.max(...[]) retorna -Infinity, causando NaN em cálculos.

**Solução:**

```typescript
// Validação obrigatória
if (!data || data.length === 0) {
  return <EmptyState />;
}

// Agora seguro
const values = data.map(d => d.value);
const max = Math.max(...values);

// Proteção extra para divisões
const ratio = max !== 0 ? value / max : 0;
const range = max - min || 1; // Fallback se iguais
```

**Checklist:**
- [ ] Early return se array vazio
- [ ] Componente de estado vazio
- [ ] Fallback || 1 para denominadores
- [ ] Verificação !== 0 antes de divisão

---

### API-RESPONSE-001: Consistent ID in Response

**Problema:** PUT/POST não retorna ID, cliente não sabe qual recurso usar.

**Solução API:**

```typescript
// Validar ID
if (!id || id === 'undefined') {
  return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
}

// SEMPRE retornar ID
return NextResponse.json({ success: true, id, ...data });
```

**Solução Cliente:**

```typescript
// Capturar ANTES de limpar
const existingId = editingItem?.id;
const result = await response.json();
const resourceId = result.id || existingId;
setEditingItem(null); // Agora pode limpar
```

---

## 🟡 Contratos de Alta Prioridade

### REACT-CALLBACK-001: Callback Unmount Protection

**Problema:** Callbacks manuais (onClick) não têm cleanup automático.

**Solução:**

```typescript
const isMountedRef = useRef(true);
const abortRef = useRef<AbortController | null>(null);

useEffect(() => {
  isMountedRef.current = true;
  return () => {
    isMountedRef.current = false;
    abortRef.current?.abort();
  };
}, []);

const fetchData = useCallback(async () => {
  abortRef.current?.abort();
  abortRef.current = new AbortController();
  
  const res = await fetch(url, { signal: abortRef.current.signal });
  if (isMountedRef.current) setData(await res.json());
}, []);
```

---

### REACT-PROP-SYNC-001: Prop-State Synchronization

**Problema:** useState(initialProp) ignora mudanças na prop.

**Solução:**

```typescript
const [config, setConfig] = useState(initialConfig || {});

useEffect(() => {
  if (isOpen) {
    setConfig(initialConfig || {});
    setStep(1); // Reset auxiliares
  }
}, [isOpen, initialConfig]);
```

---

### NEXTJS-SSC-001: Server/Client Component Separation

**Problema:** Layout com 'use client' causa hydration mismatch.

**Solução:**

```typescript
// layout.tsx (Server - SEM 'use client')
export default async function Layout({ children }) {
  const session = await auth();
  return <LayoutClient user={session?.user}>{children}</LayoutClient>;
}

// LayoutClient.tsx (Client)
'use client';
export function LayoutClient({ children, user }) {
  // Hooks e handlers aqui
}
```

---

## 🟢 Contrato de Média Prioridade

### REACT-INSTANCE-001: Instance-Stable Random Values

**Problema:** Math.random() no module level = todas instâncias iguais.

**Solução:**

```typescript
function hashToIndex(str: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
  }
  return Math.abs(hash) % max;
}

function Component() {
  const id = useId();
  const [value] = useState(() => items[hashToIndex(id, items.length)]);
}
```

---

## 📁 Arquivos de Contrato

```
docs/mcp/contracts/
├── react-cleanup-001.json
├── react-callback-001.json
├── react-instance-001.json
├── react-prop-sync-001.json
├── data-array-001.json
├── nextjs-ssc-001.json
├── api-response-001.json
└── index.json
```

---

## 🔧 Uso via MCP

### Consultar Contrato

```
Tool: get_contract
Args: { "contract_id": "react-cleanup-001" }
```

### Buscar Padrões

```
Tool: search_patterns
Args: { "query": "useEffect fetch cleanup" }
```

### Validar Código

```
Tool: validate_code
Args: { 
  "code": "useEffect(() => { fetch(...).then(setData) }, [])",
  "contract_ids": ["react-cleanup-001"]
}
```

---

## 📊 Métricas

- **Bugs Corrigidos:** 15
- **Arquivos Afetados:** 10
- **Contratos Criados:** 7
- **Tempo de Correção:** ~2h
- **Prevenção Estimada:** 50+ bugs futuros similares

---

## 🔄 Manutenção

1. **Revisar** após cada sprint com correções
2. **Identificar** padrões recorrentes
3. **Documentar** problema + solução
4. **Criar** contrato JSON
5. **Testar** detecção automática
6. **Atualizar** catálogo

---

## 📚 Referências

- [React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)
- [Next.js App Router](https://nextjs.org/docs/app)
- [AbortController MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [AuraCore MCP Rules](../regrasmcp.mdc)
