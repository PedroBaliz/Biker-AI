import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
app.use(express.json());

// JSON file database path for syncing accounts across devices
const USERS_DB_PATH = path.join(process.cwd(), "users_db.json");
const CLOUD_DB_URL = "https://kvdb.io/b70e2926ag2_biker_ai_secure_store_pro/users_database";

// In-memory cache to keep performance high and prevent rate-limiting
let inMemoryDbCache: Record<string, any> | null = null;
let lastCloudFetchTime = 0;

// Dual-sync cloud-capable database retriever helper
async function getDatabase(): Promise<Record<string, any>> {
  const now = Date.now();
  // Cache in memory for 30 seconds to keep performance instant and bypass limits
  if (inMemoryDbCache && (now - lastCloudFetchTime < 30000)) {
    return inMemoryDbCache;
  }

  // Load from the local JSON as standard fast backup
  let localDb: Record<string, any> = {};
  try {
    if (fs.existsSync(USERS_DB_PATH)) {
      const data = fs.readFileSync(USERS_DB_PATH, "utf-8");
      localDb = JSON.parse(data);
    }
  } catch (err) {
    console.warn("Nenhum cache de banco de dados local encontrado ou falha na leitura:", err);
  }

  // Sync / fetch from the cloud KV store
  try {
    const res = await fetch(CLOUD_DB_URL);
    if (res.ok) {
      const cloudDb = await res.json();
      if (cloudDb && typeof cloudDb === "object") {
        // Merge cloud-dominant registry with local registry
        inMemoryDbCache = { ...localDb, ...cloudDb };
        lastCloudFetchTime = now;
        // Save local copy to update caches
        fs.writeFileSync(USERS_DB_PATH, JSON.stringify(inMemoryDbCache, null, 2), "utf-8");
        return inMemoryDbCache;
      }
    }
  } catch (err) {
    console.warn("Erro ao ler banco de dados na nuvem, utilizando cache local:", err);
  }

  inMemoryDbCache = localDb;
  return localDb;
}

// Dual-sync cloud-capable database saving helper
async function saveDatabase(db: Record<string, any>) {
  inMemoryDbCache = db;
  // Write locally right away
  try {
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("FALHA ao salvar cache de banco de dados local:", err);
  }

  // Write asynchronously to cloud storage
  try {
    await fetch(CLOUD_DB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(db)
    });
    console.log("Banco de dados sincronizado na nuvem com sucesso!");
  } catch (err) {
    console.error("FALHA ao sincronizar banco de dados na nuvem:", err);
  }
}

// -------------------------------------------------------------
// USER SIGNUP, SIGNIN & CLOUD SYNCHRONIZATION ENDPOINTS
// -------------------------------------------------------------

// Sign up and provision an athlete profile on the cloud (server)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Dados inválidos de cadastro." });
    }

    const db = await getDatabase();
    const emailKey = email.trim().toLowerCase();

    if (db[emailKey]) {
      return res.status(400).json({ error: "Este endereço de e-mail já está cadastrado. Faça login para acessar." });
    }

    const customWelcomeText = `Olá, ${name.trim()}! Que excelente ver você aqui na Biker AI. Eu sou o seu Treinador de Ciclismo pessoal.\n\nMinhas planilhas e conselhos são focados em melhorar o seu fôlego e resistência de forma simples e segura, ajustando seus treinos por potência, batimentos do coração ou pelas suas percepções de cansaço.\n\nPara começarmos a planejar sua evolução de forma personalizada, preciso te conhecer melhor através de algumas perguntas rápidas no nosso chat.\n\nComo você já se cadastrou, podemos iniciar o questionário agora mesmo. **Qual é o seu tempo médio pedalando ou seu nível atual no ciclismo?**`;

    const newProfile = {
      name: name.trim(),
      level: "",
      goal: "",
      daysPerWeek: null,
      durationPerSession: null,
      eventDate: "",
      hasPowerMeter: null,
      ftp: null,
      hasHeartRate: null,
      maxHeartRate: null,
      limitations: "",
      recentActivity: "",
      onboardingStep: 1
    };

    const initialChat = [
      {
        id: "welcome-registered",
        sender: "treinador",
        text: customWelcomeText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    ];

    const newUserEntry = {
      email: email.trim(),
      password,
      profile: newProfile,
      chatHistory: initialChat,
      plan: null
    };

    db[emailKey] = newUserEntry;
    await saveDatabase(db);

    res.json({ success: true, user: newUserEntry });
  } catch (error: any) {
    console.error("Error in server registration:", error);
    res.status(500).json({ error: error.message });
  }
});

