// Regras de acesso pago: trial, assinatura, campos de perfil editáveis pelo atleta e mascaramento da planilha (paywall).
import { isCoachProfile } from "./auth";
import { isMasterAdminEmail } from "./config";
import { getDatabase } from "./db";
import { findUserInDb, getAuthToken, normalizeEmail } from "./util";

export function isTrialActive(profile: any): boolean {
  if (!profile || !profile.createdAt) return false;
  if (profile.subscriptionStatus === "expired") return false;
  const created = new Date(profile.createdAt).getTime();
  if (isNaN(created)) return false;
  const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
  // Mesma borda do cliente (getUserAccessInfo): exatamente em 72 h o trial já expirou.
  return (Date.now() - created) < TRIAL_DURATION_MS;
}

export function hasActiveAccess(profile: any, userEmail?: string): boolean {
  if (!profile) return false;
  if (isCoachProfile(profile, profile?.email || userEmail)) return true;
  if (profile.subscriptionStatus === "expired") return false;
  if (profile.subscriptionStatus === "active") return true;
  return isTrialActive(profile);
}

export const PROFILE_FIELD_ALLOWLIST = new Set([
  "name",
  "level",
  "goal",
  "daysPerWeek",
  "durationPerSession",
  "eventDate",
  "hasPowerMeter",
  "ftp",
  "hasHeartRate",
  "maxHeartRate",
  "limitations",
  "recentActivity",
  "onboardingStep"
]);

export function sanitizeUserProfileInput(incomingProfile: any, existingProfile: any = {}) {
  const sanitized: Record<string, any> = { ...(existingProfile || {}) };
  if (!incomingProfile || typeof incomingProfile !== "object") {
    return sanitized;
  }

  for (const [key, value] of Object.entries(incomingProfile)) {
    if (!PROFILE_FIELD_ALLOWLIST.has(key) || value === undefined) continue;
    sanitized[key] = value;
  }

  if (sanitized.role !== "coach" && sanitized.role !== "admin") {
    sanitized.role = existingProfile?.role || "athlete";
  }
  sanitized.isCoach = Boolean(existingProfile?.isCoach === true || sanitized.role === "coach");
  sanitized.subscriptionStatus = existingProfile?.subscriptionStatus || "pending_payment";
  sanitized.subscriptionPlan = existingProfile?.subscriptionPlan || "Plano Pro";
  sanitized.subscriptionExpiresAt = existingProfile?.subscriptionExpiresAt || "2026-12-31";
  sanitized.createdAt = existingProfile?.createdAt || new Date().toISOString();

  return sanitized;
}

/**
 * Decide o acesso pago a partir do perfil salvo no banco para o usuário autenticado.
 * Nunca use o `profile` enviado no corpo da requisição para isso: o cliente controla esse dado.
 * Um coach autenticado tem acesso total (inclusive ao agir em nome de um atleta).
 */
export async function resolveRequesterAccess(req: any): Promise<boolean> {
  const email = normalizeEmail(req.user?.email);
  if (!email) return false;
  if (isMasterAdminEmail(email)) return true;
  const db = await getDatabase(false, getAuthToken(req));
  const profile = findUserInDb(db, email)?.user?.profile;
  if (!profile) return false;
  return hasActiveAccess({ ...profile, email }, email);
}

export function sanitizePlanForUser(plan: any, profile: any, userEmail?: string) {
  return sanitizePlanByAccess(plan, hasActiveAccess(profile, userEmail));
}

export function sanitizePlanByAccess(plan: any, isSubscriber: boolean) {
  if (!plan) return null;

  if (isSubscriber) {
    return {
      ...plan,
      isLocked: false
    };
  }

  return {
    ...plan,
    isLocked: true,
    workouts: (plan.workouts || []).map((w: any) => ({
      ...w,
      structure: "[Conteúdo Exclusivo - Assine o Biker AI para desbloquear a estrutura minuto a minuto e % de FTP]",
      tip: "[Assine o Biker AI para acessar as instruções fisiológicas e dicas do treinador]",
      isLocked: true
    })),
    observations: plan.observations ? "[Conteúdo Exclusivo - Assine o Biker AI para visualizar as observações técnicas completas do treinador.]" : "",
    evaluation: plan.evaluation ? "[Conteúdo Exclusivo - Assine o Biker AI para visualizar a avaliação fisiológica completa.]" : ""
  };
}

/**
 * Perfil inicial único para contas novas (cadastro, sessão Google e sincronização).
 * Sem métricas inventadas: FTP, FC etc. ficam nulos até o atleta responder o onboarding.
 */
export function createDefaultProfile(email: string, name?: string): Record<string, any> {
  const isCoach = isMasterAdminEmail(email);
  const profile: Record<string, any> = {
    name: (name || "").trim() || (isCoach ? "Treinador" : email.split("@")[0]),
    level: "",
    goal: "",
    daysPerWeek: null,
    durationPerSession: null,
    eventDate: "",
    hasPowerMeter: null,
    ftp: null,
    hasHeartRate: null,
    maxHeartRate: null,
    limitations: "",
    recentActivity: "",
    // O coach não passa pelo onboarding de atleta.
    onboardingStep: isCoach ? 10 : 1,
    role: isCoach ? "coach" : "athlete",
    isCoach,
    subscriptionStatus: isCoach ? "active" : "pending_payment",
    subscriptionPlan: isCoach ? "Acesso Master (Coach)" : "Plano Pro",
    createdAt: new Date().toISOString()
  };
  if (isCoach) profile.subscriptionExpiresAt = "2030-12-31";
  return profile;
}
