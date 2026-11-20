// Persistência: cache em memória, Firestore (Admin SDK, REST com o token do usuário ou SDK lite), arquivo local e backups.
import path from "path";
import fs from "fs";
import os from "os";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore/lite";
import { createDefaultProfile } from "./access";
import { isCoachProfile } from "./auth";
import { MASTER_ADMIN_EMAIL, USERS_DB_PATH, adminFirestoreDb, disableAdminFirestore, firebaseAppletConfig, firestoreDb, useFirestore } from "./config";
import { findUserInDb, normalizeEmail } from "./util";

export let inMemoryDbCache: Record<string, any> | null = null;
export let inMemoryDbCacheTimestamp: number = 0;
export let inMemoryDbCacheSource: "firestore" | "local_cache" = "local_cache";
export const DB_CACHE_TTL_MS = 30000;

export function toFirestoreValue(value: any): any {
  if (value === null) return { nullValue: null };
  if (value === undefined) return null;
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.filter(v => v !== undefined).map(toFirestoreValue) } };
  if (typeof value === "object") {
    const fields: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      if (value[key] !== undefined) {
        fields[key] = toFirestoreValue(value[key]);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

export function toFirestoreDocument(fields: Record<string, any>) {
  const docFields: Record<string, any> = {};
  for (const key of Object.keys(fields)) {
    if (fields[key] !== undefined) {
      docFields[key] = toFirestoreValue(fields[key]);
    }
  }
  return { fields: docFields };
}

export function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== "object") return val;
  if ("nullValue" in val) return null;
  if ("stringValue" in val) return val.stringValue;
  if ("booleanValue" in val) return Boolean(val.booleanValue);
  if ("integerValue" in val) {
    const num = Number(val.integerValue);
    return isNaN(num) ? val.integerValue : num;
  }
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("timestampValue" in val) return val.timestampValue;
  if ("arrayValue" in val) {
    return Array.isArray(val.arrayValue?.values) ? val.arrayValue.values.map(fromFirestoreValue) : [];
  }
  if ("mapValue" in val) {
    const res: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const k of Object.keys(fields)) res[k] = fromFirestoreValue(fields[k]);
    return res;
  }
  return val;
}

export function fromFirestoreDocument(doc: any): Record<string, any> {
  if (!doc || !doc.fields) return {};
  const res: Record<string, any> = {};
  for (const k of Object.keys(doc.fields)) res[k] = fromFirestoreValue(doc.fields[k]);
  return res;
}

