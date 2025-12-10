# 🔧 AuraCore - Guia de Configuração

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```bash
# ===========================================
# DATABASE
# ===========================================
DATABASE_URL="Server=localhost,1433;Database=auracore;User Id=sa;Password=YourPassword;TrustServerCertificate=true"

# ===========================================
# AUTHENTICATION
# ===========================================
AUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# ===========================================
# SEFAZ INTEGRATION
# ===========================================
# Environment: "production" ou "homologation"
SEFAZ_ENVIRONMENT="homologation"
SEFAZ_UF="SP"

# ===========================================
# CERTIFICADO DIGITAL A1
# ===========================================
# Caminho para o arquivo .PFX (PKCS#12)
CERTIFICATE_PFX_PATH="/path/to/your/certificate.pfx"
CERTIFICATE_PASSWORD="your-certificate-password"
ORGANIZATION_NAME="Your Company Name"
```

---

## 📋 Instruções de Configuração

### 1. **Banco de Dados (SQL Server)**

```bash
# Certifique-se de que o SQL Server está rodando
# Crie o banco de dados:
CREATE DATABASE auracore;

# Execute as migrations:
npx drizzle-kit migrate
```

### 2. **Auth Secret**

```bash
# Gere uma chave secreta:
openssl rand -base64 32

# Cole o resultado em AUTH_SECRET
```

### 3. **Certificado Digital A1**

Para assinar XMLs (CTe/MDFe), você precisa de um certificado digital A1:

1. Adquira um certificado A1 da Receita Federal (via AC certificadora)
2. Baixe o arquivo `.pfx` (PKCS#12)
3. Configure o caminho e senha nas variáveis de ambiente
4. **IMPORTANTE:** Nunca commite o arquivo `.pfx` no Git!

```bash
# Adicione ao .gitignore:
*.pfx
*.p12
certificates/
```

### 4. **SEFAZ - Ambiente de Homologação**

Para testes, use o ambiente de homologação:

```bash
SEFAZ_ENVIRONMENT="homologation"
SEFAZ_UF="SP"  # Ou sua UF
```

**Endpoints por UF:**

| UF | Produção | Homologação |
|----|----------|-------------|
| SP | `https://nfe.fazenda.sp.gov.br/cteWEB/services/CTeRecepcaoV4.asmx` | `https://homologacao.nfe.fazenda.sp.gov.br/cteWEB/services/CTeRecepcaoV4.asmx` |
| RJ | `https://cte.svrs.rs.gov.br/ws/cterecepcao/CTeRecepcaoV4.asmx` | `https://cte-homologacao.svrs.rs.gov.br/ws/cterecepcao/CTeRecepcaoV4.asmx` |
| Outros | SVRS (Rio Grande do Sul) | SVRS Homologação |

### 5. **Modo Desenvolvimento**

No modo desenvolvimento (`NODE_ENV=development`), o sistema:

- ✅ Simula assinatura de XMLs
- ✅ Retorna autorizações automáticas (sem enviar para SEFAZ real)
- ✅ Permite testar o fluxo completo sem certificado

**Para produção, configure:**

```bash
NODE_ENV="production"
SEFAZ_ENVIRONMENT="production"
```

---

## 🚀 Fluxo de Produção

### Checklist antes de ir para produção:

- [ ] Certificado A1 válido configurado
- [ ] Variável `SEFAZ_ENVIRONMENT="production"`
- [ ] Endpoints da SEFAZ corretos para sua UF
- [ ] Testar assinatura de XML em homologação
- [ ] Testar autorização de CTe em homologação
- [ ] Validar CIOT para motoristas terceiros
- [ ] Validar Averbação de Seguro
- [ ] Backup do banco de dados configurado
- [ ] HTTPS habilitado no servidor
- [ ] Secrets gerenciados via Azure Key Vault ou similar

---

## 📞 Suporte

Em caso de dúvidas sobre configuração:

1. Certificado Digital: Contate sua AC certificadora (Certisign, Serasa, etc.)
2. SEFAZ: Consulte o portal da SEFAZ do seu estado
3. Sistema: Revise a documentação em `/docs`

---

## 🔐 Segurança

**NUNCA commite no Git:**

- ❌ Arquivos `.pfx` ou `.p12`
- ❌ Senhas de certificado
- ❌ `AUTH_SECRET` real
- ❌ Credenciais de banco de dados

**Use:**

- ✅ Variáveis de ambiente
- ✅ Azure Key Vault (produção)
- ✅ `.env.local` (desenvolvimento - ignorado pelo Git)
- ✅ Secrets do GitHub Actions (CI/CD)

---

🎉 **Configuração Completa! Sistema Pronto para Uso!**







