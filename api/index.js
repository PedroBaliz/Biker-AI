// server.ts
import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import https from "https";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore/lite";
import { initializeApp as initializeAdminApp, getApp as getAdminApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
dotenv.config();
var SUBSCRIPTION_PRICE_BRL = 16.9;
var configPath = path.join(process.cwd(), "firebase-applet-config.json");
var firebaseAppletConfig = {};
if (fs.existsSync(configPath)) {
  try {
    firebaseAppletConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (err) {
    console.error("Erro ao carregar firebase-applet-config.json:", err.message);
  }
}
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
  console.log("[Firebase Config] Vari\xE1veis de ambiente aplicadas.");
}
var firestoreDb = null;
var useFirestore = false;
try {
  if (firebaseAppletConfig && firebaseAppletConfig.projectId && firebaseAppletConfig.apiKey) {
    const firebaseApp = getApps().length === 0 ? initializeApp({
      apiKey: firebaseAppletConfig.apiKey,
      authDomain: firebaseAppletConfig.authDomain,
      projectId: firebaseAppletConfig.projectId,
      appId: firebaseAppletConfig.appId,
      storageBucket: firebaseAppletConfig.storageBucket,
      messagingSenderId: firebaseAppletConfig.messagingSenderId
    }) : getApp();
    firestoreDb = getFirestore(firebaseApp, firebaseAppletConfig.firestoreDatabaseId || void 0);
    useFirestore = true;
    console.log("[Firebase Lite] Inicializado com sucesso para o projeto:", firebaseAppletConfig.projectId);
  } else {
    console.log("[Firebase Lite] Desativado. Usando apenas persist\xEAncia local.");
  }
} catch (err) {
  console.error("[Firebase Lite] Falha ao inicializar. Usando persist\xEAncia local:", err.message);
  firestoreDb = null;
  useFirestore = false;
}
var adminFirestoreDb = null;
try {
  if (firebaseAppletConfig && firebaseAppletConfig.projectId) {
    const adminConfig = {
      projectId: firebaseAppletConfig.projectId
    };
    const serviceAccountPath = path.join(process.cwd(), "service-account.json");
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        adminConfig.credential = cert(serviceAccount);
        console.log("[Firebase Admin] Inicializado com credencial de FIREBASE_SERVICE_ACCOUNT.");
      } catch (keyErr) {
        console.error("[Firebase Admin] Erro ao carregar FIREBASE_SERVICE_ACCOUNT:", keyErr.message);
      }
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        adminConfig.credential = cert(serviceAccount);
        console.log("[Firebase Admin] Inicializado com credencial de FIREBASE_SERVICE_ACCOUNT_KEY.");
      } catch (keyErr) {
        console.error("[Firebase Admin] Erro ao carregar FIREBASE_SERVICE_ACCOUNT_KEY:", keyErr.message);
      }
    } else if (fs.existsSync(serviceAccountPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
        adminConfig.credential = cert(serviceAccount);
        console.log("[Firebase Admin] Carregando credenciais do arquivo service-account.json...");
      } catch (keyErr) {
        console.error("[Firebase Admin] Erro ao carregar service-account.json:", keyErr.message);
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        adminConfig.credential = applicationDefault();
        console.log("[Firebase Admin] Inicializando com Application Default Credentials (ADC)...");
      } catch (adcErr) {
        console.warn("[Firebase Admin] ADC n\xE3o dispon\xEDvel no ambiente atual:", adcErr.message);
      }
    }
    if (adminConfig.credential) {
      initializeAdminApp(adminConfig);
      let firestoreInstance;
      try {
        if (firebaseAppletConfig.firestoreDatabaseId) {
          firestoreInstance = getAdminFirestore(getAdminApp(), firebaseAppletConfig.firestoreDatabaseId);
        } else {
          firestoreInstance = getAdminFirestore(getAdminApp());
        }
      } catch (e) {
        console.warn("[Firebase Admin] Falha ao iniciar firestore com databaseId, tentando padr\xE3o:", e.message);
        firestoreInstance = getAdminFirestore(getAdminApp());
      }
      adminFirestoreDb = firestoreInstance;
      console.log("[Firebase Admin] Inicializado com sucesso para o projeto:", firebaseAppletConfig.projectId);
    } else {
      console.log("[Firebase Admin] Credenciais de conta de servi\xE7o n\xE3o encontradas. Usando Firestore Lite SDK.");
    }
  }
} catch (err) {
  console.warn("[Firebase Admin] Falha ao inicializar Admin SDK:", err.message);
}
var USERS_DB_PATH = process.env.VERCEL ? path.join(os.tmpdir(), "users_db.json") : path.join(process.cwd(), "users_db.json");
try {
  const bootLogPath = process.env.VERCEL ? path.join(os.tmpdir(), "server_boot.log") : path.join(process.cwd(), "server_boot.log");
  fs.writeFileSync(
    bootLogPath,
    `Server boot started at: ${(/* @__PURE__ */ new Date()).toISOString()}
Local DB Path: ${USERS_DB_PATH}
`,
    "utf-8"
  );
} catch (e) {
  console.error("Failed to write startup log:", e);
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1e5, 64, "sha256").toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (!storedHash.includes(":")) {
    return password === storedHash;
  }
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const testHash = crypto.pbkdf2Sync(password, salt, 1e5, 64, "sha256").toString("hex");
  try {
    const a = Buffer.from(testHash);
    const b = Buffer.from(hash);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
var googlePublicKeys = {};
var keysExpiryTime = 0;
async function fetchGooglePublicKeys() {
  if (Date.now() < keysExpiryTime && Object.keys(googlePublicKeys).length > 0) {
    return googlePublicKeys;
  }
  return new Promise((resolve, reject) => {
    const req = https.get("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com", (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          googlePublicKeys = JSON.parse(data);
          const cacheControl = res.headers["cache-control"] || "";
          const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
          const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) * 1e3 : 3600 * 1e3;
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
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}
var tokenVerificationCache = /* @__PURE__ */ new Map();
function setTestAuthToken(token, decodedPayload, ttlMs = 3e5) {
  tokenVerificationCache.set(token, { decoded: decodedPayload, exp: Date.now() + ttlMs });
}
async function verifyFirebaseIdToken(token, projectId) {
  const cached = tokenVerificationCache.get(token);
  if (cached && cached.exp > Date.now()) {
    return cached.decoded;
  }
  let decodedToken = null;
  try {
    let adminApp = null;
    try {
      adminApp = getAdminApp();
    } catch {
    }
    if (adminApp) {
      decodedToken = await getAdminAuth(adminApp).verifyIdToken(token);
    }
  } catch (adminErr) {
  }
  if (!decodedToken) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const [headerB64, payloadB64, signatureB64] = parts;
        const header = JSON.parse(base64UrlDecode(headerB64));
        const payload = JSON.parse(base64UrlDecode(payloadB64));
        const signature = Buffer.from(signatureB64, "base64url");
        const now = Math.floor(Date.now() / 1e3);
        const isClaimsValid = payload.exp > now && payload.iss === `https://securetoken.google.com/${projectId}` && payload.aud === projectId && Boolean(payload.sub);
        if (isClaimsValid) {
          if (header.alg === "RS256") {
            try {
              const keys = await fetchGooglePublicKeys();
              const cert2 = keys[header.kid];
              if (cert2) {
                const verifier = crypto.createVerify("SHA256");
                verifier.update(`${headerB64}.${payloadB64}`);
                if (verifier.verify(cert2, signature)) {
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
    } catch (fastErr) {
    }
  }
  if (!decodedToken) {
    throw new Error("Token de autentica\xE7\xE3o inv\xE1lido ou expirado");
  }
  const expMs = decodedToken.exp ? decodedToken.exp * 1e3 : Date.now() + 6e4;
  tokenVerificationCache.set(token, { decoded: decodedToken, exp: Math.min(expMs, Date.now() + 6e4) });
  if (tokenVerificationCache.size > 200) {
    tokenVerificationCache.clear();
  }
  return decodedToken;
}
var MASTER_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "pedro.bramos@sempreceub.com").trim().toLowerCase();
function verifyAdminSecret(providedSecret) {
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
fetchGooglePublicKeys().catch(() => {
});
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const adminPassword = req.headers["x-admin-password"] || req.body?.adminPassword;
    const requestPath = (req.originalUrl || req.path || "").toString();
    const isAdminRoute = requestPath.startsWith("/api/admin/");
    if (adminPassword && verifyAdminSecret(adminPassword)) {
      if (isAdminRoute || requestPath === "") {
        req.user = { email: MASTER_ADMIN_EMAIL, isAdmin: true, role: "coach" };
        return next();
      }
      return res.status(403).json({ error: "Credencial administrativa n\xE3o pode ser usada em rotas de usu\xE1rio. Use um token de atleta ou a rota administrativa correta." });
    }
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Sess\xE3o inv\xE1lida ou ausente. Cabe\xE7alho de autoriza\xE7\xE3o n\xE3o fornecido." });
    }
    const token = authHeader.split("Bearer ")[1]?.trim();
    if (!token) {
      return res.status(401).json({ error: "Token de autoriza\xE7\xE3o vazio." });
    }
    const projectId = firebaseAppletConfig.projectId;
    if (!projectId) {
      return res.status(500).json({ error: "Configura\xE7\xE3o do Firebase incompleta no servidor." });
    }
    const decodedToken = await verifyFirebaseIdToken(token, projectId);
    const tokenEmail = normalizeEmail(decodedToken?.email || decodedToken?.firebase?.identities?.email?.[0]);
    if (!tokenEmail) {
      return res.status(401).json({ error: "Token n\xE3o cont\xE9m uma identidade ou e-mail v\xE1lido." });
    }
    req.user = decodedToken || {};
    req.user.email = tokenEmail;
    return next();
  } catch (err) {
    console.warn("[RequireAuth] Falha na valida\xE7\xE3o do token:", err.message);
    return res.status(401).json({ error: `Sess\xE3o inv\xE1lida ou expirada: ${err.message}` });
  }
}
function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return null;
  }
  return normalized;
}
function findUserInDb(db, email) {
  if (!email || !db) return null;
  const emailKey = normalizeEmail(email) || email.trim().toLowerCase();
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
async function verifyUserMatch(req, res, next) {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: "Sess\xE3o inv\xE1lida ou n\xE3o autenticada." });
  }
  const authEmail = normalizeEmail(req.user.email) || req.user.email.toString().trim().toLowerCase();
  const requestedEmail = req.body?.email || req.body?.profile?.email || req.query?.email || req.headers["x-user-email"];
  if (!requestedEmail) {
    return next();
  }
  const bodyEmail = normalizeEmail(requestedEmail.toString()) || requestedEmail.toString().trim().toLowerCase();
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
    console.error("[VerifyUserMatch] Erro ao consultar privil\xE9gios no BD:", e);
  }
  return res.status(403).json({ error: "Acesso negado. Permiss\xE3o restrita aos pr\xF3prios dados do atleta ou ao treinador." });
}
function isTrialActive(profile) {
  if (!profile || !profile.createdAt) return false;
  if (profile.subscriptionStatus === "expired") return false;
  const created = new Date(profile.createdAt).getTime();
  if (isNaN(created)) return false;
  const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1e3;
  return Date.now() - created <= TRIAL_DURATION_MS;
}
function hasActiveAccess(profile, userEmail) {
  if (!profile) return false;
  const emailToCheck = (profile?.email || userEmail || "").trim().toLowerCase();
  const isCoach = profile?.role === "coach" || profile?.role === "admin" || emailToCheck === MASTER_ADMIN_EMAIL;
  if (isCoach) return true;
  if (profile.subscriptionStatus === "expired") return false;
  if (profile.subscriptionStatus === "active") return true;
  return isTrialActive(profile);
}
var PROFILE_FIELD_ALLOWLIST = /* @__PURE__ */ new Set([
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
function sanitizeUserProfileInput(incomingProfile, existingProfile = {}) {
  const sanitized = { ...existingProfile || {} };
  if (!incomingProfile || typeof incomingProfile !== "object") {
    return sanitized;
  }
  for (const [key, value] of Object.entries(incomingProfile)) {
    if (!PROFILE_FIELD_ALLOWLIST.has(key) || value === void 0) continue;
    sanitized[key] = value;
  }
  if (sanitized.role !== "coach" && sanitized.role !== "admin") {
    sanitized.role = existingProfile?.role || "athlete";
  }
  sanitized.isCoach = Boolean(existingProfile?.isCoach === true || sanitized.role === "coach");
  sanitized.subscriptionStatus = existingProfile?.subscriptionStatus || "pending_payment";
  sanitized.subscriptionPlan = existingProfile?.subscriptionPlan || "Plano Pro";
  sanitized.subscriptionExpiresAt = existingProfile?.subscriptionExpiresAt || "2026-12-31";
  sanitized.createdAt = existingProfile?.createdAt || (/* @__PURE__ */ new Date()).toISOString();
  return sanitized;
}
function sanitizePlanForUser(plan, profile, userEmail) {
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
    workouts: (plan.workouts || []).map((w) => ({
      ...w,
      structure: "[Conte\xFAdo Exclusivo - Assine o Biker AI para desbloquear a estrutura minuto a minuto e % de FTP]",
      tip: "[Assine o Biker AI para acessar as instru\xE7\xF5es fisiol\xF3gicas e dicas do treinador]",
      isLocked: true
    })),
    observations: plan.observations ? "[Conte\xFAdo Exclusivo - Assine o Biker AI para visualizar as observa\xE7\xF5es t\xE9cnicas completas do treinador.]" : "",
    evaluation: plan.evaluation ? "[Conte\xFAdo Exclusivo - Assine o Biker AI para visualizar a avalia\xE7\xE3o fisiol\xF3gica completa.]" : ""
  };
}
async function requireAdmin(req, res, next) {
  const adminPassword = req.headers["x-admin-password"] || req.body?.adminPassword;
  if (adminPassword && verifyAdminSecret(adminPassword)) {
    req.user = req.user || {};
    if (!req.user.email) req.user.email = MASTER_ADMIN_EMAIL;
    return next();
  }
  const authEmail = (req.user?.email || "").toString().trim().toLowerCase();
  if (!authEmail) {
    return res.status(401).json({ error: "Sess\xE3o inv\xE1lida. Realize login para continuar." });
  }
  if (authEmail === MASTER_ADMIN_EMAIL) {
    return next();
  }
  try {
    const db = await getDatabase();
    const userFound = findUserInDb(db, authEmail);
    if (userFound && userFound.user?.profile && (userFound.user.profile.role === "coach" || userFound.user.profile.role === "admin" || userFound.user.profile.isCoach === true)) {
      return next();
    }
  } catch (e) {
    console.error("Erro ao verificar papel do usu\xE1rio:", e);
  }
  return res.status(403).json({ error: "Acesso restrito. Opera\xE7\xE3o exclusiva do treinador/coach." });
}
var app = express();
app.use(express.json());
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
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";
  const userAgent = (req.headers["user-agent"] || "").slice(0, 100);
  const logMsg = `[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${req.url} - IP: ${clientIp} - UA: ${userAgent}
`;
  try {
    const requestsLogPath = process.env.VERCEL ? path.join(os.tmpdir(), "server_requests.log") : path.join(process.cwd(), "server_requests.log");
    fs.appendFileSync(requestsLogPath, logMsg, "utf-8");
  } catch (e) {
  }
  next();
});
var rateLimitStore = /* @__PURE__ */ new Map();
function createRateLimiter(options) {
  const { windowMs, max, message, keyPrefix = "global" } = options;
  return (req, res, next) => {
    const path2 = req.originalUrl || req.url;
    if (!path2.startsWith("/api")) {
      return next();
    }
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || req.socket.remoteAddress || "unknown";
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
    const resetSeconds = Math.ceil((record.resetTime - now) / 1e3);
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);
    if (record.count > max) {
      res.setHeader("Retry-After", resetSeconds);
      console.warn(`[RateLimit] IP ${clientIp} excedeu o limite na rota ${path2} (${record.count}/${max})`);
      return res.status(429).json({ error: message, retryAfter: resetSeconds });
    }
    next();
  };
}
var generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1e3,
  max: 120,
  message: "Muitas requisi\xE7\xF5es enviadas em curto intervalo. Por favor, aguarde alguns instantes.",
  keyPrefix: "api-general"
});
var authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1e3,
  max: 30,
  message: "Muitas tentativas de login ou registro. Por favor, aguarde 15 minutos para tentar novamente.",
  keyPrefix: "api-auth"
});
var aiGenerationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1e3,
  max: 25,
  message: "Limite de solicita\xE7\xF5es de Intelig\xEAncia Artificial atingido. Por favor, aguarde alguns minutos antes de gerar novos treinos.",
  keyPrefix: "api-ai"
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/generate-plan", aiGenerationLimiter);
app.use("/api/evaluate-workout", aiGenerationLimiter);
app.use("/api/parse-strava", aiGenerationLimiter);
app.use("/api", generalApiLimiter);
var inMemoryDbCache = null;
var inMemoryDbCacheTimestamp = 0;
var inMemoryDbCacheSource = "local_cache";
var DB_CACHE_TTL_MS = 3e4;
function getAuthToken(req) {
  const authHeader = req?.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split("Bearer ")[1];
  }
  return void 0;
}
function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (value === void 0) return null;
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.filter((v) => v !== void 0).map(toFirestoreValue) } };
  if (typeof value === "object") {
    const fields = {};
    for (const key of Object.keys(value)) {
      if (value[key] !== void 0) {
        fields[key] = toFirestoreValue(value[key]);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}
function toFirestoreDocument(fields) {
  const docFields = {};
  for (const key of Object.keys(fields)) {
    if (fields[key] !== void 0) {
      docFields[key] = toFirestoreValue(fields[key]);
    }
  }
  return { fields: docFields };
}
function fromFirestoreValue(val) {
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
    const res = {};
    const fields = val.mapValue?.fields || {};
    for (const k of Object.keys(fields)) res[k] = fromFirestoreValue(fields[k]);
    return res;
  }
  return val;
}
function fromFirestoreDocument(doc2) {
  if (!doc2 || !doc2.fields) return {};
  const res = {};
  for (const k of Object.keys(doc2.fields)) res[k] = fromFirestoreValue(doc2.fields[k]);
  return res;
}
async function fetchFirestoreUsers(idToken) {
  if (adminFirestoreDb) {
    try {
      const snapshot2 = await adminFirestoreDb.collection("users").get();
      const users2 = {};
      snapshot2.forEach((doc2) => {
        users2[doc2.id] = doc2.data();
      });
      return users2;
    } catch (err) {
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
        const users2 = {};
        if (data.documents && Array.isArray(data.documents)) {
          for (const d of data.documents) {
            const docId = d.name.split("/").pop();
            users2[docId] = fromFirestoreDocument(d);
          }
        }
        return users2;
      }
    } catch (restErr) {
    }
  }
  if (!useFirestore || !firestoreDb) throw new Error("Firestore n\xE3o est\xE1 habilitado.");
  const colRef = collection(firestoreDb, "users");
  const snapshot = await getDocs(colRef);
  const users = {};
  snapshot.docs.forEach((doc2) => {
    users[doc2.id] = doc2.data();
  });
  return users;
}
async function fetchFirestoreUser(email, idToken) {
  const emailKey = email.trim().toLowerCase();
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return { found: false };
  }
  if (adminFirestoreDb) {
    try {
      const docSnap = await adminFirestoreDb.collection("users").doc(emailKey).get();
      if (docSnap.exists) return { found: true, data: docSnap.data() };
      return { found: false };
    } catch (err) {
    }
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
    } catch (restErr) {
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
    } catch (e) {
      return { found: false, error: e.message };
    }
  }
  return { found: false };
}
async function saveFirestoreUser(email, userData, idToken) {
  const emailKey = email.trim().toLowerCase();
  let lastError = null;
  if (adminFirestoreDb) {
    try {
      await adminFirestoreDb.collection("users").doc(emailKey).set(userData);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error("[Firestore] Falha ao salvar com Admin SDK:", lastError.message);
    }
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
      lastError = new Error(`Firestore REST retornou ${res.status}: ${await res.text()}`);
    } catch (restErr) {
      lastError = restErr instanceof Error ? restErr : new Error(String(restErr));
    }
  }
  if (useFirestore && firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "users", emailKey);
      await setDoc(docRef, userData);
      return;
    } catch (err) {
      lastError = lastError || (err instanceof Error ? err : new Error(String(err)));
    }
  }
  if (lastError) {
    console.warn(`[Firestore] Aviso de sincroniza\xE7\xE3o para ${emailKey}:`, lastError.message);
  }
}
async function deleteFirestoreUser(email, idToken) {
  const emailKey = email.trim().toLowerCase();
  const cleanKey = emailKey.replace(/[^a-z0-9]/g, "_");
  const keysToDelete = Array.from(/* @__PURE__ */ new Set([emailKey, cleanKey]));
  if (adminFirestoreDb) {
    try {
      for (const k of keysToDelete) {
        await adminFirestoreDb.collection("users").doc(k).delete().catch(() => {
        });
      }
      const snapshot = await adminFirestoreDb.collection("users").get().catch(() => null);
      if (snapshot) {
        snapshot.forEach((doc2) => {
          const data = doc2.data();
          const docEmail = data?.email?.trim()?.toLowerCase();
          if (docEmail === emailKey || keysToDelete.includes(doc2.id)) {
            doc2.ref.delete().catch(() => {
            });
          }
        });
      }
      return;
    } catch (err) {
    }
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
        }).catch(() => {
        });
      }
    } catch (restErr) {
    }
  }
  if (useFirestore && firestoreDb) {
    try {
      for (const k of keysToDelete) {
        const docRef = doc(firestoreDb, "users", k);
        await deleteDoc(docRef).catch(() => {
        });
      }
    } catch (e) {
    }
  }
}
async function getDatabaseWithSource(forceRefresh = false, idToken) {
  const isCacheValid = inMemoryDbCache && Date.now() - inMemoryDbCacheTimestamp < DB_CACHE_TTL_MS;
  if (!forceRefresh && isCacheValid && inMemoryDbCache) {
    return { db: inMemoryDbCache, source: inMemoryDbCacheSource };
  }
  const localDb = {};
  let resolvedSource = "local_cache";
  if (useFirestore) {
    try {
      const users = await fetchFirestoreUsers(idToken);
      if (Object.keys(users).length > 0) {
        Object.assign(localDb, users);
        resolvedSource = "firestore";
      }
    } catch (err) {
    }
  }
  if (Object.keys(localDb).length === 0) {
    try {
      if (fs.existsSync(USERS_DB_PATH)) {
        const data = fs.readFileSync(USERS_DB_PATH, "utf-8");
        Object.assign(localDb, JSON.parse(data));
        resolvedSource = "local_cache";
      }
    } catch (localErr) {
    }
  }
  if (!findUserInDb(localDb, MASTER_ADMIN_EMAIL)) {
    localDb[MASTER_ADMIN_EMAIL] = {
      email: MASTER_ADMIN_EMAIL,
      profile: {
        name: "Pedro Ramos (Treinador Master)",
        level: "avan\xE7ado",
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
async function getDatabase(forceRefresh = false, idToken) {
  const result = await getDatabaseWithSource(forceRefresh, idToken);
  return result.db;
}
var BACKUPS_DIR = process.env.VERCEL ? path.join(os.tmpdir(), "db_backups") : path.join(process.cwd(), "db_backups");
var lastAutomaticBackupTime = 0;
async function triggerAutomaticBackup(db) {
  const now = Date.now();
  if (now - lastAutomaticBackupTime < 10 * 60 * 1e3) return;
  lastAutomaticBackupTime = now;
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const filename = `users_db_backup_${timestamp}.json`;
    const backupPath = path.join(BACKUPS_DIR, filename);
    await fs.promises.writeFile(backupPath, JSON.stringify(db, null, 2), "utf-8");
    const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.startsWith("users_db_backup_") && f.endsWith(".json")).map((f) => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime() })).sort((a, b) => b.time - a.time);
    if (files.length > 10) {
      for (const file of files.slice(10)) {
        fs.unlinkSync(path.join(BACKUPS_DIR, file.name));
      }
    }
  } catch (err) {
  }
}
async function createDatabaseBackup(db, filename) {
  await fs.promises.mkdir(BACKUPS_DIR, { recursive: true });
  const backupName = filename || `users_db_backup_${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.json`;
  if (!/^users_db_backup_[A-Za-z0-9_.-]+\.json$/.test(backupName)) {
    throw new Error("Nome de backup inv\xE1lido.");
  }
  await fs.promises.writeFile(path.join(BACKUPS_DIR, backupName), JSON.stringify(db, null, 2), "utf-8");
  return backupName;
}
async function saveDatabase(db, targetEmail, idToken) {
  inMemoryDbCache = db;
  inMemoryDbCacheTimestamp = Date.now();
  let firestoreSuccess = false;
  let firestoreError = null;
  if (useFirestore) {
    try {
      if (targetEmail) {
        const emailKey = targetEmail.trim().toLowerCase();
        const target = findUserInDb(db, emailKey);
        if (!target) throw new Error("Usu\xE1rio n\xE3o encontrado para persist\xEAncia.");
        await saveFirestoreUser(emailKey, target.user, idToken);
        firestoreSuccess = true;
      } else {
        const results = await Promise.allSettled(
          Object.keys(db).map((email) => saveFirestoreUser(email, db[email], idToken))
        );
        const failed = results.find((result) => result.status === "rejected");
        if (failed) {
          firestoreError = failed.reason;
        } else {
          firestoreSuccess = true;
        }
      }
    } catch (err) {
      firestoreError = err;
    }
  }
  let diskSuccess = false;
  let diskError = null;
  try {
    await fs.promises.writeFile(USERS_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    diskSuccess = true;
    triggerAutomaticBackup(db).catch(() => {
    });
  } catch (err) {
    diskError = err;
  }
  if (!diskSuccess && !firestoreSuccess) {
    console.warn(`[SaveDatabase] Aviso de persist\xEAncia f\xEDsica (disco: ${diskError?.message}, firestore: ${firestoreError?.message}). Usu\xE1rio mantido em mem\xF3ria.`);
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
        await Promise.all(userEmails.map((email) => saveFirestoreUser(email, localDb[email]).catch(() => {
        })));
      }
    }
  } catch (err) {
  }
}
var isDirectRun = Boolean(
  process.argv[1] && (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.cjs") || process.argv[1].endsWith("server.js"))
);
if (isDirectRun && process.env.NODE_ENV !== "test" && !process.env.VITEST && !process.env.VERCEL) {
  runInitialMigration().then(() => ensureAllAthletesArePending()).catch(() => {
  });
}
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
          if (!user.profile.subscriptionStatus) {
            user.profile.subscriptionStatus = "pending_payment";
            changed = true;
          }
          if (user.profile.subscriptionPlan !== "Plano Pro") {
            user.profile.subscriptionPlan = "Plano Pro";
            changed = true;
          }
        } else {
          if (user.profile.role !== "coach") {
            user.profile.role = "coach";
            changed = true;
          }
          if (user.profile.subscriptionPlan !== "Acesso Master (Coach)") {
            user.profile.subscriptionPlan = "Acesso Master (Coach)";
            changed = true;
          }
          if (user.profile.subscriptionStatus !== "active") {
            user.profile.subscriptionStatus = "active";
            changed = true;
          }
        }
        if (changed) updatedCount++;
      }
    }
    if (updatedCount > 0) {
      await saveDatabase(db);
    }
  } catch (err) {
  }
}
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Dados inv\xE1lidos de cadastro." });
    }
    const db = await getDatabase();
    const emailKey = email.trim().toLowerCase();
    if (db[emailKey]) {
      const existing = db[emailKey];
      const isBootstrappedWithoutPassword = !existing.password;
      const hasNoPlanOrWorkouts = (!existing.plan || Object.keys(existing.plan).length === 0) && (!existing.workoutLogs || existing.workoutLogs.length === 0);
      if (isBootstrappedWithoutPassword || hasNoPlanOrWorkouts) {
        existing.password = hashPassword(password);
        if (existing.profile) existing.profile.name = name.trim();
        await saveDatabase(db, emailKey, getAuthToken(req));
        const responseUser2 = { ...existing };
        delete responseUser2.password;
        return res.json({ success: true, user: responseUser2 });
      }
      return res.status(400).json({ error: "Este endere\xE7o de e-mail j\xE1 est\xE1 cadastrado. Fa\xE7a login para acessar." });
    }
    const customWelcomeText = `Ol\xE1, ${name.trim()}! Que excelente ver voc\xEA aqui na Biker AI. Eu sou o seu Treinador de Ciclismo pessoal.

Minhas planilhas e conselhos s\xE3o focados em melhorar o seu f\xF4lego e resist\xEAncia de forma simples e segura, ajustando seus treinos por pot\xEAncia, batimentos do cora\xE7\xE3o ou pelas suas percep\xE7\xF5es de cansa\xE7o.

Para come\xE7armos a planejar sua evolu\xE7\xE3o de forma personalizada, preciso te conhecer melhor atrav\xE9s de algumas perguntas r\xE1pidas no nosso chat.

Como voc\xEA j\xE1 se cadastrou, podemos iniciar o question\xE1rio agora mesmo. **Qual \xE9 o seu tempo m\xE9dio pedalando ou seu n\xEDvel atual no ciclismo?**`;
    const isCoachEmail = email.trim().toLowerCase() === MASTER_ADMIN_EMAIL;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const newProfile = {
      name: name.trim(),
      level: "intermedi\xE1rio",
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
      subscriptionPlan: isCoachEmail ? "Acesso Master (Coach)" : "Plano Pro",
      role: isCoachEmail ? "coach" : "athlete",
      createdAt: nowIso
    };
    if (isCoachEmail) {
      newProfile.subscriptionExpiresAt = "2030-12-31";
    }
    const initialChat = [
      {
        id: "welcome-registered",
        sender: "treinador",
        text: customWelcomeText,
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
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
    delete responseUser.password;
    res.json({ success: true, user: responseUser });
  } catch (error) {
    console.error("[Auth/Register] Falha no cadastro central:", error);
    res.status(500).json({
      error: error.message || "N\xE3o foi poss\xEDvel salvar seu cadastro central.",
      detail: process.env.NODE_ENV === "production" ? void 0 : error.message
    });
  }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha s\xE3o obrigat\xF3rios." });
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
      if (!user.profile.subscriptionStatus) user.profile.subscriptionStatus = user.profile.role === "coach" ? "active" : "pending_payment";
      if (!user.profile.subscriptionPlan) user.profile.subscriptionPlan = "Plano Pro";
      if (!user.profile.subscriptionExpiresAt) user.profile.subscriptionExpiresAt = "2026-12-31";
      if (!user.profile.createdAt) user.profile.createdAt = user.createdAt;
    }
    const responseUser = { ...user };
    delete responseUser.password;
    if (responseUser.plan) {
      responseUser.plan = sanitizePlanForUser(responseUser.plan, responseUser.profile, responseUser.email);
    }
    res.json({ success: true, user: responseUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/auth/save-user", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const { email, userAccount, password } = req.body;
    if (!email || !userAccount || typeof userAccount !== "object") {
      return res.status(400).json({ error: "Dados para sincroniza\xE7\xE3o inv\xE1lidos." });
    }
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ error: "E-mail inv\xE1lido." });
    }
    const db = await getDatabase();
    const userFound = findUserInDb(db, normalizedEmail);
    let targetKey;
    let existingUser;
    if (!userFound) {
      targetKey = normalizedEmail;
      const isMaster = targetKey === MASTER_ADMIN_EMAIL;
      existingUser = {
        email: targetKey,
        profile: {
          name: isMaster ? "Pedro Ramos" : targetKey.split("@")[0],
          role: isMaster ? "coach" : "athlete",
          isCoach: isMaster,
          subscriptionStatus: isMaster ? "active" : "pending_payment",
          subscriptionPlan: isMaster ? "Acesso Master (Coach)" : "Plano Pro",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
    const requesterEmail = normalizeEmail(req.user?.email || "") || (req.user?.email || "").toString().trim().toLowerCase();
    const adminHeader = req.headers["x-admin-password"];
    const adminSecretStr = typeof adminHeader === "string" ? adminHeader : void 0;
    const isAdminCaller = Boolean(
      adminSecretStr && verifyAdminSecret(adminSecretStr) || requesterEmail === MASTER_ADMIN_EMAIL
    );
    const existingCreatedAt = existingUser?.profile?.createdAt || existingUser?.createdAt || (/* @__PURE__ */ new Date()).toISOString();
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
      plan: userAccount.plan !== void 0 ? userAccount.plan : existingUser.plan,
      feedbacks: userAccount.feedbacks !== void 0 ? userAccount.feedbacks : existingUser.feedbacks || [],
      workoutLogs: userAccount.workoutLogs !== void 0 ? userAccount.workoutLogs : existingUser.workoutLogs || [],
      chatHistory: userAccount.chatHistory !== void 0 ? userAccount.chatHistory : existingUser.chatHistory || [],
      password: preservedPassword,
      createdAt: existingCreatedAt
    };
    const responseUser = { ...db[targetKey] };
    delete responseUser.password;
    await saveDatabase(db, targetKey, getAuthToken(req));
    res.json({ success: true, user: responseUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/auth/session", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail \xE9 obrigat\xF3rio." });
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
        return res.status(503).json({ error: "Falha tempor\xE1ria ao consultar dados do atleta na nuvem. Tente novamente." });
      }
    }
    if (!userFound) {
      const isMasterAdmin = emailLower === MASTER_ADMIN_EMAIL;
      const newProfile = {
        name: isMasterAdmin ? "Pedro Ramos" : req.user?.name || emailLower.split("@")[0],
        email: emailLower,
        role: isMasterAdmin ? "coach" : "athlete",
        isCoach: isMasterAdmin,
        subscriptionStatus: isMasterAdmin ? "active" : "pending_payment",
        subscriptionPlan: isMasterAdmin ? "Acesso Master (Coach)" : "Plano Pro",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        goal: "melhorar condicionamento",
        level: "intermedi\xE1rio",
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
      if (isMasterAdmin) {
        newProfile.subscriptionExpiresAt = "2030-12-31";
      }
      const newUserEntry = {
        email: emailLower,
        profile: newProfile,
        chatHistory: [],
        plan: null,
        feedbacks: [],
        workoutLogs: [],
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      db[emailLower] = newUserEntry;
      await saveDatabase(db, emailLower, getAuthToken(req));
      const responseUser2 = { ...newUserEntry };
      delete responseUser2.password;
      return res.json({ success: true, user: responseUser2 });
    }
    const responseUser = { ...userFound.user };
    delete responseUser.password;
    if (responseUser.plan) {
      responseUser.plan = sanitizePlanForUser(responseUser.plan, responseUser.profile, responseUser.email);
    }
    res.json({ success: true, user: responseUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/workout/log-completion", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const { email, log, workoutIndex, workout } = req.body;
    if (!email || !log) {
      return res.status(400).json({ error: "E-mail e dados do treino s\xE3o obrigat\xF3rios." });
    }
    const db = await getDatabase();
    const userFound = findUserInDb(db, email);
    if (!userFound) {
      return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
    }
    const targetKey = userFound.key;
    const user = userFound.user;
    if (!Array.isArray(user.workoutLogs)) {
      user.workoutLogs = [];
    }
    const existingLogIdx = user.workoutLogs.findIndex((l) => l.id === log.id);
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
        completedDate: log.completedAt ? log.completedAt.slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/auth/check-status", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail \xE9 obrigat\xF3rio." });
    const db = await getDatabase();
    const userFound = findUserInDb(db, email);
    if (!userFound) return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/user/notify-payment", async (req, res) => {
  try {
    const { email, method, note } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail \xE9 obrigat\xF3rio." });
    const db = await getDatabase();
    const userFound = findUserInDb(db, email);
    if (!userFound) return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
    const user = userFound.user;
    if (!user.feedbacks) user.feedbacks = [];
    const paymentFeedback = {
      id: `pay_notify_${Date.now()}`,
      userName: user.profile?.name || "Atleta",
      userEmail: user.email,
      text: `[AVISO DE PAGAMENTO - R$ ${SUBSCRIPTION_PRICE_BRL.toFixed(2).replace(".", ",")} Via Mercado Pago] Atleta informou que concluiu o pagamento via ${method || "Mercado Pago"}. ${note ? `Obs: ${note}` : "Aguardando ativa\xE7\xE3o no painel privado."}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    user.feedbacks.unshift(paymentFeedback);
    await saveDatabase(db, userFound.key, getAuthToken(req));
    res.json({ success: true, message: "Aviso de pagamento registrado para an\xE1lise do treinador." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/auth/verify-password", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "E-mail e senha s\xE3o obrigat\xF3rios para verifica\xE7\xE3o." });
    const db = await getDatabase();
    const userFound = findUserInDb(db, email);
    if (!userFound) return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
    res.json({ success: verifyPassword(password, userFound.user.password) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var currentApiKey = "";
var aiClient = null;
var getAiClient = () => {
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
  const responses = {
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
    } catch (err) {
      responses.firestoreConnection = "FAILED";
      responses.firestoreErrorMessage = err.message;
    }
  } else {
    responses.firestoreConnection = "DISABLED_OR_UNINITIALIZED";
  }
  try {
    const testCall = await callGeminiWithFallback(
      (model) => getAiClient().models.generateContent({
        model,
        contents: "Hi, please answer with exactly 'OK'."
      })
    );
    responses.geminiConnection = "SUCCESS";
    responses.geminiResponse = testCall.text;
  } catch (err) {
    responses.geminiConnection = "FAILED";
    responses.errorMessage = err.message;
  }
  res.json(responses);
});
var checkApiKey = () => {
  getAiClient();
};
var callGeminiWithFallback = async (requestFn, modelsToTry = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-pro"]) => {
  let lastError = null;
  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      const modelPromise = requestFn(model);
      const perModelTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout de 45s no modelo ${model}`)), 45e3);
      });
      return await Promise.race([modelPromise, perModelTimeout]);
    } catch (err) {
      lastError = err;
      if (i < modelsToTry.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
    }
  }
  throw lastError;
};
var withTimeout = (promise, ms = 25e3, errorMessage = "Timeout exceeding limit") => {
  let timeoutId;
  let didTimeout = false;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      reject(new Error(errorMessage));
    }, ms);
  });
  promise.catch((err) => {
    if (didTimeout) {
      console.warn("[Plano de Fundo] Exce\xE7\xE3o da API ap\xF3s limite de tempo:", err?.message || err);
    }
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};
var cleanAndParseJson = (text) => {
  let cleanText = text.trim();
  const tryParse = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
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
var fallbackOnboarding = (message, profile) => {
  const safeMsg = typeof message === "string" ? message : "";
  let currentStep = profile?.onboardingStep ? Number(profile.onboardingStep) : 1;
  if (currentStep === 1 && profile?.name) currentStep = 2;
  const nextStep = Math.min(10, currentStep + 1);
  return {
    reply: `Entendido! Seguindo a sua prepara\xE7\xE3o: me diga sobre a sua disponibilidade atual para os treinos.`,
    parsedProfile: { onboardingStep: nextStep }
  };
};
var fallbackGeneratePlan = (profile, nextWeekNum = 1) => {
  return {
    workouts: [],
    summary: `Planilha de Treinamento - Semana ${nextWeekNum}.`,
    observations: "Mantenha o foco em hidrata\xE7\xE3o e descanso.",
    evaluation: "Avalie pelo n\xEDvel de cansa\xE7o percebido.",
    weekNumber: nextWeekNum,
    coachMessage: "Inicie seus pedais mantendo consist\xEAncia!"
  };
};
var fallbackEvaluateWorkout = (workout, profile) => {
  return {
    aiFeedback: `Parab\xE9ns pelo treino realizado! Mantenha a disciplina de hidrata\xE7\xE3o e acompanhe as zonas de intensidade.`
  };
};
var fallbackChat = (message, profile, currentPlan, messageHistory = []) => {
  return {
    reply: `Ol\xE1, atleta! Para atingir sua meta no ciclismo com seguran\xE7a, mantenha a consist\xEAncia em Z2 e hidrate-se adequadamente.`,
    updatedPlan: null
  };
};
app.post("/api/onboard", requireAuth, verifyUserMatch, async (req, res) => {
  const { message, profile, messageHistory } = req.body;
  try {
    checkApiKey();
    const systemInstruction = `Voc\xEA \xE9 um treinador de ciclismo especialista. Fa\xE7a as perguntas uma a uma em formato JSON {"reply": string, "parsedProfile": object}.`;
    const response = await withTimeout(
      callGeminiWithFallback(
        (model) => getAiClient().models.generateContent({
          model,
          contents: `Mensagem: "${message}" | Perfil: ${JSON.stringify(profile)}`,
          config: { systemInstruction, responseMimeType: "application/json" }
        })
      )
    );
    res.json(cleanAndParseJson(response.text));
  } catch (error) {
    res.json(fallbackOnboarding(message, profile));
  }
});
app.post("/api/generate-plan", requireAuth, verifyUserMatch, async (req, res) => {
  const { profile } = req.body;
  try {
    checkApiKey();
    const response = await withTimeout(
      callGeminiWithFallback(
        (model) => getAiClient().models.generateContent({
          model,
          contents: `Gere uma planilha semanal em JSON para: ${JSON.stringify(profile)}`,
          config: { responseMimeType: "application/json" }
        })
      )
    );
    const fullPlanData = cleanAndParseJson(response.text);
    const userEmailKey = (profile?.email || req.user?.email || "").trim().toLowerCase();
    res.json(sanitizePlanForUser(fullPlanData, profile, userEmailKey));
  } catch (error) {
    const data = fallbackGeneratePlan(profile, 1);
    const userEmailKey = (profile?.email || req.user?.email || "").trim().toLowerCase();
    res.json(sanitizePlanForUser(data, profile, userEmailKey));
  }
});
app.post("/api/generate-next-week", requireAuth, verifyUserMatch, async (req, res) => {
  const { profile, currentPlan, nextWeekNumber } = req.body;
  try {
    const userEmailKey = (profile?.email || req.user?.email || "").trim().toLowerCase();
    if (!hasActiveAccess(profile, userEmailKey)) {
      return res.status(403).json({ error: "Acesso bloqueado. Assine o Biker AI.", isBlocked: true });
    }
    checkApiKey();
    const response = await withTimeout(
      callGeminiWithFallback(
        (model) => getAiClient().models.generateContent({
          model,
          contents: `Gere a Semana ${nextWeekNumber} em JSON para: ${JSON.stringify(profile)}`,
          config: { responseMimeType: "application/json" }
        })
      )
    );
    res.json(sanitizePlanForUser(cleanAndParseJson(response.text), profile, userEmailKey));
  } catch (error) {
    const data = fallbackGeneratePlan(profile, nextWeekNumber || 2);
    const userEmailKey = (profile?.email || req.user?.email || "").trim().toLowerCase();
    res.json(sanitizePlanForUser(data, profile, userEmailKey));
  }
});
app.post("/api/evaluate-workout", requireAuth, verifyUserMatch, async (req, res) => {
  const { profile, workout } = req.body;
  try {
    const userEmailKey = (profile?.email || req.user?.email || "").trim().toLowerCase();
    if (!hasActiveAccess(profile, userEmailKey)) {
      return res.status(403).json({ error: "Acesso bloqueado.", isBlocked: true });
    }
    checkApiKey();
    const response = await withTimeout(
      callGeminiWithFallback(
        (model) => getAiClient().models.generateContent({
          model,
          contents: `Avalie o treino realizado em JSON: ${JSON.stringify(workout)}`,
          config: { responseMimeType: "application/json" }
        })
      )
    );
    res.json(cleanAndParseJson(response.text));
  } catch (error) {
    res.json(fallbackEvaluateWorkout(workout, profile));
  }
});
app.post("/api/chat", requireAuth, verifyUserMatch, async (req, res) => {
  const { message, profile, currentPlan } = req.body;
  try {
    const userEmailKey = (profile?.email || req.user?.email || "").trim().toLowerCase();
    if (currentPlan && !hasActiveAccess(profile, userEmailKey)) {
      return res.json({
        reply: `Ol\xE1, atleta! Notei que o seu per\xEDodo de teste gratuito de 3 dias expirou (ou sua conta est\xE1 aguardando ativa\xE7\xE3o). Para continuar recebendo acompanhamento do treinador e planilhas personalizadas, assine o Plano Pro por apenas R$ ${SUBSCRIPTION_PRICE_BRL.toFixed(2).replace(".", ",")}/m\xEAs!`,
        isBlocked: true
      });
    }
    checkApiKey();
    const response = await withTimeout(
      callGeminiWithFallback(
        (model) => getAiClient().models.generateContent({
          model,
          contents: `Atleta: "${message}" | Perfil: ${JSON.stringify(profile)}`,
          config: { responseMimeType: "application/json" }
        })
      )
    );
    res.json(cleanAndParseJson(response.text));
  } catch (error) {
    res.json(fallbackChat(message, profile, currentPlan));
  }
});
app.post("/api/admin/verify-access", requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    const authEmail = (req.user?.email || "").toString().trim().toLowerCase();
    if (password && verifyAdminSecret(password) || authEmail === MASTER_ADMIN_EMAIL) {
      return res.json({ success: true, authorized: true });
    }
    const db = await getDatabase();
    const userFound = findUserInDb(db, authEmail);
    if (userFound?.user?.profile && (userFound.user.profile.role === "coach" || userFound.user.profile.role === "admin")) {
      return res.json({ success: true, authorized: true });
    }
    return res.status(403).json({ error: "Acesso administrativo negado." });
  } catch (err) {
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
        chatHistoryCount: Array.isArray(user.chatHistory) ? user.chatHistory.length : 0,
        hasPlan: Boolean(user.plan),
        planSummary: user.plan?.summary || "",
        feedbacks: Array.isArray(user.feedbacks) ? user.feedbacks : [],
        profile: {
          ...user.profile,
          subscriptionStatus: user.profile?.subscriptionStatus || (isCoach ? "active" : "pending_payment"),
          subscriptionPlan: isCoach ? "Acesso Master (Coach)" : user.profile?.subscriptionPlan || "Plano Pro"
        }
      };
    });
    res.json({ success: true, users: userList, source });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/admin/update-user-status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const status = req.body?.subscriptionStatus;
    const role = req.body?.role;
    if (!email) return res.status(400).json({ error: "E-mail do usu\xE1rio \xE9 obrigat\xF3rio." });
    if (!["active", "expired", "pending_payment"].includes(status)) {
      return res.status(400).json({ error: "Status de assinatura inv\xE1lido." });
    }
    if (role !== void 0 && !["athlete", "coach"].includes(role)) {
      return res.status(400).json({ error: "Papel de usu\xE1rio inv\xE1lido." });
    }
    const db = await getDatabase(true, getAuthToken(req));
    const userFound = findUserInDb(db, email);
    if (!userFound) return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
    if (email === MASTER_ADMIN_EMAIL && role === "athlete") {
      return res.status(403).json({ error: "O treinador principal n\xE3o pode ser rebaixado." });
    }
    const profile = userFound.user.profile || {};
    profile.subscriptionStatus = status;
    if (typeof req.body?.subscriptionPlan === "string" && req.body.subscriptionPlan.trim()) {
      profile.subscriptionPlan = req.body.subscriptionPlan.trim().slice(0, 100);
    }
    if (typeof req.body?.subscriptionExpiresAt === "string") {
      profile.subscriptionExpiresAt = req.body.subscriptionExpiresAt.trim().slice(0, 40);
    }
    if (role !== void 0) profile.role = role;
    if (req.body?.createdAt !== void 0) {
      const createdAt = new Date(req.body.createdAt);
      if (Number.isNaN(createdAt.getTime())) return res.status(400).json({ error: "Data de cria\xE7\xE3o inv\xE1lida." });
      profile.createdAt = createdAt.toISOString();
    }
    if (req.body?.ftp !== void 0) {
      const ftp = req.body.ftp === null || req.body.ftp === "" ? null : Number(req.body.ftp);
      if (ftp !== null && (!Number.isFinite(ftp) || ftp < 0 || ftp > 2e3)) return res.status(400).json({ error: "FTP inv\xE1lido." });
      profile.ftp = ftp;
    }
    if (req.body?.maxHeartRate !== void 0) {
      const maxHeartRate = req.body.maxHeartRate === null || req.body.maxHeartRate === "" ? null : Number(req.body.maxHeartRate);
      if (maxHeartRate !== null && (!Number.isFinite(maxHeartRate) || maxHeartRate < 30 || maxHeartRate > 250)) return res.status(400).json({ error: "Frequ\xEAncia card\xEDaca m\xE1xima inv\xE1lida." });
      profile.maxHeartRate = maxHeartRate;
    }
    userFound.user.profile = profile;
    await saveDatabase(db, userFound.key, getAuthToken(req));
    res.json({ success: true, user: { ...userFound.user, password: void 0 } });
  } catch (error) {
    console.error("[Admin/UpdateUser] Falha:", error);
    res.status(500).json({ error: "N\xE3o foi poss\xEDvel atualizar o usu\xE1rio." });
  }
});
app.post("/api/admin/delete-user", requireAuth, requireAdmin, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: "E-mail do usu\xE1rio \xE9 obrigat\xF3rio." });
    if (email === MASTER_ADMIN_EMAIL) return res.status(403).json({ error: "O treinador principal n\xE3o pode ser exclu\xEDdo." });
    const db = await getDatabase(true, getAuthToken(req));
    const userFound = findUserInDb(db, email);
    if (!userFound) return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
    delete db[userFound.key];
    await saveDatabase(db, void 0, getAuthToken(req));
    await deleteFirestoreUser(email, getAuthToken(req));
    try {
      const adminApp = getAdminApp();
      await getAdminAuth(adminApp).getUserByEmail(email).then((record) => getAdminAuth(adminApp).deleteUser(record.uid));
    } catch (error) {
      console.warn("[Admin/DeleteUser] N\xE3o foi poss\xEDvel remover a identidade Firebase:", error.message);
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[Admin/DeleteUser] Falha:", error);
    res.status(500).json({ error: "N\xE3o foi poss\xEDvel excluir o usu\xE1rio." });
  }
});
app.get("/api/admin/backups", requireAuth, requireAdmin, async (req, res) => {
  try {
    await fs.promises.mkdir(BACKUPS_DIR, { recursive: true });
    const entries = await fs.promises.readdir(BACKUPS_DIR, { withFileTypes: true });
    const backups = await Promise.all(entries.filter((entry) => entry.isFile() && /^users_db_backup_[A-Za-z0-9_.-]+\.json$/.test(entry.name)).map(async (entry) => {
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
  } catch (error) {
    res.status(500).json({ error: "N\xE3o foi poss\xEDvel listar os backups." });
  }
});
app.post("/api/admin/backups/create", requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = await getDatabase(true, getAuthToken(req));
    const filename = await createDatabaseBackup(db);
    res.json({ success: true, filename });
  } catch (error) {
    console.error("[Admin/BackupCreate] Falha:", error);
    res.status(500).json({ error: "N\xE3o foi poss\xEDvel criar o backup." });
  }
});
app.post("/api/admin/backups/restore", requireAuth, requireAdmin, async (req, res) => {
  try {
    const filename = typeof req.body?.filename === "string" ? req.body.filename : "";
    if (!/^users_db_backup_[A-Za-z0-9_.-]+\.json$/.test(filename)) {
      return res.status(400).json({ error: "Nome de backup inv\xE1lido." });
    }
    const backupPath = path.join(BACKUPS_DIR, filename);
    const backupDb = JSON.parse(await fs.promises.readFile(backupPath, "utf-8"));
    if (!backupDb || Array.isArray(backupDb) || typeof backupDb !== "object") {
      return res.status(400).json({ error: "Conte\xFAdo de backup inv\xE1lido." });
    }
    const currentDb = await getDatabase(true, getAuthToken(req));
    await createDatabaseBackup(currentDb);
    for (const currentEmail of Object.keys(currentDb)) {
      if (!Object.prototype.hasOwnProperty.call(backupDb, currentEmail)) {
        await deleteFirestoreUser(currentEmail, getAuthToken(req));
      }
    }
    await saveDatabase(backupDb, void 0, getAuthToken(req));
    res.json({ success: true });
  } catch (error) {
    console.error("[Admin/BackupRestore] Falha:", error);
    res.status(500).json({ error: "N\xE3o foi poss\xEDvel restaurar o backup." });
  }
});
function getPublicApiUrl(req) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (forwardedHost || req.get("host") || "localhost:3000").toString().split(",")[0].trim();
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = (forwardedProto || (req.secure ? "https" : "http")).toString().split(",")[0].trim();
  return `${protocol}://${host}`;
}
function isValidMercadoPagoSignature(req) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const signature = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  const dataId = (req.query?.["data.id"] || req.body?.data?.id || req.body?.id || "").toString().toLowerCase();
  if (typeof signature !== "string" || typeof requestId !== "string" || !dataId) return false;
  const parts = signature.split(",").reduce((result, part) => {
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
async function fetchMercadoPagoResource(resource) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN n\xE3o configurado.");
  const response = await fetch(`https://api.mercadopago.com${resource}`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Mercado Pago retornou ${response.status}: ${data?.message || "erro desconhecido"}`);
  return data;
}
async function activateUserFromMercadoPago(email, paymentId, plan = "Plano Pro") {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Mercado Pago n\xE3o retornou um e-mail de pagador v\xE1lido.");
  const db = await getDatabase();
  const userFound = findUserInDb(db, normalizedEmail);
  if (!userFound) {
    console.warn(`[Mercado Pago] Pagamento ${paymentId} recebido para usu\xE1rio inexistente: ${normalizedEmail}`);
    return false;
  }
  const user = userFound.user;
  if (user.profile?.mercadoPagoPaymentId === paymentId && user.profile?.subscriptionStatus === "active") return true;
  user.profile = {
    ...user.profile,
    subscriptionStatus: "active",
    subscriptionPlan: plan,
    subscriptionExpiresAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1e3).toISOString(),
    mercadoPagoPaymentId: paymentId,
    mercadoPagoUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveDatabase(db, userFound.key);
  return true;
}
async function updateUserSubscriptionByEmail(email, status, subscriptionId) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const db = await getDatabase();
  const userFound = findUserInDb(db, normalizedEmail);
  if (!userFound) return false;
  userFound.user.profile = {
    ...userFound.user.profile,
    subscriptionStatus: status,
    mercadoPagoSubscriptionId: subscriptionId,
    mercadoPagoUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveDatabase(db, userFound.key);
  return true;
}
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
    if (!accessToken) return res.status(503).json({ error: "Mercado Pago n\xE3o est\xE1 configurado neste ambiente." });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/mercadopago/create-subscription", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || req.user?.email);
    const cardTokenId = typeof req.body?.cardTokenId === "string" ? req.body.cardTokenId.trim() : "";
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const planId = process.env.MERCADO_PAGO_PREAPPROVAL_PLAN_ID;
    if (!email) return res.status(400).json({ error: "E-mail v\xE1lido \xE9 obrigat\xF3rio." });
    if (!cardTokenId) return res.status(400).json({ error: "Token do cart\xE3o \xE9 obrigat\xF3rio." });
    if (!accessToken) return res.status(503).json({ error: "Mercado Pago n\xE3o est\xE1 configurado neste ambiente." });
    if (!planId) return res.status(503).json({ error: "Plano do Mercado Pago n\xE3o est\xE1 configurado neste ambiente." });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/mercadopago/create-preference", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || req.user?.email);
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(503).json({ error: "Mercado Pago n\xE3o est\xE1 configurado neste ambiente." });
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
    if (!mpResponse.ok) return res.status(502).json({ error: mpData?.message || "Falha ao criar prefer\xEAncia." });
    res.json({ success: true, init_point: mpData.init_point, preferenceId: mpData.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/mercadopago/create-pix", requireAuth, verifyUserMatch, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || req.user?.email);
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(503).json({ error: "Mercado Pago n\xE3o est\xE1 configurado neste ambiente." });
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
    if (!responseMP.ok) return res.status(502).json({ error: mpData?.message || "Falha ao criar cobran\xE7a Pix." });
    res.json({
      success: true,
      qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/mercadopago/webhook", async (req, res) => {
  if (!isValidMercadoPagoSignature(req)) {
    return res.status(401).json({ error: "Assinatura do webhook inv\xE1lida." });
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
      const subscriptionStatus = subscription.status === "authorized" ? "active" : subscription.status === "pending" ? "pending_payment" : "expired";
      await updateUserSubscriptionByEmail(
        subscription.external_reference || subscription.payer_email,
        subscriptionStatus,
        resourceId
      );
    }
    return res.sendStatus(200);
  } catch (error) {
    console.error("[Mercado Pago] Falha ao processar webhook:", error.message);
    return res.status(500).json({ error: "Falha tempor\xE1ria ao processar webhook." });
  }
});
async function bootstrap() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  if (!process.env.VERCEL) {
    app.listen(3e3, "0.0.0.0", () => {
      console.log("Server running on port 3000");
    });
  }
}
if (isDirectRun && process.env.NODE_ENV !== "test" && !process.env.VITEST && !process.env.VERCEL) {
  bootstrap().catch((err) => console.error("Failed to start server:", err));
}
var server_default = app;
export {
  MASTER_ADMIN_EMAIL,
  app,
  server_default as default,
  fetchFirestoreUser,
  fetchFirestoreUsers,
  findUserInDb,
  getDatabase,
  getDatabaseWithSource,
  hashPassword,
  requireAdmin,
  requireAuth,
  saveDatabase,
  setTestAuthToken,
  verifyAdminSecret,
  verifyPassword
};
