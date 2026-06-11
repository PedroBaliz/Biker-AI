import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// Write startup log to verify server is executing
try {
  fs.writeFileSync(
    path.join(process.cwd(), "server_boot.log"),
    `Server boot started at: ${new Date().toISOString()}\nLocal DB Path: ${path.join(process.cwd(), "users_db.json")}\n`,
    "utf-8"
  );
} catch (e: any) {
  console.error("Failed to write startup log:", e);
}

const app = express();
app.use(express.json());

// Normalização de URLs de API no ambiente Vercel para compatibilidade de rotas
app.use((req, res, next) => {
  if (process.env.VERCEL && !req.url.startsWith("/api")) {
    req.url = "/api" + req.url;
  }
  next();
});

// Log all requests to a physical file for request tracing
app.use((req, res, next) => {
  const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}\n`;
  try {
    fs.appendFileSync(path.join(process.cwd(), "server_requests.log"), logMsg, "utf-8");
  } catch (e) {
    // ignore logging failure
  }
  next();
});

// JSON file database path for local persistence
const USERS_DB_PATH = path.join(process.cwd(), "users_db.json");

// In-memory cache to keep performance high and prevent disk read fatigue
let inMemoryDbCache: Record<string, any> | null = null;

// Local database retriever helper
async function getDatabase(): Promise<Record<string, any>> {
  if (inMemoryDbCache) {
    return inMemoryDbCache;
  }

  // Load from the local JSON file
  let localDb: Record<string, any> = {};
  try {
    if (fs.existsSync(USERS_DB_PATH)) {
      const data = fs.readFileSync(USERS_DB_PATH, "utf-8");
      localDb = JSON.parse(data);
    }
  } catch (err: any) {
    console.warn("Nenhum cache de banco de dados local encontrado ou falha na leitura, iniciando novo:", err.message);
  }

  inMemoryDbCache = localDb;
  return localDb;
}

// Local database saving helper
async function saveDatabase(db: Record<string, any>) {
  inMemoryDbCache = db;

  // Write locally right away to guarantee instant local persistence
  try {
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    console.log("[Banco Local] Banco de dados persistido localmente com sucesso.");
  } catch (err) {
    console.error("FALHA ao salvar cache de banco de dados local:", err);
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

// Initialize Gemini client lazily on the server
let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  let key = process.env.GEMINI_API_KEY || "";
  // Strip quotes if they were added in the environment
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  } else if (key.startsWith("'") && key.endsWith("'")) {
    key = key.slice(1, -1);
  }
  key = key.trim();

  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured in the environment variables.");
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
};

// Helper to handle Gemini API errors or key missing
const checkApiKey = () => {
  getAiClient();
};

// Safe JSON parser block that strips away any markdown fences
const cleanAndParseJson = (text: string): any => {
  let cleanText = text.trim();
  
  const tryParse = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  // 1. Try parsing directly
  let parsed = tryParse(cleanText);
  if (parsed) return parsed;

  // 2. Clear Markdown fences
  if (cleanText.startsWith("```")) {
    const firstNewline = cleanText.indexOf("\n");
    if (firstNewline !== -1) {
      cleanText = cleanText.substring(firstNewline + 1);
    } else {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();
  }
  
  parsed = tryParse(cleanText);
  if (parsed) return parsed;

  // 3. Search for the outermost JSON brace bounds
  const firstBrace = cleanText.indexOf("{");
  const lastBrace = cleanText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleanText.substring(firstBrace, lastBrace + 1);
    parsed = tryParse(candidate);
    if (parsed) return parsed;
  }

  // 4. Search for outermost array brackets
  const firstBracket = cleanText.indexOf("[");
  const lastBracket = cleanText.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const candidate = cleanText.substring(firstBracket, lastBracket + 1);
    parsed = tryParse(candidate);
    if (parsed) return parsed;
  }

  console.error("FALHA CRÍTICA DE RESOLUÇÃO JSON:", text);
  throw new Error("O servidor recebeu uma resposta com formato incorreto da IA. Por favor, tente enviar a mensagem novamente.");
};

