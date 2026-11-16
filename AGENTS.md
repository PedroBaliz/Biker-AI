# AGENTS.md — Guia para agentes de IA e colaboradores

Biker AI: treinador de ciclismo com IA (Gemini). SPA React + API Express num único repositório.
Arquitetura detalhada: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

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

- [server.ts](server.ts) — **toda** a API (auth, IA, admin, Mercado Pago, SEO). ~2400 linhas. Use `grep -n "app\.(get|post)"` para achar rotas em vez de ler inteiro.
- [src/App.tsx](src/App.tsx) — orquestração do frontend; componentes em [src/components/](src/components/).
- [src/firebase.ts](src/firebase.ts) — cliente Firebase e `apiFetch`, que anexa o ID token às chamadas `/api/*`. Use sempre `apiFetch`, nunca `fetch` cru, para rotas autenticadas.
- [firestore.rules](firestore.rules) — regras RBAC do Firestore.
- [tests/](tests/) — testes de segurança e de acesso por assinatura; importam `app` e middlewares de `server.ts`.

## Arquivos gerados — não editar à mão

- `api/index.js` — bundle ESM do `server.ts` gerado pelo esbuild no build (usado pela Vercel). Edite `server.ts` e rode `npm run build`.
- `dist/` — saída do Vite + `dist/server.cjs`.
- `users_db.json` — banco local de desenvolvimento, **fora do git**. Use [users_db.example.json](users_db.example.json) como modelo. Nunca commite dados de usuários ou hashes de senha.

## Invariantes de segurança (não quebrar)

1. **Campos privilegiados** (`role`, `isCoach`, `subscriptionStatus`, `subscriptionPlan`, `subscriptionExpiresAt`, `createdAt`) nunca são graváveis pelo cliente:
   - servidor: `PROFILE_FIELD_ALLOWLIST` + `sanitizeUserProfileInput` em `server.ts`;
   - Firestore: `allowedProfileKeys()` + `diff().affectedKeys().hasOnly(...)` em `firestore.rules`.
   Ao adicionar um campo de perfil editável, atualize **os dois** lugares e os testes.
2. **Rotas de atleta** usam `requireAuth, verifyUserMatch` (o atleta só acessa os próprios dados). **Rotas admin** (`/api/admin/*`) usam `requireAuth, requireAdmin`. Rota nova sem middleware = bug.
3. A credencial `x-admin-password` só vale em `/api/admin/*` — comparação sempre com `crypto.timingSafeEqual`.
4. Conteúdo pago: planos passam por `sanitizePlanForUser` antes de sair para o cliente; acesso decidido por `hasActiveAccess` (coach, assinatura `active` ou trial de 3 dias).
5. Logs registram só método, rota e status — nunca headers, tokens ou corpo.
6. Segredos só via variáveis de ambiente (ver [.env.example](.env.example)). `GEMINI_API_KEY` e tokens do Mercado Pago são **server-side**; só variáveis `VITE_*` vão para o bundle do cliente.

## Convenções

- TypeScript, ESM (`"type": "module"`). Textos de UI e mensagens de erro em **português do Brasil**.
- Chamadas ao Gemini passam por `callGeminiWithFallback` (tenta vários modelos com timeout de 45 s) e têm uma função `fallback*` determinística para quando a IA falha — mantenha esse padrão em rotas de IA novas.
- Rotas de IA novas precisam de rate limit (`aiGenerationLimiter`).
- Persistência sempre via `getDatabase` / `saveDatabase` (Firestore com fallback para arquivo local); não acesse `users_db.json` diretamente.
- Acesso pago em rotas novas: use `resolveRequesterAccess(req)` (lê o perfil do banco). Nunca decida acesso pelo `profile` enviado no corpo da requisição.
- Testes rodam com o Firestore desligado (`VITEST` definido) e usam só o `users_db.json` local; autenticação em testes via `setTestAuthToken`.

## Fluxo de trabalho

- Branch a partir de `main`; commits no estilo Conventional Commits (`feat:`, `fix:`, `refactor:`, `build:`).
- Mudanças visíveis ao usuário entram no `CHANGELOG.md` (quando existir).
- Deploy: push em `main` → Vercel roda `npm run vercel-build`. Rollback: "Promote" de um deploy anterior no painel da Vercel.
