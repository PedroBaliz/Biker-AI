import express from "express";
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

let firestoreDb: any = null;
let useFirestore = false;

try {
  if (firebaseAppletConfig && firebaseAppletConfig.projectId && firebaseAppletConfig.apiKey) {
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
  if (firebaseAppletConfig && firebaseAppletConfig.projectId) {
    const adminConfig: any = {
      projectId: firebaseAppletConfig.projectId
    };

    const serviceAccountPath = path.join(process.cwd(), "service-account.json");
    if (fs.existsSync(serviceAccountPath)) {
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

// --- CRYPTOGRAPHIC HELPERS & SECURITY MIDDLEWARES ---

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  
  if (!storedHash.includes(":")) {
    return password === storedHash;
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

        if (isClaimsValid) {
          if (header.alg === "RS256") {
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
            } catch (keyErr) {
              if (process.env.NODE_ENV === "test") {
                decodedToken = payload;
              }
            }
          }
          if (!decodedToken && isClaimsValid && process.env.NODE_ENV === "test") {
            decodedToken = payload;
          }
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

const MASTER_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "pedro.bramos@sempreceub.com").trim().toLowerCase();

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

    if (adminPassword && verifyAdminSecret(adminPassword)) {
      req.user = { email: MASTER_ADMIN_EMAIL, isAdmin: true, role: "coach" };
      return next();
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
    const tokenEmail = decodedToken?.email || decodedToken?.firebase?.identities?.email?.[0];
    if (!tokenEmail) {
      return res.status(401).json({ error: "Token não contém uma identidade ou e-mail válido." });
    }

    req.user = decodedToken || {};
    req.user.email = tokenEmail.trim().toLowerCase();
    return next();
  } catch (err: any) {
    console.warn("[RequireAuth] Falha na validação do token:", err.message);
    return res.status(401).json({ error: `Sessão inválida ou expirada: ${err.message}` });
  }
}

function findUserInDb(db: Record<string, any>, email: string): { key: string; user: any } | null {
  if (!email || !db) return null;
  const emailKey = email.trim().toLowerCase();
  const cleanKey = emailKey.replace(/[^a-z0-9]/g, "_");

  if (db[emailKey]) return { key: emailKey, user: db[emailKey] };
  if (db[cleanKey]) return { key: cleanKey, user: db[cleanKey] };

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

  const authEmail = req.user.email.toString().trim().toLowerCase();
  const requestedEmail = req.body?.email || req.body?.profile?.email || req.query?.email || req.headers["x-user-email"];

  if (!requestedEmail) {
    return next();
  }

  const bodyEmail = requestedEmail.toString().trim().toLowerCase();
  const isMasterCoach = authEmail === MASTER_ADMIN_EMAIL;

  if (isMasterCoach || authEmail === bodyEmail) {
    return next();
  }

  try {
    const db = await getDatabase();
    const userFound = findUserInDb(db, authEmail);
    if (userFound?.user?.profile && (userFound.user.profile.role === "coach" || userFound.user.profile.role === "admin" || userFound.user.profile.isCoach === true)) {
      return next();
    }
  } catch (e) {
    console.error("[VerifyUserMatch] Erro ao consultar privilégios no BD:", e);
  }

  return res.status(403).json({ error: "Acesso negado. Permissão restrita aos próprios dados do atleta ou ao treinador." });
}

function isTrialActive(profile: any): boolean {
  if (!profile || !profile.createdAt) return false;
  if (profile.subscriptionStatus === "expired") return false;
  const created = new Date(profile.createdAt).getTime();
  if (isNaN(created)) return false;
  const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
  return (Date.now() - created) <= TRIAL_DURATION_MS;
}

function hasActiveAccess(profile: any, userEmail?: string): boolean {
  if (!profile) return false;
  const emailToCheck = (profile?.email || userEmail || "").trim().toLowerCase();
  const isCoach = profile?.role === "coach" || profile?.role === "admin" || emailToCheck === MASTER_ADMIN_EMAIL;
  if (isCoach) return true;
  if (profile.subscriptionStatus === "expired") return false;
  if (profile.subscriptionStatus === "active") return true;
  return isTrialActive(profile);
}

function sanitizePlanForUser(plan: any, profile: any, userEmail?: string) {
  if (!plan) return null;
  const isSubscriber = hasActiveAccess(profile, userEmail);
  
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

async function requireAdmin(req: any, res: any, next: any) {
  const adminPassword = req.headers["x-admin-password"] || req.body?.adminPassword;

  if (adminPassword && verifyAdminSecret(adminPassword)) {
    req.user = req.user || {};
    if (!req.user.email) req.user.email = MASTER_ADMIN_EMAIL;
    return next();
  }

  const authEmail = (req.user?.email || "").toString().trim().toLowerCase();
  if (!authEmail) {
    return res.status(401).json({ error: "Sessão inválida. Realize login para continuar." });
  }

  if (authEmail === MASTER_ADMIN_EMAIL) {
    return next();
  }

  try {
    const db = await getDatabase();
    const userFound = findUserInDb(db, authEmail);
    if (
      userFound &&
      userFound.user?.profile &&
      (userFound.user.profile.role === "coach" ||
       userFound.user.profile.role === "admin" ||
       userFound.user.profile.isCoach === true)
    ) {
      return next();
    }
  } catch (e) {
    console.error("Erro ao verificar papel do usuário:", e);
  }

  return res.status(403).json({ error: "Acesso restrito. Operação exclusiva do treinador/coach." });
}

const app = express();
app.use(express.json());

// Google Site Verification & Sitemap
app.get("/googleef65b720b90cbd44.html", (req, res) => {
  res.type("text/html").send("google-site-verification: googleef65b720b90cbd44.html");
});

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(`User-agent: *
Allow: /
Allow: /treino-ciclismo-iniciante
Allow: /planilha-treino-ciclismo
Allow: /treino-ciclismo-emagrecer
Allow: /treino-100km
Allow: /zona-2-ciclismo
Disallow: /api/
Disallow: /admin/

User-agent: Googlebot
Allow: /
Allow: /treino-ciclismo-iniciante
Allow: /planilha-treino-ciclismo
Allow: /treino-ciclismo-emagrecer
Allow: /treino-100km
Allow: /zona-2-ciclismo

User-agent: Googlebot-Image
Allow: /

Sitemap: https://ais-pre-ig3xpt2tylya4dpumxckiy-403337948550.us-west2.run.app/sitemap.xml
`);
});

app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://ais-pre-ig3xpt2tylya4dpumxckiy-403337948550.us-west2.run.app/</loc>
    <lastmod>2026-09-13</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
});

