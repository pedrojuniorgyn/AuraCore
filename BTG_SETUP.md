# 🏦 BTG PACTUAL - CONFIGURAÇÃO

## 📋 Variáveis de Ambiente

Adicione estas variáveis no seu arquivo `.env.local`:

```env
# BTG Pactual API - Sandbox
BTG_ENVIRONMENT=sandbox
BTG_CLIENT_ID=f737a371-13bc-4202-ba23-e41fdd2f4e78
BTG_CLIENT_SECRET=Dg1jCRu0ral3UU_8bX9tEY0q_ogdCu045vjVqDOY0ZdubQwblGfElayI8qZSA0CqEVDmZ0iuaLGXcqrSX5_KMA
BTG_API_BASE_URL=https://api.sandbox.empresas.btgpactual.com
BTG_AUTH_BASE_URL=https://id.sandbox.btgpactual.com
BTG_ACCOUNT_NUMBER=14609960
BTG_AGENCY=0050
```

## 🔗 Links Úteis

- **Documentação:** https://developers.empresas.btgpactual.com/docs/comecando
- **API Reference:** https://developers.empresas.btgpactual.com/reference
- **Comunidade:** https://developers.empresas.btgpactual.com/comunidade
- **Área do Desenvolvedor:** Portal BTG

## ✅ Checklist de Implementação

- [x] Autenticação OAuth2
- [x] Client HTTP Base
- [ ] Schemas de Banco de Dados
- [ ] Service de Boletos
- [ ] Service de Pix Cobrança
- [ ] Service de Pagamentos
- [ ] Service de Consultas
- [ ] APIs REST
- [ ] Webhook Handler
- [ ] Integrações com Billing
- [ ] Frontend Dashboard

## 🧪 Como Testar

```bash
# 1. Adicionar variáveis no .env.local
# 2. Reiniciar o servidor Next.js
# 3. Testar autenticação:
curl http://localhost:3000/api/btg/health
```





