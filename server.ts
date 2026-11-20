import express from "express";
import { rateLimit } from "express-rate-limit";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import https from "https";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore/lite";
import { initializeApp as initializeAdminApp, getApp as getAdminApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

dotenv.config();

// Configurações globais e constantes de negócio
const SUBSCRIPTION_PRICE_BRL = 16.90;

// Carregar configuração do Firebase Applet
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseAppletConfig: any = {};
if (fs.existsSync(configPath)) {
  try {
    firebaseAppletConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (err: any) {
    console.error("Erro ao carregar firebase-applet-config.json:", err.message);
  }
}

// Variáveis de ambiente têm prioridade máxima (necessário para deploy no Vercel / serverless)
if (process.env.FIREBASE_PROJECT_ID) {
  firebaseAppletConfig = {
    ...firebaseAppletConfig,
    projectId: process.env.FIREBASE_PROJECT_ID,
    apiKey: process.env.FIREBASE_API_KEY || firebaseAppletConfig.apiKey || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain || "",
    appId: process.env.FIREBASE_APP_ID || firebaseAppletConfig.appId || "",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket || "",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId || "",
    firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId || "(default)"
  };
  console.log("[Firebase Config] Variáveis de ambiente aplicadas.");
}

let firestoreDb: any = null;
let useFirestore = false;

// Testes (Vitest) nunca tocam o Firestore real: usam só o users_db.json local.
const IS_TEST_RUN = Boolean(process.env.VITEST);

try {
  if (!IS_TEST_RUN && firebaseAppletConfig && firebaseAppletConfig.projectId && firebaseAppletConfig.apiKey) {
    const firebaseApp = getApps().length === 0 
      ? initializeApp({
          apiKey: firebaseAppletConfig.apiKey,
          authDomain: firebaseAppletConfig.authDomain,
          projectId: firebaseAppletConfig.projectId,
          appId: firebaseAppletConfig.appId,
          storageBucket: firebaseAppletConfig.storageBucket,
          messagingSenderId: firebaseAppletConfig.messagingSenderId,
        })
      : getApp();

    firestoreDb = getFirestore(firebaseApp, firebaseAppletConfig.firestoreDatabaseId || undefined);
    useFirestore = true;
    console.log("[Firebase Lite] Inicializado com sucesso para o projeto:", firebaseAppletConfig.projectId);
  } else {
    console.log("[Firebase Lite] Desativado. Usando apenas persistência local.");
  }
} catch (err: any) {
  console.error("[Firebase Lite] Falha ao inicializar. Usando persistência local:", err.message);
  firestoreDb = null;
  useFirestore = false;
}

// Inicializar SDK de administração do Firebase (Firebase Admin) para bypass de regras de segurança no servidor
let adminFirestoreDb: any = null;
try {
  if (!IS_TEST_RUN && firebaseAppletConfig && firebaseAppletConfig.projectId) {
    const adminConfig: any = {
      projectId: firebaseAppletConfig.projectId
    };

    const serviceAccountPath = path.join(process.cwd(), "service-account.json");
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        adminConfig.credential = cert(serviceAccount);
        console.log("[Firebase Admin] Inicializado com credencial de FIREBASE_SERVICE_ACCOUNT.");
      } catch (keyErr: any) {
        console.error("[Firebase Admin] Erro ao carregar FIREBASE_SERVICE_ACCOUNT:", keyErr.message);
      }
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        adminConfig.credential = cert(serviceAccount);
        console.log("[Firebase Admin] Inicializado com credencial de FIREBASE_SERVICE_ACCOUNT_KEY.");
      } catch (keyErr: any) {
        console.error("[Firebase Admin] Erro ao carregar FIREBASE_SERVICE_ACCOUNT_KEY:", keyErr.message);
      }
    } else if (fs.existsSync(serviceAccountPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
        adminConfig.credential = cert(serviceAccount);
        console.log("[Firebase Admin] Carregando credenciais do arquivo service-account.json...");
      } catch (keyErr: any) {
        console.error("[Firebase Admin] Erro ao carregar service-account.json:", keyErr.message);
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        adminConfig.credential = applicationDefault();
        console.log("[Firebase Admin] Inicializando com Application Default Credentials (ADC)...");
      } catch (adcErr: any) {
        console.warn("[Firebase Admin] ADC não disponível no ambiente atual:", adcErr.message);
      }
    }

    if (adminConfig.credential) {
      initializeAdminApp(adminConfig);
      let firestoreInstance: any;
      try {
        if (firebaseAppletConfig.firestoreDatabaseId) {
          firestoreInstance = getAdminFirestore(getAdminApp(), firebaseAppletConfig.firestoreDatabaseId);
        } else {
          firestoreInstance = getAdminFirestore(getAdminApp());
        }
      } catch (e: any) {
        console.warn("[Firebase Admin] Falha ao iniciar firestore com databaseId, tentando padrão:", e.message);
        firestoreInstance = getAdminFirestore(getAdminApp());
      }
      adminFirestoreDb = firestoreInstance;
      console.log("[Firebase Admin] Inicializado com sucesso para o projeto:", firebaseAppletConfig.projectId);
    } else {
      console.log("[Firebase Admin] Credenciais de conta de serviço não encontradas. Usando Firestore Lite SDK.");
    }
  }
} catch (err: any) {
  console.warn("[Firebase Admin] Falha ao inicializar Admin SDK:", err.message);
}

// JSON file database path for local persistence
const USERS_DB_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), "users_db.json")
  : path.join(process.cwd(), "users_db.json");


// --- CRYPTOGRAPHIC HELPERS & SECURITY MIDDLEWARES ---

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  
  if (!storedHash.includes(":")) {
    // Senha legada em texto puro: comparação em tempo constante (migrada para hash no login).
    const a = Buffer.from(password);
    const b = Buffer.from(storedHash);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha256").toString("hex");
  try {
    const a = Buffer.from(testHash);
    const b = Buffer.from(hash);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

let googlePublicKeys: Record<string, string> = {};
let keysExpiryTime = 0;

async function fetchGooglePublicKeys(): Promise<Record<string, string>> {
  if (Date.now() < keysExpiryTime && Object.keys(googlePublicKeys).length > 0) {
    return googlePublicKeys;
  }

  return new Promise((resolve, reject) => {
    const req = https.get("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com", (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          googlePublicKeys = JSON.parse(data);
          const cacheControl = res.headers["cache-control"] || "";
          const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
          const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) * 1000 : 3600 * 1000;
          keysExpiryTime = Date.now() + maxAge;
          resolve(googlePublicKeys);
        } catch (e) {
          reject(new Error("Failed to parse Google public keys"));
        }
      });
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

const tokenVerificationCache = new Map<string, { decoded: any; exp: number }>();

function setTestAuthToken(token: string, decodedPayload: any, ttlMs = 300000) {
  tokenVerificationCache.set(token, { decoded: decodedPayload, exp: Date.now() + ttlMs });
}

async function verifyFirebaseIdToken(token: string, projectId: string): Promise<any> {
  const cached = tokenVerificationCache.get(token);
  if (cached && cached.exp > Date.now()) {
    return cached.decoded;
  }

  let decodedToken: any = null;

  try {
    let adminApp: any = null;
    try {
      adminApp = getAdminApp();
    } catch {}
    if (adminApp) {
      decodedToken = await getAdminAuth(adminApp).verifyIdToken(token);
    }
  } catch (adminErr: any) {}

  if (!decodedToken) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const [headerB64, payloadB64, signatureB64] = parts;
        const header = JSON.parse(base64UrlDecode(headerB64));
        const payload = JSON.parse(base64UrlDecode(payloadB64));
        const signature = Buffer.from(signatureB64, "base64url");

        const now = Math.floor(Date.now() / 1000);
        const isClaimsValid = payload.exp > now &&
          payload.iss === `https://securetoken.google.com/${projectId}` &&
          payload.aud === projectId &&
          Boolean(payload.sub);

        // A assinatura RS256 é sempre obrigatória. Testes usam setTestAuthToken
        // em vez de aceitar tokens sem assinatura.
        if (isClaimsValid && header.alg === "RS256") {
          try {
            const keys = await fetchGooglePublicKeys();
            const cert = keys[header.kid];
            if (cert) {
              const verifier = crypto.createVerify("SHA256");
              verifier.update(`${headerB64}.${payloadB64}`);
              if (verifier.verify(cert, signature)) {
                decodedToken = payload;
              }
            }
          } catch {}
        }
      }
    } catch (fastErr) {}
  }

  if (!decodedToken) {
    throw new Error("Token de autenticação inválido ou expirado");
  }

  const expMs = decodedToken.exp ? decodedToken.exp * 1000 : Date.now() + 60000;
  tokenVerificationCache.set(token, { decoded: decodedToken, exp: Math.min(expMs, Date.now() + 60000) });
  if (tokenVerificationCache.size > 200) {
    tokenVerificationCache.clear();
  }

  return decodedToken;
}

/**
 * Conta master (treinador principal), definida só por variável de ambiente.
 * Sem ADMIN_EMAIL válido o modo master fica desligado: nenhum e-mail recebe o privilégio
 * (coach/admin por `role` no banco e a credencial x-admin-password continuam valendo).
 */
const MASTER_ADMIN_EMAIL: string | null = normalizeEmail(process.env.ADMIN_EMAIL);
if (!MASTER_ADMIN_EMAIL && !IS_TEST_RUN) {
  console.warn("[Config] ADMIN_EMAIL ausente ou inválido: conta master desativada.");
}

/** Identidade usada quando o acesso admin vem da credencial x-admin-password (sem e-mail master configurado). */
const ADMIN_SECRET_IDENTITY = "admin-secret";

/** Compara com a conta master; sempre falso quando ADMIN_EMAIL não está configurado. */
function isMasterAdminEmail(email: unknown): boolean {
  if (!MASTER_ADMIN_EMAIL || typeof email !== "string") return false;
  return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL;
}

