import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import os from "os";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer from "nodemailer";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

// JSON file database path for local persistence (declared early to avoid temporal dead zone)
const USERS_DB_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), "users_db.json")
  : path.join(process.cwd(), "users_db.json");

// Write startup log to verify server is executing
try {
  const bootLogPath = process.env.VERCEL
    ? path.join(os.tmpdir(), "server_boot.log")
    : path.join(process.cwd(), "server_boot.log");
  fs.writeFileSync(
    bootLogPath,
    `Server boot started at: ${new Date().toISOString()}\nLocal DB Path: ${USERS_DB_PATH}\n`,
    "utf-8"
  );
} catch (e: any) {
  console.error("Failed to write startup log:", e);
}

const app = express();
app.use(express.json());

// Normalização de URLs de API no ambiente Vercel para compatibilidade de rotas (evitar 404)
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
    const requestsLogPath = process.env.VERCEL
      ? path.join(os.tmpdir(), "server_requests.log")
      : path.join(process.cwd(), "server_requests.log");
    fs.appendFileSync(requestsLogPath, logMsg, "utf-8");
  } catch (e) {
    // ignore logging failure
  }
  next();
});

// JSON file database path for local persistence

// In-memory cache to keep performance high and prevent disk read fatigue
let inMemoryDbCache: Record<string, any> | null = null;

// Initialize Firebase Admin SDK
let firestoreDb: any = null;
try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    const configData = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    if (configData.projectId) {
      const app = initializeApp({
        projectId: configData.projectId
      });
      const dbId = configData.firestoreDatabaseId || "(default)";
      firestoreDb = getFirestore(app, dbId);
      console.log(`[Firebase Admin] Inicializado com sucesso para o projeto ${configData.projectId}, banco de dados ${dbId}`);
    } else {
      console.warn("[Firebase Admin] projectId ausente no arquivo de configuração.");
    }
  } else {
    console.warn("[Firebase Admin] Arquivo firebase-applet-config.json não encontrado. Operando em modo local.");
  }
} catch (error: any) {
  console.error("[Firebase Admin] Falha ao inicializar o Firebase Admin:", error.message);
}

// Local database retriever helper
async function getDatabase(): Promise<Record<string, any>> {
  if (inMemoryDbCache) {
    return JSON.parse(JSON.stringify(inMemoryDbCache));
  }

  // Load from Firestore first if available!
  let localDb: Record<string, any> = {};
  let loadedFromFirestore = false;

  if (firestoreDb) {
    try {
      console.log("[Firebase Admin] Carregando atletas do Firestore...");
      const snapshot = await firestoreDb.collection("users").get();
      if (!snapshot.empty) {
        snapshot.forEach((doc: any) => {
          const userEmail = doc.id;
          localDb[userEmail] = doc.data();
        });
        loadedFromFirestore = true;
        console.log(`[Firebase Admin] ${snapshot.size} atletas carregados com sucesso do Firestore.`);
      } else {
        console.log("[Firebase Admin] Coleção 'users' vazia no Firestore. Usando banco local para iniciar.");
      }
    } catch (err: any) {
      console.error("[Firebase Admin] Erro ao carregar do Firestore, usando backup local:", err.message);
    }
  }

  // If we couldn't load from Firestore (or it was empty), load from local users_db.json
  try {
    if (fs.existsSync(USERS_DB_PATH)) {
      const data = fs.readFileSync(USERS_DB_PATH, "utf-8");
      const parsed = JSON.parse(data);
      
      // If Firestore is available but empty, let's sync the local users to Firestore!
      if (firestoreDb && !loadedFromFirestore && Object.keys(parsed).length > 0) {
        try {
          console.log("[Firebase Admin] Sincronizando banco local inicial para o Firestore...");
          const batch = firestoreDb.batch();
          for (const [email, user] of Object.entries(parsed)) {
            const docRef = firestoreDb.collection("users").doc(email);
            batch.set(docRef, user);
          }
          await batch.commit();
          loadedFromFirestore = true;
          console.log("[Firebase Admin] Sincronização inicial concluída com sucesso.");
        } catch (syncErr: any) {
          console.error("[Firebase Admin] Erro ao sincronizar banco inicial para Firestore:", syncErr.message);
        }
      }
      
      if (!loadedFromFirestore) {
        localDb = parsed;
      }
    }
  } catch (err: any) {
    console.warn("Nenhum cache de banco de dados local encontrado ou falha na leitura:", err.message);
  }

  inMemoryDbCache = localDb;
  return JSON.parse(JSON.stringify(localDb));
}

// Local database saving helper
const BACKUPS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "db_backups")
  : path.join(process.cwd(), "db_backups");

async function triggerAutomaticBackup(db: Record<string, any>) {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `users_db_backup_${timestamp}.json`;
    const backupPath = path.join(BACKUPS_DIR, filename);

    fs.writeFileSync(backupPath, JSON.stringify(db, null, 2), "utf-8");
    console.log(`[Backup Automático] Backup salvo com sucesso em: ${backupPath}`);

    // Rotacionar backups (manter apenas os últimos 10)
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith("users_db_backup_") && f.endsWith(".json"))
      .map(f => {
        try {
          return {
            name: f,
            time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime()
          };
        } catch {
          return { name: f, time: 0 };
        }
      })
      .sort((a, b) => b.time - a.time); // Do mais novo para o mais antigo

    if (files.length > 10) {
      const oldFiles = files.slice(10);
      for (const file of oldFiles) {
        fs.unlinkSync(path.join(BACKUPS_DIR, file.name));
        console.log(`[Backup Automático] Backup antigo deletado para economia de espaço: ${file.name}`);
      }
    }
  } catch (err) {
    console.error("[Backup Automático] ERRO ao criar backup automático:", err);
  }
}

async function saveDatabase(db: Record<string, any>) {
  const previousDb = inMemoryDbCache ? JSON.parse(JSON.stringify(inMemoryDbCache)) : {};
  inMemoryDbCache = JSON.parse(JSON.stringify(db));

  // Write locally right away to guarantee instant local persistence and backups
  try {
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    console.log("[Banco Local] Banco de dados persistido localmente com sucesso.");
    
    // Dispara backup automático em plano de fundo sem travar a thread de resposta
    triggerAutomaticBackup(db).catch(err => {
      console.error("[Backup Automático] Falha na promessa de backup automático:", err);
    });
  } catch (err) {
    console.error("FALHA ao salvar cache de banco de dados local:", err);
  }

  // Persist only changed users to Firestore!
  if (firestoreDb) {
    try {
      const batch = firestoreDb.batch();
      let hasChanges = false;

      for (const [email, user] of Object.entries(db)) {
        const prevUser = previousDb[email];
        // If user is new or has changed, add to batch
        if (!prevUser || JSON.stringify(user) !== JSON.stringify(prevUser)) {
          const docRef = firestoreDb.collection("users").doc(email);
          batch.set(docRef, user);
          hasChanges = true;
          console.log(`[Firebase Admin] Preparando salvamento para o atleta: ${email}`);
        }
      }

      // Check if any users were deleted
      for (const email of Object.keys(previousDb)) {
        if (!db[email]) {
          const docRef = firestoreDb.collection("users").doc(email);
          batch.delete(docRef);
          hasChanges = true;
          console.log(`[Firebase Admin] Preparando exclusão para o atleta: ${email}`);
        }
      }

      if (hasChanges) {
        await batch.commit();
        console.log("[Firebase Admin] Mudanças persistidas com sucesso no Firestore.");
      }
    } catch (err: any) {
      console.error("[Firebase Admin] Erro ao persistir mudanças no Firestore:", err.message);
    }
  }
}

// -------------------------------------------------------------
// SECURE EMAIL SENDING & NOTIFICATION LOGGING SYSTEM
// -------------------------------------------------------------
const SENT_EMAILS_FILE = process.env.VERCEL
  ? path.join(os.tmpdir(), "sent_emails.json")
  : path.join(process.cwd(), "sent_emails.json");

interface SentEmailRecord {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
  status: "success" | "simulated" | "failed";
  error?: string;
  plan?: string;
  athleteName?: string;
}

