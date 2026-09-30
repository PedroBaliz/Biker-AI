import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
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
  });
});

