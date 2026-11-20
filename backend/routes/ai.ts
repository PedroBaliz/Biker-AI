// Rotas de IA: onboarding, geração de planilha, semana seguinte, avaliação de treino e chat.
import type { Express } from "express";
import { resolveRequesterAccess, sanitizePlanByAccess } from "../access";
import { PLAN_RESPONSE_SCHEMA, buildPlanPrompt, callGeminiWithFallback, checkApiKey, clampInt, cleanAndParseJson, fallbackChat, fallbackEvaluateWorkout, fallbackGeneratePlan, fallbackOnboarding, getAiClient, normalizeAiPlan } from "../ai";
import { requireAuth, verifyUserMatch } from "../auth";
import { SUBSCRIPTION_PRICE_BRL } from "../config";

export function registerAiRoutes(app: Express) {
  app.post("/api/onboard", requireAuth, verifyUserMatch, async (req, res) => {
    const { message, profile, messageHistory } = req.body;
    try {
      checkApiKey();
      const systemInstruction = `Você é um treinador de ciclismo especialista. Faça as perguntas uma a uma em formato JSON {"reply": string, "parsedProfile": object}.`;
      const response = await callGeminiWithFallback((model) =>
          getAiClient().models.generateContent({
            model,
            contents: `Mensagem: "${message}" | Perfil: ${JSON.stringify(profile)}`,
            config: { systemInstruction, responseMimeType: "application/json" }
          })
      );
      res.json(cleanAndParseJson(response.text));
    } catch (error: any) {
      res.json(fallbackOnboarding(message, profile));
    }
  });

  app.post("/api/generate-plan", requireAuth, verifyUserMatch, async (req, res) => {
    const { profile } = req.body;
    let hasAccess = false;
    try {
      hasAccess = await resolveRequesterAccess(req);
      checkApiKey();
      const response = await callGeminiWithFallback((model) =>
          getAiClient().models.generateContent({
            model,
            contents: buildPlanPrompt(profile, 1),
            config: { responseMimeType: "application/json", responseSchema: PLAN_RESPONSE_SCHEMA }
          })
      );
      res.json(sanitizePlanByAccess(normalizeAiPlan(cleanAndParseJson(response.text), profile, 1), hasAccess));
    } catch (error: any) {
      res.json(sanitizePlanByAccess(fallbackGeneratePlan(profile, 1), hasAccess));
    }
  });

  app.post("/api/generate-next-week", requireAuth, verifyUserMatch, async (req, res) => {
    const { profile } = req.body;
    const weekNumber = clampInt(req.body?.nextWeekNumber, 1, 520, 2);
    let hasAccess = false;
    try {
      hasAccess = await resolveRequesterAccess(req);
      if (!hasAccess) {
        return res.status(403).json({ error: "Acesso bloqueado. Assine o Biker AI.", isBlocked: true });
      }
      checkApiKey();
      const response = await callGeminiWithFallback((model) =>
          getAiClient().models.generateContent({
            model,
            contents: buildPlanPrompt(profile, weekNumber),
            config: { responseMimeType: "application/json", responseSchema: PLAN_RESPONSE_SCHEMA }
          })
      );
      res.json(sanitizePlanByAccess(normalizeAiPlan(cleanAndParseJson(response.text), profile, weekNumber), hasAccess));
    } catch (error: any) {
      res.json(sanitizePlanByAccess(fallbackGeneratePlan(profile, weekNumber), hasAccess));
    }
  });

  app.post("/api/evaluate-workout", requireAuth, verifyUserMatch, async (req, res) => {
    const { profile, workout } = req.body;
    try {
      if (!(await resolveRequesterAccess(req))) {
        return res.status(403).json({ error: "Acesso bloqueado.", isBlocked: true });
      }
      checkApiKey();
      const response = await callGeminiWithFallback((model) =>
          getAiClient().models.generateContent({
            model,
            contents: `Avalie o treino realizado em JSON: ${JSON.stringify(workout)}`,
            config: { responseMimeType: "application/json" }
          })
      );
      res.json(cleanAndParseJson(response.text));
    } catch (error: any) {
      res.json(fallbackEvaluateWorkout(workout, profile));
    }
  });

  app.post("/api/chat", requireAuth, verifyUserMatch, async (req, res) => {
    const { message, profile, currentPlan } = req.body;
    try {
      if (currentPlan && !(await resolveRequesterAccess(req))) {
        return res.json({
          reply: `Olá, atleta! Notei que o seu período de teste gratuito de 3 dias expirou (ou sua conta está aguardando ativação). Para continuar recebendo acompanhamento do treinador e planilhas personalizadas, assine o Plano Pro por apenas R$ ${SUBSCRIPTION_PRICE_BRL.toFixed(2).replace(".", ",")}/mês!`,
          isBlocked: true
        });
      }

      checkApiKey();
      const response = await callGeminiWithFallback((model) =>
          getAiClient().models.generateContent({
            model,
            contents: `Atleta: "${message}" | Perfil: ${JSON.stringify(profile)}`,
            config: { responseMimeType: "application/json" }
          })
      );
      res.json(cleanAndParseJson(response.text));
    } catch (error: any) {
      res.json(fallbackChat(message, profile, currentPlan));
    }
  });
}