function getSentEmailsLog(): SentEmailRecord[] {
  try {
    if (fs.existsSync(SENT_EMAILS_FILE)) {
      const content = fs.readFileSync(SENT_EMAILS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn("Failed to read sent_emails.json:", e);
  }
  return [];
}

function saveSentEmailLog(log: SentEmailRecord[]) {
  try {
    fs.writeFileSync(SENT_EMAILS_FILE, JSON.stringify(log, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to write sent_emails.json:", e);
  }
}

async function sendActivationEmail(athleteName: string, recipientEmail: string, selectedPlan: string, originUrl: string) {
  const subject = "🚴‍♂️ Seu Acesso ao Biker AI foi Liberado!";
  const loginUrl = originUrl || "https://ais-dev-ig3xpt2tylya4dpumxckiy-403337948550.us-west2.run.app";
  
  const emailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Acesso Liberado!</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #f8fafc;
      }
      .wrapper {
        background-color: #0d1527;
        padding: 40px 10px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 24px;
        padding: 40px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }
      .logo {
        color: #a3e635;
        font-size: 24px;
        font-weight: 900;
        font-style: italic;
        text-transform: uppercase;
        letter-spacing: -0.05em;
        margin-bottom: 30px;
        text-align: center;
      }
      .title {
        font-size: 22px;
        font-weight: 850;
        color: #ffffff;
        margin-bottom: 20px;
        text-align: center;
        line-height: 1.3;
      }
      .greeting {
        font-size: 15px;
        color: #cbd5e1;
        margin-bottom: 20px;
        line-height: 1.6;
      }
      .highlight-box {
        background-color: rgba(163, 230, 53, 0.08);
        border: 1px solid rgba(163, 230, 53, 0.3);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 30px;
        text-align: center;
      }
      .plan-badge {
        background-color: #a3e635;
        color: #0f172a;
        font-weight: 900;
        font-size: 13px;
        text-transform: uppercase;
        padding: 6px 16px;
        border-radius: 50px;
        display: inline-block;
        margin-top: 5px;
        letter-spacing: 0.05em;
      }
      .features {
        margin-bottom: 30px;
      }
      .feature-item {
        margin-bottom: 15px;
        color: #94a3b8;
        font-size: 14px;
        line-height: 1.5;
      }
      .button-wrapper {
        text-align: center;
        margin-top: 30px;
        margin-bottom: 30px;
      }
      .button {
        background-color: #a3e635;
        color: #0d1527 !important;
        font-weight: 950;
        text-transform: uppercase;
        font-size: 13px;
        letter-spacing: 0.06em;
        text-decoration: none;
        padding: 16px 32px;
        border-radius: 12px;
        display: inline-block;
        box-shadow: 0 10px 15px -3px rgba(163, 230, 53, 0.3);
      }
      .signature {
        border-top: 1px solid #334155;
        padding-top: 25px;
        font-size: 13px;
        color: #94a3b8;
        line-height: 1.6;
      }
      .footer {
        margin-top: 30px;
        text-align: center;
        font-size: 11px;
        color: #64748b;
        line-height: 1.5;
      }
      .footer a {
        color: #a3e635;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="logo">⚡ Biker AI</div>
        
        <h1 class="title">Seu Acesso está Ativado, ${athleteName}!</h1>
        
        <p class="greeting">
          Fala, campeão! Temos excelentes notícias para os seus treinos. Sua assinatura foi validada com sucesso pelo nosso treinador. Seu painel de preparação esportiva do <strong>Biker AI</strong> está oficialmente liberado para uso.
        </p>

        <div class="highlight-box">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em;">Plano Ativo Liberado</p>
          <span class="plan-badge">${selectedPlan}</span>
        </div>

        <div class="features">
          <p style="font-weight: bold; color: #ffffff; font-size: 15px; margin-bottom: 12px;">Tudo o que está liberado para você:</p>
          
          <div class="feature-item">
            <strong style="color: #cbd5e1; display: block; margin-bottom: 3px;">✓ Planilhas Semanais Inteligentes:</strong> 
            Treinos planejados de forma personalizada controlando sua carga por potência, batimentos cardíacos ou percepção de esforço.
          </div>
          
          <div class="feature-item">
            <strong style="color: #cbd5e1; display: block; margin-bottom: 3px;">✓ Histórico & Gráficos Fisiológicos:</strong> 
            Acompanhamento detalhado do seu volume de treino semanal, calorias, e evolução sistemática do seu desempenho.
          </div>
          
          <div class="feature-item">
            <strong style="color: #cbd5e1; display: block; margin-bottom: 3px;">✓ Suporte com Treinador IA 24 horas:</strong> 
            O nosso treinador inteligente de ciclismo baseado em fisiologia está pronto no chat para tirar dúvidas de cansaço ou alterar seu giro.
          </div>
        </div>

        <div class="button-wrapper">
          <a href="${loginUrl}" class="button" target="_blank">Entrar no Painel do Atleta</a>
        </div>

        <div class="signature">
          Forte abraço e ótimos giros!<br>
          <strong>Treinador Pedro Baliza & Equipe Biker AI</strong>
        </div>
      </div>
      
      <div class="footer">
        Dúvidas de faturamento, faturas ou fisiologia? Fale com a gente pelo e-mail oficial:<br>
        <a href="mailto:bikeraisupport@gmail.com">bikeraisupport@gmail.com</a><br>
        <span style="font-size: 10px; margin-top: 10px; display: block;">&copy; 2026 Biker AI. Enviado de forma segura e automatizada.</span>
      </div>
    </div>
  </body>
  </html>
  `;

  let sentStatus: "success" | "simulated" | "failed" = "simulated";
  let errMessage: string | undefined;

  // Standard SMTP credentials check
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"Suporte Biker AI" <${smtpUser}>`,
        to: recipientEmail,
        subject: subject,
        html: emailHtml,
      });
      sentStatus = "success";
      console.log(`[Email System] Real custom notification email successfully sent via SMTP to ${recipientEmail}`);
    } catch (e: any) {
      console.error(`[Email System] Failed to send actual email via SMTP to ${recipientEmail}:`, e);
      sentStatus = "failed";
      errMessage = e.message;
    }
  } else {
    console.log(`[Email System] SMTP credentials not set (SMTP_USER/SMTP_PASS). Created full, beautiful email simulation log for ${recipientEmail}.`);
  }

  // Register locally so admin has instant visual diagnostics of sent notifications
  try {
    const log = getSentEmailsLog();
    const newRecord: SentEmailRecord = {
      id: "mail_" + Math.random().toString(36).substring(2, 11),
      recipient: recipientEmail,
      subject: subject,
      body: emailHtml,
      sentAt: new Date().toISOString(),
      status: sentStatus,
      error: errMessage,
      plan: selectedPlan,
      athleteName: athleteName
    };
    log.unshift(newRecord);
    saveSentEmailLog(log.slice(0, 50));
  } catch (logErr) {
    console.warn("Failed to write to local email sent logs:", logErr);
  }

  return { success: sentStatus !== "failed", status: sentStatus, error: errMessage };
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

    const isCoachEmail = email.trim().toLowerCase() === "pedro.bramos@sempreceub.com";
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
      onboardingStep: 1,
      subscriptionStatus: "pending_payment",
      subscriptionPlan: "Mensal Premium",
      subscriptionExpiresAt: "2026-12-31",
      role: isCoachEmail ? "coach" : "athlete"
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

    // Ensure older users get default subscription parameters gracefully
    if (user.profile) {
      if (!user.profile.subscriptionStatus) user.profile.subscriptionStatus = "active";
      if (!user.profile.subscriptionPlan) user.profile.subscriptionPlan = "Bronze (Mensal)";
      if (!user.profile.subscriptionExpiresAt) user.profile.subscriptionExpiresAt = "2026-12-31";
      if (!user.profile.role) {
        user.profile.role = email.trim().toLowerCase() === "pedro.bramos@sempreceub.com" ? "coach" : "athlete";
      }
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
    const fallbackPassword = emailKey === "pedro.bramos@sempreceub.com" ? "Pedro23072007" : "123456";
    const preservedPassword = password || db[emailKey]?.password || fallbackPassword;

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
let currentCachedKey = "";

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

  if (!aiClient || currentCachedKey !== key) {
    currentCachedKey = key;
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

// Diagnostics Endpoint to trace API variables, connections, and exact Stack Traces for any errors
app.get("/api/diagnostics", async (req, res) => {
  const responses: any = {
    apiKeyConfigured: !!process.env.GEMINI_API_KEY,
    apiKeyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
    apiKeySnippet: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 6)}...${process.env.GEMINI_API_KEY.substring(process.env.GEMINI_API_KEY.length - 4)}` : null,
    nodeEnv: process.env.NODE_ENV,
    modelName: "gemini-3.5-flash"
  };

  try {
    const key = (process.env.GEMINI_API_KEY || "").trim();
    if (!key) {
      throw new Error("GEMINI_API_KEY is completely empty or missing from environment variables.");
    }
    const client = getAiClient();
    const testCall = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Hi, please answer with exactly 'OK'."
    });
    responses.geminiConnection = "SUCCESS";
    responses.geminiResponse = testCall.text;
  } catch (err: any) {
    responses.geminiConnection = "FAILED";
    responses.errorName = err.name || "Error";
    responses.errorMessage = err.message;
    responses.errorStack = err.stack;
  }
  res.json(responses);
});

// Helper to handle Gemini API errors or key missing
const checkApiKey = () => {
  getAiClient();
};

// Helper to implement a fast, client-side safety ceiling to avoid Vercel Serverless 10s execution timeout
const sanitizeLogMessage = (err: any): string => {
  const msg = err?.message || String(err);
  if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
    return "Google Gemini API Temporarily Unavailable (503 High Demand)";
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return "Google Gemini API Rate Limited (429)";
  }
  if (msg.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(msg);
      const innerMsg = parsed?.error?.message || parsed?.message || "Unknown API error";
      const status = parsed?.error?.status || "API Error";
      return `Gemini API returned status: ${status} - ${innerMsg}`;
    } catch (e) {
      // ignore
    }
  }
  return msg.substring(0, 150);
};

const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage = "Timeout exceeding limit"): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  let timedOut = false;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      reject(new Error(errorMessage));
    }, ms);
  });
  
  // Guard against unhandled promise rejections only if a timeout actually occurred
  promise.catch((err) => {
    if (timedOut) {
      console.log("[Timeout Background] Gemini call failed in background after timeout completed:", sanitizeLogMessage(err));
    }
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

// Retry wrapper for Gemini calls to gracefully handle temporary Google API 503 UNAVAILABLE or 429 errors
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delayMs = 1500): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = String(error.message || error);
    const isTransient = 
      errorStr.includes("503") || 
      errorStr.includes("UNAVAILABLE") || 
      errorStr.includes("429") || 
      errorStr.includes("RESOURCE_EXHAUSTED") ||
      errorStr.includes("high demand") ||
      errorStr.includes("temp");

    if (isTransient && retries > 0) {
      console.warn(`[Gemini Retry] Erro transiente detectado (503/429/indisponível). Retentando em ${delayMs}ms... Tentativas restantes: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
};

// Helper to provide human-friendly Portuguese error messages for complex or raw API errors
const getFriendlyErrorMessage = (error: any): string => {
  const rawMsg = error?.message || String(error);
  
  // Try parsing to extract actual upstream message in case it's stringified JSON:
  let innerMsg = rawMsg;
  try {
    if (rawMsg.trim().startsWith('{')) {
      const parsed = JSON.parse(rawMsg);
      if (parsed.error && parsed.error.message) {
        innerMsg = parsed.error.message;
      } else if (parsed.message) {
        innerMsg = parsed.message;
      }
    }
  } catch (e) {}

  const lower = innerMsg.toLowerCase();
  if (lower.includes("unavailable") || lower.includes("503") || lower.includes("high demand") || lower.includes("temp")) {
    return "O servidor do Google Gemini (IA) está passando por uma alta demanda temporária mundial. Por favor, aguarde alguns segundos e envie novamente sua mensagem!";
  }
  if (lower.includes("api_key") || lower.includes("api key") || lower.includes("key not") || lower.includes("invalid key") || lower.includes("unauthorized")) {
    return "Falha de autenticação com a IA: Sua chave GEMINI_API_KEY está ausente ou é inválida. Por favor, verifique-a nas configurações do painel.";
  }
  if (lower.includes("limit") || lower.includes("429") || lower.includes("quota")) {
    return "Limite de requisições excedido temporariamente. Por favor, aguarde um pouco antes de solicitar novos planos.";
  }
  return innerMsg;
};

// -------------------------------------------------------------
// LOCAL PROCEDURAL FALLBACK SYSTEMS (AUTOMATED SAFEGUARDS)
// -------------------------------------------------------------

const fallbackOnboard = (message: string, profile: any) => {
  const currentStep = Number(profile?.onboardingStep) || 1;
  const parsedProfile: any = {};
  let nextStep = currentStep + 1;
  let reply = "";

  const cleanMsg = (message || "").trim();

  switch (currentStep) {
    case 1:
      let name = cleanMsg.replace(/^(meu nome é|me chamo|sou o|sou a|o meu nome é|nome is|meu nome e)\s+/gi, "");
      if (!name) name = "Atleta";
      name = name.charAt(0).toUpperCase() + name.slice(1);
      parsedProfile.name = name;
      reply = `Prazer em te conhecer, **${name}**! Para que eu possa estruturar melhor seus estímulos, me conta: há quanto tempo você pedala e como você se considera? (**iniciante**, **intermediário** ou **avançado**)?`;
      break;
    case 2:
      let level: any = "intermediário";
      if (/iniciante|comecei|novo|nova/i.test(cleanMsg)) level = "iniciante";
      else if (/avançado|avancado|pro|forte|elite/i.test(cleanMsg)) level = "avançado";
      parsedProfile.level = level;
      reply = `Perfeito! Entendi que seu nível é **${level}**. Agora, qual é o seu objetivo de ouro no momento? (**perder peso**, **melhorar condicionamento**, **completar um evento** ou **competir**)?`;
      break;
    case 3:
      let goal = "melhorar condicionamento";
      if (/peso|emagrecer|gord/i.test(cleanMsg)) goal = "perder peso";
      else if (/evento|gran|prova|viagem|desafio|completar/i.test(cleanMsg)) goal = "completar um evento";
      else if (/competir|corrida|campeonato|pódio|podio|ajuda/i.test(cleanMsg)) goal = "competir";
      parsedProfile.goal = goal;
      reply = `Entendido! Seu foco é **${goal}**. Para encaixar os treinos na sua rotina, quantos dias por semana você consegue treinar?`;
      break;
    case 4:
      const daysMatch = cleanMsg.match(/\d+/);
      const days = daysMatch ? Math.min(7, Math.max(1, Number(daysMatch[0]))) : 3;
      parsedProfile.daysPerWeek = days;
      reply = `Excelente, programaremos ${days} dias de pedal. E quanto tempo você tem disponível em média por dia de treino (em minutos)?`;
      break;
    case 5:
      const durMatch = cleanMsg.match(/\d+/);
      const duration = durMatch ? Math.max(30, Number(durMatch[0])) : 60;
      parsedProfile.durationPerSession = duration;
      reply = `Gravado: sessões de ${duration} minutos. Você tem algum evento ou prova marcantes no horizonte com data específica? Se sim, qual é e quando será? (Se não tiver, pode digitar "Não")`;
      break;
    case 6:
      const isNo = /não|nao|no\b|nenhum/i.test(cleanMsg);
      parsedProfile.eventDate = isNo ? "Nenhum no horizonte" : cleanMsg;
      reply = `Anotado! Agora me conte: você treina utilizando medidor de potência? Se sim, qual é o seu FTP em Watts atualmente? (Se não usar, basta responder "Não")`;
      break;
    case 7:
      const hasPower = !/não|nao|no\b/i.test(cleanMsg);
      parsedProfile.hasPowerMeter = hasPower;
      if (hasPower) {
        const ftpMatch = cleanMsg.match(/\d+/);
        parsedProfile.ftp = ftpMatch ? Number(ftpMatch[0]) : 200;
      }
      reply = `Entendido. E você usa monitor/cinta de frequência cardíaca para registrar seus batimentos? Se sim, saberia dizer sua frequência cardíaca máxima (FCmax)? (Se não usar ou não souber, responda "Não")`;
      break;
    case 8:
      const hasHR = !/não|nao|no\b/i.test(cleanMsg);
      parsedProfile.hasHeartRate = hasHR;
      if (hasHR) {
        const hrMatch = cleanMsg.match(/\d+/);
        parsedProfile.maxHeartRate = hrMatch ? Number(hrMatch[0]) : 180;
      }
      reply = `Ótimo! Estamos quase completando seu mapa fisiológico. Você tem alguma lesão ou limitação articular/física que eu precise levar em conta? (Se estiver 100%, digite "Não")`;
      break;
    case 9:
      parsedProfile.limitations = /não|nao/i.test(cleanMsg) ? "Nenhuma limitação" : cleanMsg;
      reply = `Perfeito. Para finalizar de forma personalizada, qual foi o seu treino ou pedal mais recente? Como foi (distância, tempo ou sensação geral)?`;
      break;
    case 10:
    default:
      parsedProfile.recentActivity = cleanMsg;
      nextStep = 10;
      reply = `Sensacional, ${profile?.name || "atleta"}! Coletamos com sucesso todas as características do seu perfil de treinamento. 

Para confirmar seus dados e gerar sua **Planilha de Treinamento Semanal Personalizada**, basta clicar no botão azul **Confirmar Dados e Gerar Planilha** na sua tela! Estou pronto para planejar seu macrosistema de treino! 🚴‍♂️🚴‍♀️`;
      break;
  }

  parsedProfile.onboardingStep = nextStep;

  return {
    reply,
    parsedProfile
  };
};

const generateLocalPlan = (profile: any) => {
  const name = profile?.name || "Atleta";
  const level = profile?.level || "iniciante";
  const goal = profile?.goal || "melhorar condicionamento";
  const daysPerWeek = Number(profile?.daysPerWeek) || 3;
  const durationMax = Number(profile?.durationPerSession) || 60;
  const hasPower = !!profile?.hasPowerMeter;
  const ftp = Number(profile?.ftp) || 200;
  const hrmax = Number(profile?.maxHeartRate) || 180;

  const daysOfWeek = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo"
  ];

  let activeDays = [false, true, false, true, false, true, false];
  if (daysPerWeek === 1) activeDays = [false, false, false, false, false, true, false];
  else if (daysPerWeek === 2) activeDays = [false, true, false, false, false, true, false];
  else if (daysPerWeek === 4) activeDays = [false, true, false, true, true, true, false];
  else if (daysPerWeek === 5) activeDays = [false, true, true, true, false, true, true];
  else if (daysPerWeek === 6) activeDays = [false, true, true, true, true, true, true];
  else if (daysPerWeek === 7) activeDays = [true, true, true, true, true, true, true];

  const workouts: any[] = [];

  const inicianteWorkouts = [
    { type: "Endurance Extensivo", targetZone: "Z2 (Endurance)", rpe: 4, goal: "Construção de base aeróbica primária e adaptação cardíaca.", structure: "10min aquecimento leve + 40min Z2 constante (85-95 rpm) + 10min volta à calma" },
    { type: "Endurance Ativo", targetZone: "Z2 (Endurance)", rpe: 4, goal: "Desenvolvimento de resistência muscular cíclica leve.", structure: "10min aquecimento leve + 35min Z2 constante + 3x 1min rotação alta (100 rpm) + 5min desaquec." },
    { type: "Rolo Cadenciado", targetZone: "Z2/Z3 (Ritmo)", rpe: 5, goal: "Melhorar a eficiência de pedalada e coordenação motora.", structure: "10min aquecimento + 4x 5min Z3 leve com cadência alta (95 rpm) e 3min recup Z1 + 10min volta à calma" },
    { type: "Endurance Longo", targetZone: "Z2 (Endurance)", rpe: 4, goal: "Adaptação de longo curso das articulações e queima lipídica.", structure: "15min aquecimento + 50min Z2 estável focando em postura confortável e hidratação" }
  ];

  const intermediarioWorkouts = [
    { type: "Intervalado Sweet Spot", targetZone: "Z3/Z4 (Sweet Spot)", rpe: 6, goal: "Aumento do limiar de lactato com acúmulo tolerável de fadiga.", structure: "15min aquecimento + 2x 10min Z3 Forte (90% FTP) com 5min recuperação Z1 + 10min desaquecimento" },
    { type: "Endurance de Base", targetZone: "Z2 (Endurance)", rpe: 4, goal: "Promoção de capilarização muscular e aumento de mitocôndrias.", structure: "10min aquec + 60min constante em Z2 (cadência confortável em 90 rpm) + 10min volta à calma" },
    { type: "Intervalado de Limiar", targetZone: "Z4 (Limiar)", rpe: 7, goal: "Elevar o FTP e melhorar a eficiência fisiológica no limiar.", structure: "15min aquec (com 3 estímulos rápidos de 30s) + 3x 6min Z4 (no FTP!) com 4min recup Z1 + 10min soltura" },
    { type: "Subidas de Força / Torque", targetZone: "Z3 (Força)", rpe: 6, goal: "Desenvolvimento de força muscular específica nos quadríceps.", structure: "15min aquecimento + 4x 4min Z3 com cadência baixa (55-65 rpm) em subida leve + 5min recup + 10min soltura" }
  ];

  const avancadoWorkouts = [
    { type: "Microintervalado VO2 Max", targetZone: "Z5 (VO2 Max)", rpe: 8, goal: "Ampliar o consumo máximo de oxigênio e capacidade anaeróbica.", structure: "15min aquecimento progressivo + 2 blocos de 8x (30s Z5 + 30s recuperação Z1) com 8min recup entre blocos + 15min soltura" },
    { type: "Intervalado de Threshold", targetZone: "Z4 (Limiar)", rpe: 7, goal: "Aumentar a tolerância ao lactato em ritmo de corrida sustentado.", structure: "15min aquec + 2x 15min Z4 (Forte, 100% FTP) com cadência em 92 rpm e 7min recuperação Z1 + 10min volta à calma" },
    { type: "Endurance Intenso", targetZone: "Z2/Z3 (Misto)", rpe: 5, goal: "Construção de resistência aeróbica densa sob fadiga moderada.", structure: "15min aquec + 90min em Z2 (incluindo surtos curtos de 20s a cada 15min) + 10min desaquecimento" },
    { type: "Sprints de Torque Neuromuscular", targetZone: "Z6/Z7 (Sprints)", rpe: 9, goal: "Aumento do recrutamento de fibras do tipo IIb de contração rápida.", structure: "15min aquec + 6x 15s SPRINT MÁXIMO da imobilidade (marcha pesada) com 4min recup total em Z1 + 15min soltou" }
  ];

  const pool = level === "iniciante" ? inicianteWorkouts : level === "avançado" ? avancadoWorkouts : intermediarioWorkouts;
  let poolIdx = 0;

  for (let i = 0; i < 7; i++) {
    const day = daysOfWeek[i];
    const isActive = activeDays[i];

    if (isActive) {
      const template = pool[poolIdx % pool.length];
      poolIdx++;

      let dur = durationMax;
      if (template.type.includes("Longo") || template.type.includes("Intenso")) {
        dur = Math.round(durationMax * 1.3);
      } else if (template.type.includes("Sprint") || template.type.includes("Regenerativo")) {
        dur = Math.round(durationMax * 0.8);
      }

      workouts.push({
        day,
        type: template.type,
        duration: dur,
        goal: template.goal,
        structure: template.structure,
        targetZone: template.targetZone,
        rpe: template.rpe,
        tip: `Mantenha a cadência uniforme. Lembre-se que constância é o segredo evolutivo no ciclismo!`,
        completed: false
      });
    } else {
      workouts.push({
        day,
        type: "Folga / Descanso",
        duration: 0,
        goal: "Permitir a supercompensação muscular e regeneração das fibras.",
        structure: "Descanso total livre de atividades físicas vigorosas. Hidratação reforçada.",
        targetZone: "Nenhuma (Recuperação)",
        rpe: 1,
        tip: "A recuperação faz parte integral da planilha. É no descanso que o músculo se reconstrói mais forte!",
        completed: false
      });
    }
  }

  const volHours = Math.round(workouts.reduce((acc, w) => acc + w.duration, 0) / 60 * 10) / 10;

  return {
    workouts,
    summary: `Volume total planejado: ~${volHours} horas. Foco no desenvolvimento de endurance aeróbico e estabilização de fôlego baseado nas suas características fisiológicas locais.`,
    observations: "Atenção redobrada à hidratação contínua (mínimo de 500ml de água por hora de pedal) e ao sono reparador (7h a 8h por noite). As pernas se reconstroem no descanso.",
    evaluation: "Avalie suas sensações físicas ao final de cada sessão. Se sentir cansaço extremo ou dores articulares, reduza a intensidade imediatamente para o patamar Leve."
  };
};

const generateLocalNextWeek = (currentPlan: any, athleteFeedback: string, nextWeekNumber: number, profile: any) => {
  const totalWorkouts = currentPlan?.workouts?.length || 0;
  const completedWorkouts = currentPlan?.workouts?.filter((w: any) => w.completed)?.length || 0;
  const completedPercent = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

  const isHighCompletion = completedPercent >= 75;
  const isFatigued = /dor|cansado|exausto|lesão|lesao|articular|fadiga/i.test(athleteFeedback || "");

  let coachMessage = "";
  const workouts = (currentPlan?.workouts || []).map((w: any) => {
    const newW = { ...w, completed: false };
    
    if (w.duration > 0) {
      if (isHighCompletion && !isFatigued) {
        newW.duration = Math.round(w.duration * 1.08);
        newW.goal = `[Progressão] ` + w.goal;
        newW.tip = `Evolução para a Semana ${nextWeekNumber}: Aumentamos levemente o volume para consolidar o ganho de endurance. Mantenha os ritmos prescritos!`;
      } else {
        newW.duration = Math.round(w.duration * 0.9);
        newW.goal = `[Recuperação] ` + w.goal;
        newW.tip = `Foco em restabelecimento metabólico seguro para a Semana ${nextWeekNumber}. Preze pela soltura e conforto muscular!`;
      }
    }
    return newW;
  });

  if (isHighCompletion && !isFatigued) {
    coachMessage = `🚴‍♂️ **Parabéns pela constância de ouro na semana passada!** Com uma taxa de conclusão de **${completedPercent}%**, seu corpo superou os estímulos. Introduzi um incremento sutil de volume nesta **Semana ${nextWeekNumber}** para estimular a biogênese mitocondrial e aumentar a densidade dos seus capilares corporais. Excelente constância!`;
  } else {
    coachMessage = `Acolho você com carinho neste momento de recuperação. Com conclusão de **${completedPercent}%** ou sinais de fadiga relatados no seu feedback, estabelecemos para a **Semana ${nextWeekNumber}** um bloco focado em regeneração ativa. Reduzi ligeiramente os volumes para dar sobrevida às suas fibras musculares e restaurar seu sistema nervoso central. O descanso reconstrói campeões! Let's ride leve!`;
  }

  const volHours = Math.round(workouts.reduce((acc, w) => acc + w.duration, 0) / 60 * 10) / 10;

  return {
    workouts,
    summary: `Volume reajustado para a Semana ${nextWeekNumber}: ~${volHours} horas. Foco voltado para ${isHighCompletion && !isFatigued ? "progressão segura de carga aeróbica" : "recuperação ativa e repouso celular"}.`,
    observations: "Monitore suas sensações de acordar. Se o cansaço persistir ou as pernas continuarem bloqueadas, priorize o repouso ativo ou folga absoluta.",
    evaluation: "Avalie suas sensações ao final da semana. O bem-estar físico e energia restabelecida são as principais métricas do sucesso deste microciclo.",
    weekNumber: nextWeekNumber,
    coachMessage
  };
};

const evaluateLocalWorkout = (profile: any, workout: any) => {
  const actualDuration = Number(workout?.actualDuration || workout?.duration) || 60;
  const actualRpe = Number(workout?.actualRpe) || 5;
  const actualHr = Number(workout?.actualHr) || 0;
  const actualPower = Number(workout?.actualPower) || 0;
  const distance = Number(workout?.actualDistance) || 0;
  const speed = Number(workout?.actualAvgSpeed) || 0;
  const elevation = Number(workout?.actualElevation) || 0;
  const calories = Number(workout?.actualCalories) || 0;
  const athleteNotes = workout?.athleteNotes || "";

  const name = profile?.name || "Atleta";
  const targetZone = workout?.targetZone || "Z2";

  let feedback = `### 🚴‍♂️ Avaliação de Treino – Motor Resiliente Local\n\n`;
  feedback += `Olá, **${name}**! Analisei detalhadamente os dados reais do seu pedal e fiz o levantamento fisiológico dos seus números:\n\n`;

  feedback += `- **Volume Registrado**: Concluiu **${actualDuration} minutos** de treino (o planejado era **${workout?.duration || 60} minutos**).\n`;
  if (distance > 0) feedback += `- **GPS & Strava**: Percorreu um volume completo de **${distance} km** a uma velocidade média de **${speed} km/h**.\n`;
  if (elevation > 0) feedback += `- **Ganho de Altimetria**: Superou **${elevation} metros** de variação altimétrica acumulada. Ótimo trabalho de força neuromuscular!\n`;
  if (calories > 0) feedback += `- **Gasto Calórico**: O metabolismo gastou aproximadamente **${calories} kcal**. Recomendamos recarregar seus estoques de glicogênio muscular com uma refeição de carboidratos nas próximas 2 horas!\n\n`;

  feedback += `#### 🔬 Resumo da Análise Fisiológica:\n`;
  if (targetZone.includes("1") || targetZone.includes("2")) {
    if (actualRpe >= 7) {
      feedback += `Você executou um treino voltado para base aeróbica primária ou recuperação ativa em **${targetZone}**, porém registrou sensação de esforço alta de **${actualRpe}/10**. Cuidado: evite forçar demais em dias leves ou regenerativos. O erro clássico de correr forte nas solturas atrasa a supercompensação muscular.\n\n`;
    } else {
      feedback += `Excelente disciplina! Manteve a rodagem aeróbica de base em **${targetZone}** sob total controle motor, com esforço de **${actualRpe}/10** de forma extremamente limpa. Essa regularidade amplia os capilares sanguíneos nas pernas e melhora seu fôlego de longo prazo.\n\n`;
    }
  } else {
    feedback += `Belo cumprimento de metas! Entregar trabalho denso na zona alvo **${targetZone}** com percepção de esforço de **${actualRpe}/10** ativa os mecanismos moleculares de VO2max, recrutando fibras de contração intermediárias e estimulando a complacência do miocárdio.\n\n`;
  }

  if (actualPower > 0) {
    feedback += `Sua potência de **${actualPower} Watts** em relação ao seu FTP demonstrado de **${profile?.ftp || 200}W** indica que você entregou exatamente a carga programada.\n\n`;
  }
  if (actualHr > 0) {
    feedback += `Sua frequência cardíaca média de **${actualHr} bpm** indica resposta cardiovascular normal dentro do esperado.\n\n`;
  }

  if (athleteNotes) {
    feedback += `**Comentário do Atleta**: *"${athleteNotes}"*\n*Análise do Coach*: Acolhi seu comentário e incluí seu estado no macrociclo acumulado. Continue me atualizando sobre essas sensações sensoriais.\n\n`;
  }

  feedback += `#### 🛡️ Recomendações de Recuperação nas próximas 24 horas:\n`;
  feedback += `1. **Nutrição de Base**: Priorize proteínas de alta absorção para repor a degradação muscular e carboidratos complexos.\n`;
  feedback += `2. **Alongamento Suave**: Soltura da região lombar e quadríceps por 10 minutos antes de dormir ajuda a restabelecer a postura do selim.\n`;
  feedback += `3. **Sono reparador**: Noites com no mínimo 7h a 8h de sono mantêm ativos os hormônios naturais reconstrutores. Abraço do treinador e nos vemos amanhã!`;

  return { aiFeedback: feedback };
};

const fallbackChat = (message: string, profile: any, currentPlan: any) => {
  const name = profile?.name || "Atleta";
  const goal = profile?.goal || "seus objetivos de ciclismo";
  const level = profile?.level || "iniciante";
  const cleanMsg = (message || "").trim().toLowerCase();

  let reply = "";

  if (cleanMsg.includes("olá") || cleanMsg.includes("ola") || cleanMsg.includes("opa") || cleanMsg.includes("bom dia") || cleanMsg.includes("boa tarde")) {
    reply = `Olá, **${name}**! Tudo ótimo de cima do selim? Estou aqui como seu treinador de confiança para te ajudar na sua jornada rumo a **${goal}**. Quer falar sobre algum treino específico ou quer que eu te dê dicas de alimentação, cadência, potência ou subida?`;
  } else if (cleanMsg.includes("cansa") || cleanMsg.includes("fadiga") || cleanMsg.includes("dor") || cleanMsg.includes("les") || cleanMsg.includes("exausto") || cleanMsg.includes("quebrado")) {
    reply = `Opa, ${name}. Fliquei muito atento ao seu relato sobre cansaço ou dores corporais. 

O ciclismo exige de nós uma paciência biológica incrível: 
- **O músculo se reconstrói no descanso, não em cima do selim.**
- Se as dores forem nas articulações (joelhos, costas), recomendo repouso absoluto hoje ou um treino regenerativo curtíssimo (soltura de 30 minutos em Z1 bem leve).
- Beba muita água e preze pela alimentação rica em micronutrientes pós-treino.

Se você precisar ajustar hoje ou colocar uma folga na planilha, sinta-se à vontade para gerenciar seus treinos na tela! Continue se cuidando.`;
  } else if (cleanMsg.includes("zona") || cleanMsg.includes("potencia") || cleanMsg.includes("fc") || cleanMsg.includes("batimento") || cleanMsg.includes("ftp") || cleanMsg.includes("watts")) {
    reply = `Excelente dúvida sobre zonas de treino, ${name}! 

Nossa planilha se divide assim nas zonas de trabalho:
- **Z1 (Recuperação)**: Soltura ativa muito leve, pedalando e conversando com extrema facilidade.
- **Z2 (Endurance/Base)**: 56% a 75% do seu FTP. É o coração do nosso motor aeróbico, estimulando a queima de gorduras e capilarização muscular.
- **Z3 (Ritmo)**: Ritmo mais denso, respiração profunda, excelente para eventos de longa duração.
- **Z4 (Limiar de Lactato)**: Esforço forte sustentável, no limite da queimação de ácido lático muscular.
- **Z5 (VO2 Max)**: Estímulos curtos e doloridos para subir e suportar ataques.

Quer saber mais sobre alguma zona específica do seu treino de hoje?`;
  } else if (cleanMsg.includes("mudar") || cleanMsg.includes("alterar") || cleanMsg.includes("ajustar") || cleanMsg.includes("descanso") || cleanMsg.includes("folga") || cleanMsg.includes("muda")) {
    reply = `Claro, **${name}**! Posso te ajudar a planejar reajustes na planilha. Caso queira registrar descanso ou folga para hoje, clique diretamente no card do dia correspondente para editar os status do pedal no seu aplicativo! Se tiver alguma alteração de prioridades a longo prazo (como aumentar os dias disponíveis), faça a modificação e regere os treinos para termos uma nova base.`;
  } else {
    reply = `Excelente observação, **${name}**! Como seu treinador dedicado a **${goal}**, seu rumo está sempre planejado.

Fisiologicamente, para seu nível **${level}**, recomendo focar na **regularidade** e na **disciplina do volume**. É fundamental respeitar o dia fácil (Z1/Z2) para conseguir entregar 100% no dia forte!

Três dicas rápidas do treinador:
1. **Regularidade é tudo**: É melhor fazer 3 pedaladas constantes toda semana do que um giro longo de 5 horas e sumir por duas semanas.
2. **Cadência ágil**: Busque manter giros entre 85-95 rpm para poupar a patela do seu joelho.
3. **Nutrição pós-treino**: Nas próximas 2 horas após pedalar forte, garanta carboidratos de absorção rápida e proteínas para supercompensação.

Como estão as pernas hoje e qual o objetivo do seu próximo pedal?`;
  }

  return {
    reply,
    updatedPlan: null
  };
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
  const safeMsg = typeof message === "string" ? message : "";
  const onboardingStepVal = profile?.onboardingStep !== undefined ? Number(profile.onboardingStep) : 1;
  let currentStep = onboardingStepVal === 0 ? 1 : onboardingStepVal;

  // If the athlete registered, they already have a name under profile.
  // In this case, if currentStep is 1, they are actually replying to Level (Question 2).
  if (currentStep === 1 && profile?.name) {
    currentStep = 2;
  }

  const nextStep = Math.min(10, currentStep + 1);
  const parsedProfile: any = { onboardingStep: nextStep };

  const normalizedMsg = safeMsg.toLowerCase();

  switch (currentStep) {
    case 1: // Asking Name
      parsedProfile.name = safeMsg.replace(/(meu nome é|sou o|sou a|me chamo)\s*/gi, "").trim() || safeMsg || "Atleta";
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
      const matchesDays = safeMsg.match(/\d+/);
      const days = matchesDays ? parseInt(matchesDays[0], 10) : 3;
      parsedProfile.daysPerWeek = days;
      return {
        reply: `Perfeito, treinar ${days} dias por semana é excelente para construir a consistência ideal! Em média, quantos minutos você tem disponíveis por treino diário? (ex: 60 minutos, 90 minutos...)`,
        parsedProfile: { daysPerWeek: days, onboardingStep: 5 }
      };
    case 5: // Duration per session
      const matchesMinutes = safeMsg.match(/\d+/);
      const minutes = matchesMinutes ? parseInt(matchesMinutes[0], 10) : 60;
      parsedProfile.durationPerSession = minutes;
      return {
        reply: `Entendido! Treinos de ${minutes} minutos são perfeitos para sessões estruturadas e eficientes. Me conta: você tem algum evento, desafio ou prova de ciclismo com data marcada? Se sim, qual e quando?`,
        parsedProfile: { durationPerSession: minutes, onboardingStep: 6 }
      };
    case 6: // Event Date
      const eventDate = safeMsg;
      return {
        reply: `Maravilha! Focar em um evento ajuda muito a manter o foco bem definido. Agora sobre equipamentos: você utiliza Medidor de Potência nos treinos? Se sim, sabe estimar qual é seu FTP atual em Watts?`,
        parsedProfile: { eventDate, onboardingStep: 7 }
      };
    case 7: // Power Meter / FTP
      const hasPower = normalizedMsg.includes("sim") || normalizedMsg.includes("tenho") || normalizedMsg.includes("uso") || /\d+/.test(safeMsg);
      const matchesFtp = safeMsg.match(/\d+/);
      const ftpVal = matchesFtp ? parseInt(matchesFtp[0], 10) : 200;
      parsedProfile.hasPowerMeter = hasPower;
      if (hasPower) parsedProfile.ftp = ftpVal;
      return {
        reply: `Excelente! O monitoramento por potência dará uma precisão científica perfeita aos tiros. E quanto à frequência cardíaca: você utiliza sensor (fita) de batimentos do coração? Se sim, qual sua FCmax aproximada?`,
        parsedProfile: { hasPowerMeter: hasPower, ftp: hasPower ? ftpVal : undefined, onboardingStep: 8 }
      };
    case 8: // Heart Rate
      const hasHR = normalizedMsg.includes("sim") || normalizedMsg.includes("tenho") || normalizedMsg.includes("uso") || /\d+/.test(safeMsg);
      const matchesMaxHr = safeMsg.match(/\d+/);
      const maxHrVal = matchesMaxHr ? parseInt(matchesMaxHr[0], 10) : 180;
      parsedProfile.hasHeartRate = hasHR;
      if (hasHR) parsedProfile.maxHeartRate = maxHrVal;
      return {
        reply: `Muito bom! O controle cardíaco nos guiará em subidas longas e controle regenerativo. Já estamos quase lá! Você possui alguma limitação física, dor nas articulações ou joelho que devemos considerar nos treinos?`,
        parsedProfile: { hasHeartRate: hasHR, maxHeartRate: hasHR ? maxHrVal : undefined, onboardingStep: 9 }
      };
    case 9: // Limitations
      const limitations = safeMsg;
      return {
        reply: `Anotado. Sua segurança física e saúde estão sempre em primeiro lugar. Para fecharmos o seu cadastro de atleta: como foi o seu pedal ou treino mais recente (estimativa de tempo, distância ou sensação de cansaço)?`,
        parsedProfile: { limitations, onboardingStep: 10 }
      };
    case 10: // Recent Activity and Complete Onboarding
      const recentActivity = safeMsg;
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

    const response = await withTimeout(
      withRetry(() => getAiClient().models.generateContent({
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
      })),
      25000,
      "Tempo limite de 25s esgotado ao estruturar diálogo com o Coach."
    );

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
        modelStep = Math.min(10, (prevStep === 0 ? 1 : prevStep) + 1);
        data.parsedProfile.onboardingStep = modelStep;
        console.log(`[BACKEND ONBOARDING ADJUST] onboardingStep was fallback-incremented from ${prevStep} to ${modelStep}`);
      }
    }

    console.log("[BACKEND ONBOARDING RESPONSE]", JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error: any) {
    console.warn("Fadiga aeróbica no onboarding. Ativando coach local resiliente para salvaguarda:", sanitizeLogMessage(error));
    try {
      const fallbackData = fallbackOnboard(message, profile);
      res.json(fallbackData);
    } catch (fallbackErr: any) {
      res.status(500).json({ error: getFriendlyErrorMessage(error) });
    }
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

    const response = await withTimeout(
      withRetry(() => getAiClient().models.generateContent({
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
      })),
      25000,
      "Tempo limite de 25s excedido ao tentar extrair a periodização inicial."
    );

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini API");
    }
    res.json(cleanAndParseJson(resultText));
  } catch (error: any) {
    console.warn("Fadiga periférica no plano. Ativando planejador fisiológico local resiliente para salvaguarda:", sanitizeLogMessage(error));
    try {
      const fallbackData = generateLocalPlan(profile);
      res.json(fallbackData);
    } catch (fallbackErr: any) {
      res.status(500).json({ error: getFriendlyErrorMessage(error) });
    }
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

    const response = await withTimeout(
      withRetry(() => getAiClient().models.generateContent({
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
      })),
      25000,
      "Tempo limite de 25s esgotado ao recalcular o macrociclo para a próxima semana."
    );

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini API for next week generation");
    }
    res.json(cleanAndParseJson(resultText));
  } catch (error: any) {
    console.warn("Fadiga periférica na próxima semana. Ativando recalculador fisiológico local de salvaguarda:", sanitizeLogMessage(error));
    try {
      const fallbackData = generateLocalNextWeek(currentPlan, athleteFeedback, nextWeekNumber, profile);
      res.json(fallbackData);
    } catch (fallbackErr: any) {
      res.status(500).json({ error: getFriendlyErrorMessage(error) });
    }
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
2. O treino efetivamente realizado (Duração real, Esforço sentido recebido de 1 a 10, Frequência Cardíaca média, Potência média em Watts, Distância (km), Velocidade Média (km/h), Altimetria acumulada (m), Calorias gastas (kcal), link opcional do Strava e comentários do atleta).

Diretrizes da sua Análise Científica e Conselhos de Ouro:
- Analise de forma direta as métricas do GPS/Strava: distância percorrida, velocidade média e altimetria. Se houve muita subida (altimetria alta), comente sobre a demanda neuromuscular e de força (cadência e torque). Se a velocidade média foi alta para a zona alvo, valide se manteve a potência correta.
- Relacione o gasto calórico (calorias) com dicas de reabastecimento de glicogênio (ex: carboidratos pós-treino recomendados).
- Se foi um treino "Regenerativo/Folga" (Z1/Z2) e o atleta rodou com esforço maior do que o planejado ou com frequência cardíaca muito alta, explique amigavelmente sobre o erro de "treinar forte no dia fácil", o que gera estresse crônico desnecessário sem adaptação benéfica.
- Se foi um treino "Forte/Limiar/Intervalos" (Z4/Z5) e o atleta manteve o foco, comemore muito! Diga o que acontece fisiologicamente no corpo dele (melhora do VO2Max, recrutamento de fibras do tipo II, aumento da complacência cardíaca).
- Relacione os dados reais (Potência em relação ao FTP, e Frequência Cardíaca em relação à FCmax do usuário) caso esses dados tenham sido informados (FTP: ${profile?.ftp || 200}W, FCmax: ${profile?.maxHeartRate || 180} bpm).
- Forneça recomendações práticas para as próximas 24-48 horas baseadas no cansaço relatado nas notas pessoais do atleta (ex: alongamentos, hidratação adicional, alimentação regenerativa rica em carboidratos complexos/proteínas, ou um bom sono).

REGRA CRÍTICA DE COMUNICAÇÃO: Nunca utilize a palavra "RPE" ou "Percepção Subjetiva de Esforço" em suas explicações, resumos, descrições ou dicas. Esse termo técnico afasta o ciclista. Use termos muito simples e diretos para explicar o nível de esforço, tais como: "Muito Leve", "Leve", "Moderado", "Forte" ou "Máximo".

Sua resposta deve ser estruturada sob o formato JSON contendo uma única chave:
{
  "aiFeedback": "Sua avaliação completa escrita em parágrafos de Markdown bem estruturados e amigáveis, contendo elogios específicos, análises fisiológicas sobre as métricas do GPS/Strava cadastradas, e conselhos práticos de recuperação."
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
- Distância Percorrida: ${workout?.actualDistance ? `${workout.actualDistance} km` : "Não informada"}
- Velocidade Média: ${workout?.actualAvgSpeed ? `${workout.actualAvgSpeed} km/h` : "Não informada"}
- Altimetria Acumulada (Subida): ${workout?.actualElevation ? `${workout.actualElevation} metros de ganho` : "Não informada"}
- Gasto Calórico Estimado: ${workout?.actualCalories ? `${workout.actualCalories} kcal` : "Não informada"}
- Link do Pedal no Strava: ${workout?.actualStravaLink || "Não fornecido"}
- Notas / Observações do Atleta: "${workout?.athleteNotes || "Nenhum comentário preenchido pelo atleta."}"

Faça uma avaliação amigável de coach de alto nível, comentando detalhadamente sobre essa performance e as métricas do pedal, e retorne o resultado em JSON.`;

    const response = await withTimeout(
      withRetry(() => getAiClient().models.generateContent({
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
      })),
      25000,
      "Tempo limite de 25s excedido no feedback fisiológico do selim."
    );

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini API for workout evaluation");
    }
    res.json(cleanAndParseJson(resultText));
  } catch (error: any) {
    console.warn("Fadiga sistêmica na avaliação do treino. Ativando avaliador fisiológico local de salvaguarda:", sanitizeLogMessage(error));
    try {
      const fallbackData = evaluateLocalWorkout(profile, workout);
      res.json(fallbackData);
    } catch (fallbackErr: any) {
      res.status(500).json({ error: getFriendlyErrorMessage(error) });
    }
  }
});


const fallbackParseStrava = (stravaLink: string, workout: any, profile: any) => {
  const duration = Number(workout?.duration) || 60;
  const targetZone = workout?.targetZone || "Z2";
  
  // Base calculations
  let actualDuration = duration + Math.floor(Math.random() * 11) - 3; // +- 3 to 7 minutes
  if (actualDuration < 10) actualDuration = 10;
  
  // Calculate average heart rate based on profile max HR
  const maxHr = Number(profile?.maxHeartRate) || 180;
  let hrFactor = 0.65; // default Z2
  let rpe = 4;
  if (targetZone === "Z1") { hrFactor = 0.55; rpe = 2; }
  else if (targetZone === "Z3") { hrFactor = 0.75; rpe = 5; }
  else if (targetZone === "Z4") { hrFactor = 0.85; rpe = 7; }
  else if (targetZone === "Z5") { hrFactor = 0.92; rpe = 9; }
  
  const actualHr = Math.round(maxHr * (hrFactor + (Math.random() * 0.06 - 0.03)));
  
  // Calculate average power based on FTP
  const ftp = Number(profile?.ftp) || 200;
  let powerFactor = 0.65; // default Z2
  if (targetZone === "Z1") powerFactor = 0.50;
  else if (targetZone === "Z3") powerFactor = 0.80;
  else if (targetZone === "Z4") powerFactor = 0.92;
  else if (targetZone === "Z5") powerFactor = 1.15;
  
  const actualPower = Math.round(ftp * (powerFactor + (Math.random() * 0.1 - 0.05)));
  
  // Distance / Speed / Elevation
  const speed = targetZone === "Z1" ? 22 : targetZone === "Z2" ? 26 : targetZone === "Z3" ? 29 : targetZone === "Z4" ? 33 : 36;
  const actualAvgSpeed = (speed + (Math.random() * 4 - 2)).toFixed(1);
  const actualDistance = ((actualDuration / 60) * Number(actualAvgSpeed)).toFixed(2);
  
  const actualElevation = Math.round((actualDuration / 60) * (150 + Math.random() * 300));
  
  // Calories: roughly avgPower * actualDuration * 60 * 1.1 / 4.184 (physiological estimate: ~4 kcal per watt-hour scaled up)
  const actualCalories = Math.round((actualPower * (actualDuration / 60)) * 3.6);
  
  const noteOptions = [
    `Pedal maravilhoso seguindo o link ${stravaLink}. Consegui focar muito bem na Zona ${targetZone}, vento modesto de cauda na volta e as pernas responderam esplendidamente bem!`,
    `Giro realizado com sucesso utilizando o link ${stravaLink}. Ritmo super consistente, mantive a cadência média na casa de 88 rpm e a hidratação correta com eletrólitos.`,
    `Concluído! O Strava registrou perfeitamente. Senti um pouco de peso nas pernas nos primeiros 15 minutos, mas depois que aqueci consegui entregar a potência estipulada de forma suave.`,
    `Treino entregue! Monitoramento perfeito pelo ciclocomputador e integrado com sucesso. Treino com sensação térmica moderada, mas sem dores nas articulações ou desconfortos.`
  ];
  const athleteNotes = noteOptions[Math.floor(Math.random() * noteOptions.length)];

  return {
    actualDuration,
    actualRpe: rpe,
    actualHr: String(actualHr),
    actualPower: String(actualPower),
    actualDistance: String(actualDistance),
    actualAvgSpeed: String(actualAvgSpeed),
    actualElevation: String(actualElevation),
    actualCalories: String(actualCalories),
    athleteNotes
  };
};

app.post("/api/parse-strava", async (req, res) => {
  const { stravaLink, workout, profile } = req.body;
  try {
    checkApiKey();
    
    const systemInstruction = `Você é um integrador inteligente de dados do Strava para uma planilha de ciclismo estruturada.
Sua tarefa é receber um link de atividade do Strava, as informações do Treino Prescrito correspondente e o Perfil do Atleta (FTP e FCmax), e simular/gerar a extração automática exata dos dados de telemetria reais do pedal.

Por favor, gere dados extremamente realistas baseados na física e fisiologia esportiva real do ciclismo:
1. "actualDuration": Tempo em movimento em minutos (próximo à Duração Planejada, ex: planejado 60, real 58 a 64).
2. "actualRpe": PSE do atleta de 1 a 10 (conforme a intensidade e Zona Alvo do treino).
3. "actualHr": Frequência cardíaca média consistente com a Zona Alvo:
   - Z1: ~50-60% da FCmax (${profile?.maxHeartRate || 180} bpm)
   - Z2: ~60-70% da FCmax
   - Z3: ~70-80% da FCmax
   - Z4: ~80-90% da FCmax
   - Z5: ~90-98% da FCmax
4. "actualPower": Potência média em Watts consistente com a Zona Alvo:
   - Z1: ~50-64% do FTP (${profile?.ftp || 200}W)
   - Z2: ~65-75% do FTP
   - Z3: ~76-90% do FTP
   - Z4: ~91-105% do FTP
   - Z5: >105% do FTP
5. "actualDistance": Distância realista percorrida em km (calculada como duração * velocidade média / 60, ex: 25.5 km).
6. "actualAvgSpeed": Velocidade média em km/h (realista para ciclismo de estrada no plano/misto: ex: 22.0 a 35.0 km/h).
7. "actualElevation": Ganho acumulado de altimetria em metros (ex: 150 a 1200m).
8. "actualCalories": Calorias reais estimadas (com base nos watts médios e tempo, ex: 400 a 1200 kcal).
9. "athleteNotes": Um texto super curto de 2-3 frases escrito em primeira pessoa pelo ciclista em português ("Fiz no rolo...", "Saí na estrada e peguei vento de frente...", "Senti as pernas um pouco tensas no início...", etc.), citando de forma natural fatos simulados sobre o link "${stravaLink || "do Strava"}".

Sua resposta deve ser estritamente no formato JSON estruturado.`;

    const prompt = `LINK DO STRAVA: ${stravaLink || "https://www.strava.com/activities/simulated"}
TREINO PRECRITO:
- Tipo: ${workout?.type || "Endurance"}
- Duração Planejada: ${workout?.duration || 60} minutos
- Zona Alvo: ${workout?.targetZone || "Z2"}
- Esforço Estimado (RPE): ${workout?.rpe || 5}/10

PERFIL DO ATLETA:
- FTP: ${profile?.ftp || 200} Watts
- FCmáx: ${profile?.maxHeartRate || 180} bpm

Por favor, gere e retorne o JSON estruturado com os dados reais e sensações extraídos desta pedalada.`;

    const response = await withTimeout(
      withRetry(() => getAiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: [
              "actualDuration",
              "actualRpe",
              "actualHr",
              "actualPower",
              "actualDistance",
              "actualAvgSpeed",
              "actualElevation",
              "actualCalories",
              "athleteNotes"
            ],
            properties: {
              actualDuration: { type: Type.INTEGER },
              actualRpe: { type: Type.INTEGER },
              actualHr: { type: Type.STRING },
              actualPower: { type: Type.STRING },
              actualDistance: { type: Type.STRING },
              actualAvgSpeed: { type: Type.STRING },
              actualElevation: { type: Type.STRING },
              actualCalories: { type: Type.STRING },
              athleteNotes: { type: Type.STRING }
            }
          }
        }
      })),
      25000,
      "Tempo limite de processamento de dados do Strava excedido."
    );

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini API");
    }
    res.json(cleanAndParseJson(resultText));
  } catch (error: any) {
    console.warn("Fadiga periférica no Strava. Ativando parser local resiliente de salvaguarda:", sanitizeLogMessage(error));
    try {
      const fallbackData = fallbackParseStrava(stravaLink, workout, profile);
      res.json(fallbackData);
    } catch (fallbackError: any) {
      res.status(500).json({ error: getFriendlyErrorMessage(error) });
    }
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
- Use e abuse de forma personalizada de todos os dados do Atleta Perfil recebidos (por exemplo: trate o atleta pelo seu Nome, leve em consideração se possui alguma limitação ou lesão física ao responder, adeque a linguagem ao nível dele (iniciante/intermediário/avançado), relacione as dicas com o objetivo principal dele e com os equipamentos que ele usa como FTP em Watts ou FCmax se informados).
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

    const response = await withTimeout(
      withRetry(() => getAiClient().models.generateContent({
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
      })),
      25000,
      "Tempo limite de 25s atingido no acompanhamento do Coach."
    );

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini API");
    }
    res.json(cleanAndParseJson(resultText));
  } catch (error: any) {
    console.warn("Fadiga central na chamada do Gemini para chat personalizado. Ativando treinador local resiliente de salvaguarda:", sanitizeLogMessage(error));
    try {
      const fallbackData = fallbackChat(message, profile, currentPlan);
      res.json(fallbackData);
    } catch (fallbackError: any) {
      res.status(500).json({ error: getFriendlyErrorMessage(error) });
    }
  }
});

// -------------------------------------------------------------
// COACH/ADMIN DASHBOARD ENDPOINTS
// -------------------------------------------------------------

// Fetch all registered users in the database
app.get("/api/admin/users", async (req, res) => {
  try {
    const db = await getDatabase();
    // Return all users metadata (omitting passwords)
    const userList = Object.keys(db).map((key) => {
      const user = db[key];
      const isCoach = user.email?.trim().toLowerCase() === "pedro.bramos@sempreceub.com";
      return {
        email: user.email,
        profile: {
          ...user.profile,
          subscriptionStatus: user.profile?.subscriptionStatus || "active",
          subscriptionPlan: user.profile?.subscriptionPlan || "Bronze (Mensal)",
          subscriptionExpiresAt: user.profile?.subscriptionExpiresAt || "2026-12-31",
          role: user.profile?.role || (isCoach ? "coach" : "athlete")
        },
        chatHistoryCount: user.chatHistory?.length || 0,
        hasPlan: !!user.plan,
        planSummary: user.plan?.summary || ""
      };
    });
    res.json({ success: true, users: userList });
  } catch (error: any) {
    console.error("Error fetching admin users:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update profile status / subscription details of a user
app.post("/api/admin/update-user-status", async (req, res) => {
  try {
    const { email, subscriptionStatus, subscriptionPlan, subscriptionExpiresAt, role, ftp, maxHeartRate } = req.body;
    if (!email) {
      return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
    }

    const db = await getDatabase();
    const emailKey = email.trim().toLowerCase();
    const user = db[emailKey];

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const oldStatus = user.profile ? user.profile.subscriptionStatus : undefined;

    // Update profile fields
    user.profile = {
      ...user.profile,
      subscriptionStatus: subscriptionStatus || user.profile.subscriptionStatus || "active",
      subscriptionPlan: subscriptionPlan || user.profile.subscriptionPlan || "Bronze (Mensal)",
      subscriptionExpiresAt: subscriptionExpiresAt || user.profile.subscriptionExpiresAt || "2026-12-31",
      role: role || user.profile.role || "athlete"
    };

    if (ftp !== undefined) {
      user.profile.ftp = ftp ? Number(ftp) : null;
    }
    if (maxHeartRate !== undefined) {
      user.profile.maxHeartRate = maxHeartRate ? Number(maxHeartRate) : null;
    }

    db[emailKey] = user;
    await saveDatabase(db);

    // Send personalized custom activation notification email if status transitions to active
    let emailResponse = null;
    if (user.profile.subscriptionStatus === "active" && oldStatus !== "active") {
      const originUrl = req.headers.referer || req.headers.origin || "";
      try {
        emailResponse = await sendActivationEmail(
          user.profile.name || "Ciclista",
          emailKey,
          user.profile.subscriptionPlan || "Bronze (Mensal)",
          originUrl
        );
      } catch (errEmail) {
        console.error("Erro interno no disparo de email de ativação:", errEmail);
      }
    }

    res.json({ success: true, user, emailNotificationSent: !!emailResponse, emailResponse });
  } catch (error: any) {
    console.error("Error updating user status in server:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET list of simulated or sent email logs for diagnostic audit in the admin panel
app.get("/api/admin/sent-emails", async (req, res) => {
  try {
    const emails = getSentEmailsLog();
    res.json({ success: true, emails });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET automated backups list
app.get("/api/admin/backups", async (req, res) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith("users_db_backup_") && f.endsWith(".json"))
      .map(f => {
        try {
          const fullPath = path.join(BACKUPS_DIR, f);
          const stats = fs.statSync(fullPath);
          return {
            filename: f,
            sizeBytes: stats.size,
            createdAt: stats.mtime.toISOString(),
          };
        } catch {
          return {
            filename: f,
            sizeBytes: 0,
            createdAt: new Date().toISOString()
          };
        }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // Mais recentes primeiro

    // Informações do banco de dados principal
    let mainDbStats = { sizeBytes: 0, lastModified: new Date().toISOString() };
    if (fs.existsSync(USERS_DB_PATH)) {
      try {
        const mStats = fs.statSync(USERS_DB_PATH);
        mainDbStats = {
          sizeBytes: mStats.size,
          lastModified: mStats.mtime.toISOString()
        };
      } catch (err: any) {
        console.warn("Falha ao ler status do db principal:", err.message);
      }
    }

    res.json({ success: true, backups: files, mainDatabase: mainDbStats });
  } catch (err: any) {
    console.error("Erro listando backups:", err);
    res.status(500).json({ error: err.message });
  }
});

// Force create manual/instant backup
app.post("/api/admin/backups/create", async (req, res) => {
  try {
    const db = await getDatabase();
    await triggerAutomaticBackup(db);
    res.json({ success: true, message: "Backup manual instantâneo criado com sucesso!" });
  } catch (err: any) {
    console.error("Erro ao criar backup manual:", err);
    res.status(500).json({ error: err.message });
  }
});

// Restore backup from specific filename
app.post("/api/admin/backups/restore", async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Nome de arquivo do backup é obrigatório para o restauro." });
    }

    const targetPath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: "Arquivo de backup não encontrado." });
    }

    // Cria um backup extra de segurança do estado atual antes do restore
    const currentDb = await getDatabase();
    console.log("[Backup Automático] Criando backup de segurança atual antes de restaurar...");
    await triggerAutomaticBackup(currentDb);

    // Lê o conteúdo do backup e atualiza o estado
    const backupContent = fs.readFileSync(targetPath, "utf-8");
    const restoredDb = JSON.parse(backupContent);

    // Atualiza o cache e reescreve o arquivo JSON principal de usuários
    inMemoryDbCache = restoredDb;
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(restoredDb, null, 2), "utf-8");

    console.log(`[Backup Automático] Banco de dados restaurado com sucesso para a versão: ${filename}`);
    res.json({ success: true, message: `Banco de dados restaurado com sucesso para a versão: ${filename}` });
  } catch (err: any) {
    console.error("Erro no restauro do backup:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MERCADO PAGO GATEWAY INTEGRATION ENDPOINTS
// -------------------------------------------------------------

app.get("/api/mercadopago/config", (req, res) => {
  const isReal = !!(process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_CLIENT_SECRET);
  res.json({
    success: true,
    isReal,
    publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || "TEST-PublicKey-Simulado",
    sandbox_mode: true
  });
});

app.post("/api/mercadopago/create-preference", async (req, res) => {
  try {
    const { email } = req.body;
    const payerEmail = email || "usuario@cyclecoach.ai";
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      console.log("[Mercado Pago] Nenhuma credencial oficial no server. Usando link de pagamento oficial configurado.");
      return res.json({
        success: true,
        isSimulated: true,
        init_point: "https://mpago.la/24PgikU",
        sandbox_init_point: "https://mpago.la/24PgikU",
        preferenceId: "simulated-pref-id-123456"
      });
    }

    const host = req.get("host") || "localhost:3000";
    // If running in development frame or secure dev URL, determine active protocol
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const baseUrl = `${protocol}://${host}`;

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [
          {
            id: "premium-monthly",
            title: "Assinatura Mensal Premium - CycleCoach AI",
            quantity: 1,
            unit_price: 19.89,
            currency_id: "BRL"
          }
        ],
        payer: {
          email: payerEmail
        },
        back_urls: {
          success: `${baseUrl}/?status=success&payment_method=mercadopago`,
          failure: `${baseUrl}/?status=failure`,
          pending: `${baseUrl}/?status=pending`
        },
        auto_return: "all"
      })
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error("[Mercado Pago Error] Falha ao criar preferência:", errorData);
      throw new Error(errorData.message || "Erro retornado pela API oficial do Mercado Pago.");
    }

    const mpData = await mpResponse.json();
    res.json({
      success: true,
      isSimulated: false,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      preferenceId: mpData.id
    });
  } catch (error: any) {
    console.error("Erro ao processar criação de preferência Mercado Pago:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/mercadopago/create-pix", async (req, res) => {
  try {
    const { email } = req.body;
    const payerEmail = email || "usuario@cyclecoach.ai";
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      console.log("[Mercado Pago PIX] Nenhuma credencial oficial no server. Usando container de simulação integrada.");
      return res.json({
        success: true,
        isSimulated: true,
        qr_code: "00020101021226870014BR.GOV.BCB.PIX2565bikerai-mp-mercadopago-pedrobramos-19.89-6009SAOPAULO62070503MVP",
        qr_code_base64: ""
      });
    }

    const uuidRaw = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const idempotencyKey = `pix-charge-${Date.now()}-${uuidRaw.substring(0, 8)}`;

    const responseMP = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({
        transaction_amount: 19.89,
        description: "Assinatura CycleCoach AI Premium",
        payment_method_id: "pix",
        payer: {
          email: payerEmail,
          first_name: "Atleta",
          last_name: "CycleCoach"
        }
      })
    });

    if (!responseMP.ok) {
      const errorData = await responseMP.json();
      console.error("[Mercado Pago Error] Falha ao criar pagamento PIX:", errorData);
      throw new Error(errorData.message || JSON.stringify(errorData));
    }

    const mpData = await responseMP.json();
    const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;

    res.json({
      success: true,
      isSimulated: false,
      paymentId: mpData.id,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      status: mpData.status
    });
  } catch (error: any) {
    console.error("Erro ao gerar Pix integrado no Mercado Pago:", error);
    res.status(500).json({ error: error.message });
  }
});


// Serve frontend assets and start listening
async function bootstrap() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const viteModName = "vite";
    const { createServer: createViteServer } = await import(viteModName);
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
