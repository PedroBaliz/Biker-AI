// Limitadores de requisição (express-rate-limit). Em memória, por instância serverless (ver issue #9).
import { rateLimit } from "express-rate-limit";

// Observação: o contador fica em memória, por instância. Em serverless ele limita por instância
// (melhor que nada); para um limite global seria preciso um store compartilhado (ex.: Redis).
export function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  const { windowMs, max, message } = options;
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res, _next, opts) => {
      const resetTime: Date | undefined = (req as any).rateLimit?.resetTime;
      const retryAfter = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(windowMs / 1000);
      console.warn("[RateLimit] Limite excedido em %s %s", req.method, req.path);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(opts.statusCode).json({ error: message, retryAfter });
    }
  });
}

export const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Muitas requisições enviadas em curto intervalo. Por favor, aguarde alguns instantes."
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Muitas tentativas de login ou registro. Por favor, aguarde 15 minutos para tentar novamente."
});

export const aiGenerationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: "Limite de solicitações de Inteligência Artificial atingido. Por favor, aguarde alguns minutos antes de gerar novos treinos."
});

// Chat e onboarding são conversacionais: limite próprio, mais alto que o de geração de planilhas,
// para não esgotar a cota de geração durante uma conversa normal.
export const aiChatLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Muitas mensagens enviadas ao treinador em pouco tempo. Por favor, aguarde alguns minutos."
});
