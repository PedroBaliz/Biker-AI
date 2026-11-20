import { describe, it, expect, vi, afterEach } from "vitest";
import { MASTER_ADMIN_EMAIL, isMasterAdminEmail } from "../server";

// A conta master vem só da variável ADMIN_EMAIL (definida em vitest.config.ts para os testes).
describe("Conta master via ADMIN_EMAIL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("reconhece o e-mail configurado, sem diferenciar maiúsculas nem espaços", () => {
    expect(MASTER_ADMIN_EMAIL).toBe("coach@biker-ai.test");
    expect(isMasterAdminEmail(" Coach@Biker-AI.test ")).toBe(true);
    expect(isMasterAdminEmail("outro@biker-ai.test")).toBe(false);
    expect(isMasterAdminEmail(undefined)).toBe(false);
    expect(isMasterAdminEmail(null)).toBe(false);
  });

  it("desliga o modo master quando ADMIN_EMAIL não está definido", async () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.resetModules();
    const mod = await import("../server");

    expect(mod.MASTER_ADMIN_EMAIL).toBeNull();
    // Nenhum valor pode casar com uma conta master inexistente — nem o e-mail vazio.
    expect(mod.isMasterAdminEmail("")).toBe(false);
    expect(mod.isMasterAdminEmail("coach@biker-ai.test")).toBe(false);
    expect(mod.createDefaultProfile("coach@biker-ai.test").role).toBe("athlete");
  });

  it("ignora um ADMIN_EMAIL inválido", async () => {
    vi.stubEnv("ADMIN_EMAIL", "nao-e-um-email");
    vi.resetModules();
    const mod = await import("../server");

    expect(mod.MASTER_ADMIN_EMAIL).toBeNull();
    expect(mod.isMasterAdminEmail("nao-e-um-email")).toBe(false);
  });
});