// -----------------------------------------------------------------
// COCHING ENGINE LOCAL RULE-BASED FALLBACK GENERATORS (RESILIENCY)
// -----------------------------------------------------------------

const fallbackOnboarding = (message: string, profile: any): any => {
  const currentStep = profile?.onboardingStep !== undefined ? Number(profile.onboardingStep) : 1;
  const nextStep = Math.min(10, currentStep + 1);
  const parsedProfile: any = { onboardingStep: nextStep };

  const normalizedMsg = (message || "").toLowerCase();

  switch (currentStep) {
    case 1: // Asking Name
      parsedProfile.name = message.replace(/(meu nome é|sou o|sou a|me chamo)\s*/gi, "").trim() || message;
      return {
        reply: `Muito prazer, ${parsedProfile.name}! Seja bem-vindo ao Biker AI. Para calibrar a planilha ideal, me conta: há quanto tempo você pedala? Você se considera iniciante, intermediário ou avançado?`,
        parsedProfile: { name: parsedProfile.name, onboardingStep: 2 }
      };
    case 2: // Level
      let level = "iniciante";
      if (normalizedMsg.includes("avan")) level = "avançado";
      else if (normalizedMsg.includes("interm") || normalizedMsg.includes("medio")) level = "intermediário";
      parsedProfile.level = level;
      return {
        reply: `Excelente! Definir seu nível como ${level} ajuda muito a calibrar a intensidade inicial. E qual o seu objetivo principal agora nos treinos? Exemplo: perder peso, melhorar condicionamento, completar um evento ou competir?`,
        parsedProfile: { level, onboardingStep: 3 }
      };
    case 3: // Goal
      let goal = "melhorar condicionamento";
      if (normalizedMsg.includes("peso") || normalizedMsg.includes("emagrecer") || normalizedMsg.includes("gordura")) goal = "perder peso";
      else if (normalizedMsg.includes("compet") || normalizedMsg.includes("corrida") || normalizedMsg.includes("prova")) goal = "competir";
      else if (normalizedMsg.includes("evento") || normalizedMsg.includes("gfny") || normalizedMsg.includes("desafio")) goal = "completar um evento";
      parsedProfile.goal = goal;
      return {
        reply: `Muito bom! O objetivo "${goal}" vai guiar nossa periodização de maneira assertiva. Agora, me diga: quantos dias por semana você tem disponíveis para treinar de bicicleta? (ex: 3 dias, 4 dias, 5 dias...)`,
        parsedProfile: { goal, onboardingStep: 4 }
      };
    case 4: // Days per week
      const matchesDays = message.match(/\d+/);
      const days = matchesDays ? parseInt(matchesDays[0], 10) : 3;
      parsedProfile.daysPerWeek = days;
      return {
        reply: `Perfeito, treinar ${days} dias por semana é excelente para construir a consistência ideal! Em média, quantos minutos você tem disponíveis por treino diário? (ex: 60 minutos, 90 minutos...)`,
        parsedProfile: { daysPerWeek: days, onboardingStep: 5 }
      };
    case 5: // Duration per session
      const matchesMinutes = message.match(/\d+/);
      const minutes = matchesMinutes ? parseInt(matchesMinutes[0], 10) : 60;
      parsedProfile.durationPerSession = minutes;
      return {
        reply: `Entendido! Treinos de ${minutes} minutos são perfeitos para sessões estruturadas e eficientes. Me conta: você tem algum evento, desafio ou prova de ciclismo com data marcada? Se sim, qual e quando?`,
        parsedProfile: { durationPerSession: minutes, onboardingStep: 6 }
      };
    case 6: // Event Date
      const eventDate = message;
      return {
        reply: `Maravilha! Focar em um evento ajuda muito a manter o foco bem definido. Agora sobre equipamentos: você utiliza Medidor de Potência nos treinos? Se sim, sabe estimar qual é seu FTP atual em Watts?`,
        parsedProfile: { eventDate, onboardingStep: 7 }
      };
    case 7: // Power Meter / FTP
      const hasPower = normalizedMsg.includes("sim") || normalizedMsg.includes("tenho") || normalizedMsg.includes("uso") || /\d+/.test(message);
      const matchesFtp = message.match(/\d+/);
      const ftpVal = matchesFtp ? parseInt(matchesFtp[0], 10) : 200;
      parsedProfile.hasPowerMeter = hasPower;
      if (hasPower) parsedProfile.ftp = ftpVal;
      return {
        reply: `Excelente! O monitoramento por potência dará uma precisão científica perfeita aos tiros. E quanto à frequência cardíaca: você utiliza sensor (fita) de batimentos do coração? Se sim, qual sua FCmax aproximada?`,
        parsedProfile: { hasPowerMeter: hasPower, ftp: hasPower ? ftpVal : undefined, onboardingStep: 8 }
      };
    case 8: // Heart Rate
      const hasHR = normalizedMsg.includes("sim") || normalizedMsg.includes("tenho") || normalizedMsg.includes("uso") || /\d+/.test(message);
      const matchesMaxHr = message.match(/\d+/);
      const maxHrVal = matchesMaxHr ? parseInt(matchesMaxHr[0], 10) : 180;
      parsedProfile.hasHeartRate = hasHR;
      if (hasHR) parsedProfile.maxHeartRate = maxHrVal;
      return {
        reply: `Muito bom! O controle cardíaco nos guiará em subidas longas e controle regenerativo. Já estamos quase lá! Você possui alguma limitação física, dor nas articulações ou joelho que devemos considerar nos treinos?`,
        parsedProfile: { hasHeartRate: hasHR, maxHeartRate: hasHR ? maxHrVal : undefined, onboardingStep: 9 }
      };
    case 9: // Limitations
      const limitations = message;
      return {
        reply: `Anotado. Sua segurança física e saúde estão sempre em primeiro lugar. Para fecharmos o seu cadastro de atleta: como foi o seu pedal ou treino mais recente (estimativa de tempo, distância ou sensação de cansaço)?`,
        parsedProfile: { limitations, onboardingStep: 10 }
      };
    case 10: // Recent Activity and Complete Onboarding
      const recentActivity = message;
      return {
        reply: `Sensacional, atleta! Concluímos as 10 perguntas obrigatórias do seu cadastro esportivo. Seus limites de zona cardíaca e potência foram mapeados. Agora, clique no botão para salvar o perfil e vamos gerar sua planilha de treinos semanal personalizada!`,
        parsedProfile: { recentActivity, onboardingStep: 11 }
      };
    default:
      return {
        reply: `Seu perfil está totalmente configurado e ativo! Clique para salvar as métricas de treino no painel de controle para iniciarmos sua dinâmica com planilhas de ciclismo estruturadas e feedback do treinador!`,
        parsedProfile: { onboardingStep: 11 }
      };
  }
};

