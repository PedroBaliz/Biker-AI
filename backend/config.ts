// Configuração: variáveis de ambiente, Firebase (SDK lite e Admin SDK), caminhos locais e a conta master.
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import os from "os";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";
import { initializeApp as initializeAdminApp, getApp as getAdminApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { normalizeEmail } from "./util";

dotenv.config();

/**
 * Paywall desligado por padrão (ADR-008): sem meio de pagamento, todo atleta logado tem acesso
 * completo. A lógica de trial/assinatura continua no código, pronta para voltar com
 * PAYWALL_ENABLED=true (e VITE_PAYWALL_ENABLED=true no frontend) quando houver um provedor.
 */
export const PAYWALL_ENABLED = process.env.PAYWALL_ENABLED === "true";

// Carregar configuração do Firebase Applet
export const configPath = path.join(process.cwd(), "firebase-applet-config.json");
export let firebaseAppletConfig: any = {};
if (fs.existsSync(configPath)) {
  try {
    firebaseAppletConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (err: any) {
    console.error("Erro ao carregar firebase-applet-config.json:", err.message);
  }
}

// Variáveis de ambiente têm prioridade máxima (necessário para deploy no Vercel / serverless)
if (process.env.FIREBASE_PROJECT_ID) {
  firebaseAppletConfig = {
    ...firebaseAppletConfig,
    projectId: process.env.FIREBASE_PROJECT_ID,
    apiKey: process.env.FIREBASE_API_KEY || firebaseAppletConfig.apiKey || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain || "",
    appId: process.env.FIREBASE_APP_ID || firebaseAppletConfig.appId || "",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket || "",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId || "",
    firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId || "(default)"
  };
  console.log("[Firebase Config] Variáveis de ambiente aplicadas.");
}

export let firestoreDb: any = null;
export let useFirestore = false;

// Testes (Vitest) nunca tocam o Firestore real: usam só o users_db.json local.
export const IS_TEST_RUN = Boolean(process.env.VITEST);

try {
  if (!IS_TEST_RUN && firebaseAppletConfig && firebaseAppletConfig.projectId && firebaseAppletConfig.apiKey) {
    const firebaseApp = getApps().length === 0 
      ? initializeApp({
          apiKey: firebaseAppletConfig.apiKey,
          authDomain: firebaseAppletConfig.authDomain,
          projectId: firebaseAppletConfig.projectId,
          appId: firebaseAppletConfig.appId,
          storageBucket: firebaseAppletConfig.storageBucket,
          messagingSenderId: firebaseAppletConfig.messagingSenderId,
        })
      : getApp();

    firestoreDb = getFirestore(firebaseApp, firebaseAppletConfig.firestoreDatabaseId || undefined);
    useFirestore = true;
    console.log("[Firebase Lite] Inicializado com sucesso para o projeto:", firebaseAppletConfig.projectId);
  } else {
    console.log("[Firebase Lite] Desativado. Usando apenas persistência local.");
  }
} catch (err: any) {
  console.error("[Firebase Lite] Falha ao inicializar. Usando persistência local:", err.message);
  firestoreDb = null;
  useFirestore = false;
}

// Inicializar SDK de administração do Firebase (Firebase Admin) para bypass de regras de segurança no servidor
export let adminFirestoreDb: any = null;
try {
  if (!IS_TEST_RUN && firebaseAppletConfig && firebaseAppletConfig.projectId) {
    const adminConfig: any = {
      projectId: firebaseAppletConfig.projectId
    };

    const serviceAccountPath = path.join(process.cwd(), "service-account.json");
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        adminConfig.credential = cert(serviceAccount);
        console.log("[Firebase Admin] Inicializado com credencial de FIREBASE_SERVICE_ACCOUNT.");
      } catch (keyErr: any) {
        console.error("[Firebase Admin] Erro ao carregar FIREBASE_SERVICE_ACCOUNT:", keyErr.message);
      }
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        adminConfig.credential = cert(serviceAccount);
        console.log("[Firebase Admin] Inicializado com credencial de FIREBASE_SERVICE_ACCOUNT_KEY.");
      } catch (keyErr: any) {
        console.error("[Firebase Admin] Erro ao carregar FIREBASE_SERVICE_ACCOUNT_KEY:", keyErr.message);
      }
    } else if (fs.existsSync(serviceAccountPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
        adminConfig.credential = cert(serviceAccount);
        console.log("[Firebase Admin] Carregando credenciais do arquivo service-account.json...");
      } catch (keyErr: any) {
        console.error("[Firebase Admin] Erro ao carregar service-account.json:", keyErr.message);
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        adminConfig.credential = applicationDefault();
        console.log("[Firebase Admin] Inicializando com Application Default Credentials (ADC)...");
      } catch (adcErr: any) {
        console.warn("[Firebase Admin] ADC não disponível no ambiente atual:", adcErr.message);
      }
    }

    if (adminConfig.credential) {
      initializeAdminApp(adminConfig);
      let firestoreInstance: any;
      try {
        if (firebaseAppletConfig.firestoreDatabaseId) {
          firestoreInstance = getAdminFirestore(getAdminApp(), firebaseAppletConfig.firestoreDatabaseId);
        } else {
          firestoreInstance = getAdminFirestore(getAdminApp());
        }
      } catch (e: any) {
        console.warn("[Firebase Admin] Falha ao iniciar firestore com databaseId, tentando padrão:", e.message);
        firestoreInstance = getAdminFirestore(getAdminApp());
      }
      adminFirestoreDb = firestoreInstance;
      console.log("[Firebase Admin] Inicializado com sucesso para o projeto:", firebaseAppletConfig.projectId);
    } else {
      console.log("[Firebase Admin] Credenciais de conta de serviço não encontradas. Usando Firestore Lite SDK.");
    }
  }
} catch (err: any) {
  console.warn("[Firebase Admin] Falha ao inicializar Admin SDK:", err.message);
}

// JSON file database path for local persistence
export const USERS_DB_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), "users_db.json")
  : path.join(process.cwd(), "users_db.json");

/**
 * Conta master (treinador principal), definida só por variável de ambiente.
 * Sem ADMIN_EMAIL válido o modo master fica desligado: nenhum e-mail recebe o privilégio
 * (coach/admin por `role` no banco e a credencial x-admin-password continuam valendo).
 */
export const MASTER_ADMIN_EMAIL: string | null = normalizeEmail(process.env.ADMIN_EMAIL);
if (!MASTER_ADMIN_EMAIL && !IS_TEST_RUN) {
  console.warn("[Config] ADMIN_EMAIL ausente ou inválido: conta master desativada.");
}

/** Identidade usada quando o acesso admin vem da credencial x-admin-password (sem e-mail master configurado). */
export const ADMIN_SECRET_IDENTITY = "admin-secret";

/** Compara com a conta master; sempre falso quando ADMIN_EMAIL não está configurado. */
export function isMasterAdminEmail(email: unknown): boolean {
  if (!MASTER_ADMIN_EMAIL || typeof email !== "string") return false;
  return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL;
}

export const isDirectRun = Boolean(
  process.argv[1] && (
    process.argv[1].endsWith("server.ts") ||
    process.argv[1].endsWith("server.cjs") ||
    process.argv[1].endsWith("server.js")
  )
);
/** Desliga o Admin SDK depois de uma falha de credencial (usado pela camada de dados). */
export function disableAdminFirestore() {
  adminFirestoreDb = null;
}