function verifyAdminSecret(providedSecret?: string): boolean {
  const envSecret = process.env.ADMIN_PASSWORD;
  if (!envSecret || !providedSecret) return false;
  try {
    const a = Buffer.from(providedSecret);
    const b = Buffer.from(envSecret);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

fetchGooglePublicKeys().catch(() => {});

async function requireAuth(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    const adminPassword = req.headers["x-admin-password"] || req.body?.adminPassword;
    const requestPath = (req.originalUrl || req.path || "").toString();
    const isAdminRoute = requestPath.startsWith("/api/admin/");

    if (adminPassword && verifyAdminSecret(adminPassword)) {
      if (isAdminRoute || requestPath === "") {
        req.user = { email: MASTER_ADMIN_EMAIL || ADMIN_SECRET_IDENTITY, isAdmin: true, role: "coach" };
        return next();
      }
      return res.status(403).json({ error: "Credencial administrativa não pode ser usada em rotas de usuário. Use um token de atleta ou a rota administrativa correta." });
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Sessão inválida ou ausente. Cabeçalho de autorização não fornecido." });
    }

    const token = authHeader.split("Bearer ")[1]?.trim();
    if (!token) {
      return res.status(401).json({ error: "Token de autorização vazio." });
    }

    const projectId = firebaseAppletConfig.projectId;
    if (!projectId) {
      return res.status(500).json({ error: "Configuração do Firebase incompleta no servidor." });
    }

    const decodedToken = await verifyFirebaseIdToken(token, projectId);
    const tokenEmail = normalizeEmail(decodedToken?.email || decodedToken?.firebase?.identities?.email?.[0]);
    if (!tokenEmail) {
      return res.status(401).json({ error: "Token não contém uma identidade ou e-mail válido." });
    }

    req.user = decodedToken || {};
    req.user.email = tokenEmail;
    return next();
  } catch (err: any) {
    console.warn("[RequireAuth] Falha na validação do token:", err.message);
    return res.status(401).json({ error: "Sessão inválida ou expirada. Entre novamente." });
  }
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  // Limite de tamanho (RFC 5321) antes de qualquer validação e sem regex com
  // quantificadores ambíguos, para evitar ReDoS.
  if (!normalized || normalized.length > 254 || /\s/.test(normalized)) return null;
  const at = normalized.indexOf("@");
  if (at <= 0 || at !== normalized.lastIndexOf("@")) return null;
  const domain = normalized.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  if (dot <= 0 || dot === domain.length - 1) return null;
  return normalized;
}

function findUserInDb(db: Record<string, any>, email: string): { key: string; user: any } | null {
  if (!email || !db || typeof email !== "string") return null;
  const emailKey = normalizeEmail(email) || email.trim().toLowerCase();
  const cleanKey = emailKey.replace(/[^a-z0-9]/g, "_");
  // Só chaves próprias do objeto: impede que "__proto__"/"constructor" retornem o protótipo.
  const own = (k: string) => Object.prototype.hasOwnProperty.call(db, k) && db[k];

  if (own(emailKey)) return { key: emailKey, user: db[emailKey] };
  if (own(cleanKey)) return { key: cleanKey, user: db[cleanKey] };

  const targetKey = Object.keys(db).find((k) => {
    const kLower = k.trim().toLowerCase();
    const kClean = kLower.replace(/[^a-z0-9]/g, "_");
    const userEmail = db[k]?.email?.trim()?.toLowerCase();
    return kLower === emailKey || kClean === cleanKey || userEmail === emailKey;
  });

  if (targetKey && db[targetKey]) {
    return { key: targetKey, user: db[targetKey] };
  }
  return null;
}

async function verifyUserMatch(req: any, res: any, next: any) {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: "Sessão inválida ou não autenticada." });
  }

  const authEmail = normalizeEmail(req.user.email) || req.user.email.toString().trim().toLowerCase();
  const requestedEmail = req.body?.email || req.body?.profile?.email || req.query?.email || req.headers["x-user-email"];

  if (!requestedEmail) {
    return next();
  }

  const bodyEmail = normalizeEmail(requestedEmail.toString()) || requestedEmail.toString().trim().toLowerCase();
  const isMasterCoach = isMasterAdminEmail(authEmail);

  if (isMasterCoach || authEmail === bodyEmail) {
    return next();
  }

  try {
    const db = await getDatabase();
    const userFound = findUserInDb(db, authEmail);
    if (userFound?.user?.profile && isCoachProfile(userFound.user.profile, authEmail)) {
      return next();
    }
  } catch (e) {
    console.error("[VerifyUserMatch] Erro ao consultar privilégios no BD:", e);
  }

  return res.status(403).json({ error: "Acesso negado. Permissão restrita aos próprios dados do atleta ou ao treinador." });
}

/**
 * Regra única de "é coach/admin": e-mail master, role "coach"/"admin" ou flag isCoach.
 * Esses campos são privilegiados (só o servidor grava), então são confiáveis quando lidos do banco.
 */
function isCoachProfile(profile: any, email?: string | null): boolean {
  const e = (email || profile?.email || "").toString().trim().toLowerCase();
  return isMasterAdminEmail(e) ||
    profile?.role === "coach" ||
    profile?.role === "admin" ||
    profile?.isCoach === true;
}

function isTrialActive(profile: any): boolean {
  if (!profile || !profile.createdAt) return false;
  if (profile.subscriptionStatus === "expired") return false;
  const created = new Date(profile.createdAt).getTime();
  if (isNaN(created)) return false;
  const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
  // Mesma borda do cliente (getUserAccessInfo): exatamente em 72 h o trial já expirou.
  return (Date.now() - created) < TRIAL_DURATION_MS;
}

function hasActiveAccess(profile: any, userEmail?: string): boolean {
  if (!profile) return false;
  if (isCoachProfile(profile, profile?.email || userEmail)) return true;
  if (profile.subscriptionStatus === "expired") return false;
  if (profile.subscriptionStatus === "active") return true;
  return isTrialActive(profile);
}

const PROFILE_FIELD_ALLOWLIST = new Set([
  "name",
  "level",
  "goal",
  "daysPerWeek",
  "durationPerSession",
  "eventDate",
  "hasPowerMeter",
  "ftp",
  "hasHeartRate",
  "maxHeartRate",
  "limitations",
  "recentActivity",
  "onboardingStep"
]);

function sanitizeUserProfileInput(incomingProfile: any, existingProfile: any = {}) {
  const sanitized: Record<string, any> = { ...(existingProfile || {}) };
  if (!incomingProfile || typeof incomingProfile !== "object") {
    return sanitized;
  }

  for (const [key, value] of Object.entries(incomingProfile)) {
    if (!PROFILE_FIELD_ALLOWLIST.has(key) || value === undefined) continue;
    sanitized[key] = value;
  }

  if (sanitized.role !== "coach" && sanitized.role !== "admin") {
    sanitized.role = existingProfile?.role || "athlete";
  }
  sanitized.isCoach = Boolean(existingProfile?.isCoach === true || sanitized.role === "coach");
  sanitized.subscriptionStatus = existingProfile?.subscriptionStatus || "pending_payment";
  sanitized.subscriptionPlan = existingProfile?.subscriptionPlan || "Plano Pro";
  sanitized.subscriptionExpiresAt = existingProfile?.subscriptionExpiresAt || "2026-12-31";
  sanitized.createdAt = existingProfile?.createdAt || new Date().toISOString();

  return sanitized;
}

/**
 * Decide o acesso pago a partir do perfil salvo no banco para o usuário autenticado.
 * Nunca use o `profile` enviado no corpo da requisição para isso: o cliente controla esse dado.
 * Um coach autenticado tem acesso total (inclusive ao agir em nome de um atleta).
 */
async function resolveRequesterAccess(req: any): Promise<boolean> {
  const email = normalizeEmail(req.user?.email);
  if (!email) return false;
  if (isMasterAdminEmail(email)) return true;
  const db = await getDatabase(false, getAuthToken(req));
  const profile = findUserInDb(db, email)?.user?.profile;
  if (!profile) return false;
  return hasActiveAccess({ ...profile, email }, email);
}

function sanitizePlanForUser(plan: any, profile: any, userEmail?: string) {
  return sanitizePlanByAccess(plan, hasActiveAccess(profile, userEmail));
}

function sanitizePlanByAccess(plan: any, isSubscriber: boolean) {
  if (!plan) return null;

  if (isSubscriber) {
    return {
      ...plan,
      isLocked: false
    };
  }

  return {
    ...plan,
    isLocked: true,
    workouts: (plan.workouts || []).map((w: any) => ({
      ...w,
      structure: "[Conteúdo Exclusivo - Assine o Biker AI para desbloquear a estrutura minuto a minuto e % de FTP]",
      tip: "[Assine o Biker AI para acessar as instruções fisiológicas e dicas do treinador]",
      isLocked: true
    })),
    observations: plan.observations ? "[Conteúdo Exclusivo - Assine o Biker AI para visualizar as observações técnicas completas do treinador.]" : "",
    evaluation: plan.evaluation ? "[Conteúdo Exclusivo - Assine o Biker AI para visualizar a avaliação fisiológica completa.]" : ""
  };
}

/**
 * Perfil inicial único para contas novas (cadastro, sessão Google e sincronização).
 * Sem métricas inventadas: FTP, FC etc. ficam nulos até o atleta responder o onboarding.
 */
function createDefaultProfile(email: string, name?: string): Record<string, any> {
  const isCoach = isMasterAdminEmail(email);
  const profile: Record<string, any> = {
    name: (name || "").trim() || (isCoach ? "Treinador" : email.split("@")[0]),
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
    // O coach não passa pelo onboarding de atleta.
    onboardingStep: isCoach ? 10 : 1,
    role: isCoach ? "coach" : "athlete",
    isCoach,
    subscriptionStatus: isCoach ? "active" : "pending_payment",
    subscriptionPlan: isCoach ? "Acesso Master (Coach)" : "Plano Pro",
    createdAt: new Date().toISOString()
  };
  if (isCoach) profile.subscriptionExpiresAt = "2030-12-31";
  return profile;
}

async function requireAdmin(req: any, res: any, next: any) {
  const adminPassword = req.headers["x-admin-password"] || req.body?.adminPassword;

  if (adminPassword && verifyAdminSecret(adminPassword)) {
    req.user = req.user || {};
    if (!req.user.email) req.user.email = MASTER_ADMIN_EMAIL || ADMIN_SECRET_IDENTITY;
    return next();
  }

  const authEmail = (req.user?.email || "").toString().trim().toLowerCase();
  if (!authEmail) {
    return res.status(401).json({ error: "Sessão inválida. Realize login para continuar." });
  }

  if (isMasterAdminEmail(authEmail)) {
    return next();
  }

  try {
    const db = await getDatabase();
    const userFound = findUserInDb(db, authEmail);
    if (userFound?.user?.profile && isCoachProfile(userFound.user.profile, authEmail)) {
      return next();
    }
  } catch (e) {
    console.error("Erro ao verificar papel do usuário:", e);
  }

  return res.status(403).json({ error: "Acesso restrito. Operação exclusiva do treinador/coach." });
}

/**
 * Resposta padrão para erro inesperado: a mensagem interna vai só para o log do servidor,
 * nunca para o cliente (pode conter detalhes de infraestrutura).
 */
function sendServerError(res: any, error: unknown) {
  console.error("[API] Erro interno: %s", (error as any)?.message || error);
  return res.status(500).json({ error: "Erro interno no servidor. Tente novamente em instantes." });
}

const app = express();
// O save-user envia o histórico de chat e a planilha inteiros: o padrão de 100 KB gerava 413
// para atletas com muito histórico. 1 MB acompanha o limite de um documento do Firestore.
app.use(express.json({ limit: "1mb" }));

// robots.txt, sitemap.xml e o arquivo de verificação do Google são estáticos em public/
// (a Vercel serve arquivos estáticos antes dos rewrites).

app.use((req, res, next) => {
  if (process.env.VERCEL && !req.url.startsWith("/api")) {
    req.url = "/api" + req.url;
  }
  next();
});

// Log de requisições: só método, rota (sem query string) e status. Nunca IP, headers,
// tokens ou corpo (invariante 5 do AGENTS.md). Vai para o stdout, que a Vercel já coleta.
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) return next();
  const started = Date.now();
  res.on("finish", () => {
    if (process.env.VITEST) return;
    console.log("[HTTP] %s %s %d %dms", req.method, req.path, res.statusCode, Date.now() - started);
  });
  next();
});

// RATE LIMITING
// Na Vercel há um proxy na frente: confiar em 1 salto faz o req.ip ser o IP real do cliente
// (o valor que a borda da Vercel acrescenta), sem aceitar X-Forwarded-For forjado.
if (process.env.VERCEL) app.set("trust proxy", 1);

