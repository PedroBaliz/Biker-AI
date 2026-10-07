import { describe, it, expect } from "vitest";
import {
  getUserAccessInfo,
  formatTrialBannerText,
  TRIAL_DURATION_MS,
  TRIAL_DURATION_DAYS
} from "../src/utils/subscriptionUtils";
import type { UserProfile } from "../src/types";

const COACH_EMAIL = "pedro.bramos@sempreceub.com";

/** Minimal, valid UserProfile factory so tests can override only what matters. */
function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    name: "Atleta Teste",
    level: "intermediário",
    goal: "melhorar condicionamento",
    daysPerWeek: 4,
    durationPerSession: 60,
    eventDate: "",
    hasPowerMeter: true,
    ftp: 200,
    hasHeartRate: true,
    maxHeartRate: 180,
    limitations: "",
    recentActivity: "",
    onboardingStep: 10,
    role: "athlete",
    subscriptionStatus: "pending_payment",
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("getUserAccessInfo", () => {
  describe("null / undefined profile", () => {
    it("blocks access and reports pending payment when profile is null", () => {
      const info = getUserAccessInfo(null);
      expect(info.hasFullAccess).toBe(false);
      expect(info.accessType).toBe("pending_payment");
      expect(info.isPendingUser).toBe(true);
      expect(info.isCoach).toBe(false);
    });

    it("blocks access when profile is undefined", () => {
      const info = getUserAccessInfo(undefined);
      expect(info.hasFullAccess).toBe(false);
      expect(info.isPendingUser).toBe(true);
    });
  });

  describe("coach access", () => {
    it("grants full master access when profile.role is 'coach'", () => {
      const info = getUserAccessInfo(makeProfile({ role: "coach" }));
      expect(info.isCoach).toBe(true);
      expect(info.hasFullAccess).toBe(true);
      expect(info.accessType).toBe("coach");
      expect(info.isPendingUser).toBe(false);
    });

    it("grants full master access to the hard-coded master coach email regardless of role", () => {
      const info = getUserAccessInfo(
        makeProfile({ role: "athlete", subscriptionStatus: "expired" }),
        COACH_EMAIL
      );
      expect(info.isCoach).toBe(true);
      expect(info.hasFullAccess).toBe(true);
      expect(info.accessType).toBe("coach");
    });

    it("matches the master email case-insensitively and with surrounding whitespace", () => {
      const info = getUserAccessInfo(makeProfile(), "  PEDRO.BRAMOS@SEMPRECEUB.COM  ");
      expect(info.isCoach).toBe(true);
      expect(info.hasFullAccess).toBe(true);
    });

    it("does not grant coach access for a near-miss email", () => {
      const info = getUserAccessInfo(makeProfile(), "pedro.bramos@sempreceub.com.br");
      expect(info.isCoach).toBe(false);
    });
  });

  describe("active subscription", () => {
    it("grants full access and takes precedence over an expired trial", () => {
      const longAgo = new Date(Date.now() - TRIAL_DURATION_MS * 10).toISOString();
      const info = getUserAccessInfo(
        makeProfile({ subscriptionStatus: "active", createdAt: longAgo })
      );
      expect(info.hasFullAccess).toBe(true);
      expect(info.isActiveSubscriber).toBe(true);
      expect(info.accessType).toBe("active_subscriber");
      expect(info.isInTrial).toBe(false);
      expect(info.isPendingUser).toBe(false);
    });

    it("reports an active subscriber as not in trial even when created moments ago", () => {
      const info = getUserAccessInfo(makeProfile({ subscriptionStatus: "active" }));
      expect(info.isInTrial).toBe(false);
      expect(info.trialDaysRemaining).toBe(0);
    });
  });

  describe("explicitly expired / suspended subscription", () => {
    it("blocks access even when the account is well inside the trial window", () => {
      const info = getUserAccessInfo(
        makeProfile({ subscriptionStatus: "expired", createdAt: new Date().toISOString() })
      );
      expect(info.hasFullAccess).toBe(false);
      expect(info.accessType).toBe("expired");
      expect(info.isTrialExpired).toBe(true);
      expect(info.isPendingUser).toBe(true);
    });
  });

  describe("trial window", () => {
    it("grants full access inside the trial and reports days/hours remaining", () => {
      const createdAt = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
      const info = getUserAccessInfo(makeProfile({ createdAt }));
      expect(info.hasFullAccess).toBe(true);
      expect(info.isInTrial).toBe(true);
      expect(info.accessType).toBe("trial");
      expect(info.trialDaysRemaining).toBeGreaterThan(1);
      expect(info.trialHoursRemaining).toBeGreaterThan(24);
      expect(info.isPendingUser).toBe(false);
    });

    it("treats an account created milliseconds ago as a fresh trial", () => {
      const info = getUserAccessInfo(makeProfile({ createdAt: new Date().toISOString() }));
      expect(info.isInTrial).toBe(true);
      expect(info.trialDaysRemaining).toBe(TRIAL_DURATION_DAYS);
    });

    it("still allows access exactly one millisecond before the 72h boundary", () => {
      const createdAt = new Date(Date.now() - TRIAL_DURATION_MS + 1).toISOString();
      const info = getUserAccessInfo(makeProfile({ createdAt }));
      expect(info.hasFullAccess).toBe(true);
      expect(info.isInTrial).toBe(true);
      expect(info.trialHoursRemaining).toBe(1);
    });

    it("expires access exactly at the 72h boundary", () => {
      const createdAt = new Date(Date.now() - TRIAL_DURATION_MS).toISOString();
      const info = getUserAccessInfo(makeProfile({ createdAt }));
      expect(info.hasFullAccess).toBe(false);
      expect(info.isTrialExpired).toBe(true);
      expect(info.isInTrial).toBe(false);
    });

    it("expires access after the 72h boundary", () => {
      const createdAt = new Date(Date.now() - TRIAL_DURATION_MS - 1000 * 60 * 60).toISOString();
      const info = getUserAccessInfo(makeProfile({ createdAt }));
      expect(info.hasFullAccess).toBe(false);
      expect(info.accessType).toBe("trial_expired");
      expect(info.isPendingUser).toBe(true);
    });

    it("formats the trial banner with days when more than one day remains", () => {
      const createdAt = new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(); // 12h ago -> 2+ days left
      const info = getUserAccessInfo(makeProfile({ createdAt }));
      expect(info.trialDaysRemaining).toBeGreaterThan(1);
      expect(formatTrialBannerText(info.trialDaysRemaining, info.trialHoursRemaining)).toContain("dias");
    });

    it("formats the trial banner in hours when less than a day remains", () => {
      const createdAt = new Date(Date.now() - TRIAL_DURATION_MS + 1000 * 60 * 90).toISOString(); // 90 min left
      const info = getUserAccessInfo(makeProfile({ createdAt }));
      expect(info.trialDaysRemaining).toBe(1);
      expect(info.trialHoursRemaining).toBe(2);
      expect(formatTrialBannerText(info.trialDaysRemaining, info.trialHoursRemaining)).toContain("horas");
    });
  });

  describe("legacy accounts without createdAt", () => {
    it("blocks access and falls back to the expired access type", () => {
      const info = getUserAccessInfo(makeProfile({ createdAt: undefined }));
      expect(info.hasFullAccess).toBe(false);
      expect(info.accessType).toBe("expired");
      expect(info.isTrialExpired).toBe(true);
      expect(info.isPendingUser).toBe(true);
    });

    it("blocks access when createdAt is an unparseable string", () => {
      const info = getUserAccessInfo(makeProfile({ createdAt: "not-a-real-date" }));
      expect(info.hasFullAccess).toBe(false);
      expect(info.isPendingUser).toBe(true);
    });

    it("still grants legacy accounts an active subscription's full access", () => {
      const info = getUserAccessInfo(
        makeProfile({ createdAt: undefined, subscriptionStatus: "active" })
      );
      expect(info.hasFullAccess).toBe(true);
      expect(info.accessType).toBe("active_subscriber");
    });
  });
});
