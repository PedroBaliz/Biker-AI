import { describe, it, expect } from "vitest";
import { findUserInDb } from "../server";

describe("findUserInDb", () => {
  const db: Record<string, any> = {
    "atleta@exemplo.com": { email: "atleta@exemplo.com", profile: { name: "Atleta" } },
    "outro_exemplo_com": { email: "Outro@Exemplo.com", profile: { name: "Outro" } }
  };

  it("encontra pela chave, pela chave normalizada e pelo e-mail gravado", () => {
    expect(findUserInDb(db, " Atleta@Exemplo.com ")?.key).toBe("atleta@exemplo.com");
    expect(findUserInDb(db, "outro@exemplo.com")?.key).toBe("outro_exemplo_com");
  });

  it("nunca devolve o protótipo para chaves como __proto__ ou constructor", () => {
    for (const key of ["__proto__", "constructor", "prototype", "__PROTO__"]) {
      expect(findUserInDb(db, key)).toBeNull();
    }
    // Depois de tentar, Object.prototype continua intacto.
    expect(({} as any).profile).toBeUndefined();
  });

  it("devolve null para entrada vazia ou de outro tipo", () => {
    expect(findUserInDb(db, "")).toBeNull();
    expect(findUserInDb(db, undefined as any)).toBeNull();
    expect(findUserInDb(null as any, "atleta@exemplo.com")).toBeNull();
  });
});