// Authenticate and fetch full athlete history/state from the cloud (server)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const db = await getDatabase();
    const emailKey = email.trim().toLowerCase();
    const user = db[emailKey];

    if (!user) {
      return res.status(400).json({ error: "Nenhum cadastro encontrado com este e-mail. Crie uma conta ao lado!" });
    }

    if (user.password !== password) {
      return res.status(400).json({ error: "Senha incorreta. Verifique os dados e tente novamente." });
    }

    res.json({ success: true, user });
  } catch (error: any) {
    console.error("Error in server login:", error);
    res.status(500).json({ error: error.message });
  }
});

// Real-time synchronization of athlete profile, history & planning sheets to the cloud
app.post("/api/auth/save-user", async (req, res) => {
  try {
    const { email, userAccount, password } = req.body;
    if (!email || !userAccount) {
      return res.status(400).json({ error: "Dados para sincronização inválidos." });
    }

    const db = await getDatabase();
    const emailKey = email.trim().toLowerCase();
    
    // Maintain password
    const preservedPassword = password || db[emailKey]?.password || "123456";

    db[emailKey] = {
      ...userAccount,
      password: preservedPassword
    };

    await saveDatabase(db);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error synchronizing athlete state:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;

// Initialize Gemini client on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to handle Gemini API errors or key missing
const checkApiKey = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured in the environment variables.");
  }
};

/**
 * Endpoint 1: Guided Onboarding Chat Step
 * Analyzes the latest athlete message, extracts any relevant training parameters,
 * and replies with the friendly next question in Portuguese.
 */
app.post("/api/onboard", async (req, res) => {
  try {
    checkApiKey();
    const { message, profile, messageHistory } = req.body;

    const systemInstruction = `Você é um treinador especialista em ciclismo com profundo conhecimento em fisiologia do esporte, periodização e treinamento baseado em potência (FTP) e frequência cardíaca.
Seu papel atual é realizar a CONVERSA INICIAL (onboarding) com o ciclista para coletar seu perfil de forma calorosa, amigável e extremamente profissional.

Preencha os dados do atleta de forma progressiva. Você deve fazer as perguntas uma por uma, amigavelmente, em português brasileiro.
As 10 perguntas obrigatórias são:
1. Qual é o seu nome?
2. Há quanto tempo pedala? (iniciante / intermediário / avançado)
3. Qual é o seu objetivo principal? (perder peso / melhorar condicionamento / completar um evento / competir)
4. Quantos dias por semana consegue treinar?
5. Quanto tempo tem disponível por treino (em minutos)?
6. Tem algum evento ou prova com data marcada? (Se sim, qual e quando?)
7. Usa medidor de potência? Se sim, qual é seu FTP atual?
8. Usa monitor de frequência cardíaca? Se sim, qual é sua FCmax aproximada?
9. Tem alguma limitação física ou lesão?
10. Qual foi o seu pedal ou treino mais recente (distância, tempo ou sensação)?

Nas mensagens, analise a última resposta do atleta e atualize o perfil. Expresse empatia e incentive o atleta.
Você DEVE responder rigorosamente no formato JSON com duas chaves:
- "reply": a mensagem de texto amigável do treinador para o atleta (validando a resposta anterior e fazendo a PRÓXIMA PERGUNTA uma a uma).
- "parsedProfile": um objeto representando apenas as propriedades que você conseguiu extrair da resposta atual do atleta para atualizar o perfil.

Mapeamento do parsedProfile (mande apenas o que extraiu ou corrigiu neste turno, sem apagar o resto):
- name: string
- level: "iniciante" | "intermediário" | "avançado" (ou vazio se não souber)
- goal: "perder peso" | "melhorar condicionamento" | "completar um evento" | "competir" (ou vazio se não souber)
- daysPerWeek: number (ex: 3)
- durationPerSession: number (em minutos, ex: 90)
- eventDate: string (data ou descrição, ex: "GFNY em Outubro")
- hasPowerMeter: boolean (true/false)
- ftp: number (ex: 220)
- hasHeartRate: boolean (true/false)
- maxHeartRate: number (ex: 185)
- limitations: string (lesões ou restrições)
- recentActivity: string (detalhes do pedal ou treino recente informado)
- onboardingStep: number (o número da próxima pergunta de 1 a 10 que você está fazendo agora)

Exemplo de formato esperado de saída:
{
  "reply": "Excelente, Carlos! É muito bom saber que você tem o GFNY como meta. E me conte: você utiliza medidor de potência em seus treinos? Se sim, qual o seu FTP atual?",
  "parsedProfile": {
    "name": "Carlos",
    "eventDate": "GFNY em Outubro",
    "onboardingStep": 7
  }
}`;

    const updatedPrompt = `Mensagem do Atleta: "${message}"
Perfil Atual do Atleta: ${JSON.stringify(profile)}
Histórico de Mensagens anteriores: ${JSON.stringify(messageHistory?.slice(-10) || [])}

Analise a resposta, atualize o "parsedProfile" de acordo (pode preencher múltiplos campos caso o atleta tenha respondido mais de uma coisa ou antecipado dados), aumente o onboardingStep se ele respondeu a pergunta atual, e gere a "reply" contendo a próxima pergunta ou um encerramento amigável se todas as 10 perguntas foram respondidas.
Se o ciclista já respondeu a tudo, diga que o perfil está completo e que ele pode confirmar os dados na tela para gerar sua planilha semanal personalizada.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: updatedPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["reply", "parsedProfile"],
          properties: {
            reply: {
              type: Type.STRING,
              description: "Mensagem amigável do treinador respondendo ao atleta e fazendo a próxima pergunta"
            },
            parsedProfile: {
              type: Type.OBJECT,
              description: "Campos atualizados do perfil obtidos a partir da resposta",
              properties: {
                name: { type: Type.STRING },
                level: { type: Type.STRING, enum: ["iniciante", "intermediário", "avançado", ""] },
                goal: { type: Type.STRING, enum: ["perder peso", "melhorar condicionamento", "completar um evento", "competir", ""] },
                daysPerWeek: { type: Type.INTEGER },
                durationPerSession: { type: Type.INTEGER },
                eventDate: { type: Type.STRING },
                hasPowerMeter: { type: Type.BOOLEAN },
                ftp: { type: Type.INTEGER },
                hasHeartRate: { type: Type.BOOLEAN },
                maxHeartRate: { type: Type.INTEGER },
                limitations: { type: Type.STRING },
                recentActivity: { type: Type.STRING },
                onboardingStep: { type: Type.INTEGER }
              }
            }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      return res.status(500).json({ error: "No response from Gemini API" });
    }
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error in onboarding API:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint 2: Plan Generator
 * Creates a fully customized, structured weekly training plan based on sports physiology
 * and the completed profile.
 */
app.post("/api/generate-plan", async (req, res) => {
  try {
    checkApiKey();
    const { profile } = req.body;

    const systemInstruction = `Você é um treinador de ciclismo especialista e deve gerar uma planilha de treinamento semanal altamente personalizada para o perfil do ciclista.
Baseie-se na fisiologia do exercício profissional:
- Ciclistas Iniciantes: Foco em base aeróbica (Z2), cadência, adaptação articular e volume digerível. Dias de folga frequentes.
- Ciclistas Intermediários: Foco em estruturação, mescla de endurance com intervalos de Sweet Spot ou Limiar de Lactato (Z4).
- Ciclistas Avançados: Foco em periodização de alta qualidade, trabalho polarizado ou piramidal com intervalos de VO2 Max (Z5), resistência neuromuscular (Z6) ou sprints (Z7), além de treinos de base longos.

Cálculo de Zonas (mencione de forma implícita ou explícita nas dicas):
- Se tiver potência (FTP), use zonas de potência Coggan (Z1 a Z7).
- Se tiver apenas frequência cardíaca (FCmax), use zonas de FC de Karvonen ou Friel (Z1 a Z5).

REGRA CRÍTICA DE COMUNICAÇÃO: Nunca utilize a palavra "RPE" ou "Percepção Subjetiva de Esforço" em suas explicações, resumos, descrições ou dicas. Esse termo técnico afasta o ciclista. Use termos muito simples e diretos para explicar o nível de esforço, tais como: "Muito Leve", "Leve", "Moderado", "Forte" ou "Máximo".

Você DEVE responder rigorosamente no formato JSON com a seguinte estrutura:
{
  "workouts": [
    {
      "day": "Dia da semana (ex: Segunda-feira)",
      "type": "Tipo do treino (ex: Endurance Extensivo, Intervalado de Limiar, Rolo Regenerativo, Folga)",
      "duration": 75, // duração em minutos
      "goal": "Objetivo fisiológico do treino",
      "structure": "Estrutura detalhada: ex: 10min aquec + 3x8min Z4 com 4min recup Z1 + 10min volta à calma",
      "targetZone": "Zona alvo de Potência/SFC (ex: Z2 (Endurance) ou Z4 (Limiar))",
      "rpe": 6, // Nota de esforço interno estrutural de 1 a 10 (1-2 Muito Leve, 3-4 Leve, 5-6 Moderado, 7-8 Forte, 9-10 Máximo)
      "tip": "Dica prática e motivadora para o treino"
    }
    // ... incluir os 7 dias da semana
  ],
  "summary": "Resumo da semana contendo volume total estimado em horas e o foco principal simples e direto",
  "observations": "O que o ciclista deve observar atentamente de forma direta e sem jargões (hidratação, dores ou descanso)",
  "evaluation": "Como avaliar o treino através de sensações simples de cansaço ou fôlego"
}

Para dias de descanso, use type "Folga" ou "Descanso Ativo" e zere a duração se for folga total, ou coloque duração curta (ex: 30min de soltura de pernas Z1). Atribua nota de esforço interno 1 ou 2.`;

    const userBrief = `Gere uma planilha semanal para o atleta com o seguinte perfil:
Nome: ${profile.name}
Nível: ${profile.level}
Objetivo: ${profile.goal}
Dias por semana disponíveis: ${profile.daysPerWeek}
Minutos por treino disponíveis: ${profile.durationPerSession} min
Evento alvo: ${profile.eventDate || "Nenhum evento marcado"}
Equipamentos: ${profile.hasPowerMeter ? `Medidor de Potência (FTP: ${profile.ftp}W)` : "Sem medidor de potência"} | ${profile.hasHeartRate ? `Monitor Cardíaco (FCmax: ${profile.maxHeartRate} bpm)` : "Sem monitor cardíaco"}
Limitações físicas: ${profile.limitations || "Nenhuma"}
Atividade recente cadastrada: ${profile.recentActivity || "Nenhuma registrada"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userBrief,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["workouts", "summary", "observations", "evaluation"],
          properties: {
            workouts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["day", "type", "duration", "goal", "structure", "targetZone", "rpe", "tip"],
                properties: {
                  day: { type: Type.STRING },
                  type: { type: Type.STRING },
                  duration: { type: Type.INTEGER },
                  goal: { type: Type.STRING },
                  structure: { type: Type.STRING },
                  targetZone: { type: Type.STRING },
                  rpe: { type: Type.INTEGER },
                  tip: { type: Type.STRING }
                }
              }
            },
            summary: { type: Type.STRING },
            observations: { type: Type.STRING },
            evaluation: { type: Type.STRING }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      return res.status(500).json({ error: "No response from Gemini API" });
    }
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error in generate-plan API:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint 2.5: Next Week Training Generator with progression logic
 * Generates the next week of training based on the athlete's completion records
 * of the current week (workouts "completed" status) and subjective feedback.
 */
app.post("/api/generate-next-week", async (req, res) => {
  try {
    checkApiKey();
    const { profile, currentPlan, athleteFeedback, nextWeekNumber } = req.body;

    // Analyze the previous plan's workouts
    const totalWorkouts = currentPlan?.workouts?.length || 0;
    const completedWorkouts = currentPlan?.workouts?.filter((w: any) => w.completed)?.length || 0;
    const completedPercent = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

    const systemInstruction = `Você é um treinador de ciclismo de elite especialista em fisiologia do esporte. O atleta acabou de terminar a semana anterior com as seguintes estatísticas de conclusão:
- Treinos planejados: ${totalWorkouts} treinos
- Treinos efetivamente concluídos: ${completedWorkouts} treinos (${completedPercent}% de conclusão)
- Feedback subjetivo do atleta sobre a semana passada: "${athleteFeedback || "Sem comentários específicos"}"

Seu papel é criar o plano de treinos estruturado para a PRÓXIMA SEMANA (Semana ${nextWeekNumber}) do atleta de forma inteligente e personalizada:

Regras de Fisiologia para Progressão e Ajuste de Carga:
1. PROGRESSÃO (Supercompensação):
- Se o percentual de conclusão for alto (>= 75%) e o feedback não indicar dores articulares ou exaustão extrema:
  * Progrida a carga de exercícios levemente (aumento de 5% a 10% no volume diário ou adicione um pouco mais de tempo nas zonas de intensidade como Z3/Z4/Z5).
  * Na "coachMessage", parabenize-o pela constância exemplar de campeão e explique didaticamente como o corpo dele está estocando mais glicogênio nas mitocôndrias e como esse aumento gradual consolida o rendimento a longo prazo.

2. MANUTENÇÃO OU DELOAD (Recuperação):
- Se o percentual de conclusão for baixo (< 75%) OU se o atleta sinalizar dores no joelho, costas ou cansaço absurdo no feedback:
  * Faça uma semana de adaptação estável (mesma carga da semana passada) ou uma semana regenerativa/deload (reduza o volume em 20% e foque em zonas de soltura Z1/Z2 para restabelecimento metabólico).
  * Na "coachMessage", acolha o atleta amigavelmente. Explique que o descanso planejado é o que realmente constrói ciclistas fortes, pois as fibras musculares se recuperam na cama e não em cima do selim. Dê conselhos práticos e profissionais baseados na saúde dele.

Certifique-se de que a propriedade "completed" de todas as atividades na nova semana venha definida como FALSE para que o atleta possa marcá-las como feitas na nova semana.

REGRA CRÍTICA DE COMUNICAÇÃO: Nunca utilize a palavra "RPE" ou "Percepção Subjetiva de Esforço" em suas explicações, resumos, descrições ou dicas. Esse termo técnico afasta o ciclista. Use termos muito simples e diretos para explicar o nível de esforço, tais como: "Muito Leve", "Leve", "Moderado", "Forte" ou "Máximo".

Você DEVE responder rigorosamente no formato JSON com a seguinte estrutura:
{
  "workouts": [
    {
      "day": "Dia da semana (ex: Segunda-feira)",
      "type": "Tipo de treino reajustado",
      "duration": 75,
      "goal": "Foco fisiológico desse treino para a semana ${nextWeekNumber}",
      "structure": "Estrutura detalhada (aquecimento, parte principal com zonas, volta à calma)",
      "targetZone": "Zona principal de trabalho (ex: Z2 ou Z3)",
      "rpe": 5, // Nota de esforço interno estrutural de 1 a 10 (1-2 Muito Leve, 3-4 Leve, 5-6 Moderado, 7-8 Forte, 9-10 Máximo)
      "tip": "Dica prática em português para auxiliar na execução"
    }
  ],
  "summary": "Resumo simples e amigável da semana ${nextWeekNumber} comparando volume com a semana anterior e foco do bloco",
  "observations": "Cuidados e observações específicas em termos simples (hidratação, calor, cansaço ou dores)",
  "evaluation": "Como julgar as sensações físicas esperadas de forma intuitiva",
  "weekNumber": ${nextWeekNumber},
  "coachMessage": "Mensagem motivacional e explicativa em português (atenciosa e amigável) detalhando o que mudou de uma semana para a outra, abordando especificamente a conclusão passada de ${completedPercent}% e as sensações do feedback."
}`;

    const userBrief = `Perfil do Atleta: ${JSON.stringify(profile)}
Foco Principal de Treino Atual: ${profile.goal}
FTP: ${profile.ftp}W, FCmax: ${profile.maxHeartRate} bpm
Planilha da Semana que passou: ${JSON.stringify(currentPlan?.workouts || [])}

Gere o planejamento estruturado completo para a Semana ${nextWeekNumber} seguindo rigorosamente a estrutura JSON solicitada.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userBrief,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["workouts", "summary", "observations", "evaluation", "weekNumber", "coachMessage"],
          properties: {
            workouts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["day", "type", "duration", "goal", "structure", "targetZone", "rpe", "tip"],
                properties: {
                  day: { type: Type.STRING },
                  type: { type: Type.STRING },
                  duration: { type: Type.INTEGER },
                  goal: { type: Type.STRING },
                  structure: { type: Type.STRING },
                  targetZone: { type: Type.STRING },
                  rpe: { type: Type.INTEGER },
                  tip: { type: Type.STRING }
                }
              }
            },
            summary: { type: Type.STRING },
            observations: { type: Type.STRING },
            evaluation: { type: Type.STRING },
            weekNumber: { type: Type.INTEGER },
            coachMessage: { type: Type.STRING }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      return res.status(500).json({ error: "No response from Gemini API for next week generation" });
    }
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error in generate-next-week API:", error);
    res.status(500).json({ error: error.message });
  }
});



/**
 * Endpoint 3: Individual Workout Evaluator
 * Evaluates a single completed workout based on prescribed targets vs actual performance notes/metrics.
 */
app.post("/api/evaluate-workout", async (req, res) => {
  try {
    checkApiKey();
    const { profile, workout } = req.body;

    const systemInstruction = `Você é um treinador de ciclismo de alto rendimento com profundo conhecimento em fisiologia do exercício, periodização clássica e moderna. O atleta acabou de registrar a conclusão de um treino presencial ou virtual e enviou os dados reais de realização para avaliação.

Seu papel é analisar detalhadamente:
1. O treino sugerido (Objetivo, Tipo, Duração planejada, Zona de Treino, Esforço Planejado).
2. O treino efetivamente realizado (Duração real, Esforço sentido recebido de 1 a 10, Frequência Cardíaca média, Potência média em Watts e os comentários do atleta).

Diretrizes da sua Análise Científica e Conselhos de Ouro:
- Se foi um treino "Regenerativo/Folga" (Z1/Z2) e o atleta rodou com esforço maior do que o planejado ou com frequência cardíaca muito alta, explique amigavelmente sobre o erro de "treinar forte no dia fácil", o que gera estresse crônico desnecessário sem adaptação benéfica.
- Se foi um treino "Forte/Limiar/Intervalos" (Z4/Z5) e o atleta manteve o foco, comemore muito! Diga o que acontece fisiologicamente no corpo dele (melhora do VO2Max, recrutamento de fibras do tipo II, aumento da complacência cardíaca).
- Relacione os dados reais (Potência em relação ao FTP, e Frequência Cardíaca em relação à FCmax do usuário) caso esses dados tenham sido informados (FTP: ${profile.ftp}W, FCmax: ${profile.maxHeartRate} bpm).
- Forneça recomendações práticas para as próximas 24-48 horas baseadas no cansaço relatado nas notas pessoais do atleta (ex: alongamentos, hidratação adicional, alimentação regenerativa rica em carboidratos complexos/proteínas, ou um bom sono).

REGRA CRÍTICA DE COMUNICAÇÃO: Nunca utilize a palavra "RPE" ou "Percepção Subjetiva de Esforço" em suas explicações, resumos, descrições ou dicas. Esse termo técnico afasta o ciclista. Use termos muito simples e diretos para explicar o nível de esforço, tais como: "Muito Leve", "Leve", "Moderado", "Forte" ou "Máximo".

Sua resposta deve ser estruturada sob o formato JSON contendo uma única chave:
{
  "aiFeedback": "Sua avaliação completa escrita em parágrafos de Markdown bem estruturados e amigáveis, contendo elogios específicos, análises fisiológicas sobre os dados cadastrados, e conselhos práticos de recuperação."
}`;

    const prompt = `TREINO PRESCRITO:
- Dia: ${workout.day}
- Tipo: ${workout.type}
- Duração Planejada: ${workout.duration} minutos
- Zona Alvo: ${workout.targetZone}
- Esforço Sugerido: ${workout.rpe}/10

TREINO REALIZADO PELO ATLETA:
- Duração Real: ${workout.actualDuration || workout.duration} minutos
- Esforço Real Sentido: ${workout.actualRpe || 5}/10
- Frequência Cardíaca Média Registrada: ${workout.actualHr ? `${workout.actualHr} bpm` : "Não informada"} (FCmax do perfil é ${profile.maxHeartRate || "não cadastrada"} bpm)
- Potência Média Registrada: ${workout.actualPower ? `${workout.actualPower} Watts` : "Não informada"} (FTP do perfil é ${profile.ftp || "não cadastrado"}W)
- Notas / Observações do Atleta: "${workout.athleteNotes || "Nenhum comentário preenchido pelo atleta."}"

Faça uma avaliação amigável de coach de alto nível e retorne o resultado em JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["aiFeedback"],
          properties: {
            aiFeedback: { type: Type.STRING }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      return res.status(500).json({ error: "No response from Gemini API for workout evaluation" });
    }
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error in evaluate-workout API:", error);
    res.status(500).json({ error: error.message });
  }
});



/**
 * Endpoint 4: Custom Coach Chat
 * Allows the athlete to ask any scientific/practical coaching question, modify structures manually,
 * etc.
 */
app.post("/api/chat", async (req, res) => {
  try {
    checkApiKey();
    const { message, profile, currentPlan, messageHistory } = req.body;

    const systemInstruction = `Você é um treinador de ciclismo especialista de classe mundial com profundo entendimento em fisiologia esportiva.
Você está em uma conversa contínua com seu atleta parceiro. Responda em português brasileiro de forma inspiradora, mas sempre de forma amigável, clara e didática.

REGRA CRÍTICA DE COMUNICAÇÃO: Nunca utilize a palavra "RPE" ou "Percepção Subjetiva de Esforço" em suas explicações, resumos, descrições ou dicas. Esse termo técnico afasta o ciclista. Use termos muito simples e diretos para explicar o nível de esforço, tais como: "Muito Leve", "Leve", "Moderado", "Forte" ou "Máximo".

Dicas de comunicação:
- Explique brevemente o porquê fisiológico das suas instruções quando achar oportuno usando analogias fáceis e animadoras para o progresso do atleta.
- Se eles perguntarem sobre cansaço extremo ou lesão, seja cauteloso e preze pelo descanso ativo ou repouso absoluto.
- Se eles pedirem para alterar ou regenerar a planilha do treino, encoraje-os a atualizar os dados de treino ou sugira ajustes práticos.

Envie um JSON com as seguintes chaves:
- "reply": a resposta do coach formatada em Markdown (pode incluir listas, bullets ou termos explicados de maneira estimulante e simples).
- "updatedPlan": opcional, caso o atleta tenha pedido explicitamente uma alteração no treino (como "mude terça para descanso" ou "adicione um treino extra no sábado"). Retorne a planilha atualizada na mesma estrutura, senão envie nulo.`;

    const userBrief = `Atleta Perfil: ${JSON.stringify(profile)}
Planilha Semanal Atual: ${JSON.stringify(currentPlan)}
Histórico Recente: ${JSON.stringify(messageHistory?.slice(-10) || [])}
Última Mensagem do Atleta: "${message}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userBrief,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["reply"],
          properties: {
            reply: { type: Type.STRING },
            updatedPlan: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                workouts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ["day", "type", "duration", "goal", "structure", "targetZone", "rpe", "tip"],
                    properties: {
                      day: { type: Type.STRING },
                      type: { type: Type.STRING },
                      duration: { type: Type.INTEGER },
                      goal: { type: Type.STRING },
                      structure: { type: Type.STRING },
                      targetZone: { type: Type.STRING },
                      rpe: { type: Type.INTEGER },
                      tip: { type: Type.STRING }
                    }
                  }
                },
                summary: { type: Type.STRING },
                observations: { type: Type.STRING },
                evaluation: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      return res.status(500).json({ error: "No response from Gemini API" });
    }
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error in custom chat API:", error);
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend assets and start listening
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In Express v4, we use * to match all routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
});