export function firestoreUserDocUrl(projectId: string, dbId: string, docId: string): string {
  // O ID do documento vem do e-mail (entrada do usuário): sempre codificado, para não
  // alterar o caminho da requisição REST (ex.: "../", "?", "#").
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(dbId)}/documents/users/${encodeURIComponent(docId)}`;
}

export async function fetchFirestoreUsers(idToken?: string): Promise<Record<string, any>> {
  if (adminFirestoreDb) {
    try {
      const snapshot = await adminFirestoreDb.collection("users").get();
      const users: Record<string, any> = {};
      snapshot.forEach((doc: any) => { users[doc.id] = doc.data(); });
      return users;
    } catch (err: any) {
      if (err.message && (err.message.includes("default credentials") || err.message.includes("UNAUTHENTICATED"))) {
        disableAdminFirestore();
      }
    }
  }

  if (idToken && firebaseAppletConfig && firebaseAppletConfig.projectId) {
    try {
      const projectId = firebaseAppletConfig.projectId;
      const dbId = firebaseAppletConfig.firestoreDatabaseId || "(default)";
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/users`;
      const res = await fetch(url, {
        headers: { "Authorization": idToken.startsWith("Bearer ") ? idToken : `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const users: Record<string, any> = {};
        if (data.documents && Array.isArray(data.documents)) {
          for (const d of data.documents) {
            const docId = d.name.split("/").pop();
            users[docId] = fromFirestoreDocument(d);
          }
        }
        return users;
      }
    } catch (restErr: any) {}
  }

  if (!useFirestore || !firestoreDb) throw new Error("Firestore não está habilitado.");
  const colRef = collection(firestoreDb, "users");
  const snapshot = await getDocs(colRef);
  const users: Record<string, any> = {};
  snapshot.docs.forEach((doc) => { users[doc.id] = doc.data(); });
  return users;
}

export async function fetchFirestoreUser(email: string, idToken?: string): Promise<{ found: boolean; data?: any; error?: string }> {
  const emailKey = email.trim().toLowerCase();

  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return { found: false };
  }

  if (adminFirestoreDb) {
    try {
      const docSnap = await adminFirestoreDb.collection("users").doc(emailKey).get();
      if (docSnap.exists) return { found: true, data: docSnap.data() };
      return { found: false };
    } catch (err: any) {}
  }

  if (idToken && firebaseAppletConfig && firebaseAppletConfig.projectId) {
    try {
      const projectId = firebaseAppletConfig.projectId;
      const dbId = firebaseAppletConfig.firestoreDatabaseId || "(default)";
      const url = firestoreUserDocUrl(projectId, dbId, emailKey);
      const res = await fetch(url, {
        headers: { "Authorization": idToken.startsWith("Bearer ") ? idToken : `Bearer ${idToken}` }
      });
      if (res.status === 200) {
        const docJson = await res.json();
        return { found: true, data: fromFirestoreDocument(docJson) };
      } else if (res.status === 404 || res.status === 401 || res.status === 403) {
        return { found: false };
      }
    } catch (restErr: any) {
      return { found: false, error: restErr.message };
    }
  }

  if (useFirestore && firestoreDb) {
    try {
      const colRef = collection(firestoreDb, "users");
      const snapshot = await getDocs(colRef);
      for (const d of snapshot.docs) {
        if (d.id.toLowerCase() === emailKey) return { found: true, data: d.data() };
      }
      return { found: false };
    } catch (e: any) {
      return { found: false, error: e.message };
    }
  }

  return { found: false };
}

export async function saveFirestoreUser(email: string, userData: any, idToken?: string): Promise<void> {
  const emailKey = email.trim().toLowerCase();
  let lastError: Error | null = null;

  if (adminFirestoreDb) {
    try {
      await adminFirestoreDb.collection("users").doc(emailKey).set(userData);
      return;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error("[Firestore] Falha ao salvar com Admin SDK:", lastError.message);
    }
  }

  if (idToken && firebaseAppletConfig && firebaseAppletConfig.projectId) {
    try {
      const projectId = firebaseAppletConfig.projectId;
      const dbId = firebaseAppletConfig.firestoreDatabaseId || "(default)";
      const url = firestoreUserDocUrl(projectId, dbId, emailKey);
      const payload = toFirestoreDocument(userData);
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Authorization": idToken.startsWith("Bearer ") ? idToken : `Bearer ${idToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) return;
      lastError = new Error(`Firestore REST retornou ${res.status}: ${await res.text()}`);
    } catch (restErr: any) {
      lastError = restErr instanceof Error ? restErr : new Error(String(restErr));
    }
  }

  if (useFirestore && firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "users", emailKey);
      await setDoc(docRef, userData);
      return;
    } catch (err: any) {
      lastError = lastError || (err instanceof Error ? err : new Error(String(err)));
    }
  }

  if (lastError) {
    console.warn("[Firestore] Aviso de sincronização para %s: %s", emailKey, lastError.message);
  }
}

export async function deleteFirestoreUser(email: string, idToken?: string): Promise<void> {
  const emailKey = email.trim().toLowerCase();
  const cleanKey = emailKey.replace(/[^a-z0-9]/g, "_");
  const keysToDelete = Array.from(new Set([emailKey, cleanKey]));

  if (adminFirestoreDb) {
    try {
      for (const k of keysToDelete) {
        await adminFirestoreDb.collection("users").doc(k).delete().catch(() => {});
      }
      const snapshot = await adminFirestoreDb.collection("users").get().catch(() => null);
      if (snapshot) {
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          const docEmail = data?.email?.trim()?.toLowerCase();
          if (docEmail === emailKey || keysToDelete.includes(doc.id)) {
            doc.ref.delete().catch(() => {});
          }
        });
      }
      return;
    } catch (err: any) {}
  }

  if (firebaseAppletConfig && firebaseAppletConfig.projectId) {
    try {
      const projectId = firebaseAppletConfig.projectId;
      const dbId = firebaseAppletConfig.firestoreDatabaseId || "(default)";
      for (const k of keysToDelete) {
        const url = firestoreUserDocUrl(projectId, dbId, k);
        await fetch(url, {
          method: "DELETE",
          headers: idToken ? { "Authorization": idToken.startsWith("Bearer ") ? idToken : `Bearer ${idToken}` } : {}
        }).catch(() => {});
      }
    } catch (restErr: any) {}
  }

  if (useFirestore && firestoreDb) {
    try {
      for (const k of keysToDelete) {
        const docRef = doc(firestoreDb, "users", k);
        await deleteDoc(docRef).catch(() => {});
      }
    } catch (e: any) {}
  }
}