const fallbackGeneratePlan = (profile: any, nextWeekNum: number = 1): any => {
  const level = profile?.level || "iniciante";
  const daysVal = profile?.daysPerWeek || 3;
  const durationVal = profile?.durationPerSession || 60;
  
  const daysOfWeek = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
  const workouts: any[] = [];

  const trainingDaysIndex: number[] = [];
  if (daysVal <= 2) {
    trainingDaysIndex.push(5, 6);
  } else if (daysVal === 3) {
    trainingDaysIndex.push(1, 4, 6);
  } else if (daysVal === 4) {
    trainingDaysIndex.push(1, 3, 5, 6);
  } else if (daysVal === 5) {
    trainingDaysIndex.push(1, 2, 4, 5, 6);
  } else {
    trainingDaysIndex.push(1, 2, 3, 4, 5, 6);
  }

  daysOfWeek.forEach((dayName, idx) => {
    const isTraining = trainingDaysIndex.includes(idx);
    if (!isTraining) {
      workouts.push({
        day: dayName,
        type: "Folga",
        duration: 0,
        goal: "Descanso Total e Supercompensação fisiológica.",
        structure: "Dia de repouso completo. Coloque as pernas para o alto e deite cedo.",
        targetZone: "Z1 (Recuperação)",
        rpe: 1,
        tip: "Lembre-se: o verdadeiro ganho de condicionamento acontece durante o seu descanso!"
      });
    } else {
      let workoutType = "Endurance Extensivo";
      let workoutGoal = "Melhorar a eficiência aeróbica celular e capilarização muscular.";
      let workoutStructure = `10min de aquecimento livre em Z1 + ${durationVal - 15}min contínuos bem constantes em Z2 + 5min de volta à calma em Z1`;
      let workoutZone = "Z2 (Endurance)";
      let rpe = 3;
      let tip = "Mantenha a cadência uniforme e confortável entre 85-95 RPM.";

      if (idx === 1) {
        if (level === "iniciante") {
          workoutType = "Intervalado de Ritmo";
          workoutGoal = "Elevar a capacidade de suportar ritmos moderados sustentados.";
          workoutStructure = `10min aquec Z1-Z2 + 3 blocos de 5min em Z3 com 3min de recuperação ativa Z1 + 5min de soltura`;
          workoutZone = "Z3 (Tempo/Ritmo)";
          rpe = 5;
          tip = "Controle o fôlego e a postura na bicicleta. O esforço é moderado.";
        } else {
          workoutType = "Intervalado de Limiar (Sweet Spot)";
          workoutGoal = "Elevar o limiar de lactato (FTP) com alta eficiência de tempo.";
          workoutStructure = `12min aquec + 2 blocos de 12min em Sweet Spot (88-93% FTP) com 6min recuperação active Z1 + 8min volta à calma`;
          workoutZone = "Z4 (Limiar de Lactato)";
          rpe = 7;
          tip = "Mantenha a firmeza nas pernas e a concentração mental alta nos minutos finais.";
        }
      } else if (idx === 3) {
        if (level === "avançado") {
          workoutType = "VO2 Max Intervalado";
          workoutGoal = "Aprimorar consumo máximo de oxigênio e potência aeróbica máxima.";
          workoutStructure = `15min aquec progressivo + 5 tiros de 3min em Z5 com 3min de recuperação ativa Z1 + 10min soltura das pernas`;
          workoutZone = "Z5 (VO2 Máximo)";
          rpe = 9;
          tip = "Esforço forte e intenso. Pressione nos tiros de 3 minutos para abrir suas vias pulmonares.";
        } else {
          workoutType = "Giro Regenerativo";
          workoutGoal = "Oxigenar a musculatura das pernas sem gerar estresse inflamatório.";
          workoutStructure = `30-45min de giro leve contínuo e sem carga sobre a bike (Z1), cadência 90-95 RPM.`;
          workoutZone = "Z1 (Recuperação)";
          rpe = 2;
          tip = "Dia light. Marcha bem leve na bicicleta, hoje é só para soltar a musculatura.";
        }
      } else if (idx === 6) {
        workoutType = "Endurance Longo";
        workoutGoal = "Estimular adaptações musculares duradouras e o metabolismo de ácidos graxos.";
        const longDuration = Math.round(durationVal * 1.5);
        workoutStructure = `15min aquec + ${longDuration - 20}min em ritmo aeróbico Z2 constante + 5min de desaquecimento`;
        workoutZone = "Z2 (Endurance)";
        rpe = 4;
        tip = "Hidrate-se abundantemente e coma pequenos pedaços de carboidrato a cada 45 minutos de pedal.";
      }

      workouts.push({
        day: dayName,
        type: workoutType,
        duration: durationVal,
        goal: workoutGoal,
        structure: workoutStructure,
        targetZone: workoutZone,
        rpe: rpe,
        tip: tip
      });
    }
  });

  const totalHrs = Math.round((workouts.reduce((acc, w) => acc + w.duration, 0) / 60) * 10) / 10;

  return {
    workouts: workouts,
    summary: `Planilha de Treinamento - Semana ${nextWeekNum}. Volume estimado de ${totalHrs} horas focando no seu objetivo.`,
    observations: "Foque na consistência dos treinos fundamentais em Z2 e preserve os dias de descanso total.",
    evaluation: "Julgue seu treino pelo fôlego, esforço moderado e pela facilidade em manter as zonas de intensidade.",
    weekNumber: nextWeekNum,
    coachMessage: `Seja muito bem-vindo à Semana ${nextWeekNum}! Gerei esta distribuição aeróbica bem balanceada baseada na fisiologia esportiva clássica. Siga os treinos e registre suas notas e dores após cada pedalada para progredirmos com segurança na próxima semana!`
  };
};

