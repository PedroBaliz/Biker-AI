import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrainingPlan, UserProfile } from "../src/types";

// O jsPDF define save() em cada instância: estende a classe para capturar o nome do arquivo
// em vez de tentar baixar. O resto do documento é gerado de verdade.
const saved: { name: string; pages: number }[] = [];
vi.mock("jspdf", async (importOriginal) => {
  const mod: any = await importOriginal();
  class CapturingJsPDF extends mod.jsPDF {
    constructor(...args: any[]) {
      super(...args);
      (this as any).save = (name: string) => {
        saved.push({ name, pages: (this as any).internal.getNumberOfPages() });
        return this;
      };
    }
  }
  return { ...mod, jsPDF: CapturingJsPDF };
});

const { exportPlanPdf } = await import("../src/lib/exportPlanPdf");

const profile = { name: "Maria Souza", level: "intermediario", goal: "condicionamento", ftp: 220 } as unknown as UserProfile;

function workout(day: string, type: string, duration: number) {
  return { day, type, duration, goal: "Base aeróbica", structure: "10' aquecimento + 40' Z2 + 10' volta à calma", targetZone: "Z2", rpe: 4, tip: "Hidrate-se." };
}

const plan: TrainingPlan = {
  weekNumber: 3,
  summary: "Semana de base com um estímulo de limiar.",
  observations: "Durma bem antes do treino de quinta.",
  evaluation: "",
  workouts: [
    workout("Segunda", "Descanso", 0),
    workout("Terça", "Endurance Z2", 60),
    workout("Quinta", "Limiar", 75),
    workout("Sábado", "Longão", 150)
  ]
};

describe("exportPlanPdf", () => {
  beforeEach(() => { saved.length = 0; });

  it("gera o PDF e salva com o nome da semana e do atleta", () => {
    exportPlanPdf(plan, profile);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Planilha_Ciclismo_Semana_3_Maria_Souza.pdf");
    expect(saved[0].pages).toBeGreaterThanOrEqual(1);
  });

  it("aceita perfil sem nome e plano sem número de semana", () => {
    exportPlanPdf({ ...plan, weekNumber: undefined }, { ...profile, name: "" } as UserProfile);
    expect(saved[0].name).toBe("Planilha_Ciclismo_Semana_1_Atleta.pdf");
  });
});
