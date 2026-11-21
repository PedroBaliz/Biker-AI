// Ponto de entrada da API: cria o app Express, aplica middlewares e limitadores, registra as rotas
// de backend/routes/ e sobe o servidor fora da Vercel. Também reexporta o que os testes usam.
import express from "express";
import path from "path";
import { createDefaultProfile } from "./backend/access";
import { callGeminiWithFallback, fallbackGeneratePlan } from "./backend/ai";
import { hashPassword, requireAdmin, requireAuth, setTestAuthToken, verifyAdminSecret, verifyPassword } from "./backend/auth";
import { MASTER_ADMIN_EMAIL, isDirectRun, isMasterAdminEmail } from "./backend/config";
import { ensureAllAthletesArePending, fetchFirestoreUser, fetchFirestoreUsers, getDatabase, getDatabaseWithSource, runInitialMigration, saveDatabase } from "./backend/db";
import { aiChatLimiter, aiGenerationLimiter, authLimiter, generalApiLimiter } from "./backend/rateLimit";
import { registerAdminRoutes } from "./backend/routes/admin";
import { registerAiRoutes } from "./backend/routes/ai";
import { registerUserRoutes } from "./backend/routes/users";
import { findUserInDb } from "./backend/util";

const app = express();
// O save-user envia o histórico de chat e a planilha inteiros: o padrão de 100 KB gerava 413
// para atletas com muito histórico. 1 MB acompanha o limite de um documento do Firestore.
app.use(express.json({ limit: "1mb" }));

// robots.txt, sitemap.xml e o arquivo de verificação do Google são estáticos em public/
// (a Vercel serve arquivos estáticos antes dos rewrites).

app.use((req, res, next) => {
  if (process.env.VERCEL && !req.url.startsWith("/api")) {
    req.url = "/api" + req.url;
  }
  next();
});

// Log de requisições: só método, rota (sem query string) e status. Nunca IP, headers,
// tokens ou corpo (invariante 5 do AGENTS.md). Vai para o stdout, que a Vercel já coleta.
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) return next();
  const started = Date.now();
  res.on("finish", () => {
    if (process.env.VITEST) return;
    console.log("[HTTP] %s %s %d %dms", req.method, req.path, res.statusCode, Date.now() - started);
  });
  next();
});

// RATE LIMITING
// Na Vercel há um proxy na frente: confiar em 1 salto faz o req.ip ser o IP real do cliente
// (o valor que a borda da Vercel acrescenta), sem aceitar X-Forwarded-For forjado.
if (process.env.VERCEL) app.set("trust proxy", 1);

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/generate-plan", aiGenerationLimiter);
app.use("/api/generate-next-week", aiGenerationLimiter);
app.use("/api/evaluate-workout", aiGenerationLimiter);
app.use("/api/chat", aiChatLimiter);
app.use("/api/onboard", aiChatLimiter);
app.use("/api/admin/diagnostics", aiGenerationLimiter);
app.use("/api", generalApiLimiter);

// Rotas, por área (cada módulo registra as suas no app).
registerUserRoutes(app);
registerAiRoutes(app);
registerAdminRoutes(app);

if (isDirectRun && process.env.NODE_ENV !== "test" && !process.env.VITEST && !process.env.VERCEL) {
  runInitialMigration().then(() => ensureAllAthletesArePending()).catch(() => {});
}

async function bootstrap() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => { res.sendFile(path.join(distPath, 'index.html')); });
  }

  if (!process.env.VERCEL) {
    app.listen(3000, "0.0.0.0", () => {
      console.log("Server running on port 3000");
    });
  }
}

if (isDirectRun && process.env.NODE_ENV !== "test" && !process.env.VITEST && !process.env.VERCEL) {
  bootstrap().catch((err) => console.error("Failed to start server:", err));
}

export {
  app,
  requireAuth,
  requireAdmin,
  verifyPassword,
  hashPassword,
  verifyAdminSecret,
  findUserInDb,
  setTestAuthToken,
  getDatabase,
  getDatabaseWithSource,
  fetchFirestoreUser,
  fetchFirestoreUsers,
  saveDatabase,
  callGeminiWithFallback,
  fallbackGeneratePlan,
  createDefaultProfile,
  MASTER_ADMIN_EMAIL,
  isMasterAdminEmail
};

export default app;
