import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Os testes de API compartilham o users_db.json local (o Firestore fica desligado em teste):
    // rodar os arquivos em sequência evita que um sobrescreva o banco do outro.
    fileParallelism: false
  }
});