// Observação: o contador fica em memória, por instância. Em serverless ele limita por instância
// (melhor que nada); para um limite global seria preciso um store compartilhado (ex.: Redis).
function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  const { windowMs, max, message } = options;
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res, _next, opts) => {
      const resetTime: Date | undefined = (req as any).rateLimit?.resetTime;
      const retryAfter = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(windowMs / 1000);
      console.warn("[RateLimit] Limite excedido em %s %s", req.method, req.path);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(opts.statusCode).json({ error: message, retryAfter });
    }
  });
}

const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Muitas requisições enviadas em curto intervalo. Por favor, aguarde alguns instantes."
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Muitas tentativas de login ou registro. Por favor, aguarde 15 minutos para tentar novamente."
});

const aiGenerationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: "Limite de solicitações de Inteligência Artificial atingido. Por favor, aguarde alguns minutos antes de gerar novos treinos."
});

// Chat e onboarding são conversacionais: limite próprio, mais alto que o de geração de planilhas,
// para não esgotar a cota de geração durante uma conversa normal.
const aiChatLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Muitas mensagens enviadas ao treinador em pouco tempo. Por favor, aguarde alguns minutos."
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/generate-plan", aiGenerationLimiter);
app.use("/api/generate-next-week", aiGenerationLimiter);
app.use("/api/evaluate-workout", aiGenerationLimiter);
app.use("/api/chat", aiChatLimiter);
app.use("/api/onboard", aiChatLimiter);
app.use("/api/admin/diagnostics", aiGenerationLimiter);
app.use("/api", generalApiLimiter);

let inMemoryDbCache: Record<string, any> | null = null;
let inMemoryDbCacheTimestamp: number = 0;
let inMemoryDbCacheSource: "firestore" | "local_cache" = "local_cache";
const DB_CACHE_TTL_MS = 30000;

function getAuthToken(req: any): string | undefined {
  const authHeader = req?.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split("Bearer ")[1];
  }
  return undefined;
}

function toFirestoreValue(value: any): any {
  if (value === null) return { nullValue: null };
  if (value === undefined) return null;
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.filter(v => v !== undefined).map(toFirestoreValue) } };
  if (typeof value === "object") {
    const fields: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      if (value[key] !== undefined) {
        fields[key] = toFirestoreValue(value[key]);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreDocument(fields: Record<string, any>) {
  const docFields: Record<string, any> = {};
  for (const key of Object.keys(fields)) {
    if (fields[key] !== undefined) {
      docFields[key] = toFirestoreValue(fields[key]);
    }
  }
  return { fields: docFields };
}

function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== "object") return val;
  if ("nullValue" in val) return null;
  if ("stringValue" in val) return val.stringValue;
  if ("booleanValue" in val) return Boolean(val.booleanValue);
  if ("integerValue" in val) {
    const num = Number(val.integerValue);
    return isNaN(num) ? val.integerValue : num;
  }
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("timestampValue" in val) return val.timestampValue;
  if ("arrayValue" in val) {
    return Array.isArray(val.arrayValue?.values) ? val.arrayValue.values.map(fromFirestoreValue) : [];
  }
  if ("mapValue" in val) {
    const res: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const k of Object.keys(fields)) res[k] = fromFirestoreValue(fields[k]);
    return res;
  }
  return val;
}

function fromFirestoreDocument(doc: any): Record<string, any> {
  if (!doc || !doc.fields) return {};
  const res: Record<string, any> = {};
  for (const k of Object.keys(doc.fields)) res[k] = fromFirestoreValue(doc.fields[k]);
  return res;
}

function firestoreUserDocUrl(projectId: string, dbId: string, docId: string): string {
  // O ID do documento vem do e-mail (entrada do usuário): sempre codificado, para não
  // alterar o caminho da requisição REST (ex.: "../", "?", "#").
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(dbId)}/documents/users/${encodeURIComponent(docId)}`;
}

async function fetchFirestoreUsers(idToken?: string): Promise<Record<string, any>> {
  if (adminFirestoreDb) {
    try {
      const snapshot = await adminFirestoreDb.collection("users").get();
      const users: Record<string, any> = {};
      snapshot.forEach((doc: any) => { users[doc.id] = doc.data(); });
      return users;
    } catch (err: any) {
      if (err.message && (err.message.includes("default credentials") || err.message.includes("UNAUTHENTICATED"))) {
        adminFirestoreDb = null;
      }
    }
  }

  if (idToken && firebaseAppletConfig && firebaseAppletConfig.projectId) {
    try {
      const projectId = firebaseAppletConfig.projectId;
      const dbId = firebaseAppletConfig.firestoreDatabaseId || "(default)";
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/users`;
      const res = await fetch(url, {
        headers: { "Authorization": idToken.startsWith("Bearer ") ? idToken : `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const users: Record<string, any> = {};
        if (data.documents && Array.isArray(data.documents)) {
          for (const d of data.documents) {
            const docId = d.name.split("/").pop();
            users[docId] = fromFirestoreDocument(d);
          }
        }
        return users;
      }
    } catch (restErr: any) {}
  }

  if (!useFirestore || !firestoreDb) throw new Error("Firestore não está habilitado.");
  const colRef = collection(firestoreDb, "users");
  const snapshot = await getDocs(colRef);
  const users: Record<string, any> = {};
  snapshot.docs.forEach((doc) => { users[doc.id] = doc.data(); });
  return users;
}

async function fetchFirestoreUser(email: string, idToken?: string): Promise<{ found: boolean; data?: any; error?: string }> {
  const emailKey = email.trim().toLowerCase();

  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return { found: false };
  }

  if (adminFirestoreDb) {
    try {
      const docSnap = await adminFirestoreDb.collection("users").doc(emailKey).get();
      if (docSnap.exists) return { found: true, data: docSnap.data() };
      return { found: false };
    } catch (err: any) {}
  }

  if (idToken && firebaseAppletConfig && firebaseAppletConfig.projectId) {
    try {
      const projectId = firebaseAppletConfig.projectId;
      const dbId = firebaseAppletConfig.firestoreDatabaseId || "(default)";
      const url = firestoreUserDocUrl(projectId, dbId, emailKey);
      const res = await fetch(url, {
        headers: { "Authorization": idToken.startsWith("Bearer ") ? idToken : `Bearer ${idToken}` }
      });
      if (res.status === 200) {
        const docJson = await res.json();
        return { found: true, data: fromFirestoreDocument(docJson) };
      } else if (res.status === 404 || res.status === 401 || res.status === 403) {
        return { found: false };
      }
    } catch (restErr: any) {
      return { found: false, error: restErr.message };
    }
  }

  if (useFirestore && firestoreDb) {
    try {
      const colRef = collection(firestoreDb, "users");
      const snapshot = await getDocs(colRef);
      for (const d of snapshot.docs) {
        if (d.id.toLowerCase() === emailKey) return { found: true, data: d.data() };
      }
      return { found: false };
    } catch (e: any) {
      return { found: false, error: e.message };
    }
  }

  return { found: false };
}

async function saveFirestoreUser(email: string, userData: any, idToken?: string): Promise<void> {
  const emailKey = email.trim().toLowerCase();
  let lastError: Error | null = null;

  if (adminFirestoreDb) {
    try {
      await adminFirestoreDb.collection("users").doc(emailKey).set(userData);
      return;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error("[Firestore] Falha ao salvar com Admin SDK:", lastError.message);
    }
  }

  if (idToken && firebaseAppletConfig && firebaseAppletConfig.projectId) {
    try {
      const projectId = firebaseAppletConfig.projectId;
      const dbId = firebaseAppletConfig.firestoreDatabaseId || "(default)";
      const url = firestoreUserDocUrl(projectId, dbId, emailKey);
      const payload = toFirestoreDocument(userData);
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Authorization": idToken.startsWith("Bearer ") ? idToken : `Bearer ${idToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) return;
      lastError = new Error(`Firestore REST retornou ${res.status}: ${await res.text()}`);
    } catch (restErr: any) {
      lastError = restErr instanceof Error ? restErr : new Error(String(restErr));
    }
  }

  if (useFirestore && firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "users", emailKey);
      await setDoc(docRef, userData);
      return;
    } catch (err: any) {
      lastError = lastError || (err instanceof Error ? err : new Error(String(err)));
    }
  }

  if (lastError) {
    console.warn("[Firestore] Aviso de sincronização para %s: %s", emailKey, lastError.message);
  }
}

async function deleteFirestoreUser(email: string, idToken?: string): Promise<void> {
  const emailKey = email.trim().toLowerCase();
  const cleanKey = emailKey.replace(/[^a-z0-9]/g, "_");
  const keysToDelete = Array.from(new Set([emailKey, cleanKey]));

  if (adminFirestoreDb) {
    try {
      for (const k of keysToDelete) {
        await adminFirestoreDb.collection("users").doc(k).delete().catch(() => {});
      }
      const snapshot = await adminFirestoreDb.collection("users").get().catch(() => null);
      if (snapshot) {
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          const docEmail = data?.email?.trim()?.toLowerCase();
          if (docEmail === emailKey || keysToDelete.includes(doc.id)) {
            doc.ref.delete().catch(() => {});
          }
        });
      }
      return;
    } catch (err: any) {}
  }

  if (firebaseAppletConfig && firebaseAppletConfig.projectId) {
    try {
      const projectId = firebaseAppletConfig.projectId;
      const dbId = firebaseAppletConfig.firestoreDatabaseId || "(default)";
      for (const k of keysToDelete) {
        const url = firestoreUserDocUrl(projectId, dbId, k);
        await fetch(url, {
          method: "DELETE",
          headers: idToken ? { "Authorization": idToken.startsWith("Bearer ") ? idToken : `Bearer ${idToken}` } : {}
        }).catch(() => {});
      }
    } catch (restErr: any) {}
  }

  if (useFirestore && firestoreDb) {
    try {
      for (const k of keysToDelete) {
        const docRef = doc(firestoreDb, "users", k);
        await deleteDoc(docRef).catch(() => {});
      }
    } catch (e: any) {}
  }
}

async function getDatabaseWithSource(forceRefresh = false, idToken?: string): Promise<{ db: Record<string, any>; source: "firestore" | "local_cache" }> {
  const isCacheValid = inMemoryDbCache && (Date.now() - inMemoryDbCacheTimestamp < DB_CACHE_TTL_MS);
  if (!forceRefresh && isCacheValid && inMemoryDbCache) {
    return { db: inMemoryDbCache, source: inMemoryDbCacheSource };
  }

  const localDb: Record<string, any> = {};
  let resolvedSource: "firestore" | "local_cache" = "local_cache";

  if (useFirestore) {
    try {
      const users = await fetchFirestoreUsers(idToken);
      if (Object.keys(users).length > 0) {
        Object.assign(localDb, users);
        resolvedSource = "firestore";
      }
    } catch (err: any) {}
  }

  if (Object.keys(localDb).length === 0) {
    try {
      if (fs.existsSync(USERS_DB_PATH)) {
        const data = fs.readFileSync(USERS_DB_PATH, "utf-8");
        Object.assign(localDb, JSON.parse(data));
        resolvedSource = "local_cache";
      }
    } catch (localErr: any) {}
  }

  if (MASTER_ADMIN_EMAIL && !findUserInDb(localDb, MASTER_ADMIN_EMAIL)) {
    localDb[MASTER_ADMIN_EMAIL] = {
      email: MASTER_ADMIN_EMAIL,
      profile: { ...createDefaultProfile(MASTER_ADMIN_EMAIL), createdAt: "2026-01-01T00:00:00.000Z" },
      chatHistory: [],
      plan: null,
      feedbacks: [],
      workoutLogs: [],
      createdAt: "2026-01-01T00:00:00.000Z"
    };
  }

  inMemoryDbCache = localDb;
  inMemoryDbCacheTimestamp = Date.now();
  inMemoryDbCacheSource = resolvedSource;
  return { db: localDb, source: resolvedSource };
}

