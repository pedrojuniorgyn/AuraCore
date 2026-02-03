# 📱 Estratégia Mobile - AuraCore

**Versão:** 1.0.0  
**Data:** 03/02/2026  
**Status:** 🟡 Em Avaliação

---

## 📊 SITUAÇÃO ATUAL

**Implementado:**
- ✅ PWA completo (TASK 02)
- ✅ Offline-first (IndexedDB)
- ✅ Push Notifications (Web Push)
- ✅ Install prompts
- ✅ Service Worker caching

**Cobertura de Casos de Uso:**
- Instalação como app: ✅ Add to Home Screen
- Funciona offline: ✅ IndexedDB Queue
- Notificações: ✅ Web Push API
- Performance: 🟡 Bom (não excelente)
- Acesso a sensores: ❌ Limitado

---

## 🎯 QUANDO CRIAR APP NATIVO

### Gatilhos de Decisão

Considerar app nativo React Native quando:

1. **Métricas PWA atingidas:**
   - Install rate > 20%
   - Daily active users > 500
   - Offline sessions > 15%
   - User feedback demandando features nativas

2. **Features nativas necessárias:**
   - ❌ Camera básica → PWA Camera API cobre
   - ❌ Geolocation → PWA Geolocation API cobre
   - ✅ **Bluetooth** → Scanner de armazém, IoT
   - ✅ **Background Location** → Tracking contínuo de entregas
   - ✅ **Sensores** → Acelerômetro, giroscópio (rastreamento de carga)
   - ✅ **NFC** → Controle de acesso, check-in
   - ✅ **Biometria avançada** → Face ID, fingerprint (além de WebAuthn)

3. **Performance crítica:**
   - Listas com 10.000+ items
   - Animações complexas 60fps
   - Processamento pesado (ML, image processing)

4. **Business case claro:**
   - ROI calculado e positivo
   - Budget aprovado
   - Time dedicado disponível

---

## 🚀 ROADMAP MOBILE

### Fase 1: Validação PWA (Q1 2026) ✅

**Objetivo:** Provar demanda por mobile

**Ações:**
- [x] Implementar PWA completo
- [x] Adicionar offline support
- [x] Configurar push notifications
- [ ] Medir métricas (30 dias)
- [ ] Coletar feedback usuários

**KPIs:**
- PWA install rate: Target > 20%
- Offline sessions: Target > 10%
- Push opt-in: Target > 30%
- User satisfaction: Target > 4.0/5.0

---

### Fase 2: Melhorias PWA (Q1-Q2 2026)

**Se métricas forem positivas mas < 20% install:**

**Melhorias:**
1. **Camera API** (4-6h)
   - Scan de CTe/NFe
   - Captura de comprovantes
   - QR code reader

2. **Background Sync** (6-8h)
   - Sync automático quando voltar online
   - Retry inteligente
   - Queue prioritization

3. **Geolocation** (4-6h)
   - Tracking de entregas
   - Check-in em armazéns
   - Rotas otimizadas

4. **Web Share API** (2-3h)
   - Compartilhar KPIs
   - Enviar relatórios
   - Share de documentos

5. **UX Melhorias** (8-10h)
   - Skeleton loaders
   - Infinite scroll otimizado
   - Gestures (swipe, pull-to-refresh)
   - Haptic feedback

**Total:** 24-33h  
**Timeline:** 1-1.5 semanas

---

### Fase 3: MVP Native App (Q2-Q3 2026)

**Se install rate > 20% E features nativas necessárias:**

**Escopo Mínimo:**
- 1 tela: Aprovações Pendentes
- 1 ação: Aprovar/Rejeitar
- Push: Notificação de nova aprovação
- Auth: Login com mesmas credenciais

**Tech Stack:**
- React Native + Expo
- Repo separado: `auracore-mobile`
- Backend: Mesmo Next.js API
- State: Redux Toolkit ou Zustand
- API: React Query

**Timeline:** 2-3 semanas  
**Custo:** R$ 40-60k

**Milestones:**
1. **Semana 1:** Setup + Auth + API integration
2. **Semana 2:** Lista aprovações + ações
3. **Semana 3:** Push notifications + testes
4. **Semana 4:** Beta release (TestFlight + Play Beta)

---

### Fase 4: App Completo (Q3-Q4 2026)

**Se MVP for bem-sucedido:**

**Features:**
- Dashboard com KPIs
- Gráficos interativos
- Relatórios offline
- Scanner de documentos (Bluetooth)
- Tracking de entregas (GPS contínuo)
- Assinatura biométrica

**Timeline:** 3-4 meses  
**Custo:** R$ 150-200k

---

## 📁 ESTRUTURA RECOMENDADA

### Monorepo (Se App Nativo for criado)

```
auracore/
├── web/                    # Next.js app (mover de raiz)
│   ├── src/
│   ├── public/
│   └── package.json
│
├── mobile/                 # React Native app
│   ├── src/
│   ├── app.json
│   └── package.json
│
├── shared/                 # Código compartilhado
│   ├── types/
│   ├── constants/
│   └── utils/
│
└── package.json           # Root workspace
```

**Setup:**
```json
// package.json (root)
{
  "workspaces": [
    "web",
    "mobile",
    "shared"
  ]
}
```

---

## 🔧 TECH STACK RECOMENDADO

### App Nativo (Se/Quando criado)

**Core:**
- React Native 0.73+
- Expo SDK 50+
- TypeScript 5.3+

**Navigation:**
- React Navigation 6.x
- Stack + Bottom Tabs

**State:**
- Redux Toolkit (global)
- React Query (API cache)
- Zustand (local UI state)

