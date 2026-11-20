// Rotas administrativas (/api/admin/*): diagnóstico, usuários, status de assinatura, exclusão e backups.
import type { Express } from "express";
import path from "path";
import fs from "fs";
import { getApp as getAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { callGeminiWithFallback, getAiClient } from "../ai";
import { isCoachProfile, requireAdmin, requireAuth, verifyAdminSecret } from "../auth";
import { USERS_DB_PATH, firebaseAppletConfig, isMasterAdminEmail, useFirestore } from "../config";
import { BACKUPS_DIR, createDatabaseBackup, deleteFirestoreUser, fetchFirestoreUsers, getDatabase, getDatabaseWithSource, saveDatabase } from "../db";
import { findUserInDb, getAuthToken, normalizeEmail, sendServerError } from "../util";

export function registerAdminRoutes(app: Express) {
  // Restrito ao admin: faz uma chamada paga ao Gemini e lê a coleção de usuários a cada acesso.
  app.get("/api/admin/diagnostics", requireAuth, requireAdmin, async (req, res) => {
    const responses: any = {
      apiKeyConfigured: !!process.env.GEMINI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      modelName: "gemini-2.5-flash",
      useFirestore,
      firestoreInitialized: useFirestore,
      firestoreDatabaseId: firebaseAppletConfig?.firestoreDatabaseId || null
    };

    if (useFirestore) {
      try {
        const users = await fetchFirestoreUsers();
        responses.firestoreConnection = "SUCCESS";
        responses.firestoreEmpty = Object.keys(users).length === 0;
      } catch (err: any) {
        responses.firestoreConnection = "FAILED";
        responses.firestoreErrorMessage = err.message;
      }
    } else {
      responses.firestoreConnection = "DISABLED_OR_UNINITIALIZED";
    }

    try {
      const testCall = await callGeminiWithFallback((model) =>
        getAiClient().models.generateContent({
          model,
          contents: "Hi, please answer with exactly 'OK'."
        })
      );
      responses.geminiConnection = "SUCCESS";
      responses.geminiResponse = testCall.text;
    } catch (err: any) {
      responses.geminiConnection = "FAILED";
      responses.errorMessage = err.message;
    }
    res.json(responses);
  });

  // Admin Endpoints
  app.post("/api/admin/verify-access", requireAuth, async (req: any, res: any) => {
    try {
      const { password } = req.body;
      const authEmail = (req.user?.email || "").toString().trim().toLowerCase();

      if ((password && verifyAdminSecret(password)) || isMasterAdminEmail(authEmail)) {
        return res.json({ success: true, authorized: true });
      }

      const db = await getDatabase();
      const userFound = findUserInDb(db, authEmail);
      if (userFound?.user?.profile && isCoachProfile(userFound.user.profile, authEmail)) {
        return res.json({ success: true, authorized: true });
      }

      return res.status(403).json({ error: "Acesso administrativo negado." });
    } catch (err: any) {
      return sendServerError(res, err);
    }
  });

  app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { db, source } = await getDatabaseWithSource(true, getAuthToken(req));
      const userList = Object.keys(db).map((key) => {
        const user = db[key];
        const isCoach = isCoachProfile(user.profile, user.email);
        return {
          email: user.email,
          createdAt: user.profile?.createdAt || user.createdAt,
          chatHistoryCount: Array.isArray(user.chatHistory) ? user.chatHistory.length : 0,
          hasPlan: Boolean(user.plan),
          planSummary: user.plan?.summary || "",
          feedbacks: Array.isArray(user.feedbacks) ? user.feedbacks : [],
          profile: {
            ...user.profile,
            subscriptionStatus: user.profile?.subscriptionStatus || (isCoach ? "active" : "pending_payment"),
            subscriptionPlan: isCoach ? "Acesso Master (Coach)" : (user.profile?.subscriptionPlan || "Plano Pro")
          }
        };
      });
      res.json({ success: true, users: userList, source });
    } catch (error: any) {
      sendServerError(res, error);
    }
  });

  app.post("/api/admin/update-user-status", requireAuth, requireAdmin, async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const status = req.body?.subscriptionStatus;
      const role = req.body?.role;
      if (!email) return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
      if (!["active", "expired", "pending_payment"].includes(status)) {
        return res.status(400).json({ error: "Status de assinatura inválido." });
      }
      if (role !== undefined && !["athlete", "coach"].includes(role)) {
        return res.status(400).json({ error: "Papel de usuário inválido." });
      }

      const db = await getDatabase(true, getAuthToken(req));
      const userFound = findUserInDb(db, email);
      if (!userFound) return res.status(404).json({ error: "Usuário não encontrado." });
      if (isMasterAdminEmail(email) && role === "athlete") {
        return res.status(403).json({ error: "O treinador principal não pode ser rebaixado." });
      }

      const profile = userFound.user.profile || {};
      profile.subscriptionStatus = status;
      if (typeof req.body?.subscriptionPlan === "string" && req.body.subscriptionPlan.trim()) {
        profile.subscriptionPlan = req.body.subscriptionPlan.trim().slice(0, 100);
      }
      if (typeof req.body?.subscriptionExpiresAt === "string") {
        profile.subscriptionExpiresAt = req.body.subscriptionExpiresAt.trim().slice(0, 40);
      }
      if (role !== undefined) profile.role = role;
      if (req.body?.createdAt !== undefined) {
        const createdAt = new Date(req.body.createdAt);
        if (Number.isNaN(createdAt.getTime())) return res.status(400).json({ error: "Data de criação inválida." });
        profile.createdAt = createdAt.toISOString();
      }
      if (req.body?.ftp !== undefined) {
        const ftp = req.body.ftp === null || req.body.ftp === "" ? null : Number(req.body.ftp);
        if (ftp !== null && (!Number.isFinite(ftp) || ftp < 0 || ftp > 2000)) return res.status(400).json({ error: "FTP inválido." });
        profile.ftp = ftp;
      }
      if (req.body?.maxHeartRate !== undefined) {
        const maxHeartRate = req.body.maxHeartRate === null || req.body.maxHeartRate === "" ? null : Number(req.body.maxHeartRate);
        if (maxHeartRate !== null && (!Number.isFinite(maxHeartRate) || maxHeartRate < 30 || maxHeartRate > 250)) return res.status(400).json({ error: "Frequência cardíaca máxima inválida." });
        profile.maxHeartRate = maxHeartRate;
      }
      userFound.user.profile = profile;
      await saveDatabase(db, userFound.key, getAuthToken(req));
      res.json({ success: true, user: { ...userFound.user, password: undefined } });
    } catch (error: any) {
      console.error("[Admin/UpdateUser] Falha:", error);
      res.status(500).json({ error: "Não foi possível atualizar o usuário." });
    }
  });

  app.post("/api/admin/delete-user", requireAuth, requireAdmin, async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      if (!email) return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
      if (isMasterAdminEmail(email)) return res.status(403).json({ error: "O treinador principal não pode ser excluído." });

      const db = await getDatabase(true, getAuthToken(req));
      const userFound = findUserInDb(db, email);
      if (!userFound) return res.status(404).json({ error: "Usuário não encontrado." });
      delete db[userFound.key];
      // Só o documento do usuário sai do Firestore; regravar o banco inteiro a partir deste
      // instante sobrescreveria gravações feitas em paralelo por outras instâncias.
      await deleteFirestoreUser(email, getAuthToken(req));
      await saveDatabase(db, undefined, getAuthToken(req), { localOnly: true });

      try {
        const adminApp = getAdminApp();
        await getAdminAuth(adminApp).getUserByEmail(email).then((record) => getAdminAuth(adminApp).deleteUser(record.uid));
      } catch (error: any) {
        console.warn("[Admin/DeleteUser] Não foi possível remover a identidade Firebase:", error.message);
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Admin/DeleteUser] Falha:", error);
      res.status(500).json({ error: "Não foi possível excluir o usuário." });
    }
  });

  app.get("/api/admin/backups", requireAuth, requireAdmin, async (req, res) => {
    try {
      await fs.promises.mkdir(BACKUPS_DIR, { recursive: true });
      const entries = await fs.promises.readdir(BACKUPS_DIR, { withFileTypes: true });
      const backups = await Promise.all(entries
        .filter((entry) => entry.isFile() && /^users_db_backup_[A-Za-z0-9_.-]+\.json$/.test(entry.name))
        .map(async (entry) => {
          const filePath = path.join(BACKUPS_DIR, entry.name);
          const stat = await fs.promises.stat(filePath);
          return { filename: entry.name, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
        }));
      backups.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      const mainStat = await fs.promises.stat(USERS_DB_PATH).catch(() => null);
      res.json({
        success: true,
        backups,
        mainDatabase: mainStat ? { sizeBytes: mainStat.size, lastModified: mainStat.mtime.toISOString() } : null
      });
    } catch (error: any) {
      res.status(500).json({ error: "Não foi possível listar os backups." });
    }
  });

  app.post("/api/admin/backups/create", requireAuth, requireAdmin, async (req, res) => {
    try {
      const db = await getDatabase(true, getAuthToken(req));
      const filename = await createDatabaseBackup(db);
      res.json({ success: true, filename });
    } catch (error: any) {
      console.error("[Admin/BackupCreate] Falha:", error);
      res.status(500).json({ error: "Não foi possível criar o backup." });
    }
  });

  app.post("/api/admin/backups/restore", requireAuth, requireAdmin, async (req, res) => {
    try {
      const filename = typeof req.body?.filename === "string" ? req.body.filename : "";
      if (!/^users_db_backup_[A-Za-z0-9_.-]+\.json$/.test(filename)) {
        return res.status(400).json({ error: "Nome de backup inválido." });
      }
      // Além da regex (sem "/" nem "\"), confirma que o caminho resolvido fica dentro da pasta de backups.
      const backupsRoot = path.resolve(BACKUPS_DIR);
      const backupPath = path.resolve(backupsRoot, filename);
      if (!backupPath.startsWith(backupsRoot + path.sep)) {
        return res.status(400).json({ error: "Nome de backup inválido." });
      }
      const backupDb = JSON.parse(await fs.promises.readFile(backupPath, "utf-8"));
      if (!backupDb || Array.isArray(backupDb) || typeof backupDb !== "object") {
        return res.status(400).json({ error: "Conteúdo de backup inválido." });
      }
      const currentDb = await getDatabase(true, getAuthToken(req));
      await createDatabaseBackup(currentDb);
      for (const currentEmail of Object.keys(currentDb)) {
        if (!Object.prototype.hasOwnProperty.call(backupDb, currentEmail)) {
          await deleteFirestoreUser(currentEmail, getAuthToken(req));
        }
      }
      await saveDatabase(backupDb, undefined, getAuthToken(req));
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Admin/BackupRestore] Falha:", error);
      res.status(500).json({ error: "Não foi possível restaurar o backup." });
    }
  });
}