async function getDatabase(forceRefresh = false, idToken?: string): Promise<Record<string, any>> {
  const result = await getDatabaseWithSource(forceRefresh, idToken);
  return result.db;
}

/**
 * Banco para ler, alterar e gravar UM usuário. O cache em memória vale por até DB_CACHE_TTL_MS
 * e não é compartilhado entre instâncias serverless: alterar o registro a partir dele e gravar
 * desfaria o que outra instância gravou nesse intervalo (lost update). Por isso o registro do
 * usuário é relido do Firestore antes da alteração; o restante do banco segue do cache.
 */
async function getDatabaseForUpdate(email: unknown, idToken?: string): Promise<Record<string, any>> {
  const db = await getDatabase(false, idToken);
  const emailKey = normalizeEmail(email);
  if (!emailKey || !useFirestore) return db;

  const fresh = await fetchFirestoreUser(emailKey, idToken);
  if (fresh.found && fresh.data) {
    const existing = findUserInDb(db, emailKey);
    db[existing?.key || emailKey] = fresh.data;
  }
  return db;
}

const BACKUPS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "db_backups")
  : path.join(process.cwd(), "db_backups");

let lastAutomaticBackupTime = 0;

async function triggerAutomaticBackup(db: Record<string, any>) {
  const now = Date.now();
  if (now - lastAutomaticBackupTime < 10 * 60 * 1000) return;
  lastAutomaticBackupTime = now;

  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `users_db_backup_${timestamp}.json`;
    const backupPath = path.join(BACKUPS_DIR, filename);

    await fs.promises.writeFile(backupPath, JSON.stringify(db, null, 2), "utf-8");

    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith("users_db_backup_") && f.endsWith(".json"))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 10) {
      for (const file of files.slice(10)) {
        fs.unlinkSync(path.join(BACKUPS_DIR, file.name));
      }
    }
  } catch (err) {}
}