app.use((req, res, next) => {
  if (process.env.VERCEL && !req.url.startsWith("/api")) {
    req.url = "/api" + req.url;
  }
  next();
});

app.use((req, res, next) => {
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
  const userAgent = (req.headers["user-agent"] || "").slice(0, 100);
  const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${clientIp} - UA: ${userAgent}\n`;
  try {
    const requestsLogPath = process.env.VERCEL
      ? path.join(os.tmpdir(), "server_requests.log")
      : path.join(process.cwd(), "server_requests.log");
    fs.appendFileSync(requestsLogPath, logMsg, "utf-8");
  } catch (e) {}
  next();
});

// RATE LIMITING MIDDLEWARE
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

function createRateLimiter(options: { windowMs: number; max: number; message: string; keyPrefix?: string }) {
  const { windowMs, max, message, keyPrefix = "global" } = options;

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const path = req.originalUrl || req.url;
    if (!path.startsWith("/api")) {
      return next();
    }

    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || req.socket.remoteAddress || "unknown";
    const key = `${keyPrefix}:${clientIp}`;
    const now = Date.now();

    if (rateLimitStore.size > 500) {
      for (const [k, rec] of rateLimitStore.entries()) {
        if (rec.resetTime <= now) rateLimitStore.delete(k);
      }
    }

    let record = rateLimitStore.get(key);

    if (!record || record.resetTime <= now) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);

    if (record.count > max) {
      res.setHeader("Retry-After", resetSeconds);
      console.warn(`[RateLimit] IP ${clientIp} excedeu o limite na rota ${path} (${record.count}/${max})`);
      return res.status(429).json({ error: message, retryAfter: resetSeconds });
    }

    next();
  };
}

const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Muitas requisições enviadas em curto intervalo. Por favor, aguarde alguns instantes.",
  keyPrefix: "api-general"
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Muitas tentativas de login ou registro. Por favor, aguarde 15 minutos para tentar novamente.",
  keyPrefix: "api-auth"
});

const aiGenerationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: "Limite de solicitações de Inteligência Artificial atingido. Por favor, aguarde alguns minutos antes de gerar novos treinos.",
  keyPrefix: "api-ai"
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/generate-plan", aiGenerationLimiter);
app.use("/api/evaluate-workout", aiGenerationLimiter);
app.use("/api/parse-strava", aiGenerationLimiter);
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
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object") {
    const fields: Record<string, any> = {};
    for (const key of Object.keys(value)) fields[key] = toFirestoreValue(value[key]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreDocument(fields: Record<string, any>) {
  const docFields: Record<string, any> = {};
  for (const key of Object.keys(fields)) docFields[key] = toFirestoreValue(fields[key]);
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
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/users/${emailKey}`;
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

  if (adminFirestoreDb) {
    try {
      await adminFirestoreDb.collection("users").doc(emailKey).set(userData);
      return;
    } catch (err: any) {}
  }

  if (idToken && firebaseAppletConfig && firebaseAppletConfig.projectId) {
    try {
      const projectId = firebaseAppletConfig.projectId;
      const dbId = firebaseAppletConfig.firestoreDatabaseId || "(default)";
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/users/${emailKey}`;
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
    } catch (restErr: any) {}
  }

  if (!useFirestore || !firestoreDb) throw new Error("Firestore não está habilitado.");
  const docRef = doc(firestoreDb, "users", emailKey);
  await setDoc(docRef, userData);
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
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/users/${encodeURIComponent(k)}`;
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

  if (!findUserInDb(localDb, MASTER_ADMIN_EMAIL)) {
    localDb[MASTER_ADMIN_EMAIL] = {
      email: MASTER_ADMIN_EMAIL,
      profile: {
        name: "Pedro Ramos (Treinador Master)",
        level: "avançado",
        goal: "provas e alta performance",
        daysPerWeek: 5,
        durationPerSession: 90,
        hasPowerMeter: true,
        ftp: 310,
        hasHeartRate: true,
        maxHeartRate: 190,
        subscriptionStatus: "active",
        subscriptionPlan: "Acesso Master (Coach)",
        role: "coach",
        isCoach: true,
        createdAt: "2026-01-01T00:00:00.000Z"
      },
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

async function saveDatabase(db: Record<string, any>, targetEmail?: string, idToken?: string) {
  inMemoryDbCache = db;
  inMemoryDbCacheTimestamp = Date.now();

  let firestoreSuccess = false;
  let firestoreError: any = null;

  if (useFirestore) {
    try {
      if (targetEmail) {
        const emailKey = targetEmail.trim().toLowerCase();
        await saveFirestoreUser(emailKey, db[emailKey], idToken);
        firestoreSuccess = true;
      } else {
        const savePromises = Object.keys(db).map(async (email) => {
          await saveFirestoreUser(email, db[email], idToken).catch(() => {});
        });
        await Promise.all(savePromises);
        firestoreSuccess = true;
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

  if (!diskSuccess && (!useFirestore || !firestoreSuccess)) {
    throw new Error(`Falha crítica de persistência de dados: ${diskError?.message || firestoreError?.message || "Não foi possível persistir"}`);
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

runInitialMigration().then(() => ensureAllAthletesArePending()).catch(() => {});

async function ensureAllAthletesArePending() {
  try {
    const db = await getDatabase();
    let updatedCount = 0;
    
    for (const email of Object.keys(db)) {
      const user = db[email];
      if (user && user.profile) {
        const isCoach = email.trim().toLowerCase() === MASTER_ADMIN_EMAIL || user.profile.role === "coach";
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

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Dados inválidos de cadastro." });
    }

    const db = await getDatabase();
    const emailKey = email.trim().toLowerCase();

    if (db[emailKey]) {
      const existing = db[emailKey];
      const isBootstrappedWithoutPassword = !existing.password;
      const hasNoPlanOrWorkouts = (!existing.plan || Object.keys(existing.plan).length === 0) &&
                                  (!existing.workoutLogs || existing.workoutLogs.length === 0);

      if (isBootstrappedWithoutPassword || hasNoPlanOrWorkouts) {
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

    const isCoachEmail = email.trim().toLowerCase() === MASTER_ADMIN_EMAIL;
    const nowIso = new Date().toISOString();
    const newProfile = {
      name: name.trim(),
      level: "intermediário",
      goal: "melhorar condicionamento",
      daysPerWeek: 3,
      durationPerSession: 60,
      eventDate: "",
      hasPowerMeter: null,
      ftp: null,
      hasHeartRate: null,
      maxHeartRate: null,
      limitations: "",
      recentActivity: "",
      onboardingStep: 1,
      subscriptionStatus: isCoachEmail ? "active" : "pending_payment",
      subscriptionPlan: "Plano Pro",
      subscriptionExpiresAt: "2026-12-31",
      role: isCoachEmail ? "coach" : "athlete",
      createdAt: nowIso
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
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const db = await getDatabase();
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
      if (!user.profile.role) user.profile.role = email.trim().toLowerCase() === MASTER_ADMIN_EMAIL ? "coach" : "athlete";
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
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/save-user", requireAuth, verifyUserMatch, async (req: any, res: any) => {
  try {
    const { email, userAccount, password } = req.body;
    if (!email || !userAccount) {
      return res.status(400).json({ error: "Dados para sincronização inválidos." });
    }

    const db = await getDatabase();
    const userFound = findUserInDb(db, email);

    let targetKey: string;
    let existingUser: any;

    if (!userFound) {
      targetKey = email.trim().toLowerCase();
      const isMaster = targetKey === MASTER_ADMIN_EMAIL;
      existingUser = {
        email: targetKey,
        profile: {
          name: isMaster ? "Pedro Ramos" : targetKey.split("@")[0],
          role: isMaster ? "coach" : "athlete",
          isCoach: isMaster,
          subscriptionStatus: isMaster ? "active" : "pending_payment",
          subscriptionPlan: isMaster ? "Acesso Master (Coach)" : "Plano Pro",
          createdAt: new Date().toISOString()
        },
        chatHistory: [],
        plan: null,
        feedbacks: [],
        workoutLogs: []
      };
    } else {
      targetKey = userFound.key;
      existingUser = userFound.user;
    }

    const requesterEmail = (req.user?.email || "").toString().trim().toLowerCase();
    const adminHeader = req.headers["x-admin-password"];
    const adminSecretStr = typeof adminHeader === "string" ? adminHeader : undefined;
    const isAdminCaller = Boolean(
      (adminSecretStr && verifyAdminSecret(adminSecretStr)) ||
      requesterEmail === MASTER_ADMIN_EMAIL
    );

    const existingCreatedAt = existingUser?.profile?.createdAt || existingUser?.createdAt || new Date().toISOString();

    let sanitizedProfile: any;
    if (isAdminCaller) {
      sanitizedProfile = {
        ...(existingUser.profile || {}),
        ...(userAccount.profile || {}),
        createdAt: existingCreatedAt
      };
    } else {
      const incomingProfile = userAccount.profile || {};
      sanitizedProfile = {
        ...(existingUser.profile || {}),
        name: typeof incomingProfile.name === "string" ? incomingProfile.name.trim() : existingUser.profile?.name,
        level: incomingProfile.level || existingUser.profile?.level,
        goal: incomingProfile.goal || existingUser.profile?.goal,
        daysPerWeek: incomingProfile.daysPerWeek ?? existingUser.profile?.daysPerWeek,
        durationPerSession: incomingProfile.durationPerSession ?? existingUser.profile?.durationPerSession,
        eventDate: incomingProfile.eventDate ?? existingUser.profile?.eventDate,
        hasPowerMeter: incomingProfile.hasPowerMeter ?? existingUser.profile?.hasPowerMeter,
        ftp: incomingProfile.ftp !== undefined ? incomingProfile.ftp : existingUser.profile?.ftp,
        hasHeartRate: incomingProfile.hasHeartRate ?? existingUser.profile?.hasHeartRate,
        maxHeartRate: incomingProfile.maxHeartRate !== undefined ? incomingProfile.maxHeartRate : existingUser.profile?.maxHeartRate,
        limitations: incomingProfile.limitations !== undefined ? incomingProfile.limitations : existingUser.profile?.limitations,
        recentActivity: incomingProfile.recentActivity !== undefined ? incomingProfile.recentActivity : existingUser.profile?.recentActivity,
        onboardingStep: incomingProfile.onboardingStep ?? existingUser.profile?.onboardingStep,
        role: existingUser.profile?.role || "athlete",
        isCoach: existingUser.profile?.isCoach === true,
        subscriptionStatus: existingUser.profile?.subscriptionStatus || "pending_payment",
        subscriptionPlan: existingUser.profile?.subscriptionPlan || "Plano Pro",
        subscriptionExpiresAt: existingUser.profile?.subscriptionExpiresAt || "2026-12-31",
        createdAt: existingCreatedAt
      };
    }

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
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/session", requireAuth, verifyUserMatch, async (req: any, res: any) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail é obrigatório." });
    const emailLower = email.trim().toLowerCase();
    const authToken = getAuthToken(req);

    const db = await getDatabase(false, authToken);
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
      const isMasterAdmin = emailLower === MASTER_ADMIN_EMAIL;

      const newProfile: any = {
        name: isMasterAdmin ? "Pedro Ramos" : (req.user?.name || emailLower.split("@")[0]),
        email: emailLower,
        role: isMasterAdmin ? "coach" : "athlete",
        isCoach: isMasterAdmin,
        subscriptionStatus: isMasterAdmin ? "active" : "pending_payment",
        subscriptionPlan: isMasterAdmin ? "Acesso Master (Coach)" : "Plano Pro",
        subscriptionExpiresAt: isMasterAdmin ? "2030-12-31" : "2026-12-31",
        createdAt: new Date().toISOString(),
        goal: "melhorar condicionamento",
        level: "intermediário",
        daysPerWeek: 4,
        durationPerSession: 60,
        hasPowerMeter: true,
        ftp: isMasterAdmin ? 310 : 200,
        hasHeartRate: true,
        maxHeartRate: 185,
        limitations: "Nenhuma",
        recentActivity: "Ciclismo regular",
        onboardingStep: 10
      };

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
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/workout/log-completion", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const { email, log, workoutIndex, workout } = req.body;
    if (!email || !log) {
      return res.status(400).json({ error: "E-mail e dados do treino são obrigatórios." });
    }

    const db = await getDatabase();
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
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/check-status", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail é obrigatório." });
    const db = await getDatabase();
    const userFound = findUserInDb(db, email);
    if (!userFound) return res.status(404).json({ error: "Usuário não encontrado." });
    const user = userFound.user;
    const emailKey = email.trim().toLowerCase();

    const isCoach = emailKey === MASTER_ADMIN_EMAIL || user.profile?.role === "coach";
    const status = user.profile?.subscriptionStatus || (isCoach ? "active" : "pending_payment");

    res.json({
      success: true,
      subscriptionStatus: status,
      isTrial: isTrialActive(user.profile),
      hasAccess: hasActiveAccess(user.profile, emailKey),
      profile: user.profile
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/user/notify-payment", async (req, res) => {
  try {
    const { email, method, note } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail é obrigatório." });
    const db = await getDatabase();
    const userFound = findUserInDb(db, email);
    if (!userFound) return res.status(404).json({ error: "Usuário não encontrado." });
    const user = userFound.user;

    if (!user.feedbacks) user.feedbacks = [];

    const paymentFeedback = {
      id: `pay_notify_${Date.now()}`,
      userName: user.profile?.name || "Atleta",
      userEmail: user.email,
      text: `[AVISO DE PAGAMENTO - R$ ${SUBSCRIPTION_PRICE_BRL.toFixed(2).replace(".", ",")} Via Mercado Pago] Atleta informou que concluiu o pagamento via ${method || "Mercado Pago"}. ${note ? `Obs: ${note}` : "Aguardando ativação no painel privado."}`,
      timestamp: new Date().toISOString()
    };

    user.feedbacks.unshift(paymentFeedback);
    await saveDatabase(db, userFound.key, getAuthToken(req));

    res.json({ success: true, message: "Aviso de pagamento registrado para análise do treinador." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/verify-password", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "E-mail e senha são obrigatórios para verificação." });
    const db = await getDatabase();
    const userFound = findUserInDb(db, email);
    if (!userFound) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json({ success: verifyPassword(password, userFound.user.password) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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

app.get("/api/diagnostics", async (req, res) => {
  const responses: any = {
    apiKeyConfigured: !!process.env.GEMINI_API_KEY,
    apiKeyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
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

const callGeminiWithFallback = async (
  requestFn: (modelName: string) => Promise<any>,
  modelsToTry: string[] = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-pro"]
): Promise<any> => {
  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      const modelPromise = requestFn(model);
      const perModelTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout de 45s no modelo ${model}`)), 45000);
      });
      return await Promise.race([modelPromise, perModelTimeout]);
    } catch (err: any) {
      lastError = err;
      if (i < modelsToTry.length - 1) {
        await new Promise(r => setTimeout(r, 200));
        continue;
      }
    }
  }

  throw lastError;
};

const withTimeout = <T>(promise: Promise<T>, ms: number = 25000, errorMessage = "Timeout exceeding limit"): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  let didTimeout = false;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      reject(new Error(errorMessage));
    }, ms);
  });
  
  promise.catch((err) => {
    if (didTimeout) {
      console.warn("[Plano de Fundo] Exceção da API após limite de tempo:", err?.message || err);
    }
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
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

const fallbackGeneratePlan = (profile: any, nextWeekNum: number = 1): any => {
  return {
    workouts: [],
    summary: `Planilha de Treinamento - Semana ${nextWeekNum}.`,
    observations: "Mantenha o foco em hidratação e descanso.",
    evaluation: "Avalie pelo nível de cansaço percebido.",
    weekNumber: nextWeekNum,
    coachMessage: "Inicie seus pedais mantendo consistência!"
  };
};

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
    const response = await withTimeout(
      callGeminiWithFallback((model) =>
        getAiClient().models.generateContent({
          model,
          contents: `Mensagem: "${message}" | Perfil: ${JSON.stringify(profile)}`,
          config: { systemInstruction, responseMimeType: "application/json" }
        })
      )
    );
    res.json(cleanAndParseJson(response.text));
  } catch (error: any) {
    res.json(fallbackOnboarding(message, profile));
  }
});

app.post("/api/generate-plan", requireAuth, verifyUserMatch, async (req, res) => {
  const { profile } = req.body;
  try {
    checkApiKey();
    const response = await withTimeout(
      callGeminiWithFallback((model) =>
        getAiClient().models.generateContent({
          model,
          contents: `Gere uma planilha semanal em JSON para: ${JSON.stringify(profile)}`,
          config: { responseMimeType: "application/json" }
        })
      )
    );
    const fullPlanData = cleanAndParseJson(response.text);
    const userEmailKey = (profile?.email || (req as any).user?.email || "").trim().toLowerCase();
    res.json(sanitizePlanForUser(fullPlanData, profile, userEmailKey));
  } catch (error: any) {
    const data = fallbackGeneratePlan(profile, 1);
    const userEmailKey = (profile?.email || (req as any).user?.email || "").trim().toLowerCase();
    res.json(sanitizePlanForUser(data, profile, userEmailKey));
  }
});

app.post("/api/generate-next-week", requireAuth, verifyUserMatch, async (req, res) => {
  const { profile, currentPlan, nextWeekNumber } = req.body;
  try {
    const userEmailKey = (profile?.email || (req as any).user?.email || "").trim().toLowerCase();
    if (!hasActiveAccess(profile, userEmailKey)) {
      return res.status(403).json({ error: "Acesso bloqueado. Assine o Biker AI.", isBlocked: true });
    }
    checkApiKey();
    const response = await withTimeout(
      callGeminiWithFallback((model) =>
        getAiClient().models.generateContent({
          model,
          contents: `Gere a Semana ${nextWeekNumber} em JSON para: ${JSON.stringify(profile)}`,
          config: { responseMimeType: "application/json" }
        })
      )
    );
    res.json(sanitizePlanForUser(cleanAndParseJson(response.text), profile, userEmailKey));
  } catch (error: any) {
    const data = fallbackGeneratePlan(profile, nextWeekNumber || 2);
    const userEmailKey = (profile?.email || (req as any).user?.email || "").trim().toLowerCase();
    res.json(sanitizePlanForUser(data, profile, userEmailKey));
  }
});

app.post("/api/evaluate-workout", requireAuth, verifyUserMatch, async (req, res) => {
  const { profile, workout } = req.body;
  try {
    const userEmailKey = (profile?.email || (req as any).user?.email || "").trim().toLowerCase();
    if (!hasActiveAccess(profile, userEmailKey)) {
      return res.status(403).json({ error: "Acesso bloqueado.", isBlocked: true });
    }
    checkApiKey();
    const response = await withTimeout(
      callGeminiWithFallback((model) =>
        getAiClient().models.generateContent({
          model,
          contents: `Avalie o treino realizado em JSON: ${JSON.stringify(workout)}`,
          config: { responseMimeType: "application/json" }
        })
      )
    );
    res.json(cleanAndParseJson(response.text));
  } catch (error: any) {
    res.json(fallbackEvaluateWorkout(workout, profile));
  }
});

app.post("/api/chat", requireAuth, verifyUserMatch, async (req, res) => {
  const { message, profile, currentPlan } = req.body;
  try {
    const userEmailKey = (profile?.email || (req as any).user?.email || "").trim().toLowerCase();
    if (currentPlan && !hasActiveAccess(profile, userEmailKey)) {
      return res.json({
        reply: `Olá, atleta! Notei que o seu período de teste gratuito de 3 dias expirou (ou sua conta está aguardando ativação). Para continuar recebendo acompanhamento do treinador e planilhas personalizadas, assine o Plano Pro por apenas R$ ${SUBSCRIPTION_PRICE_BRL.toFixed(2).replace(".", ",")}/mês!`,
        isBlocked: true
      });
    }

    checkApiKey();
    const response = await withTimeout(
      callGeminiWithFallback((model) =>
        getAiClient().models.generateContent({
          model,
          contents: `Atleta: "${message}" | Perfil: ${JSON.stringify(profile)}`,
          config: { responseMimeType: "application/json" }
        })
      )
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

    if ((password && verifyAdminSecret(password)) || authEmail === MASTER_ADMIN_EMAIL) {
      return res.json({ success: true, authorized: true });
    }

    const db = await getDatabase();
    const userFound = findUserInDb(db, authEmail);
    if (userFound?.user?.profile && (userFound.user.profile.role === "coach" || userFound.user.profile.role === "admin")) {
      return res.json({ success: true, authorized: true });
    }

    return res.status(403).json({ error: "Acesso administrativo negado." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { db, source } = await getDatabaseWithSource(true, getAuthToken(req));
    const userList = Object.keys(db).map((key) => {
      const user = db[key];
      const isCoach = user.email?.trim().toLowerCase() === MASTER_ADMIN_EMAIL || user.profile?.role === "coach";
      return {
        email: user.email,
        createdAt: user.profile?.createdAt || user.createdAt,
        profile: {
          ...user.profile,
          subscriptionStatus: user.profile?.subscriptionStatus || (isCoach ? "active" : "pending_payment"),
          subscriptionPlan: isCoach ? "Acesso Master (Coach)" : (user.profile?.subscriptionPlan || "Plano Pro")
        }
      };
    });
    res.json({ success: true, users: userList, source });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mercado Pago Endpoints padronizados com R$ 16,90
app.get("/api/mercadopago/config", (req, res) => {
  res.json({
    success: true,
    isReal: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
    publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || "TEST-PublicKey-Simulado",
    direct_link: "https://mpago.la/24PgikU"
  });
});

app.post("/api/mercadopago/create-preference", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const { email } = req.body;
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.json({
        success: true,
        isSimulated: true,
        init_point: "https://mpago.la/24PgikU",
        preferenceId: "simulated-pref-id-123456"
      });
    }

    const host = req.get("host") || "localhost:3000";
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";

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
        payer: { email: email || "usuario@biker.ai" },
        back_urls: { success: `${protocol}://${host}/?status=success` }
      })
    });

    const mpData = await mpResponse.json();
    res.json({ success: true, init_point: mpData.init_point });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/mercadopago/create-pix", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const { email } = req.body;
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.json({
        success: true,
        isSimulated: true,
        qr_code: `00020101021226870014BR.GOV.BCB.PIX2565bikerai-mp-mercadopago-${SUBSCRIPTION_PRICE_BRL.toFixed(2)}`
      });
    }

    const responseMP = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `pix-${Date.now()}`
      },
      body: JSON.stringify({
        transaction_amount: SUBSCRIPTION_PRICE_BRL,
        description: "Assinatura Biker AI Premium",
        payment_method_id: "pix",
        payer: { email: email || "usuario@biker.ai" }
      })
    });

    const mpData = await responseMP.json();
    res.json({
      success: true,
      qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
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
  MASTER_ADMIN_EMAIL
};

export default app;
