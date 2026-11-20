// Rotas do atleta: cadastro, login, sincronização de perfil, sessão e registro de treino.
import type { Express } from "express";
import crypto from "crypto";
import { createDefaultProfile, hasActiveAccess, isTrialActive, sanitizePlanForUser, sanitizeUserProfileInput } from "../access";
import { hashPassword, isCoachProfile, requireAuth, verifyAdminSecret, verifyPassword, verifyUserMatch } from "../auth";
import { isMasterAdminEmail, useFirestore } from "../config";
import { fetchFirestoreUser, getDatabase, getDatabaseForUpdate, saveDatabase, setDatabaseCache } from "../db";
import { findUserInDb, getAuthToken, normalizeEmail, sendServerError } from "../util";

export function registerUserRoutes(app: Express) {
  // -------------------------------------------------------------
  // USER SIGNUP, SIGNIN & CLOUD SYNCHRONIZATION ENDPOINTS
  // -------------------------------------------------------------

  // O cliente cria a conta no Firebase Auth antes de chamar esta rota, então exigimos o ID token:
  // só o dono do e-mail pode cadastrar (ou completar) a conta correspondente.
  app.post("/api/auth/register", requireAuth, async (req: any, res) => {
    try {
      const { email, password, name } = req.body;
      if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string" || !email || !password || !name.trim()) {
        return res.status(400).json({ error: "Dados inválidos de cadastro." });
      }

      const emailKey = normalizeEmail(email);
      if (!emailKey) return res.status(400).json({ error: "E-mail inválido." });
      if (normalizeEmail(req.user?.email) !== emailKey) {
        return res.status(403).json({ error: "O e-mail do cadastro não corresponde à sessão autenticada." });
      }

      const db = await getDatabaseForUpdate(emailKey, getAuthToken(req));

      if (Object.prototype.hasOwnProperty.call(db, emailKey)) {
        const existing = db[emailKey];
        // Conta criada por /api/auth/session (onAuthStateChanged chega antes do cadastro) ainda sem senha:
        // o próprio dono, autenticado, pode completá-la. Contas que já têm senha nunca são sobrescritas.
        if (!existing.password) {
          existing.password = hashPassword(password);
          if (existing.profile) existing.profile.name = name.trim();
          await saveDatabase(db, emailKey, getAuthToken(req));
          const responseUser = { ...existing };
          delete (responseUser as any).password;
          return res.json({ success: true, user: responseUser });
        }

        return res.status(400).json({ error: "Este endereço de e-mail já está cadastrado. Faça login para acessar." });
      }

      const customWelcomeText = `Olá, ${name.trim()}! Que excelente ver você aqui na Biker AI. Eu sou o seu Treinador de Ciclismo pessoal.\n\nMinhas planilhas e conselhos são focados em melhorar o seu fôlego e resistência de forma simples e segura, ajustando seus treinos por potência, batimentos do coração ou pelas suas percepções de cansaço.\n\nPara começarmos a planejar sua evolução de forma personalizada, preciso te conhecer melhor através de algumas perguntas rápidas no nosso chat.\n\nComo você já se cadastrou, podemos iniciar o questionário agora mesmo. **Qual é o seu tempo médio pedalando ou seu nível atual no ciclismo?**`;

      const newProfile = createDefaultProfile(emailKey, name);
      const nowIso = newProfile.createdAt;

      const initialChat = [
        {
          id: "welcome-registered",
          sender: "treinador",
          text: customWelcomeText,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      ];

      const newUserEntry = {
        email: email.trim(),
        password: hashPassword(password),
        profile: newProfile,
        createdAt: nowIso,
        chatHistory: initialChat,
        plan: null
      };

      db[emailKey] = newUserEntry;
      await saveDatabase(db, emailKey, getAuthToken(req));

      const responseUser = { ...newUserEntry };
      delete (responseUser as any).password;

      res.json({ success: true, user: responseUser });
    } catch (error: any) {
      console.error("[Auth/Register] Falha no cadastro central:", error);
      res.status(500).json({ error: "Não foi possível salvar seu cadastro central." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }

      const db = await getDatabaseForUpdate(email, getAuthToken(req));
      const userFound = findUserInDb(db, email);

      if (!userFound) {
        return res.status(400).json({ error: "Nenhum cadastro encontrado com este e-mail. Crie uma conta ao lado!" });
      }
      const user = userFound.user;
      const userKey = userFound.key;

      if (!verifyPassword(password, user.password)) {
        return res.status(400).json({ error: "Senha incorreta. Verifique os dados e tente novamente." });
      }

      if (!user.password.includes(":")) {
        user.password = hashPassword(password);
        await saveDatabase(db, userKey, getAuthToken(req));
      }

      if (user.profile) {
        if (!user.profile.role) user.profile.role = isMasterAdminEmail(email) ? "coach" : "athlete";
        if (!user.profile.subscriptionStatus) user.profile.subscriptionStatus = (user.profile.role === "coach") ? "active" : "pending_payment";
        if (!user.profile.subscriptionPlan) user.profile.subscriptionPlan = "Plano Pro";
        if (!user.profile.subscriptionExpiresAt) user.profile.subscriptionExpiresAt = "2026-12-31";
        if (!user.profile.createdAt) user.profile.createdAt = (user as any).createdAt;
      }

      const responseUser = { ...user };
      delete (responseUser as any).password;
      if (responseUser.plan) {
        responseUser.plan = sanitizePlanForUser(responseUser.plan, responseUser.profile, responseUser.email);
      }

      res.json({ success: true, user: responseUser });
    } catch (error: any) {
      sendServerError(res, error);
    }
  });

  app.post("/api/auth/save-user", requireAuth, verifyUserMatch, async (req: any, res: any) => {
    try {
      const { email, userAccount, password } = req.body;
      if (!email || !userAccount || typeof userAccount !== "object") {
        return res.status(400).json({ error: "Dados para sincronização inválidos." });
      }

      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        return res.status(400).json({ error: "E-mail inválido." });
      }

      const db = await getDatabaseForUpdate(normalizedEmail, getAuthToken(req));
      const userFound = findUserInDb(db, normalizedEmail);

      let targetKey: string;
      let existingUser: any;

      if (!userFound) {
        targetKey = normalizedEmail;
        existingUser = {
          email: targetKey,
          profile: createDefaultProfile(targetKey),
          chatHistory: [],
          plan: null,
          feedbacks: [],
          workoutLogs: []
        };
      } else {
        targetKey = userFound.key;
        existingUser = userFound.user;
      }

      const requesterEmail = normalizeEmail(req.user?.email || "") || (req.user?.email || "").toString().trim().toLowerCase();
      const adminHeader = req.headers["x-admin-password"];
      const adminSecretStr = typeof adminHeader === "string" ? adminHeader : undefined;
      const isAdminCaller = Boolean(
        (adminSecretStr && verifyAdminSecret(adminSecretStr)) ||
        isMasterAdminEmail(requesterEmail)
      );

      const existingCreatedAt = existingUser?.profile?.createdAt || existingUser?.createdAt || new Date().toISOString();

      const sanitizedProfile = sanitizeUserProfileInput(userAccount.profile || {}, existingUser?.profile || {});

      if (!isAdminCaller) {
        sanitizedProfile.role = existingUser.profile?.role || "athlete";
        sanitizedProfile.isCoach = existingUser.profile?.isCoach === true;
        sanitizedProfile.subscriptionStatus = existingUser.profile?.subscriptionStatus || "pending_payment";
        sanitizedProfile.subscriptionPlan = existingUser.profile?.subscriptionPlan || "Plano Pro";
        if (existingUser.profile?.subscriptionExpiresAt) {
          sanitizedProfile.subscriptionExpiresAt = existingUser.profile.subscriptionExpiresAt;
        }
      }

      sanitizedProfile.createdAt = existingCreatedAt;

      let preservedPassword = existingUser?.password;
      if (password && password !== existingUser?.password) {
        preservedPassword = password.includes(":") ? password : hashPassword(password);
      } else if (!preservedPassword) {
        preservedPassword = hashPassword(crypto.randomBytes(16).toString("hex"));
      }

      db[targetKey] = {
        ...existingUser,
        email: existingUser.email,
        profile: sanitizedProfile,
        plan: userAccount.plan !== undefined ? userAccount.plan : existingUser.plan,
        feedbacks: userAccount.feedbacks !== undefined ? userAccount.feedbacks : (existingUser.feedbacks || []),
        workoutLogs: userAccount.workoutLogs !== undefined ? userAccount.workoutLogs : (existingUser.workoutLogs || []),
        chatHistory: userAccount.chatHistory !== undefined ? userAccount.chatHistory : (existingUser.chatHistory || []),
        password: preservedPassword,
        createdAt: existingCreatedAt
      };

      const responseUser = { ...db[targetKey] };
      delete (responseUser as any).password;

      await saveDatabase(db, targetKey, getAuthToken(req));
      res.json({ success: true, user: responseUser });
    } catch (error: any) {
      sendServerError(res, error);
    }
  });

  app.post("/api/auth/session", requireAuth, verifyUserMatch, async (req: any, res: any) => {
    try {
      const emailLower = normalizeEmail(req.body?.email);
      if (!emailLower) return res.status(400).json({ error: "E-mail é obrigatório." });
      const authToken = getAuthToken(req);

      const db = await getDatabaseForUpdate(emailLower, authToken);
      let userFound = findUserInDb(db, emailLower);

      if (!userFound && useFirestore) {
        const singleFetch = await fetchFirestoreUser(emailLower, authToken);
        if (singleFetch.found && singleFetch.data) {
          db[emailLower] = singleFetch.data;
          setDatabaseCache(db);
          userFound = { user: singleFetch.data, key: emailLower };
        } else if (singleFetch.error) {
          return res.status(503).json({ error: "Falha temporária ao consultar dados do atleta na nuvem. Tente novamente." });
        }
      }

      if (!userFound) {
        // Conta nova (ex.: primeiro login com Google): perfil vazio, o atleta passa pelo onboarding.
        const newProfile = { ...createDefaultProfile(emailLower, req.user?.name), email: emailLower };

        const newUserEntry = {
          email: emailLower,
          profile: newProfile,
          chatHistory: [],
          plan: null,
          feedbacks: [],
          workoutLogs: [],
          createdAt: new Date().toISOString()
        };

        db[emailLower] = newUserEntry;
        await saveDatabase(db, emailLower, getAuthToken(req));

        const responseUser = { ...newUserEntry };
        delete (responseUser as any).password;
        return res.json({ success: true, user: responseUser });
      }

      const responseUser = { ...userFound.user };
      delete (responseUser as any).password;
      if (responseUser.plan) {
        responseUser.plan = sanitizePlanForUser(responseUser.plan, responseUser.profile, responseUser.email);
      }

      res.json({ success: true, user: responseUser });
    } catch (error: any) {
      sendServerError(res, error);
    }
  });

  app.post("/api/workout/log-completion", requireAuth, verifyUserMatch, async (req, res) => {
    try {
      const { email, log, workoutIndex, workout } = req.body;
      if (!email || !log) {
        return res.status(400).json({ error: "E-mail e dados do treino são obrigatórios." });
      }

      const db = await getDatabaseForUpdate(email, getAuthToken(req));
      const userFound = findUserInDb(db, email);
      if (!userFound) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      const targetKey = userFound.key;
      const user = userFound.user;

      if (!Array.isArray(user.workoutLogs)) {
        user.workoutLogs = [];
      }

      const existingLogIdx = user.workoutLogs.findIndex((l: any) => l.id === log.id);
      if (existingLogIdx >= 0) {
        user.workoutLogs[existingLogIdx] = log;
      } else {
        user.workoutLogs.push(log);
      }

      if (user.plan && Array.isArray(user.plan.workouts) && typeof workoutIndex === "number" && user.plan.workouts[workoutIndex]) {
        user.plan.workouts[workoutIndex] = {
          ...user.plan.workouts[workoutIndex],
          ...workout,
          completed: log.completed !== "nao",
          completedDate: log.completedAt ? log.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
          actualDistance: log.actualDistanceKm,
          actualDuration: log.actualDurationMin,
          completionStatus: log.completed,
          difficulty: log.difficulty,
          athleteNotes: log.notes || user.plan.workouts[workoutIndex].athleteNotes
        };
      }

      await saveDatabase(db, targetKey, getAuthToken(req));

      res.json({
        success: true,
        workoutLogs: user.workoutLogs,
        plan: user.plan
      });
    } catch (error: any) {
      sendServerError(res, error);
    }
  });

  app.post("/api/auth/check-status", requireAuth, verifyUserMatch, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "E-mail é obrigatório." });
      const db = await getDatabase();
      const userFound = findUserInDb(db, email);
      if (!userFound) return res.status(404).json({ error: "Usuário não encontrado." });
      const user = userFound.user;
      const emailKey = email.trim().toLowerCase();

      const isCoach = isCoachProfile(user.profile, emailKey);
      const status = user.profile?.subscriptionStatus || (isCoach ? "active" : "pending_payment");

      res.json({
        success: true,
        subscriptionStatus: status,
        isTrial: isTrialActive(user.profile),
        hasAccess: hasActiveAccess(user.profile, emailKey),
        profile: user.profile
      });
    } catch (error: any) {
      sendServerError(res, error);
    }
  });

}