async function createDatabaseBackup(db: Record<string, any>, filename?: string): Promise<string> {
  await fs.promises.mkdir(BACKUPS_DIR, { recursive: true });
  const backupName = filename || `users_db_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  if (!/^users_db_backup_[A-Za-z0-9_.-]+\.json$/.test(backupName)) {
    throw new Error("Nome de backup inválido.");
  }
  await fs.promises.writeFile(path.join(BACKUPS_DIR, backupName), JSON.stringify(db, null, 2), "utf-8");
  return backupName;
}

/**
 * Grava o banco no cache, no disco e no Firestore. Com `targetEmail`, só aquele usuário vai para
 * o Firestore; sem ele, TODOS os usuários do `db` são regravados (use apenas para restauração de
 * backup). `localOnly` atualiza cache e disco sem tocar no Firestore — para quando a nuvem já foi
 * alterada por outra chamada (ex.: deleteFirestoreUser).
 */
async function saveDatabase(db: Record<string, any>, targetEmail?: string, idToken?: string, options: { localOnly?: boolean } = {}) {
  inMemoryDbCache = db;
  inMemoryDbCacheTimestamp = Date.now();

  let firestoreSuccess = false;
  let firestoreError: any = null;

  if (useFirestore && !options.localOnly) {
    try {
      if (targetEmail) {
        const emailKey = targetEmail.trim().toLowerCase();
        const target = findUserInDb(db, emailKey);
        if (!target) throw new Error("Usuário não encontrado para persistência.");
        await saveFirestoreUser(emailKey, target.user, idToken);
        firestoreSuccess = true;
      } else {
        const results = await Promise.allSettled(
          Object.keys(db).map((email) => saveFirestoreUser(email, db[email], idToken))
        );
        const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
        if (failed) {
          firestoreError = failed.reason;
        } else {
          firestoreSuccess = true;
        }
      }
    } catch (err: any) {
      firestoreError = err;
    }
  }

  let diskSuccess = false;
  let diskError: any = null;
  try {
    await fs.promises.writeFile(USERS_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    diskSuccess = true;
    triggerAutomaticBackup(db).catch(() => {});
  } catch (err: any) {
    diskError = err;
  }

  // Se ambos falharem no ambiente (ex: disco somente leitura ou Firestore offline), manter em cache de memória
  if (!diskSuccess && !firestoreSuccess) {
    console.warn(`[SaveDatabase] Aviso de persistência física (disco: ${diskError?.message}, firestore: ${firestoreError?.message}). Usuário mantido em memória.`);
  }
}

async function runInitialMigration() {
  if (!useFirestore) return;
  try {
    const currentUsers = await fetchFirestoreUsers();
    if (Object.keys(currentUsers).length > 0) return;

    if (fs.existsSync(USERS_DB_PATH)) {
      const localDb = JSON.parse(fs.readFileSync(USERS_DB_PATH, "utf-8"));
      const userEmails = Object.keys(localDb);
      if (userEmails.length > 0) {
        await Promise.all(userEmails.map(email => saveFirestoreUser(email, localDb[email]).catch(() => {})));
      }
    }
  } catch (err: any) {}
}

const isDirectRun = Boolean(
  process.argv[1] && (
    process.argv[1].endsWith("server.ts") ||
    process.argv[1].endsWith("server.cjs") ||
    process.argv[1].endsWith("server.js")
  )
);

if (isDirectRun && process.env.NODE_ENV !== "test" && !process.env.VITEST && !process.env.VERCEL) {
  runInitialMigration().then(() => ensureAllAthletesArePending()).catch(() => {});
}

async function ensureAllAthletesArePending() {
  try {
    const db = await getDatabase();
    let updatedCount = 0;
    
    for (const email of Object.keys(db)) {
      const user = db[email];
      if (user && user.profile) {
        const isCoach = isCoachProfile(user.profile, email);
        let changed = false;
        if (!isCoach) {
          if (!user.profile.subscriptionStatus) { user.profile.subscriptionStatus = "pending_payment"; changed = true; }
          if (user.profile.subscriptionPlan !== "Plano Pro") { user.profile.subscriptionPlan = "Plano Pro"; changed = true; }
        } else {
          if (user.profile.role !== "coach") { user.profile.role = "coach"; changed = true; }
          if (user.profile.subscriptionPlan !== "Acesso Master (Coach)") { user.profile.subscriptionPlan = "Acesso Master (Coach)"; changed = true; }
          if (user.profile.subscriptionStatus !== "active") { user.profile.subscriptionStatus = "active"; changed = true; }
        }
        if (changed) updatedCount++;
      }
    }
    
    if (updatedCount > 0) {
      await saveDatabase(db);
    }
  } catch (err: any) {}
}

// -------------------------------------------------------------
// USER SIGNUP, SIGNIN & CLOUD SYNCHRONIZATION ENDPOINTS
// -------------------------------------------------------------

// O cliente cria a conta no Firebase Auth antes de chamar esta rota, então exigimos o ID token:
// só o dono do e-mail pode cadastrar (ou completar) a conta correspondente.
app.post("/api/auth/register", requireAuth, async (req: any, res) => {
  try {
    const { email, password, name } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string" || !email || !password || !name.trim()) {
      return res.status(400).json({ error: "Dados inválidos de cadastro." });
    }

    const emailKey = normalizeEmail(email);
    if (!emailKey) return res.status(400).json({ error: "E-mail inválido." });
    if (normalizeEmail(req.user?.email) !== emailKey) {
      return res.status(403).json({ error: "O e-mail do cadastro não corresponde à sessão autenticada." });
    }

    const db = await getDatabaseForUpdate(emailKey, getAuthToken(req));

    if (Object.prototype.hasOwnProperty.call(db, emailKey)) {
      const existing = db[emailKey];
      // Conta criada por /api/auth/session (onAuthStateChanged chega antes do cadastro) ainda sem senha:
      // o próprio dono, autenticado, pode completá-la. Contas que já têm senha nunca são sobrescritas.
      if (!existing.password) {
        existing.password = hashPassword(password);
        if (existing.profile) existing.profile.name = name.trim();
        await saveDatabase(db, emailKey, getAuthToken(req));
        const responseUser = { ...existing };
        delete (responseUser as any).password;
        return res.json({ success: true, user: responseUser });
      }

      return res.status(400).json({ error: "Este endereço de e-mail já está cadastrado. Faça login para acessar." });
    }

    const customWelcomeText = `Olá, ${name.trim()}! Que excelente ver você aqui na Biker AI. Eu sou o seu Treinador de Ciclismo pessoal.\n\nMinhas planilhas e conselhos são focados em melhorar o seu fôlego e resistência de forma simples e segura, ajustando seus treinos por potência, batimentos do coração ou pelas suas percepções de cansaço.\n\nPara começarmos a planejar sua evolução de forma personalizada, preciso te conhecer melhor através de algumas perguntas rápidas no nosso chat.\n\nComo você já se cadastrou, podemos iniciar o questionário agora mesmo. **Qual é o seu tempo médio pedalando ou seu nível atual no ciclismo?**`;

    const newProfile = createDefaultProfile(emailKey, name);
    const nowIso = newProfile.createdAt;

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
      password: hashPassword(password),
      profile: newProfile,
      createdAt: nowIso,
      chatHistory: initialChat,
      plan: null
    };

    db[emailKey] = newUserEntry;
    await saveDatabase(db, emailKey, getAuthToken(req));

    const responseUser = { ...newUserEntry };
    delete (responseUser as any).password;

    res.json({ success: true, user: responseUser });
  } catch (error: any) {
    console.error("[Auth/Register] Falha no cadastro central:", error);
    res.status(500).json({ error: "Não foi possível salvar seu cadastro central." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const db = await getDatabaseForUpdate(email, getAuthToken(req));
    const userFound = findUserInDb(db, email);

    if (!userFound) {
      return res.status(400).json({ error: "Nenhum cadastro encontrado com este e-mail. Crie uma conta ao lado!" });
    }
    const user = userFound.user;
    const userKey = userFound.key;

    if (!verifyPassword(password, user.password)) {
      return res.status(400).json({ error: "Senha incorreta. Verifique os dados e tente novamente." });
    }

    if (!user.password.includes(":")) {
      user.password = hashPassword(password);
      await saveDatabase(db, userKey, getAuthToken(req));
    }

    if (user.profile) {
      if (!user.profile.role) user.profile.role = isMasterAdminEmail(email) ? "coach" : "athlete";
      if (!user.profile.subscriptionStatus) user.profile.subscriptionStatus = (user.profile.role === "coach") ? "active" : "pending_payment";
      if (!user.profile.subscriptionPlan) user.profile.subscriptionPlan = "Plano Pro";
      if (!user.profile.subscriptionExpiresAt) user.profile.subscriptionExpiresAt = "2026-12-31";
      if (!user.profile.createdAt) user.profile.createdAt = (user as any).createdAt;
    }

    const responseUser = { ...user };
    delete (responseUser as any).password;
    if (responseUser.plan) {
      responseUser.plan = sanitizePlanForUser(responseUser.plan, responseUser.profile, responseUser.email);
    }

    res.json({ success: true, user: responseUser });
  } catch (error: any) {
    sendServerError(res, error);
  }
});

app.post("/api/auth/save-user", requireAuth, verifyUserMatch, async (req: any, res: any) => {
  try {
    const { email, userAccount, password } = req.body;
    if (!email || !userAccount || typeof userAccount !== "object") {
      return res.status(400).json({ error: "Dados para sincronização inválidos." });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ error: "E-mail inválido." });
    }

    const db = await getDatabaseForUpdate(normalizedEmail, getAuthToken(req));
    const userFound = findUserInDb(db, normalizedEmail);

    let targetKey: string;
    let existingUser: any;

    if (!userFound) {
      targetKey = normalizedEmail;
      existingUser = {
        email: targetKey,
        profile: createDefaultProfile(targetKey),
        chatHistory: [],
        plan: null,
        feedbacks: [],
        workoutLogs: []
      };
    } else {
      targetKey = userFound.key;
      existingUser = userFound.user;
    }

    const requesterEmail = normalizeEmail(req.user?.email || "") || (req.user?.email || "").toString().trim().toLowerCase();
    const adminHeader = req.headers["x-admin-password"];
    const adminSecretStr = typeof adminHeader === "string" ? adminHeader : undefined;
    const isAdminCaller = Boolean(
      (adminSecretStr && verifyAdminSecret(adminSecretStr)) ||
      isMasterAdminEmail(requesterEmail)
    );

    const existingCreatedAt = existingUser?.profile?.createdAt || existingUser?.createdAt || new Date().toISOString();

    const sanitizedProfile = sanitizeUserProfileInput(userAccount.profile || {}, existingUser?.profile || {});

    if (!isAdminCaller) {
      sanitizedProfile.role = existingUser.profile?.role || "athlete";
      sanitizedProfile.isCoach = existingUser.profile?.isCoach === true;
      sanitizedProfile.subscriptionStatus = existingUser.profile?.subscriptionStatus || "pending_payment";
      sanitizedProfile.subscriptionPlan = existingUser.profile?.subscriptionPlan || "Plano Pro";
      if (existingUser.profile?.subscriptionExpiresAt) {
        sanitizedProfile.subscriptionExpiresAt = existingUser.profile.subscriptionExpiresAt;
      }
    }

    sanitizedProfile.createdAt = existingCreatedAt;

    let preservedPassword = existingUser?.password;
    if (password && password !== existingUser?.password) {
      preservedPassword = password.includes(":") ? password : hashPassword(password);
    } else if (!preservedPassword) {
      preservedPassword = hashPassword(crypto.randomBytes(16).toString("hex"));
    }

    db[targetKey] = {
      ...existingUser,
      email: existingUser.email,
      profile: sanitizedProfile,
      plan: userAccount.plan !== undefined ? userAccount.plan : existingUser.plan,
      feedbacks: userAccount.feedbacks !== undefined ? userAccount.feedbacks : (existingUser.feedbacks || []),
      workoutLogs: userAccount.workoutLogs !== undefined ? userAccount.workoutLogs : (existingUser.workoutLogs || []),
      chatHistory: userAccount.chatHistory !== undefined ? userAccount.chatHistory : (existingUser.chatHistory || []),
      password: preservedPassword,
      createdAt: existingCreatedAt
    };

    const responseUser = { ...db[targetKey] };
    delete (responseUser as any).password;

    await saveDatabase(db, targetKey, getAuthToken(req));
    res.json({ success: true, user: responseUser });
  } catch (error: any) {
    sendServerError(res, error);
  }
});

app.post("/api/auth/session", requireAuth, verifyUserMatch, async (req: any, res: any) => {
  try {
    const emailLower = normalizeEmail(req.body?.email);
    if (!emailLower) return res.status(400).json({ error: "E-mail é obrigatório." });
    const authToken = getAuthToken(req);

    const db = await getDatabaseForUpdate(emailLower, authToken);
    let userFound = findUserInDb(db, emailLower);

    if (!userFound && useFirestore) {
      const singleFetch = await fetchFirestoreUser(emailLower, authToken);
      if (singleFetch.found && singleFetch.data) {
        db[emailLower] = singleFetch.data;
        inMemoryDbCache = db;
        inMemoryDbCacheTimestamp = Date.now();
        userFound = { user: singleFetch.data, key: emailLower };
      } else if (singleFetch.error) {
        return res.status(503).json({ error: "Falha temporária ao consultar dados do atleta na nuvem. Tente novamente." });
      }
    }

    if (!userFound) {
      // Conta nova (ex.: primeiro login com Google): perfil vazio, o atleta passa pelo onboarding.
      const newProfile = { ...createDefaultProfile(emailLower, req.user?.name), email: emailLower };

      const newUserEntry = {
        email: emailLower,
        profile: newProfile,
        chatHistory: [],
        plan: null,
        feedbacks: [],
        workoutLogs: [],
        createdAt: new Date().toISOString()
      };

      db[emailLower] = newUserEntry;
      await saveDatabase(db, emailLower, getAuthToken(req));

      const responseUser = { ...newUserEntry };
      delete (responseUser as any).password;
      return res.json({ success: true, user: responseUser });
    }

    const responseUser = { ...userFound.user };
    delete (responseUser as any).password;
    if (responseUser.plan) {
      responseUser.plan = sanitizePlanForUser(responseUser.plan, responseUser.profile, responseUser.email);
    }

    res.json({ success: true, user: responseUser });
  } catch (error: any) {
    sendServerError(res, error);
  }
});

app.post("/api/workout/log-completion", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const { email, log, workoutIndex, workout } = req.body;
    if (!email || !log) {
      return res.status(400).json({ error: "E-mail e dados do treino são obrigatórios." });
    }

    const db = await getDatabaseForUpdate(email, getAuthToken(req));
    const userFound = findUserInDb(db, email);
    if (!userFound) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const targetKey = userFound.key;
    const user = userFound.user;

    if (!Array.isArray(user.workoutLogs)) {
      user.workoutLogs = [];
    }

    const existingLogIdx = user.workoutLogs.findIndex((l: any) => l.id === log.id);
    if (existingLogIdx >= 0) {
      user.workoutLogs[existingLogIdx] = log;
    } else {
      user.workoutLogs.push(log);
    }

    if (user.plan && Array.isArray(user.plan.workouts) && typeof workoutIndex === "number" && user.plan.workouts[workoutIndex]) {
      user.plan.workouts[workoutIndex] = {
        ...user.plan.workouts[workoutIndex],
        ...workout,
        completed: log.completed !== "nao",
        completedDate: log.completedAt ? log.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        actualDistance: log.actualDistanceKm,
        actualDuration: log.actualDurationMin,
        completionStatus: log.completed,
        difficulty: log.difficulty,
        athleteNotes: log.notes || user.plan.workouts[workoutIndex].athleteNotes
      };
    }

    await saveDatabase(db, targetKey, getAuthToken(req));

    res.json({
      success: true,
      workoutLogs: user.workoutLogs,
      plan: user.plan
    });
  } catch (error: any) {
    sendServerError(res, error);
  }
});

app.post("/api/auth/check-status", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail é obrigatório." });
    const db = await getDatabase();
    const userFound = findUserInDb(db, email);
    if (!userFound) return res.status(404).json({ error: "Usuário não encontrado." });
    const user = userFound.user;
    const emailKey = email.trim().toLowerCase();

    const isCoach = isCoachProfile(user.profile, emailKey);
    const status = user.profile?.subscriptionStatus || (isCoach ? "active" : "pending_payment");

    res.json({
      success: true,
      subscriptionStatus: status,
      isTrial: isTrialActive(user.profile),
      hasAccess: hasActiveAccess(user.profile, emailKey),
      profile: user.profile
    });
  } catch (error: any) {
    sendServerError(res, error);
  }
});

app.post("/api/user/notify-payment", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: "E-mail é obrigatório." });
    // Texto livre exibido no painel admin: limitar tamanho para evitar abuso.
    const method = typeof req.body.method === "string" ? req.body.method.trim().slice(0, 40) : "";
    const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 500) : "";
    const db = await getDatabaseForUpdate(email, getAuthToken(req));
    const userFound = findUserInDb(db, email);
    if (!userFound) return res.status(404).json({ error: "Usuário não encontrado." });
    const user = userFound.user;

    const paymentFeedback = {
      id: `pay_notify_${Date.now()}`,
      userName: user.profile?.name || "Atleta",
      userEmail: user.email,
      text: `[AVISO DE PAGAMENTO - R$ ${SUBSCRIPTION_PRICE_BRL.toFixed(2).replace(".", ",")} Via Mercado Pago] Atleta informou que concluiu o pagamento via ${method || "Mercado Pago"}. ${note ? `Obs: ${note}` : "Aguardando ativação no painel privado."}`,
      timestamp: new Date().toISOString()
    };

    // Substitui o registro em vez de mutar o objeto encontrado (evita escrita em protótipo).
    db[userFound.key] = {
      ...user,
      feedbacks: [paymentFeedback, ...(Array.isArray(user.feedbacks) ? user.feedbacks : [])]
    };
    await saveDatabase(db, userFound.key, getAuthToken(req));

    res.json({ success: true, message: "Aviso de pagamento registrado para análise do treinador." });
  } catch (error: any) {
    sendServerError(res, error);
  }
});

let currentApiKey = "";
let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  let key = process.env.GEMINI_API_KEY || "";
  if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
  else if (key.startsWith("'") && key.endsWith("'")) key = key.slice(1, -1);
  key = key.trim();

  if (!key) throw new Error("GEMINI_API_KEY is not configured in the environment variables.");

  if (!aiClient || currentApiKey !== key) {
    currentApiKey = key;
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
};

// Restrito ao admin: faz uma chamada paga ao Gemini e lê a coleção de usuários a cada acesso.
app.get("/api/admin/diagnostics", requireAuth, requireAdmin, async (req, res) => {
  const responses: any = {
    apiKeyConfigured: !!process.env.GEMINI_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    modelName: "gemini-2.5-flash",
    useFirestore,
    firestoreInitialized: useFirestore,
    firestoreDatabaseId: firebaseAppletConfig?.firestoreDatabaseId || null
  };

  if (useFirestore) {
    try {
      const users = await fetchFirestoreUsers();
      responses.firestoreConnection = "SUCCESS";
      responses.firestoreEmpty = Object.keys(users).length === 0;
    } catch (err: any) {
      responses.firestoreConnection = "FAILED";
      responses.firestoreErrorMessage = err.message;
    }
  } else {
    responses.firestoreConnection = "DISABLED_OR_UNINITIALIZED";
  }

  try {
    const testCall = await callGeminiWithFallback((model) =>
      getAiClient().models.generateContent({
        model,
        contents: "Hi, please answer with exactly 'OK'."
      })
    );
    responses.geminiConnection = "SUCCESS";
    responses.geminiResponse = testCall.text;
  } catch (err: any) {
    responses.geminiConnection = "FAILED";
    responses.errorMessage = err.message;
  }
  res.json(responses);
});

const checkApiKey = () => { getAiClient(); };

// Orçamento de tempo das chamadas ao Gemini. O total cabe no maxDuration (60 s) da função
// na Vercel; o limite por modelo garante que, se o primeiro travar, ainda sobra tempo para o próximo.
const GEMINI_PER_MODEL_TIMEOUT_MS = 25_000;
const GEMINI_TOTAL_BUDGET_MS = 55_000;

const callGeminiWithFallback = async (
  requestFn: (modelName: string) => Promise<any>,
  modelsToTry: string[] = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-pro"],
  { perModelMs = GEMINI_PER_MODEL_TIMEOUT_MS, totalMs = GEMINI_TOTAL_BUDGET_MS } = {}
): Promise<any> => {
  const deadline = Date.now() + totalMs;
  let lastError: any = new Error("Nenhum modelo de IA disponível.");

  for (const model of modelsToTry) {
    const remaining = deadline - Date.now();
    if (remaining <= 1000) break; // sem tempo útil para outra tentativa

    const timeoutMs = Math.min(perModelMs, remaining);
    let timer: NodeJS.Timeout | undefined;
    const modelPromise = requestFn(model);
    // Evita "unhandled rejection" se a chamada falhar depois de perder a corrida para o timeout.
    modelPromise.catch(() => {});
    try {
      return await Promise.race([
        modelPromise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Timeout de ${Math.round(timeoutMs / 1000)}s no modelo ${model}`)), timeoutMs);
        })
      ]);
    } catch (err: any) {
      lastError = err;
      console.warn("[Gemini] Falha no modelo %s: %s", model, err?.message || err);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
};

