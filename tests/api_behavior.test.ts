import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import {
  app,
  setTestAuthToken,
  callGeminiWithFallback,
  fallbackGeneratePlan,
  createDefaultProfile,
  MASTER_ADMIN_EMAIL
} from "../server";

const USERS_DB_PATH = path.join(process.cwd(), "users_db.json");
let initialDbBackup: string | null = null;
let savedGeminiKey: string | undefined;

beforeAll(() => {
  if (fs.existsSync(USERS_DB_PATH)) initialDbBackup = fs.readFileSync(USERS_DB_PATH, "utf-8");
  // Sem chave, as rotas de IA usam o fallback determinístico: nada de chamadas pagas.
  savedGeminiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "";
});

afterAll(() => {
  if (initialDbBackup !== null) fs.writeFileSync(USERS_DB_PATH, initialDbBackup, "utf-8");
  if (savedGeminiKey !== undefined) process.env.GEMINI_API_KEY = savedGeminiKey;
});

async function deleteUser(email: string) {
  const token = `cleanup-${email}`;
  setTestAuthToken(token, { email: MASTER_ADMIN_EMAIL, uid: "cleanup", sub: "cleanup" });
  await request(app).post("/api/admin/delete-user").set("Authorization", `Bearer ${token}`).send({ email });
}

describe("callGeminiWithFallback", () => {
  it("passa para o próximo modelo quando o primeiro trava", async () => {
    const tried: string[] = [];
    const result = await callGeminiWithFallback(
      (model) => {
        tried.push(model);
        return model === "lento" ? new Promise(() => {}) : Promise.resolve({ text: `ok:${model}` });
      },
      ["lento", "rapido"],
      { perModelMs: 50, totalMs: 5000 }
    );
    expect(result.text).toBe("ok:rapido");
    expect(tried).toEqual(["lento", "rapido"]);
  });

  it("passa para o próximo modelo quando o primeiro falha", async () => {
    const result = await callGeminiWithFallback(
      (model) => (model === "quebrado" ? Promise.reject(new Error("503")) : Promise.resolve({ text: "ok" })),
      ["quebrado", "bom"],
      { perModelMs: 1000, totalMs: 5000 }
    );
    expect(result.text).toBe("ok");
  });

  it("respeita o orçamento total e lança o último erro", async () => {
    const started = Date.now();
    await expect(
      callGeminiWithFallback(() => new Promise(() => {}), ["a", "b", "c"], { perModelMs: 5000, totalMs: 1200 })
    ).rejects.toThrow(/Timeout/);
    expect(Date.now() - started).toBeLessThan(2500);
  });
});

describe("fallbackGeneratePlan", () => {
  it("gera um treino por dia disponível, com estrutura preenchida", () => {
    for (const days of [1, 3, 5, 7]) {
      const plan = fallbackGeneratePlan({ daysPerWeek: days, durationPerSession: 60, level: "intermediário" }, 1);
      expect(plan.workouts).toHaveLength(days);
      for (const w of plan.workouts) {
        expect(w.day).toBeTruthy();
        expect(w.structure.length).toBeGreaterThan(10);
        expect(w.duration).toBeGreaterThan(0);
        expect(w.rpe).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("usa watts quando há FTP e bpm quando só há FC máxima", () => {
    const comFtp = fallbackGeneratePlan({ daysPerWeek: 2, ftp: 250, hasPowerMeter: true }, 1);
    expect(comFtp.workouts[0].targetZone).toMatch(/W\)/);
    const comFc = fallbackGeneratePlan({ daysPerWeek: 2, hasPowerMeter: false, hasHeartRate: true, maxHeartRate: 190 }, 1);
    expect(comFc.workouts[0].targetZone).toMatch(/bpm\)/);
    const semNada = fallbackGeneratePlan({ daysPerWeek: 2 }, 1);
    expect(semNada.workouts[0].targetZone).toMatch(/PSE/);
  });

  it("aguenta perfil vazio ou valores inválidos", () => {
    const plan = fallbackGeneratePlan({ daysPerWeek: "abc", durationPerSession: -5 }, 3);
    expect(plan.workouts).toHaveLength(3);
    expect(plan.weekNumber).toBe(3);
    expect(fallbackGeneratePlan(undefined, 1).workouts.length).toBeGreaterThan(0);
  });
});

describe("createDefaultProfile", () => {
  it("não inventa métricas e manda o atleta para o onboarding", () => {
    const p = createDefaultProfile("novo@exemplo.com", "Novo");
    expect(p.onboardingStep).toBe(1);
    expect(p.ftp).toBeNull();
    expect(p.maxHeartRate).toBeNull();
    expect(p.role).toBe("athlete");
    expect(p.subscriptionStatus).toBe("pending_payment");
  });
});

describe("Rotas", () => {
  it("/api/auth/session cria conta nova sem dados inventados", async () => {
    const email = `google.${Date.now()}@exemplo.com`;
    const token = `session-${email}`;
    setTestAuthToken(token, { email, uid: "g", sub: "g" });
    const res = await request(app).post("/api/auth/session").set("Authorization", `Bearer ${token}`).send({ email });
    expect(res.status).toBe(200);
    expect(res.body.user.profile.onboardingStep).toBe(1);
    expect(res.body.user.profile.ftp).toBeNull();
    await deleteUser(email);
  });

  it("/api/generate-plan devolve planilha completa (não vazia) quando a IA falha", async () => {
    const email = `trial.${Date.now()}@exemplo.com`;
    const token = `plan-${email}`;
    setTestAuthToken(token, { email, uid: "t", sub: "t" });
    await request(app).post("/api/auth/session").set("Authorization", `Bearer ${token}`).send({ email });

    const res = await request(app)
      .post("/api/generate-plan")
      .set("Authorization", `Bearer ${token}`)
      .send({ email, profile: { daysPerWeek: 4, durationPerSession: 75, ftp: 220, hasPowerMeter: true } });
    expect(res.status).toBe(200);
    expect(res.body.isLocked).toBe(false); // trial de 3 dias ativo
    expect(res.body.workouts).toHaveLength(4);
    await deleteUser(email);
  });

  // Mantenha este teste por último no arquivo: ele esgota o limite de /api/auth/login.
  it("rate limit de autenticação responde 429 com mensagem e retryAfter", async () => {
    let last: any;
    for (let i = 0; i < 31; i++) {
      last = await request(app).post("/api/auth/login").send({});
    }
    expect(last.status).toBe(429);
    expect(last.body.error).toMatch(/aguarde/i);
    expect(last.body.retryAfter).toBeGreaterThan(0);
    expect(last.headers["retry-after"]).toBeDefined();
  });

  it("aceita corpo JSON acima de 100 KB (histórico de chat grande)", async () => {
    const email = `historico.${Date.now()}@exemplo.com`;
    const token = `big-${email}`;
    setTestAuthToken(token, { email, uid: "h", sub: "h" });
    const chatHistory = Array.from({ length: 400 }, (_, i) => ({
      id: `m${i}`, sender: "atleta", text: "x".repeat(500), timestamp: "10:00"
    }));
    const res = await request(app)
      .post("/api/auth/save-user")
      .set("Authorization", `Bearer ${token}`)
      .send({ email, userAccount: { email, chatHistory } });
    expect(res.status).toBe(200);
    await deleteUser(email);
  });
});
