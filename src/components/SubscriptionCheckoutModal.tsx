import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import SubscriptionWall from "./SubscriptionWall";
import { getUserAccessInfo } from "../utils/subscriptionUtils";
import type { UserProfile, UserAccount } from "../types";

interface SubscriptionCheckoutModalProps {
  accessInfo: ReturnType<typeof getUserAccessInfo>;
  currentUser: UserAccount | null;
  profile: UserProfile;
  refreshUserSession: (emailKey: string) => Promise<void>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  setShowSubscriptionCheckout: React.Dispatch<React.SetStateAction<boolean>>;
  showSubscriptionCheckout: boolean;
}

// Extraído do App.tsx (issue #8): mesmo JSX, com o estado recebido por props.
export default function SubscriptionCheckoutModal({ accessInfo, currentUser, profile, refreshUserSession, setProfile, setShowSubscriptionCheckout, showSubscriptionCheckout }: SubscriptionCheckoutModalProps) {
  return (
    <>
      <AnimatePresence>
        {showSubscriptionCheckout && currentUser && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-4xl bg-slate-900 rounded-3xl border border-slate-800 p-2 sm:p-6 shadow-2xl my-auto max-h-[92vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowSubscriptionCheckout(false)}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>

              <SubscriptionWall 
                userEmail={currentUser.email}
                userName={profile.name || currentUser.profile?.name || "Atleta"}
                currentStatus={accessInfo.accessType === "expired" ? "expired" : accessInfo.accessType === "trial_expired" ? "trial_expired" : "pending_payment"}
                onActivated={(updatedProfile) => {
                  setProfile(updatedProfile);
                  if (currentUser) {
                    refreshUserSession(currentUser.email);
                  }
                  setShowSubscriptionCheckout(false);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}
