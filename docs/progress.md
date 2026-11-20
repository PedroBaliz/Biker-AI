# Progresso — Biker AI

Estado atual do projeto. Leia no início de cada sessão e atualize no fim (ver "Protocolo de sessão" no [AGENTS.md](../AGENTS.md)). Mantenha curto: só o estado atual, o próximo passo e as últimas sessões. O histórico completo fica no git.

**Status atual:** manutenção. Produção em https://biker-ai.vercel.app.

**Próximo passo:** escolher o meio de pagamento e então resolver a [#6](https://github.com/PedroBaliz/Biker-AI/issues/6) ([ADR-005](decisions.md#adr-005-trabalho-de-pagamentos-em-espera)). Até lá, a melhor candidata é a [#7](https://github.com/PedroBaliz/Biker-AI/issues/7): quebrar `server.ts` em módulos.

**Backlog:** [GitHub Issues](https://github.com/PedroBaliz/Biker-AI/issues). Pendências novas viram issue, não lista neste arquivo.

**Bloqueios:**
- Pagamentos: sem provedor definido (ADR-005, #6).

**Medição:** cada sessão termina com uma linha de medição, para avaliar com dados se o protocolo de sessão compensa. Use sempre os mesmos comandos:

| Campo | Como obter |
|---|---|
| Tokens | `/cost` no fim da sessão (se a conta não mostrar tokens, use `/context`) |
| Reorientação | `/context` logo antes da primeira ação útil (tokens gastos só para se situar) |
| Reexplicações | quantas vezes foi preciso repetir algo que já devia estar na memória |
| Bugs pegos na revisão | problemas achados antes do merge (revisão, checklist, testes) |
| Tempo | duração da sessão, em minutos |

---

## Sessão 2026-11-20

### Feito
- Alinhamento com o guia de desenvolvimento com IA: criados `docs/decisions.md` (ADR-001 a 005), `docs/progress.md` e `CHANGELOG.md`.
- Adicionado o "Protocolo de sessão" ao `AGENTS.md`.
- Backlog movido para GitHub Issues: #6 (pagamentos), #7 (`server.ts`), #8 (`App.tsx`), #9 (rate limit/cache entre instâncias), #10 (Strava), #11 (e-mail do admin fixo).
- PR #12: esta estrutura de memória (decisions, progress, changelog, protocolo de sessão).
- PR #13: `express` 4.22.2 → 4.22.3, levando o `qs` para 6.16.2 (corrige os alertas Dependabot #44 e #20).
- [#14](https://github.com/PedroBaliz/Biker-AI/issues/14) fechada: os alertas do `grpc-js` (#25, #23) e do `uuid` (#1) foram dispensados como código não usado em runtime. A correção real do `uuid` exige o `firebase-admin` 14 (Node 22+); o 13 foi testado e não resolve.
- Caderno de produto "Biker AI" criado no MemorySmith: visão do produto, decisões de negócio abertas (DN-001 pagamento, DN-002 Strava) e casos (CASO-001 a 004).

- [PR #16](https://github.com/PedroBaliz/Biker-AI/pull/16) mergeada (fecha #11): e-mail do admin master só via `ADMIN_EMAIL`, sem fallback; `firestore.rules` com `isAdmin()` só por `admins/{uid}` (ADR-006).
- [PR #17](https://github.com/PedroBaliz/Biker-AI/pull/17) mergeada (parte da #9): `getDatabaseForUpdate` relê o usuário antes de alterar; `delete-user` não regrava mais todos os usuários.
- Produção conferida após os merges (deploy `8a06e45`): página e API respondem.

### Pendente
- **Confirmar `ADMIN_EMAIL` na Vercel.** Sem ele, a conta master está sem privilégio em produção desde a #16. O painel admin continua acessível por `ADMIN_PASSWORD` e por perfis com `role: coach`.
- **Antes de publicar o `firestore.rules` novo:** criar `admins/<UID>` no Firestore. As regras não vão com o deploy, então as de produção continuam as antigas até serem publicadas.
- **Validar a #17 em produção:** salvar o perfil, gerar um plano, registrar um treino e excluir um usuário de teste. O caminho novo não roda nos testes (Firestore desligado).
- #9 segue aberta só para o rate limit compartilhado, que precisa de um store externo (Redis).
- #7 e #8 (quebrar `server.ts` e `App.tsx`) estão desbloqueadas: a #16 e a #17 já entraram.

### Decisões tomadas
- Backlog nas GitHub Issues, sem `tasks/*.md`: o fluxo já é por PR.
- Não forçar o `grpc-js` com `overrides`: a faixa `~1.9.0` é uma trava do próprio `@firebase/firestore`.
- Não usar hook de typecheck por edição: o `tsc` leva ~30 s, e o CI já bloqueia.
- Medir cada sessão (tabela acima), a partir da próxima.

### Medição
| Tokens | Reorientação | Reexplicações | Bugs pegos na revisão | Tempo |
|---|---|---|---|---|
| (pendente: `/cost`) | não mensurável (sessão sem `progress.md` no início) | 0 | 2 no código (lost update, fallback de admin) + 3 erros do agente pegos | ~1h35 de escrita (14:59–16:34) |

Sessão de **linha de base**: começou sem `progress.md`, então representa o cenário "sem protocolo". A primeira sessão que retomar por este arquivo é a primeira medição "com protocolo". Os 3 erros do agente pegos foram:
- contagem de alertas do Dependabot incompleta, corrigida com `state=open&per_page=100`;
- checklist de exemplo marcado como feito antes do merge;
- este `progress.md` dando a #16 e a #17 como abertas depois de elas já terem sido mergeadas.

Entregas da sessão: 7 PRs mergeadas (#12, #13, #15, #16, #17, #18 e esta), 7 issues criadas, 2 fechadas.

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
