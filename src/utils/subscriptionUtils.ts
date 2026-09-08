import { UserProfile } from "../types";

export const TRIAL_DURATION_DAYS = 3;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000; // 72 hours (3 days)

export type UserAccessType = 'coach' | 'active_subscriber' | 'trial' | 'trial_expired' | 'expired' | 'pending_payment';

export interface UserAccessInfo {
  hasFullAccess: boolean;
  isCoach: boolean;
  isActiveSubscriber: boolean;
  isInTrial: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
  trialHoursRemaining: number;
  accessType: UserAccessType;
  statusLabel: string;
  isPendingUser: boolean; // Convenience flag: true if user is blocked / non-subscriber with expired trial
}

/**
 * Centrally evaluates a user's access rights.
 * Priority:
 * 1. Coach role / Coach email -> Full master access
 * 2. Active paying subscription -> Full access (takes absolute priority over trial)
 * 3. 3-day trial period (createdAt <= 3 days) -> Full access to training features
 * 4. Trial expired or pending payment -> Blocked (preview & paywall active)
 */
export function getUserAccessInfo(profile: UserProfile | null | undefined, email?: string): UserAccessInfo {
  if (!profile) {
    return {
      hasFullAccess: false,
      isCoach: false,
      isActiveSubscriber: false,
      isInTrial: false,
      isTrialExpired: false,
      trialDaysRemaining: 0,
      trialHoursRemaining: 0,
      accessType: 'pending_payment',
      statusLabel: 'Pendente',
      isPendingUser: true
    };
  }

  const userEmail = (email || '').trim().toLowerCase();
  const isCoach = profile.role === 'coach' || userEmail === 'pedro.bramos@sempreceub.com';

  // 1. Coach access
  if (isCoach) {
    return {
      hasFullAccess: true,
      isCoach: true,
      isActiveSubscriber: true,
      isInTrial: false,
      isTrialExpired: false,
      trialDaysRemaining: 0,
      trialHoursRemaining: 0,
      accessType: 'coach',
      statusLabel: 'Coach (Admin)',
      isPendingUser: false
    };
  }

  // 2. Active Subscription (takes precedence over trial)
  if (profile.subscriptionStatus === 'active') {
    return {
      hasFullAccess: true,
      isCoach: false,
      isActiveSubscriber: true,
      isInTrial: false,
      isTrialExpired: false,
      trialDaysRemaining: 0,
      trialHoursRemaining: 0,
      accessType: 'active_subscriber',
      statusLabel: 'Assinante Ativo',
      isPendingUser: false
    };
  }

  // 3. Explicitly Expired or Suspended by coach
  if (profile.subscriptionStatus === 'expired') {
    return {
      hasFullAccess: false,
      isCoach: false,
      isActiveSubscriber: false,
      isInTrial: false,
      isTrialExpired: true,
      trialDaysRemaining: 0,
      trialHoursRemaining: 0,
      accessType: 'expired',
      statusLabel: 'Acesso Bloqueado / Expirado',
      isPendingUser: true
    };
  }

  // 4. 3-Day Free Trial Check
  if (profile.createdAt) {
    const createdTime = new Date(profile.createdAt).getTime();
    if (!isNaN(createdTime)) {
      const elapsedMs = Date.now() - createdTime;
      const remainingMs = TRIAL_DURATION_MS - elapsedMs;

      if (remainingMs > 0) {
        const remainingHours = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60)));
        const remainingDays = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

        return {
          hasFullAccess: true,
          isCoach: false,
          isActiveSubscriber: false,
          isInTrial: true,
          isTrialExpired: false,
          trialDaysRemaining: remainingDays,
          trialHoursRemaining: remainingHours,
          accessType: 'trial',
          statusLabel: remainingDays > 1 ? `Teste (${remainingDays} dias)` : `Teste (${remainingHours}h)`,
          isPendingUser: false
        };
      } else {
        return {
          hasFullAccess: false,
          isCoach: false,
          isActiveSubscriber: false,
          isInTrial: false,
          isTrialExpired: true,
          trialDaysRemaining: 0,
          trialHoursRemaining: 0,
          accessType: 'trial_expired',
          statusLabel: 'Teste Expirado',
          isPendingUser: true
        };
      }
    }
  }

  // 5. Default for non-active users without createdAt (legacy accounts)
  return {
    hasFullAccess: false,
    isCoach: false,
    isActiveSubscriber: false,
    isInTrial: false,
    isTrialExpired: true,
    trialDaysRemaining: 0,
    trialHoursRemaining: 0,
    accessType: 'expired',
    statusLabel: 'Acesso Pendente / Expirado',
    isPendingUser: true
  };
}

/**
 * Returns user-facing friendly countdown text without emojis
 */
export function formatTrialBannerText(daysRemaining: number, hoursRemaining: number): string {
  if (daysRemaining > 1) {
    return `Período de teste gratuito: restam ${daysRemaining} dias de acesso total.`;
  }
  if (hoursRemaining > 1) {
    return `Período de teste gratuito: restam ${hoursRemaining} horas de acesso total.`;
  }
  return `Período de teste gratuito: resta menos de 1 hora de acesso total.`;
}