const fallbackEvaluateWorkout = (workout: any, profile: any): any => {
  const durationText = workout.actualDuration ? `${workout.actualDuration} minutos` : `${workout.duration} minutos`;
  const feedbackMarkdown = `### Avaliação do Coach para o Treino do dia 🚴

Parabéns pelo registro do seu treino, **atleta**! Ter constância é o pilar número um da evolução no ciclismo de alta performance. 

Analisando a sua atividade:
- **Treino Prescrito:** ${workout.type} (${workout.targetZone}) planejado para ${workout.duration} min com esforço sugerido de ${workout.rpe}/10.
- **Treino Realizado:** Finalizado em ${durationText} com sensação de esforço de ${workout.actualRpe || 5}/10.
${workout.actualHr ? `- **Frequência Cardíaca Média:** ${workout.actualHr} bpm (Sua FCmax cadastrada é ${profile?.maxHeartRate || "não definida"} bpm).` : ""}
${workout.actualPower ? `- **Potência Média:** ${workout.actualPower} Watts (Seu FTP cadastrado é ${profile?.ftp || "não definido"}W).` : ""}

**Análise Fisiológica das Sensações:**
Sua percepção de esforço relatada (${workout.actualRpe || 5}/10) em relação à zona alvo **"${workout.targetZone}"** indica que o treino atingiu os estímulos hormonais e mitocondriais planejados. 

${workout.athleteNotes ? `**Sobre suas impressões:** *"\n${workout.athleteNotes}\n"*` : ""}

**Recomendações Práticas para as Próximas 24 horas:**
1. **Regeneração Energética:** Consuma uma refeição rica em carboidratos complexos e proteínas dentro da janela de ouro de recuperação nas próximas 2 horas para repor os estoques de glicogênio muscular.
2. **Hidratação:** Beba no mínimo 500ml de água com eletrólitos adicionais para equilibrar os sais perdidos na transpiração.
3. **Descanso:** Respeite a noite de sono para que o hormônio do crescimento (GH) auxilie na regeneração das microlesões musculares induzidas pelo exercício.

Continue firme registrando seus treinos e nos vemos no próximo!`;

  return {
    aiFeedback: feedbackMarkdown
  };
};

