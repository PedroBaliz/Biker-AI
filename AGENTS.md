# AGENTS.md — Guia para agentes de IA e colaboradores

Biker AI: treinador de ciclismo com IA (Gemini). SPA React + API Express num único repositório.
Arquitetura detalhada: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Estado atual: [docs/progress.md](docs/progress.md). Decisões (ADR): [docs/decisions.md](docs/decisions.md).

## Comandos

| Ação | Comando |
| --- | --- |
| Dev (API + Vite na porta 3000) | `npm run dev` |
| Typecheck (é o "lint" do projeto) | `npm run lint` |
| Testes (Vitest) | `npm test` |
| Build completo | `npm run build` |
| Rodar build de produção local | `npm start` |

Antes de concluir qualquer mudança: `npm run lint && npm test`. O CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) roda lint → testes → build em todo push/PR para `main`.

## Mapa rápido

- [server.ts](server.ts) — ponto de entrada da API (~110 linhas): cria o app, aplica middlewares e limitadores, registra as rotas e reexporta o que os testes usam.
- [backend/](backend/) — a API em módulos:
  - `config.ts` — env, Firebase, conta master;
  - `util.ts` — funções puras;
  - `auth.ts` — token e middlewares;
  - `access.ts` — trial, paywall (desligado, ADR-008), campos editáveis;
  - `db.ts` — cache, Firestore, backups;
  - `ai.ts` — Gemini e fallbacks;
  - `rateLimit.ts` — limitadores;
  - `routes/` — `users`, `ai` e `admin`; cada um exporta `register*Routes(app)`.

  Rota nova vai no módulo da área, nunca de volta no `server.ts`.
