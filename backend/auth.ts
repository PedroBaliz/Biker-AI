// Autenticação e autorização: senhas, verificação do ID token do Firebase e os middlewares requireAuth, verifyUserMatch e requireAdmin.
import crypto from "crypto";
import https from "https";
import { getApp as getAdminApp, cert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { ADMIN_SECRET_IDENTITY, MASTER_ADMIN_EMAIL, firebaseAppletConfig, isMasterAdminEmail } from "./config";
import { getDatabase } from "./db";
import { findUserInDb, normalizeEmail } from "./util";

// --- CRYPTOGRAPHIC HELPERS & SECURITY MIDDLEWARES ---

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
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

export let googlePublicKeys: Record<string, string> = {};
export let keysExpiryTime = 0;

export async function fetchGooglePublicKeys(): Promise<Record<string, string>> {
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

export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

export const tokenVerificationCache = new Map<string, { decoded: any; exp: number }>();

export function setTestAuthToken(token: string, decodedPayload: any, ttlMs = 300000) {
  tokenVerificationCache.set(token, { decoded: decodedPayload, exp: Date.now() + ttlMs });
}

export async function verifyFirebaseIdToken(token: string, projectId: string): Promise<any> {
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

export function verifyAdminSecret(providedSecret?: string): boolean {
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

export async function requireAuth(req: any, res: any, next: any) {
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

export async function verifyUserMatch(req: any, res: any, next: any) {
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
export function isCoachProfile(profile: any, email?: string | null): boolean {
  const e = (email || profile?.email || "").toString().trim().toLowerCase();
  return isMasterAdminEmail(e) ||
    profile?.role === "coach" ||
    profile?.role === "admin" ||
    profile?.isCoach === true;
}

export async function requireAdmin(req: any, res: any, next: any) {
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