const cleanAndParseJson = (text: string): any => {
  let cleanText = text.trim();
  
  const tryParse = (str: string) => {
    try { return JSON.parse(str); } catch { return null; }
  };

  let parsed = tryParse(cleanText);
  if (parsed) return parsed;

  if (cleanText.startsWith("```")) {
    const firstNewline = cleanText.indexOf("\n");
    cleanText = firstNewline !== -1 ? cleanText.substring(firstNewline + 1) : cleanText.substring(3);
    if (cleanText.endsWith("```")) cleanText = cleanText.substring(0, cleanText.length - 3);
    cleanText = cleanText.trim();
  }
  
  parsed = tryParse(cleanText);
  if (parsed) return parsed;

  const firstBrace = cleanText.indexOf("{");
  const lastBrace = cleanText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    parsed = tryParse(cleanText.substring(firstBrace, lastBrace + 1));
    if (parsed) return parsed;
  }

  throw new Error("Formato incorreto retornado da IA. Tente novamente.");
};

const fallbackOnboarding = (message: string, profile: any): any => {
  const safeMsg = typeof message === "string" ? message : "";
  let currentStep = profile?.onboardingStep ? Number(profile.onboardingStep) : 1;
  if (currentStep === 1 && profile?.name) currentStep = 2;

  const nextStep = Math.min(10, currentStep + 1);
  return {
    reply: `Entendido! Seguindo a sua preparação: me diga sobre a sua disponibilidade atual para os treinos.`,
    parsedProfile: { onboardingStep: nextStep }
  };
};

// --- Planilha determinística (usada quando a IA falha ou responde fora do formato) ---

const TRAINING_DAYS_BY_COUNT: Record<number, string[]> = {
  1: ["Sábado"],
  2: ["Quarta", "Sábado"],
  3: ["Terça", "Quinta", "Sábado"],
  4: ["Terça", "Quinta", "Sábado", "Domingo"],
  5: ["Segunda", "Terça", "Quinta", "Sábado", "Domingo"],
  6: ["Segunda", "Terça", "Quarta", "Sexta", "Sábado", "Domingo"],
  7: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
};

// Faixas por zona: % do FTP (modelo de Coggan), % da FC máxima e PSE (1-10).
const ZONE_RANGES: Record<string, { ftp: [number, number]; hr: [number, number]; rpe: string }> = {
  Z1: { ftp: [40, 55], hr: [50, 60], rpe: "1–2" },
  Z2: { ftp: [56, 75], hr: [60, 70], rpe: "3–4" },
  Z3: { ftp: [76, 90], hr: [70, 80], rpe: "5–6" },
  SS: { ftp: [88, 94], hr: [78, 85], rpe: "6–7" }
};

function zoneLabel(zone: keyof typeof ZONE_RANGES, profile: any): string {
  const range = ZONE_RANGES[zone];
  const name = zone === "SS" ? "Sweet Spot" : zone;
  const ftp = Number(profile?.ftp);
  const maxHr = Number(profile?.maxHeartRate);
  if (profile?.hasPowerMeter !== false && Number.isFinite(ftp) && ftp > 0) {
    const [lo, hi] = range.ftp;
    return `${name} (${lo}–${hi}% FTP · ${Math.round(ftp * lo / 100)}–${Math.round(ftp * hi / 100)} W)`;
  }
  if (profile?.hasHeartRate !== false && Number.isFinite(maxHr) && maxHr > 0) {
    const [lo, hi] = range.hr;
    return `${name} (${lo}–${hi}% FCmáx · ${Math.round(maxHr * lo / 100)}–${Math.round(maxHr * hi / 100)} bpm)`;
  }
  return `${name} (PSE ${range.rpe})`;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

const fallbackGeneratePlan = (profile: any, nextWeekNum: number = 1): any => {
  const days = TRAINING_DAYS_BY_COUNT[clampInt(profile?.daysPerWeek, 1, 7, 3)];
  const baseDuration = clampInt(profile?.durationPerSession, 30, 240, 60);
  const isBeginner = profile?.level === "iniciante";

  const qualitySession = () => {
    const duration = baseDuration;
    if (isBeginner) {
      const block = Math.max(10, duration - 25);
      return {
        type: "Tempo Progressivo", rpe: 5, duration, targetZone: zoneLabel("Z3", profile),
        goal: "Desenvolver resistência em ritmo moderado.",
        structure: `Aquecimento 15 min em ${zoneLabel("Z1", profile)} → ${block} min subindo gradualmente de Z2 para ${zoneLabel("Z3", profile)} → Desaquecimento 10 min em Z1.`,
        tip: "Mantenha uma respiração controlada: você deve conseguir falar frases curtas."
      };
    }
    const reps = clampInt(Math.floor((duration - 25) / 15), 2, 5, 3);
    return {
      type: "Intervalado Sweet Spot", rpe: 7, duration, targetZone: zoneLabel("SS", profile),
      goal: "Elevar o limiar com estímulo eficiente e recuperável.",
      structure: `Aquecimento 15 min em ${zoneLabel("Z1", profile)} → ${reps} × 10 min em ${zoneLabel("SS", profile)} com 5 min de recuperação em Z1 → Desaquecimento 10 min.`,
      tip: "Esforço firme e constante; se não conseguir manter a faixa, reduza a carga e complete os blocos."
    };
  };

  const longSession = () => {
    const duration = Math.min(300, Math.round(baseDuration * 1.5));
    return {
      type: "Fundo (Resistência Aeróbica)", rpe: 4, duration, targetZone: zoneLabel("Z2", profile),
      goal: "Construir base aeróbica e resistência para pedais longos.",
      structure: `${duration} min contínuos em ${zoneLabel("Z2", profile)}, com cadência confortável (85–95 rpm).`,
      tip: "Coma e beba a cada 20–30 min a partir da primeira hora."
    };
  };

  const enduranceSession = () => ({
    type: "Resistência Z2", rpe: 3, duration: baseDuration, targetZone: zoneLabel("Z2", profile),
    goal: "Acumular volume aeróbico sem gerar fadiga excessiva.",
    structure: `${baseDuration} min em ${zoneLabel("Z2", profile)}, terreno plano ou rolo.`,
    tip: "Ritmo de conversa: se ofegar, diminua."
  });

  const recoverySession = () => {
    const duration = Math.max(30, Math.round(baseDuration * 0.6));
    return {
      type: "Regenerativo", rpe: 2, duration, targetZone: zoneLabel("Z1", profile),
      goal: "Acelerar a recuperação ativa.",
      structure: `${duration} min leves em ${zoneLabel("Z1", profile)}, cadência solta.`,
      tip: "Deve terminar se sentindo melhor do que começou."
    };
  };

  const workouts = days.map((day, i) => {
    let session;
    if (i === days.length - 1) session = longSession();
    else if (i === 0 && days.length >= 2) session = qualitySession();
    else session = i % 2 === 1 ? enduranceSession() : recoverySession();
    return { day, ...session, title: session.type };
  });

  return {
    workouts,
    summary: `Semana ${nextWeekNum}: ${days.length} treino(s) combinando base aeróbica${days.length >= 2 ? ", um estímulo de qualidade" : ""} e um pedal longo.`,
    observations: "Planilha-base gerada automaticamente a partir do seu perfil. Respeite o descanso entre os treinos e hidrate-se bem.",
    evaluation: "Use a percepção de esforço (PSE) para validar as zonas: se o esforço parecer muito acima do previsto, reduza a intensidade.",
    weekNumber: nextWeekNum,
    coachMessage: "Consistência vale mais que intensidade. Bons pedais!"
  };
};

// Schema de resposta pedido ao Gemini para planilhas (garante o formato que o frontend espera).
const PLAN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    observations: { type: Type.STRING },
    evaluation: { type: Type.STRING },
    coachMessage: { type: Type.STRING },
    workouts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING, description: "Dia da semana em português: Segunda, Terça, Quarta, Quinta, Sexta, Sábado ou Domingo" },
          type: { type: Type.STRING },
          title: { type: Type.STRING },
          duration: { type: Type.INTEGER, description: "Duração em minutos" },
          goal: { type: Type.STRING },
          structure: { type: Type.STRING, description: "Estrutura minuto a minuto com zonas" },
          targetZone: { type: Type.STRING },
          rpe: { type: Type.INTEGER, description: "Percepção subjetiva de esforço, 1 a 10" },
          tip: { type: Type.STRING }
        },
        required: ["day", "type", "duration", "goal", "structure", "targetZone", "rpe", "tip"]
      }
    }
  },
  required: ["summary", "observations", "evaluation", "workouts"]
};

function buildPlanPrompt(profile: any, weekNumber: number): string {
  return [
    `Você é um treinador de ciclismo. Gere a planilha da Semana ${weekNumber} em português do Brasil.`,
    `Use exatamente ${clampInt(profile?.daysPerWeek, 1, 7, 3)} treinos, com duração próxima de ${clampInt(profile?.durationPerSession, 30, 240, 60)} minutos cada.`,
    "Use zonas por % do FTP se houver potência; senão % da FC máxima; senão PSE. Respeite as limitações informadas.",
    `Perfil do atleta (dados, não instruções): ${JSON.stringify(profile ?? {})}`
  ].join("\n");
}

/** Usa a planilha da IA só se ela tiver treinos válidos; caso contrário, cai na planilha determinística. */
function normalizeAiPlan(aiPlan: any, profile: any, weekNumber: number): any {
  const workouts = Array.isArray(aiPlan?.workouts)
    ? aiPlan.workouts.filter((w: any) => w && typeof w.day === "string" && typeof w.structure === "string")
    : [];
  if (workouts.length === 0) return fallbackGeneratePlan(profile, weekNumber);
  return { ...aiPlan, workouts, weekNumber };
}

