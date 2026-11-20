import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Os testes de API compartilham o users_db.json local (o Firestore fica desligado em teste):
    // rodar os arquivos em sequência evita que um sobrescreva o banco do outro.
    fileParallelism: false,
    // Conta master fictícia para os testes (em produção vem só da variável ADMIN_EMAIL).
    env: {
      ADMIN_EMAIL: "coach@biker-ai.test",
      // O paywall está desligado em produção (ADR-008), mas os testes o ligam para continuar
      // validando a lógica de trial/assinatura que fica pronta para voltar. O padrão desligado
      // é testado em tests/paywall_disabled.test.ts.
      PAYWALL_ENABLED: "true",
      VITE_PAYWALL_ENABLED: "true"
    }
  }
});