- [src/App.tsx](src/App.tsx) — orquestração do frontend: estado, sessão e as telas (~2.400 linhas; a divisão continua na #8). Componentes em [src/components/](src/components/). Lógica sem UI vai em [src/lib/](src/lib/) (ex.: `exportPlanPdf.ts`). Bloco novo de tela vira componente com props tipadas, não mais JSX dentro do `App`.
- [src/firebase.ts](src/firebase.ts) — cliente Firebase e `apiFetch`, que anexa o ID token às chamadas `/api/*`. Use sempre `apiFetch`, nunca `fetch` cru, para rotas autenticadas.
- [firestore.rules](firestore.rules) — regras RBAC do Firestore.
- [tests/](tests/) — testes de segurança e de acesso por assinatura; importam `app` e middlewares de `server.ts`, que os reexporta de `backend/`.

## Arquivos gerados — não editar à mão

- `build/` — `server.mjs` (usado pela Vercel) e `server.cjs` (para `npm start`), gerados pelo esbuild a partir do `server.ts` (que inclui `backend/` no bundle). Fica **fora do git e fora de `dist/`**: tudo em `dist/` é público.
- `dist/` — saída do Vite (site estático). Nunca gere código de servidor aqui.
- `api/index.js` **não** é gerado: é um stub fixo e versionado que reexporta `build/server.mjs`. A Vercel detecta funções antes do build, por isso ele precisa existir no repositório. Não crie um `api/index.ts` ao lado.
- `users_db.json` — banco local de desenvolvimento, **fora do git**. Use [users_db.example.json](users_db.example.json) como modelo. Nunca commite dados de usuários ou hashes de senha.

## Invariantes de segurança (não quebrar)

1. **Campos privilegiados** (`role`, `isCoach`, `subscriptionStatus`, `subscriptionPlan`, `subscriptionExpiresAt`, `createdAt`) nunca são graváveis pelo cliente:
   - servidor: `PROFILE_FIELD_ALLOWLIST` + `sanitizeUserProfileInput` em `backend/access.ts`;
   - Firestore: `allowedProfileKeys()` + `diff().affectedKeys().hasOnly(...)` em `firestore.rules`.
   Ao adicionar um campo de perfil editável, atualize **os dois** lugares e os testes.
2. **Rotas de atleta** usam `requireAuth, verifyUserMatch` (o atleta só acessa os próprios dados). **Rotas admin** (`/api/admin/*`) usam `requireAuth, requireAdmin`. Rota nova sem middleware = bug.
3. A credencial `x-admin-password` só vale em `/api/admin/*` — comparação sempre com `crypto.timingSafeEqual`.
4. Conteúdo pago: planos passam por `sanitizePlanForUser` antes de sair para o cliente; acesso decidido só por `hasActiveAccess` (servidor) e `getUserAccessInfo` (cliente). **O paywall está desligado** (`PAYWALL_ENABLED` / `VITE_PAYWALL_ENABLED`, ADR-008): todo atleta tem acesso. Não há meio de pagamento; não religue o paywall sem integrar um.
5. Logs registram só método, rota e status — nunca headers, tokens ou corpo.
6. Segredos só via variáveis de ambiente (ver [.env.example](.env.example)). `GEMINI_API_KEY` e qualquer credencial de terceiros são **server-side**; só variáveis `VITE_*` vão para o bundle do cliente.

## Convenções

- TypeScript, ESM (`"type": "module"`). Textos de UI e mensagens de erro em **português do Brasil**.
- Chamadas ao Gemini passam por `callGeminiWithFallback` (tenta vários modelos: até 25 s por modelo e 55 s no total, dentro do `maxDuration` de 60 s da Vercel) e têm uma função `fallback*` determinística para quando a IA falha — mantenha esse padrão em rotas de IA novas. Não envolva a chamada em outro timeout. Planilhas usam `PLAN_RESPONSE_SCHEMA` + `normalizeAiPlan`, que cai em `fallbackGeneratePlan` se a IA vier sem treinos.
- Rotas de IA novas precisam de rate limit (`aiGenerationLimiter`, ou `aiChatLimiter` para rotas conversacionais). Os limitadores usam `express-rate-limit` via `createRateLimiter`; não volte para um limitador caseiro (o CodeQL só reconhece bibliotecas conhecidas).
- Erros inesperados em rotas: `sendServerError(res, error)`. Nunca devolva `error.message` ao cliente.
- `robots.txt`, `sitemap.xml` e a verificação do Google ficam em `public/` (servidos como estáticos). Domínio de produção: `https://biker-ai.vercel.app`.
- Persistência sempre via `getDatabase` / `saveDatabase` (Firestore com fallback para arquivo local); não acesse `users_db.json` diretamente.
- Acesso pago em rotas novas: use `resolveRequesterAccess(req)` (lê o perfil do banco). Nunca decida acesso pelo `profile` enviado no corpo da requisição.
- Testes rodam com o Firestore desligado (`VITEST` definido) e usam só o `users_db.json` local; autenticação em testes via `setTestAuthToken`.

## Protocolo de sessão

**Início:** leia [docs/progress.md](docs/progress.md) (estado atual e próximo passo). Para mudanças estruturais, leia também [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e [docs/decisions.md](docs/decisions.md). Nunca reverta uma decisão registrada sem criar uma ADR que a substitua.

**Fim** (antes de commitar):
1. Atualize `docs/progress.md`: o que foi feito, o que ficou pendente, um próximo passo específico e a linha de **Medição** da sessão (como medir está no topo do arquivo).
2. Decisão técnica nova ou revertida → nova ADR em `docs/decisions.md`.
3. Mudança visível ao usuário → `CHANGELOG.md`, em `[Não lançado]`.
4. Pendência ou dívida técnica nova → GitHub Issue (o backlog fica lá). Dívida estrutural também entra em "Dívidas técnicas conhecidas" do `docs/ARCHITECTURE.md`.

## Fluxo de trabalho

- Branch a partir de `main`; commits no estilo Conventional Commits (`feat:`, `fix:`, `refactor:`, `build:`).
- Mudanças visíveis ao usuário entram no [CHANGELOG.md](CHANGELOG.md).
- Deploy: push em `main` → Vercel roda `npm run vercel-build`. Rollback: "Promote" de um deploy anterior no painel da Vercel.
