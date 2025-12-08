# TESTE MANUAL DA API SEFAZ

## 1. Upload de Certificado (via cURL)

```bash
curl -X POST http://localhost:3000/api/branches/1/certificate \
  -F "pfx=@/caminho/para/certificado.pfx" \
  -F "password=SUA_SENHA" \
  -H "Cookie: next-auth.session-token=SEU_TOKEN"
```

## 2. Download de NFes (via cURL)

```bash
curl -X POST http://localhost:3000/api/sefaz/download-nfes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=SEU_TOKEN" \
  -d '{"branch_id": 1}'
```

## 3. Obter Token de Sessão

1. Faça login em: http://localhost:3000/login
2. Abra DevTools (F12)
3. Vá em Application > Cookies
4. Copie o valor de `next-auth.session-token`
5. Use nos comandos acima

## 4. Resposta Esperada (Download NFes)

```json
{
  "success": true,
  "message": "3 NFe(s) importada(s) automaticamente!",
  "data": {
    "totalDocuments": 5,
    "maxNsu": "000000000000123",
    "processing": {
      "totalDocuments": 5,
      "imported": 3,
      "duplicates": 1,
      "errors": 0,
      "resumos": 1,
      "completas": 4
    }
  }
}
```