export async function getDatabaseWithSource(forceRefresh = false, idToken?: string): Promise<{ db: Record<string, any>; source: "firestore" | "local_cache" }> {
  const isCacheValid = inMemoryDbCache && (Date.now() - inMemoryDbCacheTimestamp < DB_CACHE_TTL_MS);
  if (!forceRefresh && isCacheValid && inMemoryDbCache) {
    return { db: inMemoryDbCache, source: inMemoryDbCacheSource };
  }

  const localDb: Record<string, any> = {};
  let resolvedSource: "firestore" | "local_cache" = "local_cache";

  if (useFirestore) {
    try {
      const users = await fetchFirestoreUsers(idToken);
      if (Object.keys(users).length > 0) {
        Object.assign(localDb, users);
        resolvedSource = "firestore";
      }
    } catch (err: any) {}
  }

  if (Object.keys(localDb).length === 0) {
    try {
      if (fs.existsSync(USERS_DB_PATH)) {
        const data = fs.readFileSync(USERS_DB_PATH, "utf-8");
        Object.assign(localDb, JSON.parse(data));
        resolvedSource = "local_cache";
      }
    } catch (localErr: any) {}
  }

  if (MASTER_ADMIN_EMAIL && !findUserInDb(localDb, MASTER_ADMIN_EMAIL)) {
    localDb[MASTER_ADMIN_EMAIL] = {
      email: MASTER_ADMIN_EMAIL,
      profile: { ...createDefaultProfile(MASTER_ADMIN_EMAIL), createdAt: "2026-01-01T00:00:00.000Z" },
      chatHistory: [],
      plan: null,
      feedbacks: [],
      workoutLogs: [],
      createdAt: "2026-01-01T00:00:00.000Z"
    };
  }

  inMemoryDbCache = localDb;
  inMemoryDbCacheTimestamp = Date.now();
  inMemoryDbCacheSource = resolvedSource;
  return { db: localDb, source: resolvedSource };
}

export async function getDatabase(forceRefresh = false, idToken?: string): Promise<Record<string, any>> {
  const result = await getDatabaseWithSource(forceRefresh, idToken);
  return result.db;
}

/**
 * Banco para ler, alterar e gravar UM usuário. O cache em memória vale por até DB_CACHE_TTL_MS
 * e não é compartilhado entre instâncias serverless: alterar o registro a partir dele e gravar
 * desfaria o que outra instância gravou nesse intervalo (lost update). Por isso o registro do
 * usuário é relido do Firestore antes da alteração; o restante do banco segue do cache.
 */
export async function getDatabaseForUpdate(email: unknown, idToken?: string): Promise<Record<string, any>> {
  const db = await getDatabase(false, idToken);
  const emailKey = normalizeEmail(email);
  if (!emailKey || !useFirestore) return db;

  const fresh = await fetchFirestoreUser(emailKey, idToken);
  if (fresh.found && fresh.data) {
    const existing = findUserInDb(db, emailKey);
    db[existing?.key || emailKey] = fresh.data;
  }
  return db;
}

export const BACKUPS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "db_backups")
  : path.join(process.cwd(), "db_backups");

export let lastAutomaticBackupTime = 0;

export async function triggerAutomaticBackup(db: Record<string, any>) {
  const now = Date.now();
  if (now - lastAutomaticBackupTime < 10 * 60 * 1000) return;
  lastAutomaticBackupTime = now;

  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `users_db_backup_${timestamp}.json`;
    const backupPath = path.join(BACKUPS_DIR, filename);

    await fs.promises.writeFile(backupPath, JSON.stringify(db, null, 2), "utf-8");

    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith("users_db_backup_") && f.endsWith(".json"))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 10) {
      for (const file of files.slice(10)) {
        fs.unlinkSync(path.join(BACKUPS_DIR, file.name));
      }
    }
  } catch (err) {}
}

