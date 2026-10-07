# Biker AI — Seu Treinador de Ciclismo com Inteligência Artificial

> Plataforma de periodização, prescrição e acompanhamento de treinos de ciclismo personalizados com IA (Google Gemini), adaptados ao nível, objetivos, rotina e métricas de cada atleta.

---

### Demonstração Online (Live Demo)

Acesse a aplicação em produção e teste todas as funcionalidades em tempo real:

**[Acessar Biker AI](https://ais-pre-ig3xpt2tylya4dpumxckiy-403337948550.us-west2.run.app)**

> **Credenciais de Demonstração (Seed Demo):**
> - **Atleta:** `atleta.demo@exemplo.com` (visualização de microciclo, chat do treinador e histórico)
> - **Treinador (Admin):** `treinador.demo@exemplo.com` (painel de gestão, status de atletas e backups)

---

## O Problema que o Biker AI Resolve

A maioria dos ciclistas amadores e entusiastas enfrenta um dilema comum:

1. **Planilhas genéricas da internet:** Não respeitam a rotina semanal real, o nível físico, as limitações articulares ou os equipamentos do atleta (medidor de potência vs. frequencímetro vs. percepção de esforço - RPE).
2. **Consultorias presenciais e treinadores dedicados:** Possuem custo financeiro elevado, tornando o acompanhamento técnico inacessível para grande parte dos praticantes.
3. **Falta de feedback pós-treino:** Atletas pedalam sem saber se a intensidade aplicada foi produtiva ou se estão sob risco de sobrecarga.

O **Biker AI** auxilia na estruturação de treinos combinando a capacidade analítica da Inteligência Artificial do Google Gemini com metodologias consolidadas de treinamento esportivo (periodização de cargas, zonas de potência Coggan Z1–Z7, zonas cardíacas e RPE Borg 1–10).

---

## Visão Geral da Interface

| Planilha Semanal Estruturada | Treinador Conversacional (Coach AI) |
| :---: | :---: |
| Visualização clara dos treinos do microciclo, aquecimento, bloco principal, cadência alvo e dicas. | Chat dinâmico em sessão limpa para tirar dúvidas e solicitar ajustes rápidos na planilha. |

| Painel do Treinador (Admin) | Integração com Strava |
| :---: | :---: |
| Gestão de assinaturas, auditoria de atletas cadastrados e backups do sistema. | Importação de treinos reais com comparação entre o planejado e o executado. |

---

## Principais Funcionalidades

### 1. Onboarding & Perfil de Treino Personalizado

- Questionário guiado para mapeamento de:
  - Nível do ciclista (*Iniciante*, *Intermediário*, *Avançado/Competitivo*).
  - Objetivo principal (*Melhorar condicionamento*, *Provas/Gran Fondo*, *Subidas/Escaladas*, *Perda de peso*).
  - Disponibilidade semanal (número de dias e minutos por sessão).
  - Métricas e sensores: **Potência (FTP)**, **Frequência Cardíaca (BPM Máximo)** ou **Percepção Subjetiva de Esforço (RPE 1-10)** para quem pedala sem sensores.
  - Limitações físicas e rotina recente.

### 2. Prescrição e Periodização de Planilhas Semanais

- Estruturação de microciclos organizados por dia da semana.
- Cada sessão detalha:
  - **Aquecimento progressivo** com cadência sugerida.
  - **Bloco Principal intervalado** (Ex: *Sweet Spot*, *VO2 Max*, *Endurance Z2*, *Limiar de Lactato*).
  - **Volta à calma**, hidratação e recomendações práticas de recuperação.
- **Geração da Próxima Semana:** O treinador avalia os treinos concluídos pelo atleta para modular as cargas do ciclo seguinte.

### 3. Coach AI Conversacional (Sessão Efêmera)

- Assistente virtual especialista em ciclismo para tirar dúvidas técnicas (nutrição, técnica de pedalada, recuperação, cadência).
- Permite solicitar ajustes na planilha diretamente pelo chat (ex: *"Tive um imprevisto na terça, pode reorganizar minha semana?"*).
- Sessões em tempo real focadas, iniciando limpas a cada abertura para máximo desempenho e privacidade.

### 4. Leitura e Análise de Treinos do Strava

- Importação direta de dados e links de atividades do Strava.
- Extração de métricas de desempenho: quilometragem, ganho de elevação, velocidade média, potência e batimentos cardíacos.
- Avaliação comparativa entre o treino prescrito e a atividade registrada pelo atleta.

### 5. Exportação em PDF Formatado

- Download em 1 clique da planilha semanal completa em layout limpo e profissional para impressão ou consulta offline no celular/ciclocomputador.

### 6. Painel Administrativo do Treinador (Coach Dashboard)

- Visualização e auditoria de atletas cadastrados.
- Gerenciamento de status de assinatura (*Ativo*, *Pendente*, *Expirado*).
- Criação e restauração de backups instantâneos do banco de dados.
- Moderação e controle de acessos com credenciais restritas e verificação criptográfica.

### 7. Assinaturas & Período de Teste Gratuito

- Teste gratuito (*trial*) de 3 dias sem bloqueio de funcionalidades.
- Muro de assinatura transparente integrado ao Mercado Pago (Checkout transparente e Pix instantâneo com QR Code dinâmico).

---

## Arquitetura e Tecnologias

```text
biker-ai/
├── src/
│   ├── components/            # Componentes React modulares (CoachChat, WorkoutCard, etc.)
│   ├── lib/                   # Utilitários de API, pixel, analytics e formatação
│   ├── App.tsx                # Container e orquestração do frontend
│   └── firebase.ts            # Inicialização e cliente Firebase SDK (Auth & Firestore)
├── server.ts                  # Servidor Express Full-Stack (IA Gemini, API, Proxy, Auth)
├── firestore.rules            # Regras de segurança RBAC publicadas no Firestore
├── tests/                     # Suíte de testes automatizados com Vitest
└── .github/workflows/         # Pipeline de Integração Contínua (CI)
```

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite | Interface SPA responsiva, reativa e tipada |
| **Estilização** | Tailwind CSS v4, Motion (Framer) | Design moderno, animações fluidas e modo escuro |
| **Inteligência Artificial** | Google GenAI SDK (`@google/genai`) | Integração server-side com modelos Gemini |
| **Backend / API** | Node.js, Express, TSX | Rotas de API, autenticação, proxy seguro e orquestração |
| **Autenticação & Banco** | Firebase Auth & Cloud Firestore | Login social/credenciais e persistência em nuvem com RBAC |
| **Testes** | Vitest | Testes unitários para segurança, auth e hashing PBKDF2 |
| **CI / CD** | GitHub Actions | Lint, verificação de tipos, testes automatizados e build |

---

## Segurança e Defesa em Profundidade

- **Defesa Contra Escalada de Privilégios no Firestore (`firestore.rules`):**  
  As regras do Cloud Firestore utilizam uma lista restrita de campos editáveis combinada com `diff().affectedKeys().hasOnly(...)`. Essa validação impede que um usuário conceda privilégios a si mesmo (como adicionar ou alterar `role`, `isCoach`, `subscriptionStatus`, `subscriptionPlan`, `subscriptionExpiresAt` ou `createdAt`), mesmo quando esses campos estiverem ausentes no documento original.

- **Pipeline de Autorização no Servidor Express (`server.ts`):**
  - `requireAuth`: exige token JWT oficial assinado pelo Google Firebase (RS256) ou credencial administrativa validada via `crypto.timingSafeEqual`.
  - `verifyUserMatch`: garante que um atleta autenticado só consiga ler ou modificar seus próprios registros, bloqueando qualquer tentativa de scraping ou alteração de dados de terceiros.
  - Sanitização de perfil na rota real `/api/auth/save-user`: apenas campos não-privilegiados do atleta (`name`, `level`, `goal`, `ftp`, `maxHeartRate`, etc.) podem ser atualizados pelo cliente; status de assinatura e papéis administrativos são rigorosamente preservados do banco.

- **Proteção de Senhas:** Senhas locais passam por hash **PBKDF2** nativo com 100.000 iterações, SHA-256 e *salt* criptográfico exclusivo de 16 bytes por usuário.

- **Sanitização de Logs e Telemetria:** Logs de requisições registram apenas método, rota e status HTTP, sem nunca gravar cabeçalhos de autorização, cookies ou tokens de acesso.

---

## Dados de Demonstração (Seed Data)

Para permitir a execução, testes automatizados e avaliação local sem necessidade de banco em nuvem inicial:

- O repositório inclui registros **100% fictícios** de exemplo em `users_db.json` e no modelo `users_db.example.json`.
- Nenhum dado pessoal real ou de produção está presente no repositório.
- As senhas dos registros de teste utilizam formato criptográfico `salt:hash` gerado por PBKDF2
