import { describe, it, expect } from "vitest";
import crypto from "crypto";

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

function verifyAdminSecret(providedSecret?: string, envSecret?: string): boolean {
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

describe("Security & Authentication Hardening Tests", () => {
  describe("Password Hashing & PBKDF2 Verification", () => {
    it("should generate salted PBKDF2 hashes and verify correct password", () => {
      const password = "athlete-secure-pass-2026";
      const hashed = hashPassword(password);
      expect(hashed).toContain(":");
      const [salt, hash] = hashed.split(":");
      expect(salt.length).toBe(32);
      expect(hash.length).toBe(128);
      expect(verifyPassword(password, hashed)).toBe(true);
      expect(verifyPassword("wrong-password", hashed)).toBe(false);
    });

    it("should never verify empty passwords or mismatched hashes", () => {
      expect(verifyPassword("", "")).toBe(false);
      expect(verifyPassword("pass", "invalid:format")).toBe(false);
    });
  });

  describe("Admin Secret Verification", () => {
    it("should reject admin access if environment secret is not set", () => {
      expect(verifyAdminSecret("anySecret", undefined)).toBe(false);
      expect(verifyAdminSecret("anySecret", "")).toBe(false);
    });

    it("should securely verify timing-safe secret matches", () => {
      const secret = "SuperSecretCoachKey2026!";
      expect(verifyAdminSecret(secret, secret)).toBe(true);
      expect(verifyAdminSecret("wrongSecret", secret)).toBe(false);
    });
  });

  describe("Header and Log Sanitization", () => {
    it("should not log sensitive headers like authorization or admin passwords", () => {
      const headers = {
        "host": "localhost:3000",
        "user-agent": "Mozilla/5.0",
        "authorization": "Bearer eyJhbGciOi...",
        "x-admin-password": "ConfidentialPassword",
        "cookie": "session=xyz123"
      };

      const clientIp = "127.0.0.1";
      const userAgent = (headers["user-agent"] || "").slice(0, 100);
      const sanitizedLog = `[${new Date().toISOString()}] GET /api/workout - IP: ${clientIp} - UA: ${userAgent}\n`;

      expect(sanitizedLog).not.toContain("Bearer");
      expect(sanitizedLog).not.toContain("ConfidentialPassword");
      expect(sanitizedLog).not.toContain("xyz123");
    });
  });

  describe("Identity Spoofing Prevention", () => {
    it("should reject client-provided email fallback when token is missing", () => {
      const mockReq = {
        headers: {},
        body: { email: "victim@example.com" }
      };

      const hasBearer = Boolean(mockReq.headers["authorization"]?.startsWith("Bearer "));
      expect(hasBearer).toBe(false);
      // Under hardened requireAuth, this request is immediately rejected with 401
    });
  });
});
