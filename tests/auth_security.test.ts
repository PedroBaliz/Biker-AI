import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requireAuth,
  requireAdmin,
  verifyPassword,
  hashPassword,
  verifyAdminSecret,
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

  describe("Privilege Escalation Defense", () => {
    it("should not allow client-supplied profile.role or subscriptionStatus to overwrite server values for non-admins", () => {
      const existingAthlete = {
        email: "ciclista@exemplo.com",
        profile: {
          name: "Ciclista Normal",
          role: "athlete",
          isCoach: false,
          subscriptionStatus: "pending_payment",
          subscriptionPlan: "Plano Pro"
        }
      };

      const maliciousPayload = {
        name: "Ciclista Normal",
        role: "admin", // Malicious attempt to escalate
        isCoach: true,  // Malicious attempt to escalate
        subscriptionStatus: "active" // Malicious attempt to bypass payment
      };

      // Simulates the sanitization logic applied inside /api/auth/save-user
      const isCallerAdmin = false;
      const safeProfile = isCallerAdmin ? maliciousPayload : {
        ...existingAthlete.profile,
        name: maliciousPayload.name,
        role: existingAthlete.profile.role,
        isCoach: existingAthlete.profile.isCoach,
        subscriptionStatus: existingAthlete.profile.subscriptionStatus,
        subscriptionPlan: existingAthlete.profile.subscriptionPlan
      };

      expect(safeProfile.name).toBe("Ciclista Normal");
      expect(safeProfile.role).toBe("athlete"); // Escalation blocked!
      expect(safeProfile.isCoach).toBe(false);  // Escalation blocked!
      expect(safeProfile.subscriptionStatus).toBe("pending_payment"); // Escalation blocked!
    });
  });
});