**API:**
- Axios + interceptors
- React Query para cache
- Auth token refresh

**Storage:**
- AsyncStorage (small data)
- SQLite (offline data)
- MMKV (fast key-value)

**Push:**
- Expo Notifications
- Firebase Cloud Messaging (FCM)

**Biometria:**
- expo-local-authentication
- expo-secure-store

**Camera/Scanner:**
- expo-camera
- expo-barcode-scanner

**Location:**
- expo-location
- Background location task

**Build/Deploy:**
- EAS Build (Expo Application Services)
- EAS Submit (app stores)
- EAS Update (OTA updates)

---

## 💰 ESTIMATIVAS DE CUSTO

### PWA Melhorias (Fase 2)

- Desenvolvimento: **R$ 12.500** (25h × R$ 500/h)
- Manutenção: Inclusa no web app
- **Total:** **R$ 12.500**

### MVP Native (Fase 3)

- Setup + Config: **R$ 5.000** (10h)
- Auth + API: **R$ 10.000** (20h)
- Telas + Lógica: **R$ 20.000** (40h)
- Push Notifications: **R$ 5.000** (10h)
- Testes + Ajustes: **R$ 10.000** (20h)
- Deploy + CI/CD: **R$ 5.000** (10h)
- **Total MVP:** **R$ 55.000** (110h)

### App Completo (Fase 4)

- Dashboard + KPIs: **R$ 30.000** (60h)
- Relatórios: **R$ 15.000** (30h)
- Scanner + Bluetooth: **R$ 20.000** (40h)
- GPS Tracking: **R$ 15.000** (30h)
- Biometria: **R$ 5.000** (10h)
- Offline Sync: **R$ 25.000** (50h)
- Testes + QA: **R$ 20.000** (40h)
- Design + UX: **R$ 15.000** (30h)
- **Total Completo:** **R$ 145.000** (290h)

### Manutenção Anual

- Updates iOS/Android: **R$ 30.000**
- Bug fixes: **R$ 20.000**
- Features pequenas: **R$ 30.000**
- Infraestrutura (EAS, Firebase): **R$ 5.000**
- **Total Ano:** **R$ 85.000**

---

## 📊 COMPARAÇÃO: PWA vs Native

| Critério | PWA | Native | Vencedor |
|---|---|---|---|
| **Desenvolvimento** | 1 codebase | 2 codebases | PWA |
| **Tempo para MVP** | 1 semana | 3 semanas | PWA |
| **Custo inicial** | R$ 12k | R$ 55k | PWA |
| **Manutenção anual** | R$ 0 | R$ 85k | PWA |
| **Performance** | Bom | Excelente | Native |
| **Offline** | Muito bom | Excelente | Native |
| **Push** | Bom | Excelente | Native |
| **Updates** | Instantâneo | Review (3-7 dias) | PWA |
| **Install** | Add to Home | App Store | Empate |
| **Features nativas** | Limitado | Total | Native |
| **Cross-platform** | Automático | Precissa build | PWA |
| **SEO** | Sim | Não | PWA |

**Score:** PWA 7-3 Native (para maioria dos casos)

---

## 🎓 DECISÕES TÉCNICAS

### Por que Expo (não React Native CLI)?

**Pros:**
- EAS Build simplifica CI/CD
- OTA updates sem app store review
- Managed workflow (menos config)
- SDK integrado (camera, location, etc)

**Cons:**
- App size maior
- Customização limitada (resolvível com bare workflow)

**Decisão:** Usar Expo com bare workflow (best of both)

### Por que React Query?

**Pros:**
- Cache inteligente (stale-while-revalidate)
- Retry automático
- Offline mutations
- Devtools excelente

**Cons:**
- Curva de aprendizado

**Decisão:** Vale a pena para qualidade de UX

### Por que SQLite (não Realm)?

**Pros:**
- Padrão SQL (familiar)
- Suporte nativo iOS/Android
- Zero dependencies
- Rápido para reads

**Cons:**
- Schema migrations manuais
- Não é reactive

**Decisão:** SQLite para MVP, avaliar Realm depois

---

## 📚 RECURSOS

### Documentação

- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Query](https://tanstack.com/query/latest)
- [EAS Build](https://docs.expo.dev/build/introduction/)

### Templates

- [Expo + TypeScript Template](https://github.com/expo/expo/tree/main/templates/expo-template-blank-typescript)
- [React Native + Redux Toolkit](https://github.com/reduxjs/redux-toolkit/tree/master/examples/expo-app)

### Benchmarks

- [React Native Performance](https://reactnative.dev/docs/performance)
- [Expo Performance](https://docs.expo.dev/guides/performance/)

---

## ✅ CHECKLIST DE DECISÃO

Antes de criar app nativo, responder:

- [ ] PWA install rate > 20%?
- [ ] Feedback de usuários demandando native?
- [ ] Features nativas essenciais identificadas?
- [ ] Budget aprovado (R$ 55k+ MVP)?
- [ ] Time mobile disponível (2-3 semanas)?
- [ ] CI/CD para mobile configurável?
- [ ] App Store accounts criados?
- [ ] Design mobile-first pronto?
- [ ] API endpoints documentados?
- [ ] Plano de manutenção definido?

**Se > 7 respostas "sim":** Considerar app nativo  
**Se < 7 respostas "sim":** Focar em PWA

---

**Revisão:** Trimestral (Q1, Q2, Q3, Q4 2026)  
**Próxima Revisão:** Abril 2026 (após 60 dias de PWA)

**Responsável:** Tech Lead + Product Manager