export async function createDatabaseBackup(db: Record<string, any>, filename?: string): Promise<string> {
  await fs.promises.mkdir(BACKUPS_DIR, { recursive: true });
  const backupName = filename || `users_db_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  if (!/^users_db_backup_[A-Za-z0-9_.-]+\.json$/.test(backupName)) {
    throw new Error("Nome de backup inválido.");
  }
  await fs.promises.writeFile(path.join(BACKUPS_DIR, backupName), JSON.stringify(db, null, 2), "utf-8");
  return backupName;
}

/**
 * Grava o banco no cache, no disco e no Firestore. Com `targetEmail`, só aquele usuário vai para
 * o Firestore; sem ele, TODOS os usuários do `db` são regravados (use apenas para restauração de
 * backup). `localOnly` atualiza cache e disco sem tocar no Firestore — para quando a nuvem já foi
 * alterada por outra chamada (ex.: deleteFirestoreUser).
 */
export async function saveDatabase(db: Record<string, any>, targetEmail?: string, idToken?: string, options: { localOnly?: boolean } = {}) {
  inMemoryDbCache = db;
  inMemoryDbCacheTimestamp = Date.now();

  let firestoreSuccess = false;
  let firestoreError: any = null;

  if (useFirestore && !options.localOnly) {
    try {
      if (targetEmail) {
        const emailKey = targetEmail.trim().toLowerCase();
        const target = findUserInDb(db, emailKey);
        if (!target) throw new Error("Usuário não encontrado para persistência.");
        await saveFirestoreUser(emailKey, target.user, idToken);
        firestoreSuccess = true;
      } else {
        const results = await Promise.allSettled(
          Object.keys(db).map((email) => saveFirestoreUser(email, db[email], idToken))
        );
        const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
        if (failed) {
          firestoreError = failed.reason;
        } else {
          firestoreSuccess = true;
        }
      }
    } catch (err: any) {
      firestoreError = err;
    }
  }

  let diskSuccess = false;
  let diskError: any = null;
  try {
    await fs.promises.writeFile(USERS_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    diskSuccess = true;
    triggerAutomaticBackup(db).catch(() => {});
  } catch (err: any) {
    diskError = err;
  }

  // Se ambos falharem no ambiente (ex: disco somente leitura ou Firestore offline), manter em cache de memória
  if (!diskSuccess && !firestoreSuccess) {
    console.warn(`[SaveDatabase] Aviso de persistência física (disco: ${diskError?.message}, firestore: ${firestoreError?.message}). Usuário mantido em memória.`);
  }
}

export async function runInitialMigration() {
  if (!useFirestore) return;
  try {
    const currentUsers = await fetchFirestoreUsers();
    if (Object.keys(currentUsers).length > 0) return;

    if (fs.existsSync(USERS_DB_PATH)) {
      const localDb = JSON.parse(fs.readFileSync(USERS_DB_PATH, "utf-8"));
      const userEmails = Object.keys(localDb);
      if (userEmails.length > 0) {
        await Promise.all(userEmails.map(email => saveFirestoreUser(email, localDb[email]).catch(() => {})));
      }
    }
  } catch (err: any) {}
}

export async function ensureAllAthletesArePending() {
  try {
    const db = await getDatabase();
    let updatedCount = 0;
    
    for (const email of Object.keys(db)) {
      const user = db[email];
      if (user && user.profile) {
        const isCoach = isCoachProfile(user.profile, email);
        let changed = false;
        if (!isCoach) {
          if (!user.profile.subscriptionStatus) { user.profile.subscriptionStatus = "pending_payment"; changed = true; }
          if (user.profile.subscriptionPlan !== "Plano Pro") { user.profile.subscriptionPlan = "Plano Pro"; changed = true; }
        } else {
          if (user.profile.role !== "coach") { user.profile.role = "coach"; changed = true; }
          if (user.profile.subscriptionPlan !== "Acesso Master (Coach)") { user.profile.subscriptionPlan = "Acesso Master (Coach)"; changed = true; }
          if (user.profile.subscriptionStatus !== "active") { user.profile.subscriptionStatus = "active"; changed = true; }
        }
        if (changed) updatedCount++;
      }
    }
    
    if (updatedCount > 0) {
      await saveDatabase(db);
    }
  } catch (err: any) {}
}
/** Coloca um banco já carregado no cache em memória desta instância. */
export function setDatabaseCache(db: Record<string, any>) {
  inMemoryDbCache = db;
  inMemoryDbCacheTimestamp = Date.now();
}
