# Arquitetura — Biker AI

## Visão geral

```text
┌──────────────────────┐   apiFetch (Bearer ID token)   ┌────────────────────────────┐
│  SPA React 19 (Vite) │ ─────────────────────────────▶ │  API Express (server.ts)   │
│  src/App.tsx         │                                │  requireAuth / RBAC / rate │
│  Firebase Auth (cli) │ ◀───── JSON (planos, perfil) ── │  limit                     │
└──────────┬───────────┘                                └──┬──────────┬──────────┬───┘
           │ login                                        │          │          │
           ▼                                              ▼          ▼          ▼
   Firebase Auth                                   Google Gemini  Firestore  Mercado Pago
                                                   (@google/genai) (users)   (assinatura/Pix)
                                                                      │
                                                              fallback: users_db.json
```

Um único processo Node serve a API e, fora da Vercel, também os arquivos do frontend.

## Componentes

### Frontend (`src/`)
- **React 19 + TypeScript + Tailwind v4 + Motion.** SPA sem roteador; `App.tsx` controla telas (login → onboarding → plano/chat/admin).
- **Autenticação:** Firebase Auth no cliente. `apiFetch` (em `src/firebase.ts`) anexa `Authorization: Bearer <idToken>` a toda chamada `/api/*`.
- **Gráficos:** Recharts. **PDF:** jsPDF, gerado no cliente.
- **SEO:** `SeoContentPage` + `src/data/seoArticlesData.ts`; `robots.txt` e `sitemap.xml` são servidos pela API.
- **Analytics:** Meta Pixel (`src/lib/metaPixel.ts`, `VITE_FACEBOOK_PIXEL_ID`).

### Backend (`server.ts`)
Organizado em seções, na ordem do arquivo:

| Seção | Responsabilidade |
| --- | --- |
| Init Firebase | SDK cliente (`firestore/lite`) e, se houver service account, `firebase-admin` |
| Crypto/Auth | PBKDF2 (100k, SHA-256), verificação RS256 do ID token com as chaves públicas do Google, `verifyAdminSecret` |
| Middlewares | `requireAuth`, `verifyUserMatch`, `requireAdmin`, rate limiters em memória |
| Regras de acesso | `isTrialActive` (3 dias), `hasActiveAccess`, `sanitizeUserProfileInput`, `sanitizePlanForUser` (paywall) |
| Persistência | `getDatabase` / `saveDatabase`, cache em memória com TTL, backups |
| Rotas auth | `/api/auth/{register,login,save-user,session,check-status,verify-password}` |
| Rotas IA | `/api/{onboard,generate-plan,generate-next-week,evaluate-workout,chat}` |
| Rotas admin | `/api/admin/{users,update-user-status,delete-user,backups*,mercadopago/create-plan}` |
| Pagamentos | `/api/mercadopago/{config,create-subscription,create-preference,create-pix,webhook}` |
| Bootstrap | Vite middleware (dev) ou `express.static(dist)` (prod), porta 3000 |

## Fluxos principais

### Autenticação e autorização
1. Usuário loga com Firebase Auth no cliente.
2. Cada request leva o ID token; `requireAuth` valida assinatura RS256, emissor e audiência e extrai o e-mail.
3. `verifyUserMatch` garante que o e-mail do token é o dono do recurso (ou coach).
4. `/api/admin/*` exige `requireAdmin`: e-mail = `ADMIN_EMAIL`, perfil com `role: coach|admin`, ou header `x-admin-password` (= `ADMIN_PASSWORD`).

