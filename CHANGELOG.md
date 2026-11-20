# Changelog

Mudanças visíveis ao usuário do Biker AI. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). As datas são de deploy em `main`.

## [Não lançado]

### Alterado
- O Biker AI está gratuito: todos os recursos ficam liberados para qualquer atleta, sem período de teste nem bloqueio. A página inicial, os Termos de Uso, a Política de Privacidade, o contato e as Configurações da conta deixam de falar em assinatura, preço e Mercado Pago.

### Removido
- Pagamento pelo Mercado Pago (cartão, Pix e checkout) e o aviso de pagamento.
- Campo "Link do pedal no Strava" e o botão "Ver atividade no Strava" no registro do treino. As métricas digitadas (distância, tempo, potência, FC) continuam.

## 2026-11-16

### Corrigido
- Configurações da conta, link de atividade do Strava, respostas da IA e etapas do onboarding (PR #4).
- Falhas de segurança: acesso a conteúdo pago sem assinatura e acesso indevido a contas de outros usuários (PR #3).

### Alterado
- O README não promete mais a importação automática do Strava: o link da atividade é salvo só como referência.
