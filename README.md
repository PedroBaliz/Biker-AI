# 🚴‍♂️ Biker AI — Seu Treinador de Ciclismo com Inteligência Artificial

> Plataforma inteligente de periodização, prescrição e acompanhamento de treinos de ciclismo personalizados com IA (Google Gemini), adaptados ao nível, objetivos, rotina e métricas de cada atleta.

[![CI](https://github.com/pedro-bramos/biker-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/pedro-bramos/biker-ai/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8.svg)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-orange.svg)

---

## 🎯 O Problema que o Biker AI Resolve

A maioria dos ciclistas amadores e entusiastas enfrenta um dilema comum:
1. **Planilhas genéricas da internet:** Não respeitam a rotina semanal real, o nível físico, as limitações articulares ou os equipamentos do atleta (medidor de potência vs. frequencímetro vs. percepção de esforço - RPE).
2. **Consultorias presenciais e treinadores dedicados:** Possuem custo financeiro elevado, tornando o acompanhamento técnico inacessível para grande parte dos praticantes.
3. **Falta de feedback pós-treino:** Atletas pedalam sem saber se a intensidade aplicada foi produtiva ou se estão sob risco de *overtraining* ou lesão.

O **Biker AI** democratiza a metodologia profissional de treinamento esportivo de ciclismo, combinando a precisão da Inteligência Artificial do Google Gemini com a ciência da fisiologia do exercício (periodização clássica e polarizada, zonas de potência Coggan Z1–Z7, zonas cardíacas e RPE Borg 1–10).

---

## 🚀 Principais Funcionalidades

### 1. 📋 Onboarding & Diagnóstico Fisiológico Inteligente
- Questionário dinâmico guiado para mapeamento de:
  - Nível do ciclista (*Iniciante*, *Intermediário*, *Avançado/Competitivo*).
  - Objetivo principal (*Melhorar condicionamento*, *Provas/Gran Fondo*, *Subidas/Escaladas*, *Perda de peso*).
  - Disponibilidade semanal (número de dias e minutos por sessão).
  - Sensores disponíveis: **Potência (FTP)**, **Frequência Cardíaca (BPM Máximo)** ou **Percepção Subjetiva de Esforço (RPE 1-10)** para quem não usa sensores.
  - Limitações físicas e lesões prévias.

### 2. 📅 Prescrição e Periodização de Planilhas Semanais
- Geração automática de microciclos estruturados por dia da semana.
- Cada treino detalha:
  - **Aquecimento progressivo** com cadência alvo.
  - **Bloco Principal intervalado** (Ex: *Sweet Spot*, *Tiro VO2 Max*, *Endurance Z2*, *Limiar de Lactato*).
  - **Volta à calma**, hidratação, nutrição intra-treino e dicas fisiológicas práticas do treinador.
- **Geração da Próxima Semana:** O treinador avalia a adesão aos treinos anteriores e progressão de carga para modular os estímulos do ciclo seguinte.

### 3. 🤖 Coach AI Conversacional (Sessão Efêmera)
- Assistente virtual especialista em ciclismo para tirar dúvidas técnicas (nutrição, técnica de pedalada, recuperação, cadência).
- Permite solicitar ajustes na planilha diretamente pelo chat (ex: *"Tive um imprevisto na terça, pode reorganizar minha semana?"*).
- Sessões em tempo real focadas, iniciando limpas a cada abertura para máximo desempenho e privacidade.

### 4. 🔗 Leitura e Análise de Treinos do Strava
- Importação direta de dados e links de atividades do Strava.
- Extração de métricas de desempenho: quilometragem, ganho de elevação, velocidade média, potência e batimentos cardíacos.
- Avaliação comparativa: confronto entre o treino que foi prescrito e o que foi de fato executado pelo atleta, gerando feedback de conformidade.

### 5. 📄 Exportação em PDF Formatado
- Download em 1 clique da planilha semanal completa em layout limpo e profissional para impressão ou consulta offline no celular/ciclocomputador.

### 6. 🛡️ Painel Administrativo do Treinador (Coach Dashboard)
- Visualização e auditoria de todos os atletas cadastrados.
- Gerenciamento de status de assinatura (*Ativo*, *Pendente*, *Expirado*).
- Criação e restauração de backups instantâneos do banco de dados.
- Moderação e controle de acessos com credenciais restritas e verificação criptográfica.

### 7. 💳 Assinaturas & Período de Teste Gratuito
- Teste gratuito (*trial*) de 3 dias sem bloqueio de funcionalidades.
- Muro de assinatura transparente integrado ao Mercado Pago (Checkout transparente e Pix instantâneo com QR Code dinâmico).

---

## 🛠️ Arquitetura e Tecnologias

```
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

## 🔒 Segurança e Boas Práticas

- **Controle de Acesso Baseado em Papéis (RBAC):** Regras de segurança no Firestore (`firestore.rules`) garantem que cada atleta acesse e modifique apenas seus próprios dados (`isOwner(email)`), impedindo leitura ou gravação não autorizada.
- **Validação Criptográfica de Tokens:** A função `requireAuth` valida tokens JWT emitidos pelo Google Firebase utilizando as chaves públicas oficiais do Google (RS256). Não há confiança cega em dados arbitrários informados pelo cliente.
- **Proteção de Senhas:** Senhas locais passam por hash **PBKDF2** com 100.000 iterações, SHA-256 e *salt* criptográfico exclusivo por usuário.
- **Prevenção de Timing Attacks:** Validações de segredos administrativos utilizam `crypto.timingSafeEqual`.
- **Sanitização de Logs:** Logs de servidor nunca registram cabeçalhos de autorização, cookies ou tokens de acesso.

---

## 💻 Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 20.x ou superior.
- Gerenciador de pacotes `npm`.

### 1. Clonar o Repositório
```bash
git clone https://github.com/pedro-bramos/biker-ai.git
cd biker-ai
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo e preencha suas variáveis:
```bash
cp .env.example .env
```

Campos disponíveis no `.env`:
```env
# Chave de API do Google Gemini (obrigatória para o treinador IA)
GEMINI_API_KEY=sua_chave_gemini_aqui

# Credenciais administrativas do Treinador (Server-side)
ADMIN_PASSWORD=sua_senha_mestra_aqui
ADMIN_EMAIL=pedro.bramos@sempreceub.com

# Mercado Pago (opcional para testes de pagamento)
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_PUBLIC_KEY=
```

### 4. Executar em Modo de Desenvolvimento
```bash
npm run dev
```
O servidor iniciará em `http://localhost:3000`.

### 5. Executar os Testes Automatizados
```bash
npm test
```

### 6. Validar Tipos e Lint
```bash
npm run lint
```

### 7. Build para Produção
```bash
npm run build
npm start
```

---

## 🧪 Suíte de Testes Automatizados

O projeto conta com testes unitários em `tests/auth_security.test.ts` cobrindo:
- Geração e verificação de hashes PBKDF2 com *salt*.
- Comparação em tempo constante para credenciais administrativas.
- Bloqueio de tentativas de spoofing de identidade sem token válido.
- Sanitização de logs contra vazamento de credenciais e cabeçalhos sensíveis.

---

## 📄 Licença

Este projeto é desenvolvido para fins educacionais e de demonstração tecnológica. Todos os direitos reservados.