### Persistência de dados
- Modelo: documento por usuário (chave = e-mail) com `profile`, `plan`, `chatHistory`, `feedbacks` e `workoutLogs`.
- **Leitura:** cache em memória → Firestore (Admin SDK, REST com o token do usuário, ou SDK lite) → `users_db.json` como fallback.
- **Escrita:** `saveDatabase` grava no disco e no Firestore. Se ambos falham, o dado fica só em memória (com aviso no log).
- Na Vercel o arquivo local fica em `os.tmpdir()` (efêmero) → **em produção o Firestore é a única fonte durável.**
- Em execução local direta, `runInitialMigration` copia `users_db.json` para o Firestore se a coleção estiver vazia.
- Regras do Firestore (`firestore.rules`): negar por padrão; dono lê e escreve só os campos permitidos; admin tem acesso total.

### Geração de planos com IA
1. Onboarding coleta nível, objetivo, disponibilidade e métricas (FTP / FC máx. / RPE).
2. `/api/generate-plan` monta o prompt e chama `callGeminiWithFallback` (`gemini-2.5-flash` → `gemini-3.1-flash-lite` → `gemini-2.5-pro`, 45 s por modelo).
3. A resposta passa por `cleanAndParseJson`. Se a IA falhar, `fallbackGeneratePlan` devolve um plano determinístico.
4. O plano é salvo e devolvido via `sanitizePlanForUser`: sem acesso ativo, a estrutura dos treinos vem mascarada.
5. `/api/workout/log-completion` + `/api/evaluate-workout` registram e avaliam treinos; `/api/generate-next-week` usa esse histórico para a semana seguinte.

### Assinatura (Mercado Pago)
1. Novo usuário: `subscriptionStatus: pending_payment` + trial de 3 dias a partir de `createdAt`.
2. Checkout: assinatura recorrente (`preapproval`), preferência (checkout) ou Pix (`/v1/payments`).
3. O webhook `/api/mercadopago/webhook` consulta o recurso no MP e atualiza o status (`authorized` → `active`; `pending` → `pending_payment`; demais → `expired`). O vínculo com o usuário vem de `external_reference` ou `payer_email`.

## Build e deploy

| Alvo | Como roda | Artefato |
| --- | --- | --- |
| Dev local | `tsx server.ts` (Vite em middleware mode) | — |
| Node standalone | `node dist/server.cjs` (serve `dist/` estático) | `dist/server.cjs` (esbuild CJS) |
| **Vercel (produção)** | Função serverless em `/api` + `dist/` estático | `api/index.js` (esbuild ESM) |

- `vercel.json` reescreve `/api/*`, `robots.txt`, `sitemap.xml` e o HTML de verificação do Google para a função `/api`; o resto vai para `index.html`.
- Com `VERCEL` definido, o servidor não chama `listen()`: só exporta `app`.
- ⚠️ Existem `api/index.js` (bundle ESM, versionado) e `api/index.ts` (carrega `dist/server.cjs`) apontando para a mesma rota. Mantenha só um entrypoint para evitar conflito de função na Vercel.

## Variáveis de ambiente

Ver [.env.example](../.env.example). Resumo:

| Variável | Uso |
| --- | --- |
| `GEMINI_API_KEY` | IA (obrigatória para planos reais; sem ela entram os fallbacks) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Conta master e credencial administrativa |
| `FIREBASE_*` | Projeto e Firestore no servidor (obrigatórias na Vercel) |
| `FIREBASE_SERVICE_ACCOUNT[_KEY]` / `GOOGLE_APPLICATION_CREDENTIALS` | Habilitam o Admin SDK (opcional) |
| `MERCADO_PAGO_*` | Pagamentos e validação do webhook |
| `VITE_FACEBOOK_PIXEL_ID` | Pixel (vai para o cliente) |

## Dívidas técnicas conhecidas

- `server.ts` monolítico (~2400 linhas). Candidatos a módulos: `auth/`, `db/`, `ai/`, `payments/` e `admin/`.
- O rate limit e o cache do banco ficam em memória: não são compartilhados entre instâncias serverless.
- `/api/parse-strava` tem rate limit configurado, mas não há rota implementada (a integração com o Strava citada no README não existe no servidor).
- O e-mail do admin master está fixo como padrão em `server.ts` e em `firestore.rules`.