const fallbackChat = (message: string, profile: any, currentPlan: any): any => {
  const normalized = (message || "").toLowerCase();
  let reply = "";

  if (normalized.includes("mude") || normalized.includes("altera") || normalized.includes("mudar") || normalized.includes("ajusta")) {
    reply = `Como seu treinador virtual, eu posso ajustar a sua planilha para você! Diga-me qual dia você quer alterar (por exemplo: "mude terça para folga" ou "mude o treino de domingo para endurance") e posso realizar as modificações diretamente no seu histórico.`;
  } else if (normalized.includes("dor") || normalized.includes("lesao") || normalized.includes("machu") || normalized.includes("joelho")) {
    reply = `Atleta, muito cuidado! Dores no joelho, costas ou articulações no ciclismo geralmente indicam fadiga local acumulada ou necessidade de bike fit (altura do selim ou posição do carrinho).

Recomendo fortemente:
1. **Reduzir ou adiar treinos fortes** de limiar de lactato até sumir a dor.
2. Fazer apenas giros de soltura leves na Zona 1.
3. Aplicar compressas frias por 15-20 minutos e consultar especialista em saúde esportiva se as dores persistirem.

O descanso consciente é o seu melhor aliado para evitar lesões mais complexas!`;
  } else if (normalized.includes("alimenta") || normalized.includes("comer") || normalized.includes("comida") || normalized.includes("carb")) {
    reply = `A alimentação correta é o segredo para ter um rendimento espetacular! Seguem as três premissas da fisiologia:

- **Pré-treino (1h a 2h antes):** Pratos focados em carboidratos de absorção equilibrada (aveia, frutas, pão com geleia de morango). Evite gorduras ou excesso de fibras para não dar desconforto intestinal.
- **No pedal (treinos com mais de 1h30):** Carboidratos práticos consumidos de forma fracionada (gel, bananinha, isotônico ou mariola). Almeje entre 40g a 80g de carbo por hora.
- **Pós-treino (recuperação rápida):** Carboidratos para reabastecer seus reservatórios musculares de glicogênio somado a fontes limpas de proteína para reestruturar as fibras das pernas.`;
  } else if (normalized.includes("zona") || normalized.includes("fc") || normalized.includes("ftp") || normalized.includes("potencia")) {
    reply = `Compreender as zonas de estímulo é o divisor de águas entre pedalar aleatoriamente e treinar de forma científica!

Suas zonas são divididas estruturalmente assim:
- **Z1 (Recuperação):** Rodar super solto, sem esforço, para bombear sangue e oxigenar pernas cansadas.
- **Z2 (Endurance):** Nosso pilar metabólico! Constrói sua base aeróbica, melhora a queima de gordura e amplia o tamanho das mitocôndrias.
- **Z3 (Tempo/Ritmo):** Ritmo moderadamente firme, onde a respiração começa a ficar ritmada.
- **Z4 (Limiar de Lactato):** Intensidade forte perto do FTP. É o treino focado em aumentar a sua potência sustentável em subidas e planos.
- **Z5 (VO2 Máximo):** Tiros muito curtos e intensos com cansaço agudo, ideais para elevar seu fôlego máximo cardíaco.`;
  } else {
    reply = `Olá, campeão! Fico feliz em conversar sobre ciclismo e treinamento com você. 

Como seu coach de ciclismo virtual, estou por aqui para te auxiliar a:
- Ajustar ou redefinir sua planilha semanal de treinos nas suas métricas.
- Tirar dúvidas científicas sobre zonas de intensidade por potência (FTP) ou frequência cardíaca.
- Dar conselhos de alimentação, respiração correta e recuperação pós-pedal.

Em que posso te ajudar hoje para tornar seu pedal ainda mais estruturado e eficiente?`;
  }

  return {
    reply: reply,
    updatedPlan: null
  };
};

