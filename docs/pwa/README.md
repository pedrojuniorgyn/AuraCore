# Progressive Web App (PWA) - AuraCore

**Versão:** 1.0.0  
**Data:** 03/02/2026  
**Status:** ✅ Implementado

---

## 📋 VISÃO GERAL

AuraCore agora é uma Progressive Web App (PWA) completa com:

1. **Instalável** - Add to Home Screen (iOS/Android)
2. **Offline-first** - Funciona sem internet
3. **Push Notifications** - Notificações em tempo real
4. **App-like** - Experiência nativa

---

## 🎯 RECURSOS IMPLEMENTADOS

### 1. PWA Básico

- ✅ Manifest.json configurado
- ✅ Service Worker automático (next-pwa)
- ✅ Ícones em múltiplos tamanhos (72px a 512px)
- ✅ Meta tags para iOS e Android
- ✅ Splash screens
- ✅ Theme color (#667eea)

### 2. Offline Support

- ✅ Página offline (`/offline.html`)
- ✅ Cache de assets estáticos
- ✅ Cache de API responses (5 min)
- ✅ IndexedDB queue para ações offline
- ✅ Auto-sync quando voltar online
- ✅ Retry automático (max 3 tentativas)

### 3. Push Notifications

- ✅ Web Push API
- ✅ Notificações locais
- ✅ Subscribe/unsubscribe
- ✅ Persistência de subscriptions (backend TODO)
- ✅ Permissão de notificação UX

---

## 🚀 COMO USAR

### Instalar como PWA

**Desktop (Chrome/Edge):**
1. Acessar `https://auracore.com.br`
2. Clicar em ícone de instalação na barra de endereço
3. Confirmar "Instalar"

**Mobile (iOS/Android):**
1. Acessar no navegador
2. Tocar no banner "Instalar AuraCore" (ou)
3. Menu → "Adicionar à tela inicial"

### Usar Offline

```typescript
import { useOfflineQueue } from '@/lib/offline';

function MyComponent() {
  const { queueAction, stats, syncPending } = useOfflineQueue();

  const handleCreateKPI = async (data) => {
    // Se offline, adiciona à fila
    await queueAction({
      type: 'CREATE',
      entity: 'kpi',
      method: 'POST',
      url: '/api/strategic/kpis',
      payload: data,
      maxRetries: 3,
    });
  };

  return (
    <div>
      <p>Pendentes: {stats.pending}</p>
      <button onClick={syncPending}>Sincronizar</button>
    </div>
  );
}
```

### Push Notifications

```typescript
import { usePushNotifications } from '@/lib/push';

function NotificationSettings() {
  const { 
    isSupported, 
    permission, 
    subscribe, 
    showNotification 
  } = usePushNotifications(userId);

  const handleEnable = async () => {
    await subscribe();
    
    // Testar notificação
    await showNotification({
      title: 'AuraCore',
      body: 'Notificações ativadas!',
      icon: '/icons/icon-192x192.png',
    });
  };

  if (!isSupported) {
    return <p>Push notifications not supported</p>;
  }

  return (
    <button onClick={handleEnable}>
      {permission === 'granted' ? 'Ativado' : 'Ativar Notificações'}
    </button>
  );
}
```

---

## 📁 ESTRUTURA DE ARQUIVOS

```
src/
├── lib/
│   ├── offline/
│   │   ├── OfflineQueue.ts          # IndexedDB queue
│   │   ├── useOfflineQueue.ts       # React hook
│   │   └── index.ts
│   └── push/
│       ├── PushNotificationService.ts  # Web Push API
│       ├── usePushNotifications.ts     # React hook
│       └── index.ts
├── components/
│   └── pwa/
│       ├── PWAManager.tsx           # Componente raiz
│       ├── PWAInstallPrompt.tsx     # Prompt de instalação
│       ├── OfflineIndicator.tsx     # Indicador de offline
│       └── index.ts
└── app/
    ├── layout.tsx                   # PWAManager adicionado
    └── api/
        └── push/
            ├── subscribe/route.ts   # POST /api/push/subscribe
            └── unsubscribe/route.ts # POST /api/push/unsubscribe

public/
├── manifest.json                    # PWA manifest
├── offline.html                     # Fallback offline
└── icons/
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png

next.config.ts                       # next-pwa configurado
```

---

## 🔧 CONFIGURAÇÃO

### 1. Gerar Ícones PWA

```bash
# Usar ferramenta online (recomendado)
# https://www.pwabuilder.com/imageGenerator

# Ou usar script Node.js (requer sharp)
npm install --save-dev sharp
npm run generate-pwa-icons
```

**Requisitos:**
- Ícone fonte: 512x512px, PNG
- Cores: Fundo transparente ou branco
- Formato: Quadrado

### 2. Variáveis de Ambiente

```bash
# .env.local

# VAPID keys para Push Notifications (gerar em produção)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BG...
VAPID_PRIVATE_KEY=...  # Manter secreto!

# PWA habilitado apenas em produção
NODE_ENV=production
```

### 3. Gerar VAPID Keys

```bash
# Instalar web-push
npm install -g web-push

# Gerar keys
web-push generate-vapid-keys

# Copiar keys para .env
```

---

## 📊 ESTRATÉGIAS DE CACHE

### Assets Estáticos

| Tipo | Estratégia | TTL | Motivo |
|---|---|---|---|
| Fontes | CacheFirst | 1 ano | Raramente mudam |
| Imagens | StaleWhileRevalidate | 24h | Balanceamento |
| JS/CSS | StaleWhileRevalidate | 24h | Atualizações frequentes |
| Next.js /_next | StaleWhileRevalidate | 24h | Build artifacts |

### API Responses

| Endpoint | Estratégia | TTL | Motivo |
|---|---|---|---|
| GET /api/\* | NetworkFirst | 5 min | Dados dinâmicos |
| POST/PUT/DELETE | NetworkOnly | - | Nunca cachear mutações |

### Offline Queue

| Ação | Retry | TTL | Limpeza |
|---|---|---|---|
| CREATE | 3x | Indefinido | Após sync |
| UPDATE | 3x | Indefinido | Após sync |
| DELETE | 3x | Indefinido | Após sync |
| SYNCED | - | 7 dias | Auto-cleanup |

---

## 🎨 UX/UI Patterns

### Indicadores de Status

1. **Offline Banner** - Exibido quando sem conexão
2. **Pending Badge** - Número de ações pendentes
3. **Sync Progress** - Animação de sincronização
4. **Success Toast** - Confirmação de sync

### Install Prompt

- **Timing:** Após 30 segundos de uso
- **Dismissable:** Esconder por 7 dias
- **Persistent:** Acessível via menu

### Notifications

- **Permissão:** Solicitar apenas quando relevante
- **Contexto:** Explicar benefício antes de pedir
- **Opt-out:** Fácil desativar

---

## 🐛 TROUBLESHOOTING

### PWA não instala

**Sintoma:** Botão de instalação não aparece

**Causas:**
1. Não está em HTTPS (exceto localhost)
2. manifest.json não carrega
3. Service Worker não registra

**Solução:**
```bash
# 1. Verificar HTTPS
curl -I https://auracore.com.br | grep "HTTP/2 200"

# 2. Verificar manifest
curl https://auracore.com.br/manifest.json

# 3. Verificar service worker (Chrome DevTools)
# Application → Service Workers → Status
```

### Offline não funciona

**Sintoma:** Erro ao tentar usar offline

**Causas:**
1. IndexedDB bloqueado
2. Service Worker não instalado
3. Cache vazio

**Solução:**
```typescript
// Testar IndexedDB
if ('indexedDB' in window) {
  console.log('IndexedDB supported');
} else {
  console.error('IndexedDB not available');
}

// Forçar instalação SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### Push não funciona

**Sintoma:** Notificações não chegam

**Causas:**
1. Permissão negada
2. VAPID keys incorretas
3. Subscription expirada

**Solução:**
```typescript
// Verificar permissão
if (Notification.permission === 'denied') {
  console.error('User denied notification permission');
}

// Re-subscribe
await pushNotificationService.unsubscribe();
await pushNotificationService.subscribe();
```

---

## 📈 MÉTRICAS E MONITORAMENTO

### Lighthouse PWA Score

```bash
# Executar audit
npx lighthouse https://auracore.com.br --view

# Target scores:
# - PWA: 100/100 ✅
# - Performance: 90+ ✅
# - Accessibility: 95+ ✅
# - Best Practices: 95+ ✅
# - SEO: 100 ✅
```

### Analytics

Eventos a trackear:
- `pwa_install` - App instalado
- `pwa_offline` - Usuário ficou offline
- `pwa_sync` - Ações sincronizadas
- `push_subscribe` - Inscrito em notificações
- `push_notification_shown` - Notificação exibida
- `push_notification_clicked` - Notificação clicada

---

## 🔐 SEGURANÇA

### VAPID Keys

⚠️ **CRÍTICO:** NUNCA committar VAPID_PRIVATE_KEY

```bash
# .gitignore
.env.local
.env.production

# Produção: usar secrets manager
# Railway: railway secrets set VAPID_PRIVATE_KEY=...
# Vercel: vercel env add VAPID_PRIVATE_KEY
```

### Subscriptions

- Validar usuário antes de salvar subscription
- Filtrar por organizationId/branchId (multi-tenancy)
- Expirar subscriptions antigas (>90 dias sem uso)
- Criptografar endpoint no banco (opcional)

---

## 📚 REFERÊNCIAS

- [PWA Documentation (web.dev)](https://web.dev/progressive-web-apps/)
- [next-pwa](https://github.com/shadowwalker/next-pwa)
- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Implementado por:** AgenteAura ⚡  
**Data:** 03/02/2026
