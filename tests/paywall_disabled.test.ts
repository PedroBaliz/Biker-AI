import { describe, it, expect, vi, afterEach } from "vitest";

// Sem meio de pagamento (ADR-008) o paywall fica desligado por padrão: qualquer atleta tem
// acesso completo. vitest.config.ts liga as duas chaves para os outros testes; aqui elas
// voltam ao padrão (vazias) e os módulos são recarregados.
describe("paywall desligado (padrão)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const expiredAthlete = {
    role: "athlete",
    subscriptionStatus: "expired",
    createdAt: "2020-01-01T00:00:00.000Z"
  };

  it("servidor: hasActiveAccess libera até perfil expirado, e a planilha não é mascarada", async () => {
    vi.stubEnv("PAYWALL_ENABLED", "");
    vi.resetModules();
    const { hasActiveAccess, sanitizePlanForUser } = await import("../backend/access");
    const { PAYWALL_ENABLED } = await import("../backend/config");

    expect(PAYWALL_ENABLED).toBe(false);
    expect(hasActiveAccess(expiredAthlete, "atleta@exemplo.com")).toBe(true);
    expect(hasActiveAccess(null)).toBe(false); // sem perfil continua sem acesso

    const plan = { workouts: [{ day: "Terça", type: "Limiar", structure: "3x10' Z4", duration: 60 }] };
    const sanitized = sanitizePlanForUser(plan, expiredAthlete, "atleta@exemplo.com");
    expect(sanitized.isLocked).not.toBe(true);
    expect(sanitized.workouts[0].structure).toBe("3x10' Z4");
  });

  it("servidor: com PAYWALL_ENABLED=true o perfil expirado volta a ser bloqueado", async () => {
    vi.stubEnv("PAYWALL_ENABLED", "true");
    vi.resetModules();
    const { hasActiveAccess } = await import("../backend/access");
    expect(hasActiveAccess(expiredAthlete, "atleta@exemplo.com")).toBe(false);
  });

  it("cliente: getUserAccessInfo devolve acesso liberado para qualquer atleta", async () => {
    vi.stubEnv("VITE_PAYWALL_ENABLED", "");
    vi.resetModules();
    const { getUserAccessInfo, PAYWALL_ENABLED } = await import("../src/utils/subscriptionUtils");

    expect(PAYWALL_ENABLED).toBe(false);
    const info = getUserAccessInfo(expiredAthlete as any, "atleta@exemplo.com");
    expect(info.accessType).toBe("free_access");
    expect(info.hasFullAccess).toBe(true);
    expect(info.isPendingUser).toBe(false);
    expect(info.statusLabel).toBe("Acesso liberado");

    // O coach continua identificado como coach.
    expect(getUserAccessInfo({ role: "coach" } as any).accessType).toBe("coach");
  });
});