/**
 * Endpoint 1: Guided Onboarding Chat Step
 * Analyzes the latest athlete message, extracts any relevant training parameters,
 * and replies with the friendly next question in Portuguese.
 */
app.post("/api/onboard", async (req, res) => {
  const { message, profile, messageHistory } = req.body;
  try {
    checkApiKey();

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

    const response = await getAiClient().models.generateContent({
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
              required: ["onboardingStep"],
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
      throw new Error("No response from Gemini API");
    }

    const data = cleanAndParseJson(resultText);

    console.log("[BACKEND ONBOARDING REQUEST]", {
      receivedMessage: message,
      currentStep: profile?.onboardingStep,
      parsedProfileResult: data.parsedProfile
    });

    // Enforce that onboardingStep advances correctly.
    if (data.parsedProfile) {
      const prevStep = profile?.onboardingStep !== undefined ? Number(profile.onboardingStep) : 0;
      let modelStep = data.parsedProfile.onboardingStep !== undefined ? Number(data.parsedProfile.onboardingStep) : undefined;

      // Safe increment fallback: if modelStep is missing or hasn't advanced (and is less than 10)
      if (modelStep === undefined || modelStep <= prevStep) {
        modelStep = Math.min(10, prevStep + 1);
        data.parsedProfile.onboardingStep = modelStep;
        console.log(`[BACKEND ONBOARDING ADJUST] onboardingStep was fallback-incremented from ${prevStep} to ${modelStep}`);
      }
    }

    console.log("[BACKEND ONBOARDING RESPONSE]", JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error: any) {
    console.warn("Fadiga aeróbica na chamada do Gemini para onboarding. Ativando treinador local resiliente:", error.message);
    const data = fallbackOnboarding(message, profile);
    data.geminiError = error.message;
    res.json(data);
  }
});

/**
 * Endpoint 2: Plan Generator
 * Creates a fully customized, structured weekly training plan based on sports physiology
 * and the completed profile.
 */
app.post("/api/generate-plan", async (req, res) => {
  const { profile } = req.body;
  try {
    checkApiKey();

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
Nome: ${profile?.name || "Atleta"}
Nível: ${profile?.level || "iniciante"}
Objetivo: ${profile?.goal || "melhorar condicionamento"}
Dias por semana disponíveis: ${profile?.daysPerWeek || 3}
Minutos por treino disponíveis: ${profile?.durationPerSession || 60} min
Evento alvo: ${profile?.eventDate || "Nenhum evento marcado"}
Equipamentos: ${profile?.hasPowerMeter ? `Medidor de Potência (FTP: ${profile?.ftp}W)` : "Sem medidor de potência"} | ${profile?.hasHeartRate ? `Monitor Cardíaco (FCmax: ${profile?.maxHeartRate} bpm)` : "Sem monitor cardíaco"}
Limitações físicas: ${profile?.limitations || "Nenhuma"}
Atividade recente cadastrada: ${profile?.recentActivity || "Nenhuma registrada"}`;

    const response = await getAiClient().models.generateContent({
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
      throw new Error("No response from Gemini API");
    }
    res.json(cleanAndParseJson(resultText));
  } catch (error: any) {
    console.warn("Fadiga periférica na chamada do Gemini para plano personalizado. Ativando treinador local resiliente:", error.message);
    const data = fallbackGeneratePlan(profile, 1);
    data.geminiError = error.message;
    res.json(data);
  }
});

/**
 * Endpoint 2.5: Next Week Training Generator with progression logic
 * Generates the next week of training based on the athlete's completion records
 * of the current week (workouts "completed" status) and subjective feedback.
 */
app.post("/api/generate-next-week", async (req, res) => {
  const { profile, currentPlan, athleteFeedback, nextWeekNumber } = req.body;
  try {
    checkApiKey();

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

    const userBrief = `Perfil do Atleta: ${JSON.stringify(profile || {})}
Foco Principal de Treino Atual: ${profile?.goal || "Evolução"}
FTP: ${profile?.ftp || 200}W, FCmax: ${profile?.maxHeartRate || 180} bpm
Planilha da Semana que passou: ${JSON.stringify(currentPlan?.workouts || [])}

Gere o planejamento estruturado completo para a Semana ${nextWeekNumber} seguindo rigorosamente a estrutura JSON solicitada.`;

    const response = await getAiClient().models.generateContent({
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
      throw new Error("No response from Gemini API for next week generation");
    }
    res.json(cleanAndParseJson(resultText));
  } catch (error: any) {
    console.warn("Fadiga periférica na chamada do Gemini para próxima semana. Ativando treinador local resiliente:", error.message);
    const data = fallbackGeneratePlan(profile, nextWeekNumber || 2);
    data.geminiError = error.message;
    res.json(data);
  }
});



/**
 * Endpoint 3: Individual Workout Evaluator
 * Evaluates a single completed workout based on prescribed targets vs actual performance notes/metrics.
 */
app.post("/api/evaluate-workout", async (req, res) => {
  const { profile, workout } = req.body;
  try {
    checkApiKey();

    const systemInstruction = `Você é um treinador de ciclismo de alto rendimento com profundo conhecimento em fisiologia do exercício, periodização clássica e moderna. O atleta acabou de registrar a conclusão de um treino presencial ou virtual e enviou os dados reais de realização para avaliação.

Seu papel é analisar detalhadamente:
1. O treino sugerido (Objetivo, Tipo, Duração planejada, Zona de Treino, Esforço Planejado).
2. O treino efetivamente realizado (Duração real, Esforço sentido recebido de 1 a 10, Frequência Cardíaca média, Potência média em Watts e os comentários do atleta).

Diretrizes da sua Análise Científica e Conselhos de Ouro:
- Se foi um treino "Regenerativo/Folga" (Z1/Z2) e o atleta rodou com esforço maior do que o planejado ou com frequência cardíaca muito alta, explique amigavelmente sobre o erro de "treinar forte no dia fácil", o que gera estresse crônico desnecessário sem adaptação benéfica.
- Se foi um treino "Forte/Limiar/Intervalos" (Z4/Z5) e o atleta manteve o foco, comemore muito! Diga o que acontece fisiologicamente no corpo dele (melhora do VO2Max, recrutamento de fibras do tipo II, aumento da complacência cardíaca).
- Relacione os dados reais (Potência em relação ao FTP, e Frequência Cardíaca em relação à FCmax do usuário) caso esses dados tenham sido informados (FTP: ${profile?.ftp || 200}W, FCmax: ${profile?.maxHeartRate || 180} bpm).
- Forneça recomendações práticas para as próximas 24-48 horas baseadas no cansaço relatado nas notas pessoais do atleta (ex: alongamentos, hidratação adicional, alimentação regenerativa rica em carboidratos complexos/proteínas, ou um bom sono).

REGRA CRÍTICA DE COMUNICAÇÃO: Nunca utilize a palavra "RPE" ou "Percepção Subjetiva de Esforço" em suas explicações, resumos, descrições ou dicas. Esse termo técnico afasta o ciclista. Use termos muito simples e diretos para explicar o nível de esforço, tais como: "Muito Leve", "Leve", "Moderado", "Forte" ou "Máximo".

Sua resposta deve ser estruturada sob o formato JSON contendo uma única chave:
{
  "aiFeedback": "Sua avaliação completa escrita em parágrafos de Markdown bem estruturados e amigáveis, contendo elogios específicos, análises fisiológicas sobre os dados cadastrados, e conselhos práticos de recuperação."
}`;

    const prompt = `TREINO PRESCRITO:
- Dia: ${workout?.day || "Treino"}
- Tipo: ${workout?.type || "Endurance"}
- Duração Planejada: ${workout?.duration || 60} minutos
- Zona Alvo: ${workout?.targetZone || "Z2"}
- Esforço Sugerido: ${workout?.rpe || 5}/10

TREINO REALIZADO PELO ATLETA:
- Duração Real: ${workout?.actualDuration || workout?.duration || 60} minutos
- Esforço Real Sentido: ${workout?.actualRpe || 5}/10
- Frequência Cardíaca Média Registrada: ${workout?.actualHr ? `${workout.actualHr} bpm` : "Não informada"} (FCmax do perfil é ${profile?.maxHeartRate || "não cadastrada"} bpm)
- Potência Média Registrada: ${workout?.actualPower ? `${workout.actualPower} Watts` : "Não informada"} (FTP do perfil é ${profile?.ftp || "não cadastrado"}W)
- Notas / Observações do Atleta: "${workout?.athleteNotes || "Nenhum comentário preenchido pelo atleta."}"

Faça uma avaliação amigável de coach de alto nível e retorne o resultado em JSON.`;

    const response = await getAiClient().models.generateContent({
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
      throw new Error("No response from Gemini API for workout evaluation");
    }
    res.json(cleanAndParseJson(resultText));
  } catch (error: any) {
    console.warn("Fadiga sistêmica na chamada do Gemini para avaliação do treino. Ativando treinador local resiliente:", error.message);
    const data = fallbackEvaluateWorkout(workout, profile);
    res.json(data);
  }
});



/**
 * Endpoint 4: Custom Coach Chat
 * Allows the athlete to ask any scientific/practical coaching question, modify structures manually,
 * etc.
 */
app.post("/api/chat", async (req, res) => {
  const { message, profile, currentPlan, messageHistory } = req.body;
  try {
    checkApiKey();

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

    const userBrief = `Atleta Perfil: ${JSON.stringify(profile || {})}
Planilha Semanal Atual: ${JSON.stringify(currentPlan || {})}
Histórico Recente: ${JSON.stringify(messageHistory?.slice(-10) || [])}
Última Mensagem do Atleta: "${message || ""}"`;

    const response = await getAiClient().models.generateContent({
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
      throw new Error("No response from Gemini API");
    }
    res.json(cleanAndParseJson(resultText));
  } catch (error: any) {
    console.warn("Fadiga central na chamada do Gemini para chat personalizado. Ativando treinador local resiliente:", error.message);
    const data = fallbackChat(message, profile, currentPlan);
    data.geminiError = error.message;
    res.json(data);
  }
});

// Serve frontend assets and start listening
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In Express v4, we use * to match all routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
});

export default app;
