import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Os testes de API compartilham o users_db.json local (o Firestore fica desligado em teste):
    // rodar os arquivos em sequência evita que um sobrescreva o banco do outro.
    fileParallelism: false,
    // Conta master fictícia para os testes (em produção vem só da variável ADMIN_EMAIL).
    env: {
      ADMIN_EMAIL: "coach@biker-ai.test"
    }
  }
});
