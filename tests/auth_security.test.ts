import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import {
  app,
  requireAuth,
  requireAdmin,
  verifyPassword,
  hashPassword,
  verifyAdminSecret,
  setTestAuthToken,
  MASTER_ADMIN_EMAIL
} from "../server";

const USERS_DB_PATH = path.join(process.cwd(), "users_db.json");
let initialDbBackup: string | null = null;

beforeAll(() => {
  if (fs.existsSync(USERS_DB_PATH)) {
    initialDbBackup = fs.readFileSync(USERS_DB_PATH, "utf-8");
  }
});

afterAll(() => {
  if (initialDbBackup !== null) {
    fs.writeFileSync(USERS_DB_PATH, initialDbBackup, "utf-8");
  }
});

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

describe("Security & Authentication Real Middleware Tests", () => {
  describe("Password Hashing & PBKDF2 Verification", () => {
    it("should hash and verify passwords using live server implementation", () => {
      const password = "athlete-strong-password-2026";
      const hash = hashPassword(password);
      expect(hash).toContain(":");
      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword("wrong-password", hash)).toBe(false);
    });

    it("should safely reject malformed or non-matching hashes", () => {
      expect(verifyPassword("", "")).toBe(false);
      expect(verifyPassword("password123", "malformed:hash")).toBe(false);
    });
  });

  describe("Admin Secret Verification", () => {
    beforeEach(() => {
      process.env.ADMIN_PASSWORD = "ValidAdminSecret_2026!";
    });

    it("should return false if secret is missing or does not match", () => {
      expect(verifyAdminSecret("WrongSecret")).toBe(false);
      expect(verifyAdminSecret("")).toBe(false);
      expect(verifyAdminSecret(undefined)).toBe(false);
    });

    it("should verify secret using timing-safe comparison", () => {
      expect(verifyAdminSecret("ValidAdminSecret_2026!")).toBe(true);
    });
  });

  describe("requireAuth Middleware (Real Route Protection)", () => {
    it("should return 401 when Authorization header is absent, even if client supplies an email", async () => {
      const req: any = {
        headers: {},
        body: { email: "spoofed.victim@example.com" },
        query: {}
      };
      const res = createMockResponse();
      const next = vi.fn();

      await requireAuth(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("Sessão inválida ou ausente");
      expect(next).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it("should return 401 when Bearer token is malformed or invalid", async () => {
      const req: any = {
        headers: {
          authorization: "Bearer invalid.jwt.token.string"
        },
        body: { email: "athlete@example.com" },
        query: {}
      };
      const res = createMockResponse();
      const next = vi.fn();

      await requireAuth(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(next).not.toHaveBeenCalled();
    });

    it("should authorize immediately when valid admin password header is provided", async () => {
      process.env.ADMIN_PASSWORD = "ValidAdminSecret_2026!";
      const req: any = {
        headers: {
          "x-admin-password": "ValidAdminSecret_2026!"
        },
        body: {},
        query: {}
      };
      const res = createMockResponse();
      const next = vi.fn();

      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();
      expect(req.user.email).toBe(MASTER_ADMIN_EMAIL);
      expect(req.user.isAdmin).toBe(true);
    });
  });

  describe("requireAdmin Middleware (Role-Based Access Control)", () => {
    it("should return 403 when a standard athlete attempts to access admin endpoint", async () => {
      const req: any = {
        user: { email: "atleta.padrao@exemplo.com" },
        headers: {},
        body: {}
      };
      const res = createMockResponse();
      const next = vi.fn();

      await requireAdmin(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain("Acesso restrito");
      expect(next).not.toHaveBeenCalled();
    });

    it("should permit access when caller is the master admin email", async () => {
      const req: any = {
        user: { email: MASTER_ADMIN_EMAIL },
        headers: {},
        body: {}
      };
      const res = createMockResponse();
      const next = vi.fn();

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBe(200);
    });
  });

  describe("Real /api/auth/save-user Route & Privilege Escalation Prevention", () => {
    const demoAthleteEmail = "atleta.demo@exemplo.com";
    const testToken = "test-valid-bearer-token-for-athlete-demo";

    beforeEach(() => {
      process.env.ADMIN_PASSWORD = "ValidAdminSecret_2026!";
      // Seed pre-verified auth session for the demo athlete
      setTestAuthToken(testToken, {
        email: demoAthleteEmail,
        uid: "test-demo-athlete-uid",
        sub: "test-demo-athlete-uid"
      });
    });

    it("should return 401 Unauthorized when /api/auth/save-user is called without credentials", async () => {
      const res = await request(app)
        .post("/api/auth/save-user")
        .send({
          email: demoAthleteEmail,
          userAccount: { email: demoAthleteEmail }
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 403 Forbidden when an athlete attempts cross-user modification of another account", async () => {
      const res = await request(app)
        .post("/api/auth/save-user")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          email: "outro.atleta@exemplo.com",
          userAccount: { email: "outro.atleta@exemplo.com", profile: { name: "Hacked" } }
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Acesso negado");
    });

    it("should accept legitimate athlete updates but strictly block privilege escalation attempts in live save-user route", async () => {
      const escalationPayload = {
        email: demoAthleteEmail,
        userAccount: {
          email: demoAthleteEmail,
          profile: {
            name: "Atleta Atualizado com Sucesso",
            ftp: 255,
            level: "avançado",
            // Malicious attempts to escalate privileges:
            role: "admin",
            isCoach: true,
            subscriptionStatus: "active_lifetime",
            subscriptionPlan: "VIP Gratuito Ilimitado"
          }
        }
      };

      const res = await request(app)
        .post("/api/auth/save-user")
        .set("Authorization", `Bearer ${testToken}`)
        .send(escalationPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();

      const savedProfile = res.body.user.profile;

      // Legitimate profile fields were updated
      expect(savedProfile.name).toBe("Atleta Atualizado com Sucesso");
      expect(savedProfile.ftp).toBe(255);
      expect(savedProfile.level).toBe("avançado");

      // Privileged fields were BLOCKED and preserved:
      expect(savedProfile.role).toBe("athlete");
      expect(savedProfile.isCoach).toBe(false);
      expect(savedProfile.role).not.toBe("admin");
      expect(savedProfile.subscriptionPlan).not.toBe("VIP Gratuito Ilimitado");
    });

    it("should auto-bootstrap and return 200 when an authenticated user does not have a prior DB record", async () => {
      const newUserEmail = "novo.ciclista@exemplo.com";
      const newToken = "test-token-new-cyclist";
      setTestAuthToken(newToken, {
        email: newUserEmail,
        uid: "test-uid-new-cyclist",
        sub: "test-uid-new-cyclist"
      });

      const res = await request(app)
        .post("/api/auth/session")
        .set("Authorization", `Bearer ${newToken}`)
        .send({ email: newUserEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(newUserEmail);
      expect(res.body.user.profile.role).toBe("athlete");
      expect(res.body.user.profile.isCoach).toBe(false);
    });

    it("should seamlessly return Master Coach profile for MASTER_ADMIN_EMAIL on /api/auth/session", async () => {
      const adminToken = "test-token-master-admin";
      setTestAuthToken(adminToken, {
        email: MASTER_ADMIN_EMAIL,
        uid: "master-admin-uid",
        sub: "master-admin-uid"
      });

      const res = await request(app)
        .post("/api/auth/session")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: MASTER_ADMIN_EMAIL });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(MASTER_ADMIN_EMAIL);
      expect(res.body.user.profile.role).toBe("coach");
      expect(res.body.user.profile.isCoach).toBe(true);
      expect(res.body.user.profile.subscriptionStatus).toBe("active");
    });

    it("should resolve race condition by allowing /api/auth/register on an account auto-bootstrapped by session without password", async () => {
      const raceUserEmail = `race.athlete.${Date.now()}@exemplo.com`;
      const raceToken = `test-race-token-${Date.now()}`;
      setTestAuthToken(raceToken, {
        email: raceUserEmail,
        uid: "race-uid",
        sub: "race-uid"
      });

      // 1. Simulate onAuthStateChanged firing first and bootstrapping the account without a password
      const sessionRes = await request(app)
        .post("/api/auth/session")
        .set("Authorization", `Bearer ${raceToken}`)
        .send({ email: raceUserEmail });
      expect(sessionRes.status).toBe(200);

      // 2. Client registration request arrives slightly later (same authenticated owner)
      const registerRes = await request(app)
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${raceToken}`)
        .send({
          email: raceUserEmail,
          password: "SecureAthletePassword2026!",
          name: "Atleta Veloz"
        });

      expect(registerRes.status).toBe(200);
      expect(registerRes.body.success).toBe(true);
      expect(registerRes.body.user).toBeDefined();
      expect(registerRes.body.user.profile.name).toBe("Atleta Veloz");

      // Cleanup test user after execution to avoid polluting database
      const cleanupAdminToken = "test-cleanup-race-admin";
      setTestAuthToken(cleanupAdminToken, {
        email: MASTER_ADMIN_EMAIL,
        uid: "admin-cleanup-race",
        sub: "admin-cleanup-race"
      });
      await request(app)
        .post("/api/admin/delete-user")
        .set("Authorization", `Bearer ${cleanupAdminToken}`)
        .send({ email: raceUserEmail });
    });

    it("should never let /api/auth/register overwrite an account that already has a password", async () => {
      const ownerEmail = `takeover.victim.${Date.now()}@exemplo.com`;
      const ownerToken = `test-takeover-owner-${Date.now()}`;
      setTestAuthToken(ownerToken, { email: ownerEmail, uid: "takeover-owner", sub: "takeover-owner" });

      const first = await request(app)
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ email: ownerEmail, password: "OriginalPassword2026!", name: "Dono" });
      expect(first.status).toBe(200);

      const second = await request(app)
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ email: ownerEmail, password: "AttackerPassword2026!", name: "Invasor" });
      expect(second.status).toBe(400);

      const login = await request(app)
        .post("/api/auth/login")
        .send({ email: ownerEmail, password: "AttackerPassword2026!" });
      expect(login.status).toBe(400);

      const cleanupToken = "test-cleanup-takeover-admin";
      setTestAuthToken(cleanupToken, { email: MASTER_ADMIN_EMAIL, uid: "admin-cleanup-takeover", sub: "admin-cleanup-takeover" });
      await request(app)
        .post("/api/admin/delete-user")
        .set("Authorization", `Bearer ${cleanupToken}`)
        .send({ email: ownerEmail });
    });

    it("should include data source (firestore or local_cache) in /api/admin/users response", async () => {
      const adminToken = "test-admin-token-source";
      setTestAuthToken(adminToken, {
        email: MASTER_ADMIN_EMAIL,
        uid: "admin-source-uid",
        sub: "admin-source-uid"
      });

      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(["firestore", "local_cache"]).toContain(res.body.source);
    });
  });

  describe("Rotas que antes eram públicas", () => {
    it("/api/auth/register exige autenticação", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "sem.token@exemplo.com", password: "Senha2026!", name: "Sem Token" });
      expect(res.status).toBe(401);
    });

    it("/api/auth/register rejeita e-mail diferente do token", async () => {
      const token = "test-register-mismatch";
      setTestAuthToken(token, { email: "atacante@exemplo.com", uid: "mismatch", sub: "mismatch" });
      const res = await request(app)
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "vitima@exemplo.com", password: "Senha2026!", name: "Vítima" });
      expect(res.status).toBe(403);
    });

    it("/api/auth/check-status exige autenticação", async () => {
      const res = await request(app).post("/api/auth/check-status").send({ email: MASTER_ADMIN_EMAIL });
      expect(res.status).toBe(401);
    });

    it("/api/auth/check-status bloqueia consulta de outro atleta", async () => {
      const token = "test-check-status-athlete";
      setTestAuthToken(token, { email: "curioso@exemplo.com", uid: "curioso", sub: "curioso" });
      const res = await request(app)
        .post("/api/auth/check-status")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "outro.atleta@exemplo.com" });
      expect(res.status).toBe(403);
    });

    it("/api/user/notify-payment exige autenticação", async () => {
      const res = await request(app).post("/api/user/notify-payment").send({ email: MASTER_ADMIN_EMAIL, note: "spam" });
      expect(res.status).toBe(401);
    });

    it("/api/admin/diagnostics exige admin e a rota antiga deixou de existir", async () => {
      const token = "test-diagnostics-athlete";
      setTestAuthToken(token, { email: "atleta.diag@exemplo.com", uid: "diag", sub: "diag" });

      const anon = await request(app).get("/api/admin/diagnostics");
      expect(anon.status).toBe(401);

      const athlete = await request(app).get("/api/admin/diagnostics").set("Authorization", `Bearer ${token}`);
      expect(athlete.status).toBe(403);

      const legacy = await request(app).get("/api/diagnostics");
      expect(legacy.body?.geminiConnection).toBeUndefined();
    });
  });

  describe("Paywall decidido pelo banco, não pelo corpo da requisição", () => {
    const expiredEmail = "trial.expirado@exemplo.com";
    const expiredToken = "test-expired-athlete-token";
    let savedGeminiKey: string | undefined;

    beforeAll(async () => {
      // Sem chave, as rotas de IA caem no fallback determinístico: nada de chamadas pagas nos testes.
      savedGeminiKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = "";
      setTestAuthToken(expiredToken, { email: expiredEmail, uid: "expired", sub: "expired" });
      // Cria o atleta e força status expirado via admin
      await request(app).post("/api/auth/session").set("Authorization", `Bearer ${expiredToken}`).send({ email: expiredEmail });
      const adminToken = "test-paywall-admin";
      setTestAuthToken(adminToken, { email: MASTER_ADMIN_EMAIL, uid: "paywall-admin", sub: "paywall-admin" });
      await request(app)
        .post("/api/admin/update-user-status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: expiredEmail, subscriptionStatus: "expired" });
    });

    afterAll(async () => {
      if (savedGeminiKey !== undefined) process.env.GEMINI_API_KEY = savedGeminiKey;
      const adminToken = "test-paywall-admin-cleanup";
      setTestAuthToken(adminToken, { email: MASTER_ADMIN_EMAIL, uid: "paywall-cleanup", sub: "paywall-cleanup" });
      await request(app)
        .post("/api/admin/delete-user")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: expiredEmail });
    });

    const forgedProfile = { email: expiredEmail, subscriptionStatus: "active", role: "coach" };

    it("/api/generate-next-week ignora perfil forjado com assinatura ativa", async () => {
      const res = await request(app)
        .post("/api/generate-next-week")
        .set("Authorization", `Bearer ${expiredToken}`)
        .send({ email: expiredEmail, profile: forgedProfile, nextWeekNumber: 2 });
      expect(res.status).toBe(403);
      expect(res.body.isBlocked).toBe(true);
    });

    it("/api/evaluate-workout ignora perfil forjado com assinatura ativa", async () => {
      const res = await request(app)
        .post("/api/evaluate-workout")
        .set("Authorization", `Bearer ${expiredToken}`)
        .send({ email: expiredEmail, profile: forgedProfile, workout: { type: "Z2" } });
      expect(res.status).toBe(403);
    });

    it("/api/chat bloqueia atleta expirado mesmo com perfil forjado", async () => {
      const res = await request(app)
        .post("/api/chat")
        .set("Authorization", `Bearer ${expiredToken}`)
        .send({ email: expiredEmail, message: "oi", profile: forgedProfile, currentPlan: { workouts: [] } });
      expect(res.body.isBlocked).toBe(true);
    });

    it("/api/generate-plan devolve planilha bloqueada para atleta expirado", async () => {
      const res = await request(app)
        .post("/api/generate-plan")
        .set("Authorization", `Bearer ${expiredToken}`)
        .send({ email: expiredEmail, profile: forgedProfile });
      expect(res.status).toBe(200);
      expect(res.body.isLocked).toBe(true);
    });
  });
});

