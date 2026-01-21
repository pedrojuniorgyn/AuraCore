# Contract — API Error Handling

## Classificação
- **Tipo:** Padrão de Código
- **Prioridade:** CRÍTICA
- **Aplicação:** Todas as API routes em src/app/api/

## Contexto

Criado após bugs no Quick Win 4 (21/01/2026), onde erros de autenticação (401/400) eram mascarados como erros 500 devido a catch blocks que não verificavam se o erro era um Response object.

**Causa raiz:** `getTenantContext()` lança `NextResponse` objects em falhas de auth, não `Error` objects.

## Regra Obrigatória (API-ERR-001)

**TODO catch block em API routes DEVE verificar se o erro é um Response:**

```typescript
// ✅ CORRETO
} catch (error) {
  // SEMPRE verificar Response primeiro
  if (error instanceof Response) {
    return error;
  }
  
  console.error('Route error:', error);
  return NextResponse.json(
    { error: 'Internal Server Error' },
    { status: 500 }
  );
}

// ❌ INCORRETO - Mascara erros de auth como 500
} catch (error) {
  console.error('Route error:', error);
  return NextResponse.json(
    { error: 'Internal Server Error' },
    { status: 500 }
  );
}
```

## Por que isso importa?

| Sem verificação | Com verificação |
|-----------------|-----------------|
| 401 → 500 | 401 → 401 |
| 400 → 500 | 400 → 400 |
| Debug difícil | Debug fácil |
| Logs confusos | Logs claros |
| Monitoramento errado | Monitoramento correto |

## Funções que lançam Response

- `getTenantContext()` - Autenticação e multi-tenancy
- `getServerSession()` - NextAuth (quando wrapper lança)
- `validateRequest()` - Validação de input
- Qualquer middleware customizado

## Referências

- Incidente: Quick Win 4 - RAG Chat (21/01/2026)
- Arquivo afetado: src/app/api/agents/rag/query/route.ts
- Correção: LC-QW4-001
- Varredura: 200+ arquivos identificados com o problema
