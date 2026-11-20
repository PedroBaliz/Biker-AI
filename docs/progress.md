# Progresso — Biker AI

Estado atual do projeto. Leia no início de cada sessão e atualize no fim (ver "Protocolo de sessão" no [AGENTS.md](../AGENTS.md)). Mantenha curto: só o estado atual, o próximo passo e as últimas sessões. O histórico completo fica no git.

**Status atual:** manutenção. Produção em https://biker-ai.vercel.app.

**Próximo passo:** escolher o meio de pagamento e então resolver a [#6](https://github.com/PedroBaliz/Biker-AI/issues/6) ([ADR-005](decisions.md#adr-005-trabalho-de-pagamentos-em-espera)). Até lá, a melhor candidata é a [#7](https://github.com/PedroBaliz/Biker-AI/issues/7): quebrar `server.ts` em módulos.

**Backlog:** [GitHub Issues](https://github.com/PedroBaliz/Biker-AI/issues). Pendências novas viram issue, não lista neste arquivo.

**Bloqueios:**
- Pagamentos: sem provedor definido (ADR-005, #6).

---

## Sessão 2026-11-20

### Feito
- Alinhamento com o guia de desenvolvimento com IA: criados `docs/decisions.md` (ADR-001 a 005), `docs/progress.md` e `CHANGELOG.md`.
- Adicionado o "Protocolo de sessão" ao `AGENTS.md`.
- Backlog movido para GitHub Issues: #6 (pagamentos), #7 (`server.ts`), #8 (`App.tsx`), #9 (rate limit/cache entre instâncias), #10 (Strava), #11 (e-mail do admin fixo).
- PR #12: esta estrutura de memória (decisions, progress, changelog, protocolo de sessão).
- PR #13: `express` 4.22.2 → 4.22.3, levando o `qs` para 6.16.2 (corrige os alertas Dependabot #44 e #20).

### Pendente
- [#14](https://github.com/PedroBaliz/Biker-AI/issues/14): alertas restantes do Dependabot, todos via Firebase. O `uuid` (#1) exige `firebase-admin` 13 (major). O `grpc-js` (#25, #23) não tem correção do Firebase e parece não rodar em runtime: falta confirmar no bundle do servidor.

### Decisões tomadas
- Backlog nas GitHub Issues, sem `tasks/*.md`: o fluxo já é por PR.
- Não forçar o `grpc-js` com `overrides`: a faixa `~1.9.0` é uma trava do próprio `@firebase/firestore`.

## Sessão 2026-11-16

### Feito
- PR #3: hardening de segurança (bypass de paywall, sequestro de conta, rotas públicas, alertas do CodeQL).
- PR #4: bugs visíveis ao usuário (configurações, Strava, IA, onboarding).
- PR #5 (`chore/cleanup`): servidor fora de `dist/` (ADR-001), `express-rate-limit` (ADR-003), logs sem dados sensíveis, `npm audit fix`.

### Decisões tomadas
- Pagamentos em espera (ADR-005).

## Sessão 2026-11-15

### Feito
- `AGENTS.md` e `docs/ARCHITECTURE.md` criados; `users_db.json` saiu do git.
- Corrigido o conflito de `api/index.*` na Vercel (ADR-002).