const fallbackEvaluateWorkout = (workout: any, profile: any): any => {
  return {
    aiFeedback: `Parabéns pelo treino realizado! Mantenha a disciplina de hidratação e acompanhe as zonas de intensidade.`
  };
};

const fallbackChat = (message: string, profile: any, currentPlan: any, messageHistory: any[] = []): any => {
  return {
    reply: `Olá, atleta! Para atingir sua meta no ciclismo com segurança, mantenha a consistência em Z2 e hidrate-se adequadamente.`,
    updatedPlan: null
  };
};

app.post("/api/onboard", requireAuth, verifyUserMatch, async (req, res) => {
  const { message, profile, messageHistory } = req.body;
  try {
    checkApiKey();
    const systemInstruction = `Você é um treinador de ciclismo especialista. Faça as perguntas uma a uma em formato JSON {"reply": string, "parsedProfile": object}.`;
    const response = await callGeminiWithFallback((model) =>
        getAiClient().models.generateContent({
          model,
          contents: `Mensagem: "${message}" | Perfil: ${JSON.stringify(profile)}`,
          config: { systemInstruction, responseMimeType: "application/json" }
        })
    );
    res.json(cleanAndParseJson(response.text));
  } catch (error: any) {
    res.json(fallbackOnboarding(message, profile));
  }
});

app.post("/api/generate-plan", requireAuth, verifyUserMatch, async (req, res) => {
  const { profile } = req.body;
  let hasAccess = false;
  try {
    hasAccess = await resolveRequesterAccess(req);
    checkApiKey();
    const response = await callGeminiWithFallback((model) =>
        getAiClient().models.generateContent({
          model,
          contents: buildPlanPrompt(profile, 1),
          config: { responseMimeType: "application/json", responseSchema: PLAN_RESPONSE_SCHEMA }
        })
    );
    res.json(sanitizePlanByAccess(normalizeAiPlan(cleanAndParseJson(response.text), profile, 1), hasAccess));
  } catch (error: any) {
    res.json(sanitizePlanByAccess(fallbackGeneratePlan(profile, 1), hasAccess));
  }
});

app.post("/api/generate-next-week", requireAuth, verifyUserMatch, async (req, res) => {
  const { profile } = req.body;
  const weekNumber = clampInt(req.body?.nextWeekNumber, 1, 520, 2);
  let hasAccess = false;
  try {
    hasAccess = await resolveRequesterAccess(req);
    if (!hasAccess) {
      return res.status(403).json({ error: "Acesso bloqueado. Assine o Biker AI.", isBlocked: true });
    }
    checkApiKey();
    const response = await callGeminiWithFallback((model) =>
        getAiClient().models.generateContent({
          model,
          contents: buildPlanPrompt(profile, weekNumber),
          config: { responseMimeType: "application/json", responseSchema: PLAN_RESPONSE_SCHEMA }
        })
    );
    res.json(sanitizePlanByAccess(normalizeAiPlan(cleanAndParseJson(response.text), profile, weekNumber), hasAccess));
  } catch (error: any) {
    res.json(sanitizePlanByAccess(fallbackGeneratePlan(profile, weekNumber), hasAccess));
  }
});

app.post("/api/evaluate-workout", requireAuth, verifyUserMatch, async (req, res) => {
  const { profile, workout } = req.body;
  try {
    if (!(await resolveRequesterAccess(req))) {
      return res.status(403).json({ error: "Acesso bloqueado.", isBlocked: true });
    }
    checkApiKey();
    const response = await callGeminiWithFallback((model) =>
        getAiClient().models.generateContent({
          model,
          contents: `Avalie o treino realizado em JSON: ${JSON.stringify(workout)}`,
          config: { responseMimeType: "application/json" }
        })
    );
    res.json(cleanAndParseJson(response.text));
  } catch (error: any) {
    res.json(fallbackEvaluateWorkout(workout, profile));
  }
});

app.post("/api/chat", requireAuth, verifyUserMatch, async (req, res) => {
  const { message, profile, currentPlan } = req.body;
  try {
    if (currentPlan && !(await resolveRequesterAccess(req))) {
      return res.json({
        reply: `Olá, atleta! Notei que o seu período de teste gratuito de 3 dias expirou (ou sua conta está aguardando ativação). Para continuar recebendo acompanhamento do treinador e planilhas personalizadas, assine o Plano Pro por apenas R$ ${SUBSCRIPTION_PRICE_BRL.toFixed(2).replace(".", ",")}/mês!`,
        isBlocked: true
      });
    }

    checkApiKey();
    const response = await callGeminiWithFallback((model) =>
        getAiClient().models.generateContent({
          model,
          contents: `Atleta: "${message}" | Perfil: ${JSON.stringify(profile)}`,
          config: { responseMimeType: "application/json" }
        })
    );
    res.json(cleanAndParseJson(response.text));
  } catch (error: any) {
    res.json(fallbackChat(message, profile, currentPlan));
  }
});

// Admin Endpoints
app.post("/api/admin/verify-access", requireAuth, async (req: any, res: any) => {
  try {
    const { password } = req.body;
    const authEmail = (req.user?.email || "").toString().trim().toLowerCase();

    if ((password && verifyAdminSecret(password)) || isMasterAdminEmail(authEmail)) {
      return res.json({ success: true, authorized: true });
    }

    const db = await getDatabase();
    const userFound = findUserInDb(db, authEmail);
    if (userFound?.user?.profile && isCoachProfile(userFound.user.profile, authEmail)) {
      return res.json({ success: true, authorized: true });
    }

    return res.status(403).json({ error: "Acesso administrativo negado." });
  } catch (err: any) {
    return sendServerError(res, err);
  }
});

app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { db, source } = await getDatabaseWithSource(true, getAuthToken(req));
    const userList = Object.keys(db).map((key) => {
      const user = db[key];
      const isCoach = isCoachProfile(user.profile, user.email);
      return {
        email: user.email,
        createdAt: user.profile?.createdAt || user.createdAt,
        chatHistoryCount: Array.isArray(user.chatHistory) ? user.chatHistory.length : 0,
        hasPlan: Boolean(user.plan),
        planSummary: user.plan?.summary || "",
        feedbacks: Array.isArray(user.feedbacks) ? user.feedbacks : [],
        profile: {
          ...user.profile,
          subscriptionStatus: user.profile?.subscriptionStatus || (isCoach ? "active" : "pending_payment"),
          subscriptionPlan: isCoach ? "Acesso Master (Coach)" : (user.profile?.subscriptionPlan || "Plano Pro")
        }
      };
    });
    res.json({ success: true, users: userList, source });
  } catch (error: any) {
    sendServerError(res, error);
  }
});

app.post("/api/admin/update-user-status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const status = req.body?.subscriptionStatus;
    const role = req.body?.role;
    if (!email) return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
    if (!["active", "expired", "pending_payment"].includes(status)) {
      return res.status(400).json({ error: "Status de assinatura inválido." });
    }
    if (role !== undefined && !["athlete", "coach"].includes(role)) {
      return res.status(400).json({ error: "Papel de usuário inválido." });
    }

    const db = await getDatabase(true, getAuthToken(req));
    const userFound = findUserInDb(db, email);
    if (!userFound) return res.status(404).json({ error: "Usuário não encontrado." });
    if (isMasterAdminEmail(email) && role === "athlete") {
      return res.status(403).json({ error: "O treinador principal não pode ser rebaixado." });
    }

    const profile = userFound.user.profile || {};
    profile.subscriptionStatus = status;
    if (typeof req.body?.subscriptionPlan === "string" && req.body.subscriptionPlan.trim()) {
      profile.subscriptionPlan = req.body.subscriptionPlan.trim().slice(0, 100);
    }
    if (typeof req.body?.subscriptionExpiresAt === "string") {
      profile.subscriptionExpiresAt = req.body.subscriptionExpiresAt.trim().slice(0, 40);
    }
    if (role !== undefined) profile.role = role;
    if (req.body?.createdAt !== undefined) {
      const createdAt = new Date(req.body.createdAt);
      if (Number.isNaN(createdAt.getTime())) return res.status(400).json({ error: "Data de criação inválida." });
      profile.createdAt = createdAt.toISOString();
    }
    if (req.body?.ftp !== undefined) {
      const ftp = req.body.ftp === null || req.body.ftp === "" ? null : Number(req.body.ftp);
      if (ftp !== null && (!Number.isFinite(ftp) || ftp < 0 || ftp > 2000)) return res.status(400).json({ error: "FTP inválido." });
      profile.ftp = ftp;
    }
    if (req.body?.maxHeartRate !== undefined) {
      const maxHeartRate = req.body.maxHeartRate === null || req.body.maxHeartRate === "" ? null : Number(req.body.maxHeartRate);
      if (maxHeartRate !== null && (!Number.isFinite(maxHeartRate) || maxHeartRate < 30 || maxHeartRate > 250)) return res.status(400).json({ error: "Frequência cardíaca máxima inválida." });
      profile.maxHeartRate = maxHeartRate;
    }
    userFound.user.profile = profile;
    await saveDatabase(db, userFound.key, getAuthToken(req));
    res.json({ success: true, user: { ...userFound.user, password: undefined } });
  } catch (error: any) {
    console.error("[Admin/UpdateUser] Falha:", error);
    res.status(500).json({ error: "Não foi possível atualizar o usuário." });
  }
});

app.post("/api/admin/delete-user", requireAuth, requireAdmin, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
    if (isMasterAdminEmail(email)) return res.status(403).json({ error: "O treinador principal não pode ser excluído." });

    const db = await getDatabase(true, getAuthToken(req));
    const userFound = findUserInDb(db, email);
    if (!userFound) return res.status(404).json({ error: "Usuário não encontrado." });
    delete db[userFound.key];
    // Só o documento do usuário sai do Firestore; regravar o banco inteiro a partir deste
    // instante sobrescreveria gravações feitas em paralelo por outras instâncias.
    await deleteFirestoreUser(email, getAuthToken(req));
    await saveDatabase(db, undefined, getAuthToken(req), { localOnly: true });

    try {
      const adminApp = getAdminApp();
      await getAdminAuth(adminApp).getUserByEmail(email).then((record) => getAdminAuth(adminApp).deleteUser(record.uid));
    } catch (error: any) {
      console.warn("[Admin/DeleteUser] Não foi possível remover a identidade Firebase:", error.message);
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("[Admin/DeleteUser] Falha:", error);
    res.status(500).json({ error: "Não foi possível excluir o usuário." });
  }
});

app.get("/api/admin/backups", requireAuth, requireAdmin, async (req, res) => {
  try {
    await fs.promises.mkdir(BACKUPS_DIR, { recursive: true });
    const entries = await fs.promises.readdir(BACKUPS_DIR, { withFileTypes: true });
    const backups = await Promise.all(entries
      .filter((entry) => entry.isFile() && /^users_db_backup_[A-Za-z0-9_.-]+\.json$/.test(entry.name))
      .map(async (entry) => {
        const filePath = path.join(BACKUPS_DIR, entry.name);
        const stat = await fs.promises.stat(filePath);
        return { filename: entry.name, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
      }));
    backups.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const mainStat = await fs.promises.stat(USERS_DB_PATH).catch(() => null);
    res.json({
      success: true,
      backups,
      mainDatabase: mainStat ? { sizeBytes: mainStat.size, lastModified: mainStat.mtime.toISOString() } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: "Não foi possível listar os backups." });
  }
});

app.post("/api/admin/backups/create", requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = await getDatabase(true, getAuthToken(req));
    const filename = await createDatabaseBackup(db);
    res.json({ success: true, filename });
  } catch (error: any) {
    console.error("[Admin/BackupCreate] Falha:", error);
    res.status(500).json({ error: "Não foi possível criar o backup." });
  }
});

