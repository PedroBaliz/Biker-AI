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
- **SEO:** `SeoContentPage` + `src/data/seoArticlesData.ts`; `robots.txt` e `sitemap.xml` são estáticos em `public/`.
- **Analytics:** Meta Pixel (`src/lib/metaPixel.ts`, `VITE_FACEBOOK_PIXEL_ID`).

### Backend (`server.ts`)
Organizado em seções, na ordem do arquivo:

| Seção | Responsabilidade |
| --- | --- |
| Init Firebase | SDK cliente (`firestore/lite`) e, se houver service account, `firebase-admin` |
| Crypto/Auth | PBKDF2 (100k, SHA-256), verificação RS256 do ID token com as chaves públicas do Google, `verifyAdminSecret` |
| Middlewares | `requireAuth`, `verifyUserMatch`, `requireAdmin`, rate limiters (`express-rate-limit`, em memória) |
| Regras de acesso | `isTrialActive` (3 dias), `hasActiveAccess`, `sanitizeUserProfileInput`, `sanitizePlanForUser` (paywall) |
| Persistência | `getDatabase` / `saveDatabase`, cache em memória com TTL, backups |
| Rotas auth | `/api/auth/{register,login,save-user,session,check-status}` |
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
- **Escrita:** rotas que alteram um usuário leem o banco com `getDatabaseForUpdate(email)`, que relê do Firestore o registro daquele usuário (o cache de 30 s não é compartilhado entre instâncias e causaria *lost update*). `saveDatabase(db, email)` grava no disco e no Firestore só o usuário alterado. Se ambos falham, o dado fica só em memória (com aviso no log). `saveDatabase` sem e-mail regrava todos os usuários: só para restauração de backup.
- Na Vercel o arquivo local fica em `os.tmpdir()` (efêmero) → **em produção o Firestore é a única fonte durável.**
- Em execução local direta, `runInitialMigration` copia `users_db.json` para o Firestore se a coleção estiver vazia.
- Regras do Firestore (`firestore.rules`): negar por padrão; dono lê e escreve só os campos permitidos; admin tem acesso total.

### Geração de planos com IA
1. Onboarding coleta nível, objetivo, disponibilidade e métricas (FTP / FC máx. / RPE).
2. `/api/generate-plan` monta o prompt e chama `callGeminiWithFallback` (`gemini-2.5-flash` → `gemini-3.1-flash-lite` → `gemini-2.5-pro`; 25 s por modelo, 55 s no total).
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
| Node standalone | `npm start` → `node build/server.cjs` (serve `dist/` estático) | `build/server.cjs` (esbuild CJS) |
| **Vercel (produção)** | Função serverless em `/api` + `dist/` estático | `api/index.js` (stub) → `build/server.mjs` (esbuild ESM) |

- O código do servidor é gerado em `build/`, **fora de `dist/`**: tudo em `dist/` é público. Até esta mudança, `dist/server.cjs` e o sourcemap ficavam acessíveis em `/server.cjs`.
- `vercel.json` reescreve `/api/*` para a função `/api` e o resto para `index.html`. A Vercel serve arquivos estáticos antes de aplicar rewrites, então `robots.txt`, `sitemap.xml` e o HTML de verificação do Google vêm de `public/`.
- `maxDuration: 60` para a função (orçamento das chamadas ao Gemini).
- Com `VERCEL` definido, o servidor não chama `listen()`: só exporta `app`.
- ⚠️ `api/index.js` é um stub versionado e deve ser o **único** arquivo `api/index.*`. A Vercel detecta funções antes do build, e um `api/index.ts` ao lado gera conflito de função, fazendo o deploy falhar antes do build (ocorreu no commit `32c9871`).

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
- O rate limit fica em memória, por instância serverless: o limite efetivo é multiplicado pelo número de instâncias. Corrigir exige um store compartilhado, como o Redis ([#9](https://github.com/PedroBaliz/Biker-AI/issues/9)). As leituras de painel ainda podem ver dados com até 30 s de atraso, mas as gravações releem o usuário.
- Não há integração com o Strava: o link da atividade é salvo apenas como referência.
- O e-mail do admin master está fixo como padrão em `server.ts` e em `firestore.rules`.
