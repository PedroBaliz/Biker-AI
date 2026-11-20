# Decisões — Biker AI

Registro de decisões técnicas (ADR): o **porquê** de cada escolha. Antes de reverter algo listado aqui, leia a entrada e registre uma nova ADR que a substitua.

Formato: ID sequencial, status (`aceita` | `substituída por ADR-NNN` | `rejeitada`), contexto, decisão e consequências.

---

## ADR-001: Código do servidor gerado em `build/`, fora de `dist/`

**Status:** aceita · **Data:** 2026-11-16 · **Commit:** `99bc4b0`

**Contexto:** o esbuild gerava `server.cjs` e o sourcemap dentro de `dist/`, que a Vercel serve como estático. O código do servidor ficava público em `/server.cjs`.

**Decisão:** gerar `build/server.mjs` (Vercel) e `build/server.cjs` (`npm start`) em `build/`, que fica fora do git e de `dist/`.

**Consequências:** tudo em `dist/` continua público, então nunca gere código de servidor ali.

---

## ADR-002: `api/index.js` é um stub versionado

**Status:** aceita · **Data:** 2026-11-15 · **Commits:** `32c9871` (quebrou), `66b7083` (corrigiu)

**Contexto:** a Vercel detecta as funções em `api/` **antes** do build. Com `api/index.ts` e `api/index.js` no repositório ao mesmo tempo, houve conflito de função e o deploy falhou antes do build.

**Decisão:** manter um único `api/index.js` fixo e versionado, que só reexporta `build/server.mjs`.

**Consequências:** não crie `api/index.ts` nem outro `api/index.*`. A lógica fica em `server.ts` e `backend/`, empacotados juntos pelo esbuild. Nunca coloque módulos em `api/`: a Vercel transformaria cada arquivo numa função.

---

## ADR-003: Rate limit com `express-rate-limit`

**Status:** aceita · **Data:** 2026-11-16 · **Commit:** `99bc4b0`

**Contexto:** o limitador caseiro não era reconhecido pelo CodeQL, que continuava gerando alertas de "missing rate limiting".

**Decisão:** usar `express-rate-limit` via `createRateLimiter` (`aiGenerationLimiter`, `aiChatLimiter`), com `trust proxy` na Vercel para usar o IP real do cliente.

**Consequências:** os contadores ficam em memória por instância serverless, sem compartilhamento. É uma dívida aceita ([#9](https://github.com/PedroBaliz/Biker-AI/issues/9)).

---

## ADR-004: Gemini com fallback de modelos e resposta determinística

**Status:** aceita

**Contexto:** a função da Vercel tem `maxDuration: 60` s. Os modelos do Gemini às vezes demoram, falham ou devolvem JSON inválido ou sem treinos.

**Decisão:** toda chamada passa por `callGeminiWithFallback` (vários modelos, até 25 s por modelo e 55 s no total). Cada rota de IA tem uma função `fallback*` determinística. Planilhas usam `PLAN_RESPONSE_SCHEMA` + `normalizeAiPlan`.

**Consequências:** o usuário sempre recebe uma resposta. Não envolva a chamada em outro timeout, porque isso quebra o orçamento de 55 s.

---

## ADR-005: Trabalho de pagamentos em espera

**Status:** aceita · **Data:** 2026-11-16

**Contexto:** ainda não há meio de pagamento definido. O PR de pagamentos planejado na revisão de código foi cancelado. Corrigir a expiração agora cortaria o acesso, em 2027-01-01, de usuários ativados manualmente.

**Decisão:** não mexer em pagamentos nem em expiração até a escolha do provedor. Problemas conhecidos, deixados de propósito:

- `hasActiveAccess` ignora `subscriptionExpiresAt`: um status `active` nunca expira.
- `"2026-12-31"` é gravado como expiração padrão por `sanitizeUserProfileInput` e pelo painel admin.
- `/api/mercadopago/create-pix` e `create-preference` não são usados pelo frontend, e o Pix nunca notifica o webhook.
- O webhook ignora os eventos mensais `subscription_authorized_payment`.
- `AccountSettings` mostra "Invalid Date" para expirações em ISO completo.

**Consequências:** quando o provedor for escolhido, comece por esta lista ([#6](https://github.com/PedroBaliz/Biker-AI/issues/6)) e substitua esta ADR.

---

## ADR-006: Conta master só por variável de ambiente; admin no Firestore por `admins/{uid}`

**Status:** aceita · **Data:** 2026-11-20 · **Issue:** [#11](https://github.com/PedroBaliz/Biker-AI/issues/11)

**Contexto:** o e-mail da conta master estava fixo como fallback de `ADMIN_EMAIL` em `server.ts` e literal em `firestore.rules`. Trocar o admin exigia mudar o código, e o e-mail ficava exposto no repositório.

**Decisão:**
- `server.ts`: `MASTER_ADMIN_EMAIL` vem só de `ADMIN_EMAIL`, validado por `normalizeEmail`. Toda comparação passa por `isMasterAdminEmail`, que é sempre falso sem a variável.
- `firestore.rules`: `isAdmin()` checa só a existência de `admins/{uid}`.

**Consequências:**
- Sem `ADMIN_EMAIL`, o modo master fica desligado. Coaches por `role` e o `ADMIN_PASSWORD` continuam funcionando.
- `ADMIN_EMAIL` é obrigatório na Vercel.
- Antes de publicar as regras, crie `admins/<UID>` no Firestore para cada admin. Sem o Admin SDK, o servidor lê o Firestore com o token do usuário, e o painel admin depende dessa regra.

---

## ADR-007: API dividida em módulos em `backend/`, com `server.ts` só como entrada

**Status:** aceita · **Data:** 2026-11-20 · **Issue:** [#7](https://github.com/PedroBaliz/Biker-AI/issues/7)

**Contexto:** o `server.ts` tinha ~2.500 linhas, com toda a API num arquivo só. Isso dificultava a revisão e fazia o agente ler trechos grandes para achar o contexto certo. Duas PRs que mexiam no mesmo arquivo conflitavam com facilidade.

**Decisão:**
- Dividir a API em módulos dentro de `backend/`: `config`, `util`, `auth`, `access`, `db`, `ai`, `rateLimit` e `routes/{users,ai,admin,payments}`.
- O `server.ts` continua como ponto de entrada e reexporta o que os testes e o `api/index.js` usam.
- A pasta se chama `backend/`, e não `server/`, para não colidir com `import "../server"` nos testes; também não é `api/`, por causa da ADR-002.
- Estado mutável compartilhado só muda por funções do módulo dono (`disableAdminFirestore`, `setDatabaseCache`), porque um import ESM não pode ser reatribuído.

**Consequências:**
- Rota nova vai no módulo da área. O `server.ts` não volta a crescer.
- A divisão foi mecânica, sem mudança de comportamento: as mesmas 35 rotas com os mesmos middlewares, os mesmos 61 testes e o mesmo bundle (`build/`).