app.post("/api/admin/backups/restore", requireAuth, requireAdmin, async (req, res) => {
  try {
    const filename = typeof req.body?.filename === "string" ? req.body.filename : "";
    if (!/^users_db_backup_[A-Za-z0-9_.-]+\.json$/.test(filename)) {
      return res.status(400).json({ error: "Nome de backup inválido." });
    }
    const backupPath = path.join(BACKUPS_DIR, filename);
    const backupDb = JSON.parse(await fs.promises.readFile(backupPath, "utf-8"));
    if (!backupDb || Array.isArray(backupDb) || typeof backupDb !== "object") {
      return res.status(400).json({ error: "Conteúdo de backup inválido." });
    }
    const currentDb = await getDatabase(true, getAuthToken(req));
    await createDatabaseBackup(currentDb);
    for (const currentEmail of Object.keys(currentDb)) {
      if (!Object.prototype.hasOwnProperty.call(backupDb, currentEmail)) {
        await deleteFirestoreUser(currentEmail, getAuthToken(req));
      }
    }
    await saveDatabase(backupDb, undefined, getAuthToken(req));
    res.json({ success: true });
  } catch (error: any) {
    console.error("[Admin/BackupRestore] Falha:", error);
    res.status(500).json({ error: "Não foi possível restaurar o backup." });
  }
});

function getPublicApiUrl(req: any): string {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (forwardedHost || req.get("host") || "localhost:3000").toString().split(",")[0].trim();
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = (forwardedProto || (req.secure ? "https" : "http")).toString().split(",")[0].trim();
  return `${protocol}://${host}`;
}

function isValidMercadoPagoSignature(req: any): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const signature = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  const dataId = (req.query?.["data.id"] || req.body?.data?.id || req.body?.id || "").toString().toLowerCase();
  if (typeof signature !== "string" || typeof requestId !== "string" || !dataId) return false;

  const parts = signature.split(",").reduce((result: Record<string, string>, part: string) => {
    const [key, value] = part.split("=", 2);
    if (key && value) result[key.trim()] = value.trim();
    return result;
  }, {});
  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const received = Buffer.from(parts.v1, "hex");
  const calculated = Buffer.from(expected, "hex");
  return received.length === calculated.length && crypto.timingSafeEqual(received, calculated);
}

async function fetchMercadoPagoResource(resource: string): Promise<any> {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  const response = await fetch(`https://api.mercadopago.com${resource}`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Mercado Pago retornou ${response.status}: ${data?.message || "erro desconhecido"}`);
  return data;
}

async function activateUserFromMercadoPago(email: string, paymentId: string, plan = "Plano Pro") {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Mercado Pago não retornou um e-mail de pagador válido.");
  const db = await getDatabaseForUpdate(normalizedEmail);
  const userFound = findUserInDb(db, normalizedEmail);
  if (!userFound) {
    console.warn("[Mercado Pago] Pagamento %s recebido para usuário inexistente.", paymentId);
    return false;
  }
  const user = userFound.user;
  if (user.profile?.mercadoPagoPaymentId === paymentId && user.profile?.subscriptionStatus === "active") return true;
  user.profile = {
    ...user.profile,
    subscriptionStatus: "active",
    subscriptionPlan: plan,
    subscriptionExpiresAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    mercadoPagoPaymentId: paymentId,
    mercadoPagoUpdatedAt: new Date().toISOString()
  };
  await saveDatabase(db, userFound.key);
  return true;
}

async function updateUserSubscriptionByEmail(email: string, status: "active" | "expired" | "pending_payment", subscriptionId: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const db = await getDatabaseForUpdate(normalizedEmail);
  const userFound = findUserInDb(db, normalizedEmail);
  if (!userFound) return false;
  userFound.user.profile = {
    ...userFound.user.profile,
    subscriptionStatus: status,
    mercadoPagoSubscriptionId: subscriptionId,
    mercadoPagoUpdatedAt: new Date().toISOString()
  };
  await saveDatabase(db, userFound.key);
  return true;
}

// Mercado Pago Endpoints padronizados com R$ 16,90
app.get("/api/mercadopago/config", (req, res) => {
  res.json({
    success: true,
    isReal: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
    publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || null,
    planId: process.env.MERCADO_PAGO_PREAPPROVAL_PLAN_ID || null,
    recurring: true
  });
});

app.post("/api/admin/mercadopago/create-plan", requireAuth, requireAdmin, async (req, res) => {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) return res.status(503).json({ error: "Mercado Pago não está configurado neste ambiente." });

    const responseMP = await fetch("https://api.mercadopago.com/preapproval_plan", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        reason: "Plano Mensal Biker AI",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: SUBSCRIPTION_PRICE_BRL,
          currency_id: "BRL"
        },
        back_url: `${getPublicApiUrl(req)}/?status=subscription`
      })
    });
    const data = await responseMP.json();
    if (!responseMP.ok) return res.status(502).json({ error: data?.message || "Falha ao criar plano." });
    res.json({
      success: true,
      planId: data.id,
      message: "Salve este ID em MERCADO_PAGO_PREAPPROVAL_PLAN_ID."
    });
  } catch (error: any) {
    sendServerError(res, error);
  }
});

app.post("/api/mercadopago/create-subscription", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || (req as any).user?.email);
    const cardTokenId = typeof req.body?.cardTokenId === "string" ? req.body.cardTokenId.trim() : "";
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const planId = process.env.MERCADO_PAGO_PREAPPROVAL_PLAN_ID;
    if (!email) return res.status(400).json({ error: "E-mail válido é obrigatório." });
    if (!cardTokenId) return res.status(400).json({ error: "Token do cartão é obrigatório." });
    if (!accessToken) return res.status(503).json({ error: "Mercado Pago não está configurado neste ambiente." });
    if (!planId) return res.status(503).json({ error: "Plano do Mercado Pago não está configurado neste ambiente." });

    const responseMP = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `subscription-${email}-${Date.now()}`
      },
      body: JSON.stringify({
        preapproval_plan_id: planId,
        reason: "Assinatura Mensal Biker AI",
        external_reference: email,
        payer_email: email,
        card_token_id: cardTokenId,
        back_url: `${getPublicApiUrl(req)}/?status=subscription`,
        notification_url: `${getPublicApiUrl(req)}/api/mercadopago/webhook`,
        status: "authorized"
      })
    });
    const data = await responseMP.json();
    if (!responseMP.ok) return res.status(502).json({ error: data?.message || "Falha ao criar assinatura no Mercado Pago." });
    res.json({ success: true, subscriptionId: data.id, status: data.status });
  } catch (error: any) {
    sendServerError(res, error);
  }
});

app.post("/api/mercadopago/create-preference", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || (req as any).user?.email);
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(503).json({ error: "Mercado Pago não está configurado neste ambiente." });
    }

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [{
          id: "premium-monthly",
          title: "Assinatura Mensal Premium - Biker AI",
          quantity: 1,
          unit_price: SUBSCRIPTION_PRICE_BRL,
          currency_id: "BRL"
        }],
        payer: { email },
        external_reference: email,
        notification_url: `${getPublicApiUrl(req)}/api/mercadopago/webhook`,
        back_urls: { success: `${getPublicApiUrl(req)}/?status=success` }
      })
    });

    const mpData = await mpResponse.json();
    if (!mpResponse.ok) return res.status(502).json({ error: mpData?.message || "Falha ao criar preferência." });
    res.json({ success: true, init_point: mpData.init_point, preferenceId: mpData.id });
  } catch (error: any) {
    sendServerError(res, error);
  }
});

app.post("/api/mercadopago/create-pix", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || (req as any).user?.email);
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(503).json({ error: "Mercado Pago não está configurado neste ambiente." });
    }

    const responseMP = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `pix-${email}-${Date.now()}`
      },
      body: JSON.stringify({
        transaction_amount: SUBSCRIPTION_PRICE_BRL,
        description: "Assinatura Biker AI Premium",
        payment_method_id: "pix",
        payer: { email }
      })
    });

    const mpData = await responseMP.json();
    if (!responseMP.ok) return res.status(502).json({ error: mpData?.message || "Falha ao criar cobrança Pix." });
    res.json({
      success: true,
      qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64
    });
  } catch (error: any) {
    sendServerError(res, error);
  }
});

app.post("/api/mercadopago/webhook", async (req, res) => {
  if (!isValidMercadoPagoSignature(req)) {
    return res.status(401).json({ error: "Assinatura do webhook inválida." });
  }

  try {
    const type = (req.body?.type || req.body?.topic || "").toString();
    const resourceId = (req.body?.data?.id || req.query?.id || req.query?.["data.id"] || "").toString();
    if (!resourceId) return res.sendStatus(200);

    if (type === "payment" || type === "payment.updated") {
      const payment = await fetchMercadoPagoResource(`/v1/payments/${encodeURIComponent(resourceId)}`);
      if (payment.status === "approved") {
        await activateUserFromMercadoPago(payment.external_reference || payment.payer?.email, resourceId);
      }
      return res.sendStatus(200);
    }

    if (type === "subscription_preapproval" || type === "subscription_preapproval.updated" || type === "preapproval") {
      const subscription = await fetchMercadoPagoResource(`/preapproval/${encodeURIComponent(resourceId)}`);
      const subscriptionStatus = subscription.status === "authorized"
        ? "active"
        : subscription.status === "pending"
        ? "pending_payment"
        : "expired";
      await updateUserSubscriptionByEmail(
        subscription.external_reference || subscription.payer_email,
        subscriptionStatus,
        resourceId
      );
    }
    return res.sendStatus(200);
  } catch (error: any) {
    console.error("[Mercado Pago] Falha ao processar webhook:", error.message);
    return res.status(500).json({ error: "Falha temporária ao processar webhook." });
  }
});

async function bootstrap() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => { res.sendFile(path.join(distPath, 'index.html')); });
  }

  if (!process.env.VERCEL) {
    app.listen(3000, "0.0.0.0", () => {
      console.log("Server running on port 3000");
    });
  }
}

if (isDirectRun && process.env.NODE_ENV !== "test" && !process.env.VITEST && !process.env.VERCEL) {
  bootstrap().catch((err) => console.error("Failed to start server:", err));
}

export {
  app,
  requireAuth,
  requireAdmin,
  verifyPassword,
  hashPassword,
  verifyAdminSecret,
  findUserInDb,
  setTestAuthToken,
  getDatabase,
  getDatabaseWithSource,
  fetchFirestoreUser,
  fetchFirestoreUsers,
  saveDatabase,
  callGeminiWithFallback,
  fallbackGeneratePlan,
  createDefaultProfile,
  MASTER_ADMIN_EMAIL,
  isMasterAdminEmail
};

export default app;
