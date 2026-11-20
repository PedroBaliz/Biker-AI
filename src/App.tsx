import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  UserProfile,
  ChatMessage,
  TrainingPlan,
  UserAccount,
  Workout,
  isRestDay,
  formatGoal,
  formatLevel,
  WorkoutCompletionLog
} from "./types";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, apiFetch } from "./firebase";
import WorkoutCard from "./components/WorkoutCard";
import ZoneCalculator from "./components/ZoneCalculator";
import { getSimplifiedText } from "./utils/translation";
import LoginScreen from "./components/LoginScreen";
import AccountSettings from "./components/AccountSettings";
import AdminSubscribersPanel from "./components/AdminSubscribersPanel";
import WorkoutPlanPreview from "./components/WorkoutPlanPreview";
import VolumeEvolutionChart from "./components/VolumeEvolutionChart";
import WeeklyCalorieChart from "./components/WeeklyCalorieChart";
import AchievementsDashboard from "./components/AchievementsDashboard";
import WorkoutCompletionModal from "./components/WorkoutCompletionModal";
import OnboardingForm from "./components/OnboardingForm";
import TodayWorkoutCard from "./components/TodayWorkoutCard";
import { CoachChat } from "./components/CoachChat";
import TermsOfUseModal from "./components/TermsOfUseModal";
import PrivacyPolicyModal from "./components/PrivacyPolicyModal";
import ContactModal from "./components/ContactModal";
import { MetaPixelEvents } from "./lib/metaPixel";
import { exportPlanPdf } from "./lib/exportPlanPdf";
import { getUserAccessInfo } from "./utils/subscriptionUtils";
import { motion, AnimatePresence } from "motion/react";
import { SEO_ARTICLES } from "./data/seoArticlesData";
import { SeoContentPage } from "./components/SeoContentPage";
import AdminPasswordModal from "./components/AdminPasswordModal";
import ApiErrorBanner from "./components/ApiErrorBanner";
import AppFooter from "./components/AppFooter";
import FeedbackModal from "./components/FeedbackModal";
import InstallGuideModal from "./components/InstallGuideModal";
import SubscriptionCheckoutModal from "./components/SubscriptionCheckoutModal";
import { updateSeoMeta, HOME_SEO_CONFIG } from "./utils/seoHead";
import {
  ShieldCheck,
  Dumbbell,
  Bike,
  Sparkles,
  Calendar,
  User,
  Activity,
  CheckCircle2,
  RotateCcw,
  Heart,
  ShieldAlert,
  RefreshCw,
  TrendingUp,
  Clock,
  ClipboardList,
  Sliders,
  HelpCircle,
  LogOut,
  Trophy,
  Eye,
  EyeOff,
  Download,
  Lock,
  Mail,
  AlertTriangle,
  TrendingDown,
  MessageSquare,
  Lightbulb,
  BookOpen,
  ArrowRight,
  Settings,
  Menu,
  Bot
} from "lucide-react";

export default function App() {
  const [globalError, setGlobalError] = useState<{
    url: string;
    method: string;
    status: number;
    statusText: string;
    message: string;
  } | null>(null);

  const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === "string" ? input : (input as Request).url;
    const method = init?.method || "GET";
    try {
      const response = await apiFetch(input, init);
      if (response.status === 404 || response.status === 500) {
        let errorText = "";
        try {
          const clone = response.clone();
          const data = await clone.json();
          errorText = data?.error || data?.message || JSON.stringify(data);
        } catch (e) {
          try {
            const clone = response.clone();
            errorText = await clone.text();
          } catch (t) {}
        }
        
        setGlobalError({
          url: urlStr,
          method,
          status: response.status,
          statusText: response.statusText,
          message: errorText || "Sem resposta detalhada do servidor."
        });
      }
      return response;
    } catch (err: any) {
      setGlobalError({
        url: urlStr,
        method,
        status: 0,
        statusText: "Falha de Conexão",
        message: err.message || "Erro de rede. Verifique sua conexão ou se o backend está online."
      });
      throw err;
    }
  };

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // SEO and Public Content Page Routing
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.location.pathname.replace(/^\/|\/$/g, "");
    }
    return "";
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/|\/$/g, "");
      setCurrentPath(path);
      if (!path || !SEO_ARTICLES[path]) {
        updateSeoMeta(HOME_SEO_CONFIG);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigateHome = (targetGoal?: string) => {
    window.history.pushState(null, "", "/");
    setCurrentPath("");
    updateSeoMeta(HOME_SEO_CONFIG);
    window.scrollTo(0, 0);
    if (targetGoal) {
      setProfile(prev => ({ ...prev, goal: targetGoal }));
    }
  };

  const handleNavigateSlug = (slug: string) => {
    const cleanSlug = slug.replace(/^\/|\/$/g, "");
    window.history.pushState(null, "", `/${cleanSlug}`);
    setCurrentPath(cleanSlug);
    window.scrollTo(0, 0);
  };

  const [profile, setProfile] = useState<UserProfile>({
    name: "",
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
    onboardingStep: 0
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const initialMsg: ChatMessage = {
      id: "welcome",
      sender: "treinador",
      text: "Olá, atleta! Eu sou o seu Treinador de Ciclismo AI. Minhas planilhas e conselhos são baseados na mais pura ciência do esporte, controlando sua carga por potência, frequência cardíaca ou percepção de esforço. \n\nPara começarmos a planejar sua evolução de forma segura e personalizada, preciso te conhecer melhor através de 10 perguntas rápidas.\n\nPara começar: **Qual é o seu nome?**",
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    return [initialMsg];
  });

  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Dashboard Tabs & Onboarding Setup Mode
  const [showAdvancedOnboarding, setShowAdvancedOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<"planilha" | "desempenho" | "zonas" | "chat">("planilha");
  const [showMyWorkouts, setShowMyWorkouts] = useState(true);
  const [showPseExplanation, setShowPseExplanation] = useState(false);
  const [showSubscriptionCheckout, setShowSubscriptionCheckout] = useState(false);

  const safeReadLocalStorage = <T,>(key: string, fallback: T): T => {
    if (typeof window === "undefined") return fallback;
    try {
      const savedValue = window.localStorage.getItem(key);
      return savedValue === null ? fallback : (savedValue as T);
    } catch {
      return fallback;
    }
  };

  const safeWriteLocalStorage = (key: string, value: string) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage failures to avoid crashes in private/incognito browsing.
    }
  };

  // Simple / Technical display mode for workouts
  const [displayMode, setDisplayMode] = useState<"simples" | "tecnico">(() => {
    const storedValue = safeReadLocalStorage<string>("biker_ai_display_mode", "simples");
    return storedValue === "tecnico" ? "tecnico" : "simples";
  });

  useEffect(() => {
    safeWriteLocalStorage("biker_ai_display_mode", displayMode);
  }, [displayMode]);

  // Feedbacks states
  const [feedbacks, setFeedbacks] = useState<{ id: string; text: string; timestamp: string }[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Workout completion modal and evolution logs
  const [completingWorkoutIndex, setCompletingWorkoutIndex] = useState<number | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutCompletionLog[]>([]);

  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPortable, setIsPortable] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia("(display-mode: standalone)").matches || 
        (window.navigator as any).standalone === true;
      setIsPortable(isStandaloneMode);
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsPortable(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setDeferredPrompt(null);
          setIsPortable(true);
        }
      } catch (err) {
        console.error("Erro ao instalar PWA automaticamente:", err);
        setShowInstallGuide(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };
  
  // Training Plan State
  const [plan, setPlan] = useState<TrainingPlan | null>(null);

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Derived user access status (handles 3-day trial and active subscriptions)
  const accessInfo = useMemo(() => getUserAccessInfo(profile, currentUser?.email), [profile, currentUser?.email]);
  const isPendingUser = accessInfo.isPendingUser;

  const derivedMetrics = useMemo(() => {
    const workouts = plan?.workouts || [];
    const total = workouts.filter(ws => !isRestDay(ws)).length;
    const completed = workouts.filter(ws => ws.completed && !isRestDay(ws)).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalW: total, completedW: completed, pctW: pct };
  }, [plan?.workouts]);

  const { totalW, completedW, pctW } = derivedMetrics;

  const handleUpdateWorkout = useCallback((index: number, updatedWorkout: Workout) => {
    if (!plan) return;
    if (isPendingUser) {
      setShowSubscriptionCheckout(true);
      return;
    }
    const previousWorkout = plan.workouts[index];
    const isNowCompleted = updatedWorkout.completed && (!previousWorkout || !previousWorkout.completed);

    const updatedWorkouts = [...plan.workouts];
    updatedWorkouts[index] = updatedWorkout;
    const updatedPlan = {
      ...plan,
      workouts: updatedWorkouts
    };
    setPlan(updatedPlan);
    setCurrentUser(prev => prev ? { ...prev, plan: updatedPlan } : prev);

    if (isNowCompleted) {
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (err) {
        console.error("Erro ao rodar animação de confetes:", err);
      }
    }
  }, [plan, isPendingUser]);

  const handleDeleteWorkout = useCallback((index: number) => {
    if (!plan) return;
    if (isPendingUser) {
      setShowSubscriptionCheckout(true);
      return;
    }
    const updatedWorkouts = plan.workouts.filter((_, i) => i !== index);
    const updatedPlan = {
      ...plan,
      workouts: updatedWorkouts
    };
    setPlan(updatedPlan);
    setCurrentUser(prev => prev ? { ...prev, plan: updatedPlan } : prev);
  }, [plan, isPendingUser]);

  const handleSaveWorkoutLog = useCallback(async (log: WorkoutCompletionLog, updatedWorkout: Workout) => {
    if (!plan || !plan.workouts) return;

    // 1. Update workout in current plan
    const updatedWorkouts = [...plan.workouts];
    updatedWorkouts[log.workoutIndex] = updatedWorkout;
    const updatedPlan = {
      ...plan,
      workouts: updatedWorkouts
    };
    setPlan(updatedPlan);

    // 2. Update workoutLogs array
    setWorkoutLogs(prevLogs => {
      const existingIdx = prevLogs.findIndex(
        l => l.id === log.id || (l.weekNumber === log.weekNumber && l.workoutIndex === log.workoutIndex)
      );
      if (existingIdx >= 0) {
        const next = [...prevLogs];
        next[existingIdx] = log;
        return next;
      }
      return [...prevLogs, log];
    });

    setCurrentUser(prev => prev ? {
      ...prev,
      plan: updatedPlan
    } : prev);

    // 3. Celebrate with confetti if completed "sim"
    if (log.completed === "sim") {
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        console.error("Erro ao rodar animação de confetes:", err);
      }
    }

    // 4. Send to backend endpoint /api/workout/log-completion
    if (currentUser?.email) {
      try {
        await apiFetch("/api/workout/log-completion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: currentUser.email,
            log,
            workoutIndex: log.workoutIndex,
            workout: updatedWorkout
          })
        });
      } catch (err) {
        console.warn("Erro ao registrar log de treino no servidor:", err);
      }
    }
  }, [plan, currentUser?.email]);

  const handleExportPDF = useCallback(() => {
    if (!plan) return;
    if (isPendingUser) {
      setShowSubscriptionCheckout(true);
      return;
    }
    
    exportPlanPdf(plan, profile);
  }, [plan, profile, isPendingUser]);

  // Weekly Evolution States
  const [isGeneratingNextWeek, setIsGeneratingNextWeek] = useState(false);
  const [showNextWeekForm, setShowNextWeekForm] = useState(false);
  const [subjFeedback, setSubjFeedback] = useState<"otimo" | "moderado" | "muito_cansado">("otimo");
  const [textFeedback, setTextFeedback] = useState("");

  const handleGenerateNextWeek = async () => {
    if (!plan) return;
    if (isPendingUser) {
      setShowSubscriptionCheckout(true);
      return;
    }
    setIsGeneratingNextWeek(true);

    const selectedFeeling = 
      subjFeedback === "otimo" 
        ? "Me senti muito forte, recuperado e rendendo acima do esperado!" 
        : subjFeedback === "moderado" 
        ? "Foi equilibrado e confortável, cansaço normal de treinos acumulados." 
        : "Senti cansaço excessivo, pernas com dores persistentes ou queimação muscular fora da zona.";

    const combinedFeedback = `${selectedFeeling} ${textFeedback ? `Observações do atleta: ${textFeedback}` : ""}`;
    const nextWeek = (plan.weekNumber || 1) + 1;

    try {
      const response = await customFetch("/api/generate-next-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          currentPlan: plan,
          athleteFeedback: combinedFeedback,
          nextWeekNumber: nextWeek
        })
      });

      if (!response.ok) {
        let errorDetails = "";
        try {
          const errorJson = await response.json();
          errorDetails = errorJson.error || errorJson.message || JSON.stringify(errorJson);
        } catch (e) {
          try {
            errorDetails = await response.text();
          } catch (t) {
            errorDetails = `Código de Status HTTP: ${response.status} (${response.statusText})`;
          }
        }
        throw new Error(errorDetails || `Erro do servidor (Status ${response.status})`);
      }

      const data: TrainingPlan = await response.json();
      setPlan(data);

      setShowNextWeekForm(false);
      setTextFeedback("");
      setSubjFeedback("otimo");

      // Adiciona mensagem ao histórico do chat do treinador
      setChatHistory(prev => [...prev, {
        id: `gen-week-${Date.now()}`,
        sender: "treinador",
        text: `**Sua Semana ${nextWeek} de Treinos Iniciou!**\n\n${data.coachMessage || "Preparei estímulos novos na planilha baseando-me nas suas sensações, cargas anteriores e nas conclusões!"}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);

    } catch (err: any) {
      setGlobalError({
        url: "/api/generate-next-week",
        method: "POST",
        status: 500,
        statusText: "Falha na geração",
        message: err.message || "Erro ao evoluir a planilha. Por favor, tente novamente."
      });
    } finally {
      setIsGeneratingNextWeek(false);
    }
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const workoutsSectionRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<any>(null);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showAdminPasswordPrompt, setShowAdminPasswordPrompt] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helper to migrate legacy offline data from localStorage to Firebase Firestore
  const migrateLocalStorageToFirebase = async (email: string) => {
    const legacyProfile = localStorage.getItem("athlete_profile");
    const legacyPlan = localStorage.getItem("athlete_training_plan");
    const legacyChat = localStorage.getItem("coach_chat_history");
    const legacyUser = localStorage.getItem("current_coach_user");

    if (legacyProfile || legacyPlan || legacyChat || legacyUser) {
      console.log("[Migration] Legacy localStorage data found. Transferring to Firebase...");
      try {
        let profileVal = legacyProfile ? JSON.parse(legacyProfile) : null;
        let planVal = legacyPlan ? JSON.parse(legacyPlan) : null;
        let chatVal = legacyChat ? JSON.parse(legacyChat) : null;

        if (legacyUser) {
          try {
            const userObj = JSON.parse(legacyUser);
            if (!profileVal) profileVal = userObj.profile;
            if (!planVal) planVal = userObj.plan;
            if (!chatVal) chatVal = userObj.chatHistory;
          } catch (e) {}
        }

        // Fetch existing user from database to merge or create
        const sessionRes = await apiFetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });

        let mergedUser: any = { email };
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          mergedUser = { ...sessionData.user };
        }

        if (profileVal) mergedUser.profile = { ...profileVal, ...mergedUser.profile };
        if (planVal && !mergedUser.plan) mergedUser.plan = planVal;
        if (chatVal && (!mergedUser.chatHistory || mergedUser.chatHistory.length <= 1)) mergedUser.chatHistory = chatVal;

        // Save to Firebase Firestore via server (omit password so existing password is never overwritten)
        const saveRes = await apiFetch("/api/auth/save-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, userAccount: mergedUser })
        });

        if (saveRes.ok) {
          console.log("[Migration] Migration to Firebase complete. Removing localStorage keys.");
          // Clear all legacy storage keys only after successful persistence
          localStorage.removeItem("athlete_profile");
          localStorage.removeItem("athlete_training_plan");
          localStorage.removeItem("coach_chat_history");
          localStorage.removeItem("current_coach_user");
          localStorage.removeItem("coach_users");
          localStorage.removeItem("athlete_plan_history");
        } else {
          console.warn("[Migration] Save-user returned non-OK status. Preserving local data.");
        }
      } catch (e) {
        console.error("[Migration] Error transferring data to Firebase:", e);
      }
    }
  };

  const refreshUserSession = useCallback(async (emailKey: string) => {
    try {
      const response = await apiFetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailKey.toLowerCase() })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setCurrentUser(data.user);
          setProfile(data.user.profile);
          // O chat do Coach AI agora opera com sessão efêmera limpa; não restaura histórico anterior
          setPlan(data.user.plan || null);
          setFeedbacks(data.user.feedbacks || []);
          setWorkoutLogs(data.user.workoutLogs || []);
        }
      }
    } catch (err) {
      console.error("Erro ao sincronizar sessão:", err);
    }
  }, []);

  // Firebase Auth listener to automatically load/sync session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        const emailKey = firebaseUser.email.toLowerCase();
        try {
          // Trigger localStorage migration to Firestore if legacy data exists
          await migrateLocalStorageToFirebase(emailKey);
          await refreshUserSession(emailKey);
        } catch (err) {
          console.error("Erro ao sincronizar sessão do Firebase:", err);
        }
      } else {
        setCurrentUser(null);
        setWorkoutLogs([]);
      }
    });

    // Also run immediate check for legacy data migration even if not logged in to clear unneeded localStorage
    const legacyUser = localStorage.getItem("current_coach_user");
    if (legacyUser) {
      try {
        const parsed = JSON.parse(legacyUser);
        if (parsed && parsed.email) {
          migrateLocalStorageToFirebase(parsed.email.toLowerCase());
        }
      } catch (e) {}
    }

    return () => unsubscribe();
  }, []);

  // Reset scroll on user login or authentication change
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.scrollTo(0, 0);
  }, [currentUser?.email]);

  // Smooth scroll to top when changing main navigation tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  // Debounced real-time synchronization back to central server
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const preservedPassword = currentUser.password || "";

    const updatedUser: UserAccount = {
      email: currentUser.email,
      profile,
      chatHistory: currentUser.chatHistory || [], // Preserva dados existentes no Firestore sem poluir com sessões efêmeras
      plan,
      feedbacks,
      workoutLogs,
      password: preservedPassword
    };

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce backend save by 1500ms to keep UI fast and avoid network thrashing
    saveTimeoutRef.current = setTimeout(() => {
      apiFetch("/api/auth/save-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser.email,
          userAccount: updatedUser,
          password: preservedPassword
        })
      })
      .then(res => {
        if (!res.ok) {
          console.warn("Retorno de erro na sincronização em tempo real");
        }
      })
      .catch((err) => {
        console.warn("Erro de conexão ao sincronizar com servidor central:", err);
      });
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [profile, plan, feedbacks, workoutLogs, currentUser?.email]);

  // Handle message sending for onboarding or custom chat
  const handleSendMessage = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const messageToSend = (customMsg !== undefined ? customMsg : inputMessage).trim();
    if (!messageToSend) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "atleta",
      text: messageToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMsg]);
    MetaPixelEvents.contact();
    setInputMessage("");
    setIsTyping(true);

    try {
      const isOnboarding = profile.onboardingStep < 10 && !plan;
      const endpoint = isOnboarding ? "/api/onboard" : "/api/chat";

      const getRegisteredAnswersCount = (p: typeof profile) => {
        const fields = [
          p.name, p.level, p.goal, p.daysPerWeek, p.durationPerSession,
          p.eventDate, p.hasPowerMeter, p.ftp, p.hasHeartRate, p.maxHeartRate,
          p.limitations, p.recentActivity
        ];
        return fields.filter(val => val !== null && val !== "" && val !== undefined).length;
      };

      const response = await customFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          profile,
          currentPlan: plan,
          messageHistory: chatHistory
        })
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {
        // Not JSON or empty body
      }

      if (!response.ok) {
        const errMsg = data?.error || data?.message || "Falha ao comunicar com o servidor de treino.";
        throw new Error(errMsg);
      }

      const coachMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "treinador",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };

      setChatHistory(prev => [...prev, coachMsg]);

      // If in onboarding, update parsed fields
      if (isOnboarding && data.parsedProfile) {
        setProfile(prev => {
          const updated = { ...prev, ...data.parsedProfile };
          // If onboarding is finished (returned step is 10 or higher)
          if (data.parsedProfile.onboardingStep >= 10) {
            updated.onboardingStep = 10;
          }

          return updated;
        });
      }

      // If custom chat updated the training plan (e.g., manual switch of Saturday)
      if (!isOnboarding && data.updatedPlan) {
        setPlan(data.updatedPlan);
      }

    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [...prev, {
        id: `error-${Date.now()}`,
        sender: "treinador",
        text: `Opa, atleta! Tive um pequeno problema ao processar seu dado: ${err.message}. Pode tentar novamente?`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Generate Weekly Training Spreadsheet based on profile
  const generateTrainingPlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const effectiveProfile: UserProfile = {
        ...profile,
        name: profile.name && profile.name.trim() ? profile.name.trim() : (currentUser?.profile?.name || currentUser?.name || "Atleta"),
        level: profile.level || "iniciante",
        goal: profile.goal || "aumentar resistência",
        daysPerWeek: profile.daysPerWeek || 3,
        durationPerSession: profile.durationPerSession || 60,
        bikeType: profile.bikeType || "MTB",
        avgDistance: profile.avgDistance !== undefined && profile.avgDistance !== null ? profile.avgDistance : 25,
        onboardingStep: 10
      };

      const response = await customFetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: effectiveProfile })
      });

      if (!response.ok) {
        let errorDetails = "";
        try {
          const errorJson = await response.json();
          errorDetails = errorJson.error || errorJson.message || JSON.stringify(errorJson);
        } catch (e) {
          try {
            errorDetails = await response.text();
          } catch (t) {
            errorDetails = `Código de Status HTTP: ${response.status} (${response.statusText})`;
          }
        }
        throw new Error(errorDetails || `Erro do servidor (Status ${response.status})`);
      }

      const data: TrainingPlan = await response.json();
      setPlan(data);
      
      // Update onboarding status to fully completed
      setProfile(effectiveProfile);
      
      // Select appropriate tab
      setActiveTab("planilha");

      // Add coach announcement to chat
      setChatHistory(prev => [...prev, {
        id: `gen-${Date.now()}`,
        sender: "treinador",
        text: `**Planilha Semanal Gerada com Sucesso!**\n\n${effectiveProfile.name}, montei uma planilha de treinos sob medida baseada no seu nível (**${effectiveProfile.level}**) e seu objetivo de **${effectiveProfile.goal}**. Confira a aba de planilha para ver os passos e dicas de cada dia! Let's ride!`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);

    } catch (err: any) {
      setGlobalError({
        url: "/api/generate-plan",
        method: "POST",
        status: 500,
        statusText: "Falha na geração",
        message: err.message || "Erro ao gerar a planilha. Por favor, tente novamente."
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };



  // Success trigger from login screen
  const handleLoginSuccess = (user: UserAccount) => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.scrollTo(0, 0);
    setCurrentUser(user);
    setProfile(user.profile);
    // Chat do Coach AI inicia sempre com sessão limpa; não carrega histórico anterior
    setPlan(user.plan);
    setFeedbacks(user.feedbacks || []);
    setWorkoutLogs(user.workoutLogs || []);
    setShowAccountSettings(false);
  };

  // Handle updating athlete's security login info or profile name
  const handleUpdateAccount = (updatedUser: UserAccount, newPassword?: string): boolean => {
    if (!currentUser) return false;

    const passwordToStore = newPassword || currentUser.password || "";

    const finalizedSessionUser: UserAccount = {
      email: updatedUser.email,
      profile: {
        ...updatedUser.profile
      },
      chatHistory,
      plan,
      feedbacks,
      password: passwordToStore
    };

    setCurrentUser(finalizedSessionUser);
    setProfile(updatedUser.profile);

    // Sync to backend immediately for instant server persistence
    apiFetch("/api/auth/save-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: updatedUser.email,
        userAccount: finalizedSessionUser,
        password: passwordToStore
      })
    })
    .then(res => {
      if (!res.ok) {
        console.warn("Aviso: Sincronização imediata falhou");
      }
    })
    .catch((err) => {
      console.warn("Aviso: Conexão offline ao sincronizar senha imediatamente:", err);
    });

    return true;
  };

  // Handle sending feedback to trainer
  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || !currentUser) return;

    setSubmittingFeedback(true);
    const newFeedback = {
      id: "fb_" + Math.random().toString(36).substr(2, 9),
      text: feedbackText.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedFeedbacks = [...feedbacks, newFeedback];
    setFeedbacks(updatedFeedbacks);
    setFeedbackText("");
    setFeedbackSuccess(true);
    setSubmittingFeedback(false);

    setTimeout(() => {
      setFeedbackSuccess(false);
      setShowFeedbackModal(false);
    }, 2000);
  };

  // Sign out of active athlete profile
  const handleSignOut = () => {
    signOut(auth).catch((err) => console.error("Erro ao fazer logout no Firebase:", err));
    setCurrentUser(null);
    setWorkoutLogs([]);
    setShowAccountSettings(false);
    setProfile({
      name: "",
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
      onboardingStep: 0
    });
    setChatHistory([
      {
        id: "welcome",
        sender: "treinador",
        text: "Olá, atleta! Eu sou o seu Treinador de Ciclismo AI. Minhas planilhas e conselhos são baseados na mais pura ciência do esporte, controlando sua carga por potência, frequência cardíaca ou percepção de esforço. \n\nPara começarmos a planejar sua evolução de forma segura e personalizada, preciso te conhecer melhor através de 10 perguntas rápidas.\n\nPara começar: **Qual é o seu nome?**",
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setPlan(null);
  };

  // Reset App / Reset athlete specific progress
  const handleReset = () => {
    if (confirm("Você quer mesmo resetar seu perfil e histórico de treino? Todos os dados serão limpos.")) {
      const resetProfile: UserProfile = {
        name: currentUser?.profile.name || "",
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
        onboardingStep: currentUser?.profile.name ? 1 : 0
      };

      const customWelcomeText = currentUser?.profile.name 
        ? `Olá, ${currentUser.profile.name}! Que excelente ter você de volta de forma limpa. Vamos iniciar as perguntas do seu cadastro de condicionamento.\n\nQual é o seu tempo médio pedalando ou seu nível atual no ciclismo?`
        : "Olá, atleta! Eu sou o seu Treinador de Ciclismo AI. Minhas planilhas e conselhos são focados em melhorar seu fôlego e resistência de forma simples e segura, ajustando seus treinos por potência, batimentos do coração ou pelas suas percepções de cansaço. \n\nPara começarmos a planejar sua evolução de forma personalizada, preciso te conhecer melhor através de algumas perguntas rápidas.\n\nPara começar: **Qual é o seu nome?**";

      const initialChat: ChatMessage[] = [
        {
          id: "welcome-reset",
          sender: "treinador",
          text: customWelcomeText,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      ];

      setProfile(resetProfile);
      setChatHistory(initialChat);
      setPlan(null);
      localStorage.removeItem("athlete_plan_history");
      
      if (currentUser) {
        const updated: UserAccount = {
          ...currentUser,
          profile: resetProfile,
          chatHistory: initialChat,
          plan: null
        };
        setCurrentUser(updated);
      }
    }
  };

  // Helpers to check progress
  const getAnswersCompletedCount = (p: UserProfile) => {
    let count = 0;
    if (p.name) count++;
    if (p.level) count++;
    if (p.goal) count++;
    if (p.daysPerWeek !== null && p.daysPerWeek !== undefined && p.daysPerWeek !== 0) count++;
    if (p.durationPerSession !== null && p.durationPerSession !== undefined && p.durationPerSession !== 0) count++;
    if (p.eventDate) count++;
    if (p.hasPowerMeter !== null && p.hasPowerMeter !== undefined) count++;
    if (p.hasHeartRate !== null && p.hasHeartRate !== undefined) count++;
    if (p.limitations !== undefined && p.limitations !== "" && p.limitations !== null) count++;
    if (p.recentActivity !== undefined && p.recentActivity !== "" && p.recentActivity !== null) count++;
    return Math.min(10, count);
  };

  const getProgressPercentage = () => {
    return Math.round((getAnswersCompletedCount(profile) / 10) * 100);
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans selection:bg-lime-200">
      
      {/* Upper Navigation Bar */}
      {currentUser && !currentPath && (
        <header id="main-header" className="bg-slate-900/95 backdrop-blur-md text-white shadow-xl border-b border-slate-800/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 animate-fadeInUp">
            <div className="p-2 sm:p-2.5 bg-lime-500 text-slate-950 rounded-xl shadow-[0_0_15px_rgba(132,204,22,0.3)] hover:scale-105 transition-transform duration-300 shrink-0">
              <Bike className="w-4 h-4 sm:w-6 sm:h-6 text-slate-950 fill-slate-950/20" />
            </div>
            <div>
              <h1 className="font-heading font-black text-xs sm:text-lg tracking-wider flex items-center gap-1 sm:gap-2 uppercase">
                BIKER <span className="text-lime-400">AI</span>
                <span 
                  onClick={() => {
                    if (currentUser) {
                      if (showAdminPanel) {
                        setShowAdminPanel(false);
                      } else {
                        setShowAdminPasswordPrompt(true);
                        setAdminPasswordInput("");
                        setAdminPasswordError("");
                      }
                      setShowAccountSettings(false);
                    }
                  }}
                  className="text-[8px] sm:text-[9px] font-mono tracking-widest uppercase bg-slate-800 text-lime-400 px-1.5 py-0.5 rounded-md border border-slate-700 font-bold shrink-0 cursor-default select-none active:opacity-90 active:scale-95 transition-all"
                >
                  TREINADOR
                </span>
              </h1>
              <p className="hidden md:block text-[9px] sm:text-[10px] text-slate-400 font-sans tracking-widest uppercase mt-0.5 font-semibold">Plataforma de Treino Inteligente de Ciclismo</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2 animate-fadeInUp shrink-0 relative" ref={userMenuRef}>
            {currentUser && (
              <div className="relative">
                <button 
                  type="button"
                  id="user-profile-menu-button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border text-[11px] sm:text-xs font-bold font-heading uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                    isUserMenuOpen || showAccountSettings 
                      ? "bg-lime-400 text-slate-950 border-lime-400 shadow-lime-400/20" 
                      : "bg-slate-800/90 text-slate-100 border-slate-700/80 hover:bg-slate-750 hover:border-slate-600"
                  }`}
                  title="Menu do Usuário / Perfil"
                  aria-label="Abrir menu do usuário"
                >
                  <div className={`p-1 rounded-lg ${isUserMenuOpen || showAccountSettings ? "bg-slate-950 text-lime-400" : "bg-slate-700 text-lime-400"}`}>
                    <User className="w-3.5 h-3.5 shrink-0" />
                  </div>
                  <span className="max-w-[70px] xs:max-w-[100px] sm:max-w-[140px] truncate">
                    {profile.name || currentUser.profile.name || "Atleta"}
                  </span>
                  <Menu className={`w-4 h-4 shrink-0 transition-transform ${isUserMenuOpen ? "rotate-90 text-slate-950" : "text-slate-300"}`} />
                </button>

                {/* Dropdown Menu Sanduíche */}
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 mt-2 w-64 sm:w-72 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800"
                    >
                      {/* User Header in Menu */}
                      <div className="p-3.5 bg-slate-850/90 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-lime-500/20 border border-lime-500/40 text-lime-400 flex items-center justify-center font-black text-sm shrink-0 uppercase">
                          {(profile.name || currentUser.profile.name || "A").charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-100 truncate">
                            {profile.name || currentUser.profile.name || "Atleta"}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {currentUser.email}
                          </p>
                          <span className={`inline-block mt-1 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                            accessInfo.isCoach
                              ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                              : accessInfo.isActiveSubscriber
                              ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
                              : accessInfo.isInTrial
                              ? "bg-sky-400/15 text-sky-300 border border-sky-400/30"
                              : "bg-rose-400/15 text-rose-300 border border-rose-400/30"
                          }`}>
                            {accessInfo.isCoach
                              ? "Coach / Admin"
                              : accessInfo.isActiveSubscriber
                              ? "Assinante Ativo"
                              : accessInfo.isInTrial
                              ? `Teste (${accessInfo.trialDaysRemaining}d restantes)`
                              : "Teste Expirado"}
                          </span>
                        </div>
                      </div>

                      {/* Menu Options */}
                      <div className="p-1.5 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAccountSettings(true);
                            setShowAdminPanel(false);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-colors cursor-pointer ${
                            showAccountSettings 
                              ? "bg-lime-400/15 text-lime-300 border border-lime-400/30" 
                              : "text-slate-200 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <Settings className="w-4 h-4 text-lime-400 shrink-0" />
                          <div className="flex flex-col">
                            <span>Alterar Informações / Perfil</span>
                            <span className="text-[9px] font-normal text-slate-400">Editar dados de treino e senha</span>
                          </div>
                        </button>

                        {(showAccountSettings || showAdminPanel) && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowAccountSettings(false);
                              setShowAdminPanel(false);
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white text-left transition-colors cursor-pointer"
                          >
                            <Bike className="w-4 h-4 text-lime-400 shrink-0" />
                            <div className="flex flex-col">
                              <span>Minha Planilha de Treinos</span>
                              <span className="text-[9px] font-normal text-slate-400">Voltar ao painel de exercícios</span>
                            </div>
                          </button>
                        )}

                        {profile.role === "coach" && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowAdminPanel(true);
                              setShowAccountSettings(false);
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white text-left transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4 text-lime-400 shrink-0" />
                            <div className="flex flex-col">
                              <span>Painel do Treinador</span>
                              <span className="text-[9px] font-normal text-slate-400">Gerenciar inscritos e alunos</span>
                            </div>
                          </button>
                        )}
                      </div>

                      {/* Logout Action */}
                      <div className="p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleSignOut();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-left transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>Sair da conta</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </header>
      )}

      {/* Global Error Banner */}
      <ApiErrorBanner globalError={globalError} setGlobalError={setGlobalError} />

      {/* Main Body */}
      {currentPath && SEO_ARTICLES[currentPath] ? (
        <SeoContentPage 
          article={SEO_ARTICLES[currentPath]} 
          onNavigateHome={handleNavigateHome} 
          onNavigateSlug={handleNavigateSlug} 
        />
      ) : !currentUser ? (
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          onNavigateSlug={handleNavigateSlug}
        />
      ) : showAccountSettings ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col gap-8">
          <AccountSettings 
            currentUser={currentUser} 
            onUpdateAccount={handleUpdateAccount} 
            onClose={() => setShowAccountSettings(false)}
            onOpenSubscriptionCheckout={() => setShowSubscriptionCheckout(true)}
          />
        </main>
      ) : showAdminPanel ? (
        <main className="flex-1 w-full mx-auto flex flex-col gap-8">
          <AdminSubscribersPanel 
            currentUserEmail={currentUser.email}
            onClose={() => setShowAdminPanel(false)}
            onRefreshCurrentProfile={(updatedProfile) => {
              setProfile(updatedProfile);
              if (currentUser) {
                setCurrentUser({
                  ...currentUser,
                  profile: updatedProfile
                });
              }
            }}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col gap-8">
        
        {/* Account Suspended / Expired Banner - only show if athlete already has a plan generated */}
        {plan && accessInfo.accessType === "expired" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            id="account-blocked-banner"
            className="w-full bg-rose-950/90 border border-rose-800/80 text-white rounded-2xl p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-xs font-sans space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-black text-rose-100 text-sm">
                    Acesso aos Treinos Bloqueado
                  </span>
                  <span className="bg-rose-500/30 border border-rose-500/40 text-rose-200 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Assinatura Inativa
                  </span>
                </div>
                <p className="text-rose-200/90 text-xs">
                  Sua assinatura está inativa ou o acesso foi suspenso. As estruturas minuto a minuto, conclusões de treinos e evolução semanal estão bloqueadas.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="account-blocked-subscribe-btn"
              onClick={() => setShowSubscriptionCheckout(true)}
              className="px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm hover:shadow-md shrink-0 self-start sm:self-auto cursor-pointer active:scale-98"
            >
              Aderir ao Plano • R$ 16,90
            </button>
          </motion.div>
        )}

        {/* Trial Expired Banner - only show if athlete already has a plan generated */}
        {plan && accessInfo.accessType === "trial_expired" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            id="trial-expired-banner"
            className="w-full bg-amber-950/90 border border-amber-800/80 text-white rounded-2xl p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-xs font-sans space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-black text-amber-100 text-sm">
                    Período de Teste Gratuito Expirado
                  </span>
                  <span className="bg-amber-500/30 border border-amber-500/40 text-amber-200 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    3 Dias Concluídos
                  </span>
                </div>
                <p className="text-amber-200/90 text-xs">
                  Seu período de teste gratuito de 3 dias terminou. Para continuar registrando pedaladas, destravando as estruturas e evoluindo de semana, ative sua assinatura.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="trial-expired-subscribe-btn"
              onClick={() => setShowSubscriptionCheckout(true)}
              className="px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm hover:shadow-md shrink-0 self-start sm:self-auto cursor-pointer active:scale-98"
            >
              Aderir ao Plano • R$ 16,90
            </button>
          </motion.div>
        )}

        {/* Discreet Trial Countdown Banner - only show if athlete already has a plan generated */}
        {plan && accessInfo.isInTrial && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            id="trial-countdown-banner"
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-xs font-sans space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-black text-slate-100 text-sm">
                    Período de Teste Gratuito Ativo
                  </span>
                  <span className="bg-sky-500/20 border border-sky-500/30 text-sky-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    {accessInfo.trialDaysRemaining > 1 
                      ? `${accessInfo.trialDaysRemaining} dias restantes` 
                      : `${accessInfo.trialHoursRemaining}h restantes`}
                  </span>
                </div>
                <p className="text-slate-300 text-xs">
                  Você tem acesso total aos treinos, estruturas minuto a minuto e métricas. Garanta a continuidade dos seus treinos após o teste.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="trial-banner-subscribe-btn"
              onClick={() => setShowSubscriptionCheckout(true)}
              className="px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm hover:shadow-md shrink-0 self-start sm:self-auto cursor-pointer active:scale-98"
            >
              Aderir ao Plano • R$ 16,90
            </button>
          </motion.div>
        )}

        {/* Scenario A: Simplified Express Onboarding Screen */}
        <AnimatePresence mode="wait">
          {!plan ? (
            <motion.div 
              key="onboarding-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto w-full space-y-6"
            >
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-lime-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-3 py-1 bg-lime-400 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-wider shadow-xs">
                      Criar Primeiro Treino
                    </span>
                    <span className="text-lime-400 text-xs font-mono font-bold flex items-center gap-1">
                      ⚡ Leva menos de 1 minuto
                    </span>
                  </div>
                  <h2 className="font-heading font-black text-xl sm:text-2xl text-white tracking-tight flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-lime-400 animate-pulse shrink-0" />
                    <span>Seu Primeiro Plano de Ciclismo com IA</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl font-sans">
                    Responda às 6 etapas rápidas para calibrarmos seus dias, intensidade e metas na medida certa.
                  </p>
                </div>
              </div>

              {/* Express Onboarding Form Card */}
              <OnboardingForm 
                profile={profile} 
                setProfile={setProfile} 
                onGeneratePlan={generateTrainingPlan} 
                isGeneratingPlan={isGeneratingPlan} 
              />
            </motion.div>
          ) : (
            
            /* Scenario B: Fully Completed Athlete Dashboard */
            <motion.div 
              key="dashboard-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              
              {/* Profile Brief Top Summary Bar */}
              <div className="bg-white rounded-3xl border border-slate-100/85 shadow-[0_4px_24px_rgba(15,23,42,0.02)] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fadeInUp">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-lime-400 flex items-center justify-center font-heading font-black text-lime-400 text-lg shadow-sm relative shrink-0">
                    {(profile.name || "AT").slice(0, 2).toUpperCase()}
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                  </div>
                  <div>
                    <h2 className="font-heading font-black text-slate-800 text-lg leading-tight">Ciclista: {profile.name || "Atleta"}</h2>
                    <p className="text-xs text-slate-405 leading-relaxed font-sans mt-1 flex flex-wrap items-center gap-2 font-medium">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">{formatLevel(profile.level)}</span>
                      <span className="text-slate-300">•</span>
                      <span>Foco: <strong className="text-slate-850">{formatGoal(profile.goal)}</strong></span>
                    </p>
                  </div>
                </div>

                {/* Tab select Buttons with Sporty design */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl w-full md:w-auto border border-slate-200/60 shadow-inner">
                  <button 
                    onClick={() => {
                      setActiveTab("planilha");
                      MetaPixelEvents.viewContent("Planilha de Treinos", "Navegação do Atleta");
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-4 text-[11px] sm:text-xs font-black leading-none font-heading uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === "planilha" ? "bg-slate-900 text-lime-400 shadow-sm" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span className="truncate">Planilha</span>
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab("desempenho");
                      MetaPixelEvents.viewContent("Evolução e Métricas", "Navegação do Atleta");
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-4 text-[11px] sm:text-xs font-black leading-none font-heading uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === "desempenho" ? "bg-slate-900 text-lime-400 shadow-sm" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <Trophy className="w-4 h-4 shrink-0" />
                    <span className="truncate">Evolução</span>
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab("zonas");
                      MetaPixelEvents.viewContent("Guia de Zonas de Treino", "Navegação do Atleta");
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-4 text-[11px] sm:text-xs font-black leading-none font-heading uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === "zonas" ? "bg-slate-900 text-lime-400 shadow-sm" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <Sliders className="w-4 h-4 shrink-0" />
                    <span className="truncate">Meu Guia</span>
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab("chat");
                      MetaPixelEvents.viewContent("Chat Treinador IA", "Navegação do Atleta");
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-4 text-[11px] sm:text-xs font-black leading-none font-heading uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === "chat" ? "bg-slate-900 text-lime-400 shadow-sm" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <Bot className="w-4 h-4 shrink-0" />
                    <span className="truncate">Coach IA</span>
                  </button>
                  <button 
                    onClick={() => {
                      setFeedbackText("");
                      setFeedbackSuccess(false);
                      setShowFeedbackModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-4 text-[11px] sm:text-xs font-black leading-none font-heading uppercase rounded-xl transition-all cursor-pointer text-slate-700 hover:bg-slate-200 hover:text-slate-900 bg-white/70 border border-slate-200/60 shadow-2xs"
                    title="Enviar sugestão ou feedback direto para a área privada do treinador"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
                    <span className="truncate">Feedback</span>
                  </button>

                  {!isPortable && (
                    <button
                      id="header-install-pwa-button"
                      type="button"
                      onClick={handleInstallClick}
                      className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-4 text-[11px] sm:text-xs font-black leading-none font-heading uppercase rounded-xl transition-all cursor-pointer bg-lime-400 hover:bg-lime-350 text-slate-950 shadow-2xs border border-lime-500/40"
                      title="Instalar Aplicativo Biker AI"
                    >
                      <Download className="w-4 h-4 text-slate-950 shrink-0" />
                      <span className="truncate">Instalar App</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Render Selected TAB content */}
              <AnimatePresence mode="wait">
                {activeTab === "planilha" && (
                  <motion.div 
                    key="tab-planilha" 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    {/* Render Preview Header if plan exists and user access is blocked/pending */}
                    {plan && isPendingUser && (
                      <WorkoutPlanPreview 
                        plan={plan} 
                        profile={profile} 
                        onUnlockClick={() => setShowSubscriptionCheckout(true)} 
                      />
                    )}

                    {/* TOP PRIORITY HERO: O que eu preciso treinar hoje? */}
                    {plan && plan.workouts && (
                      <TodayWorkoutCard
                        workouts={plan.workouts}
                        profile={profile}
                        isSimpleMode={displayMode === "simples"}
                        onUpdateWorkout={handleUpdateWorkout}
                        onOpenCompleteModal={(workoutIndex) => setCompletingWorkoutIndex(workoutIndex)}
                        onOpenFullWorkout={(workoutIndex) => {
                          setShowMyWorkouts(true);
                          setTimeout(() => {
                            workoutsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }, 150);
                        }}
                      />
                    )}

                    {/* Before Starting Guide Banner */}
                    <motion.div 
                      initial={{ opacity: 0, y: -15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      id="before-starting-guide-card" 
                      className="bg-gradient-to-r from-sky-500/10 via-indigo-500/5 to-transparent border border-sky-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-3xs"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-sky-500 text-white rounded-2xl shrink-0 shadow-xs animate-pulse">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[9px] font-black tracking-widest uppercase text-sky-600 block mb-1 font-mono">
                            Passo Essencial
                          </span>
                          <h4 className="font-heading font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                            Antes de começar o treino de hoje, leia o seu Guia!
                          </h4>
                          <p className="text-xs font-sans text-slate-600 leading-relaxed mt-1">
                            Acesse o <strong className="text-slate-800 font-extrabold font-heading">Meu Guia</strong> para ver o guia fácil de sensações, as zonas personalizadas de batimento/potência, calculadora de hidratação inteligente e as boas práticas de segurança!
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("zonas");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="w-full md:w-auto px-5 py-3 bg-sky-600 hover:bg-sky-700 active:scale-98 text-white text-xs font-heading font-black uppercase tracking-wider rounded-xl transition-all shadow-sm hover:shadow-md shrink-0 flex items-center justify-center gap-2 cursor-pointer border-none"
                      >
                        <span>Abrir Meu Guia</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>

                    {plan?.coachMessage && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4 }}
                        id="coach-weekly-feedback-banner" 
                        className="bg-gradient-to-r from-lime-500/10 to-emerald-500/10 border border-lime-500/20 rounded-2xl p-5 flex items-start gap-4 shadow-2xs"
                      >
                        <MessageSquare className="w-5 h-5 text-lime-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-heading font-extrabold text-slate-800 text-sm">Feedback do Treinador AI — Semana {plan.weekNumber || 1}</h4>
                          <p className="text-xs font-sans text-slate-655 leading-relaxed mt-1 italic">
                            "{displayMode === "simples" ? getSimplifiedText(plan.coachMessage) : plan.coachMessage}"
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Weekly Plan summary card */}
                    <div id="plan-block-summary" className="w-full">
                      
                      {/* Summary text */}
                      <motion.div 
                        initial={{ opacity: 0, y: 25 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="bg-slate-900 text-white p-6 rounded-2xl w-full shadow-xs border border-slate-800 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-3">
                          <h3 className="font-heading font-extrabold text-sm uppercase tracking-widest text-lime-400 flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-lime-400" /> Macrociclo & Foco Principal
                          </h3>
                          <p className="text-xs text-slate-350 leading-relaxed font-sans">
                            {displayMode === "simples" ? getSimplifiedText(plan?.summary) : plan?.summary}
                          </p>
                        </div>

                        {/* Direct Access Action Link styled sportily */}
                        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between sm:justify-start gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (showMyWorkouts) {
                                setShowMyWorkouts(false);
                              } else {
                                setShowMyWorkouts(true);
                                setTimeout(() => {
                                  workoutsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }, 150);
                              }
                            }}
                            className={`px-5 py-2.5 rounded-xl font-black font-heading text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 shadow-md cursor-pointer active:scale-97 shrink-0 ${
                              showMyWorkouts 
                                ? "bg-slate-800 hover:bg-slate-755 text-white border border-slate-705 shadow-sm" 
                                : "bg-lime-500 hover:bg-lime-400 text-slate-950 hover:shadow-[0_0_15px_rgba(132,204,22,0.3)]"
                            }`}
                          >
                            {showMyWorkouts ? (
                              <>
                                <EyeOff className="w-4 h-4" />
                                <span>Ocultar Meus Treinos ({completedW}/{totalW})</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                <span>Acessar Meus Treinos ({completedW}/{totalW} Feitos)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>

                    </div>

                    {/* Progress Tracker Panel & Worksheet Actions */}
                    {plan && plan.workouts && (
                      (() => {
                        const totalW = plan.workouts.filter(w => !isRestDay(w)).length;
                        const completedW = plan.workouts.filter(w => w.completed && !isRestDay(w)).length;
                        const pctW = totalW > 0 ? Math.round((completedW / totalW) * 100) : 0;
                        return (
                          <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5 }}
                            className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6"
                          >
                            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <h3 className="font-heading font-black text-slate-800 text-lg flex items-center gap-2">
                                  <ClipboardList className="w-5 h-5 text-lime-650" />
                                  <span>Painel de Progresso Semanal</span>
                                </h3>
                                <p className="text-xs text-slate-500 font-sans">
                                  Acompanhe o rendimento e evolua a planilha para subir cargas quando se sentir pronto.
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isPendingUser) {
                                      setShowSubscriptionCheckout(true);
                                    } else {
                                      setShowNextWeekForm(prev => !prev);
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-xl text-xs font-black font-heading flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                                    showNextWeekForm 
                                      ? "bg-rose-600 hover:bg-rose-700 text-white" 
                                      : isPendingUser
                                      ? "bg-amber-400 hover:bg-amber-500 text-slate-950 hover:shadow-md active:scale-95"
                                      : "bg-gradient-to-r from-lime-500 to-emerald-500 text-slate-950 hover:shadow-md hover:brightness-105 active:scale-95"
                                  }`}
                                >
                                  {isPendingUser ? (
                                    <Lock className="w-3.5 h-3.5 shrink-0" />
                                  ) : (
                                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  <span>{showNextWeekForm ? "Fechar Configuração" : "Evoluir de Semana"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleExportPDF}
                                  className={`px-3.5 py-2 text-white rounded-xl text-xs font-bold font-heading flex items-center gap-1.5 transition-all shadow-xs cursor-pointer focus:outline-hidden ${
                                    isPendingUser
                                      ? "bg-slate-700 hover:bg-slate-800"
                                      : "bg-sky-600 hover:bg-sky-700"
                                  }`}
                                >
                                  {isPendingUser ? (
                                    <Lock className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                  <span>Exportar PDF</span>
                                </button>
                                {completedW > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm("Deseja realmente limpar o progresso de conclusão de todos os treinos?")) {
                                        const updatedWorkouts = plan.workouts.map(w => ({ ...w, completed: false }));
                                        const updatedPlan = { ...plan, workouts: updatedWorkouts };
                                        setPlan(updatedPlan);
                                      }
                                    }}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Resetar</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Collapsible form for weekly evolution */}
                            <AnimatePresence>
                              {showNextWeekForm && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="overflow-hidden border-t border-slate-100 pt-5 space-y-4"
                                >
                                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                                    <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                                      <div className="bg-lime-100 p-1.5 rounded-lg text-lime-700 shrink-0">
                                        <Sparkles className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <h4 className="font-heading font-black text-slate-800 text-xs sm:text-sm">
                                          Iniciar Estímulos da Semana {(plan.weekNumber || 1) + 1}
                                        </h4>
                                        <p className="text-[10.5px] text-slate-500 font-sans mt-0.5">
                                          O Treinador AI analisará sua constância de <strong>{pctW}% de conclusão</strong> para calibrar as novas intensidades.
                                        </p>
                                      </div>
                                    </div>

                                    {/* Subj feedback radio grid */}
                                    <div className="space-y-2">
                                      <label className="block text-[10px] font-bold text-slate-600 font-heading uppercase tracking-wider">
                                        Como foi sua adaptação física e cansaço nesta semana?
                                      </label>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                        <button
                                          type="button"
                                          onClick={() => setSubjFeedback("otimo")}
                                          className={`text-left p-3.5 rounded-xl border text-xs font-sans transition-all flex items-start gap-2.5 cursor-pointer ${
                                            subjFeedback === "otimo"
                                              ? "border-emerald-500 bg-emerald-50 text-slate-900 font-semibold ring-2 ring-emerald-500/20 shadow-xs"
                                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
                                          }`}
                                        >
                                          <Dumbbell className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
                                          <div>
                                            <p className="font-bold text-emerald-900 text-[11px] uppercase tracking-wide">Excelente / Forte</p>
                                            <p className="text-[10px] text-slate-600 leading-tight mt-0.5">Me senti muito forte, pernas recuperadas e com energia de sobra.</p>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => setSubjFeedback("moderado")}
                                          className={`text-left p-3.5 rounded-xl border text-xs font-sans transition-all flex items-start gap-2.5 cursor-pointer ${
                                            subjFeedback === "moderado"
                                              ? "border-amber-500 bg-amber-50 text-slate-900 font-semibold ring-2 ring-amber-500/20 shadow-xs"
                                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
                                          }`}
                                        >
                                          <CheckCircle2 className="w-4 h-4 text-amber-600 mt-1 shrink-0" />
                                          <div>
                                            <p className="font-bold text-amber-900 text-[11px] uppercase tracking-wide">Equilibrado / Normal</p>
                                            <p className="text-[10px] text-slate-600 leading-tight mt-0.5">Cansaço normal esperado das sessões, mas completei bem.</p>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => setSubjFeedback("muito_cansado")}
                                          className={`text-left p-3.5 rounded-xl border text-xs font-sans transition-all flex items-start gap-2.5 cursor-pointer ${
                                            subjFeedback === "muito_cansado"
                                              ? "border-rose-500 bg-rose-50 text-slate-900 font-semibold ring-2 ring-rose-500/20 shadow-xs"
                                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
                                          }`}
                                        >
                                          <AlertTriangle className="w-4 h-4 text-rose-600 mt-1 shrink-0" />
                                          <div>
                                            <p className="font-bold text-rose-900 text-[11px] uppercase tracking-wide">Exausto / Dores</p>
                                            <p className="text-[10px] text-slate-600 leading-tight mt-0.5">Sinto dores articulares persistentes, exaustão física ou queimação pesada.</p>
                                          </div>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Text explanation */}
                                    <div className="space-y-1.5">
                                      <label className="block text-[10px] font-bold text-slate-600 font-heading uppercase tracking-wider">
                                        Observações sobre a evolução ou solicitações ao Coach (opcional)
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={textFeedback}
                                        onChange={(e) => setTextFeedback(e.target.value)}
                                        placeholder="Ex: Tive um pouco de desconforto de quinta em diante ou gostaria de treinos mais focados em subidas..."
                                        className="w-full bg-white border border-slate-200 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 rounded-xl p-3 text-xs text-slate-800 outline-hidden font-sans placeholder:text-slate-400 leading-normal"
                                      />
                                    </div>

                                    {/* Progression rule visual tips based on stats */}
                                    <div className="bg-slate-100 p-3 rounded-xl text-[11px] text-slate-700 flex items-start gap-2.5 border border-slate-200">
                                      <TrendingDown className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                                      <p className="leading-relaxed font-sans">
                                        {pctW >= 75 ? (
                                          <span>Análise Fisiológica: Você concluiu <strong>{pctW}% dos treinos</strong> propostos! Atleta exemplar! Iremos propor um microciclo de <strong>Progressão de Cargas e Supercompensação Aeróbica</strong> para a Semana {(plan.weekNumber || 1) + 1}.</span>
                                        ) : (
                                          <span>Análise Fisiológica: Como você realizou <strong>{pctW}% das atividades</strong> (abaixo do limiar de consistência de 75%), priorizaremos um ciclo de <strong>Estabilização, Adaptação ou Descanso Ativo (Deload)</strong> na Semana {(plan.weekNumber || 1) + 1} para consolidar seus ganhos com saúde.</span>
                                        )}
                                      </p>
                                    </div>

                                    {/* Action button */}
                                    <div className="flex justify-end pt-3 border-t border-slate-200/60">
                                      <button
                                        id="save-progress-evolve-btn"
                                        type="button"
                                        disabled={isGeneratingNextWeek}
                                        onClick={() => {
                                          if (isPendingUser) {
                                            setShowSubscriptionCheckout(true);
                                            return;
                                          }
                                          handleGenerateNextWeek();
                                        }}
                                        className="w-full sm:w-auto px-6 py-3.5 bg-lime-400 hover:bg-lime-350 text-slate-950 font-heading font-black text-xs sm:text-sm uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md border-2 border-lime-500 active:scale-98"
                                      >
                                        {isGeneratingNextWeek ? (
                                          <>
                                            <RefreshCw className="w-4 h-4 animate-spin text-slate-950 shrink-0" />
                                            <span className="text-slate-950 font-black">Montando Nova Planilha e Cargas...</span>
                                          </>
                                        ) : isPendingUser ? (
                                          <>
                                            <Lock className="w-4 h-4 text-slate-950 shrink-0" />
                                            <span className="text-slate-950 font-black">Desbloquear Assinatura p/ Evoluir</span>
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950/20 shrink-0" />
                                            <span className="text-slate-950 font-black">Salvar Progresso & Evoluir p/ Semana {(plan.weekNumber || 1) + 1}</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>


                          </motion.div>
                        );
                      })()
                    )}

                    {/* Charts Panel Grid */}
                    {plan && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <VolumeEvolutionChart profile={profile} plan={plan} />
                        <WeeklyCalorieChart profile={profile} plan={plan} />
                      </div>
                    )}

                    <div ref={workoutsSectionRef} className="scroll-mt-28 block" />
                    <AnimatePresence>
                      {showMyWorkouts && (
                        <motion.div
                          key="workouts-reveal-wrapper"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          {/* Workouts section header with the PSE Explanation button */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 pb-3 border-b border-slate-100 mb-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-lime-600 shrink-0" />
                              <h3 className="font-heading font-black text-slate-800 text-sm uppercase tracking-wider">
                                Próximos Treinos e Programação Semanal
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowPseExplanation(prev => !prev)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-black font-heading flex items-center gap-1.5 transition-all border shadow-2xs cursor-pointer focus:outline-hidden ${
                                showPseExplanation
                                  ? "bg-slate-900 text-lime-400 border-slate-950 font-extrabold"
                                  : "bg-lime-50 text-lime-700 hover:bg-lime-100 hover:text-lime-800 border-lime-100/80"
                              }`}
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>O que é PSE?</span>
                            </button>
                          </div>

                          {/* Collapsible guide explaining PSE and its scales */}
                          <AnimatePresence>
                            {showPseExplanation && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden pb-4 pt-1 w-full"
                              >
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
                                  <div className="flex items-start md:items-center gap-3 pb-3 border-b border-slate-200">
                                    <div className="bg-lime-500 text-slate-900 p-2 rounded-xl shrink-0">
                                      <HelpCircle className="w-5 h-5 animate-pulse" />
                                    </div>
                                    <div>
                                      <h4 className="font-heading font-black text-slate-800 text-sm uppercase tracking-wide">
                                        Guia de PSE — Percepção Subjetiva de Esforço
                                      </h4>
                                      <p className="text-xs text-slate-600 font-sans mt-0.5 leading-relaxed">
                                        A <strong>PSE (Percepção Subjetiva de Esforço)</strong> ou RPE é uma escala de <strong>1 a 10</strong> que serve para avaliar o quão extenuante, cansativo e pesado foi um treino com base no que você sentiu. Ela permite que ciclistas monitorem a fadiga real, regulem a intensidade e previnam o esgotamento (overtraining).
                                      </p>
                                    </div>
                                  </div>

                                  {/* Color-graded Scale Table/Grid */}
                                  <div className="space-y-3">
                                    <h5 className="text-[10px] font-bold text-slate-400 font-heading uppercase tracking-widest">
                                      O que significa cada nota da escala:
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      
                                      {/* PSE 1-2 */}
                                      <div className="bg-white border border-emerald-100/80 hover:border-emerald-250 rounded-xl p-3 shadow-3xs flex gap-3 transition-colors">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 font-mono font-black shrink-0 flex items-center justify-center text-sm border border-emerald-500/20">
                                          1-2
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-heading font-extrabold text-emerald-700 text-[11px] uppercase tracking-wider">Muito Leve / Soltura</span>
                                          <span className="text-[10.5px] text-slate-500 font-sans mt-0.5 leading-tight">
                                            Regenerativo total. Giro solto nas pernas com quase nenhuma força. Conversa flui perfeitamente, sem cansar nadinha.
                                          </span>
                                        </div>
                                      </div>

                                      {/* PSE 3-4 */}
                                      <div className="bg-white border border-sky-100/80 hover:border-sky-250 rounded-xl p-3 shadow-3xs flex gap-3 transition-colors">
                                        <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-650 font-mono font-black shrink-0 flex items-center justify-center text-sm border border-sky-500/20">
                                          3-4
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-heading font-extrabold text-sky-700 text-[11px] uppercase tracking-wider">Leve / Moderado</span>
                                          <span className="text-[10.5px] text-slate-500 font-sans mt-0.5 leading-tight">
                                            Ritmo de Endurance (Z2). Confortável o suficiente para passar o dia pedalando. Respiração profunda, mas sem ofegar.
                                          </span>
                                        </div>
                                      </div>

                                      {/* PSE 5-6 */}
                                      <div className="bg-white border border-amber-100/80 hover:border-amber-250 rounded-xl p-3 shadow-3xs flex gap-3 transition-colors">
                                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 font-mono font-black shrink-0 flex items-center justify-center text-sm border border-amber-500/20">
                                          5-6
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-heading font-extrabold text-amber-700 text-[11px] uppercase tracking-wider">Firme / Ritmo</span>
                                          <span className="text-[10.5px] text-slate-500 font-sans mt-0.5 leading-tight">
                                            Tempo (Z3). Calor corporal aumenta e a respiração acelera bastante. Requer foco para manter, mas você ainda fala frases completas.
                                          </span>
                                        </div>
                                      </div>

                                      {/* PSE 7-8 */}
                                      <div className="bg-white border border-orange-100/80 hover:border-orange-250 rounded-xl p-3 shadow-3xs flex gap-3 transition-colors">
                                        <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-600 font-mono font-black shrink-0 flex items-center justify-center text-sm border border-orange-500/20">
                                          7-8
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-heading font-extrabold text-orange-700 text-[11px] uppercase tracking-wider">Muito Forte</span>
                                          <span className="text-[10.5px] text-slate-500 font-sans mt-0.5 leading-tight">
                                            Limiar de Lactato (Z4). Respiração pesada e pernas queimando pelo ácido lático. Conversa interrompida (só palavras isoladas).
                                          </span>
                                        </div>
                                      </div>

                                      {/* PSE 9 */}
                                      <div className="bg-white border border-red-100/80 hover:border-red-250 rounded-xl p-3 shadow-3xs flex gap-3 transition-colors">
                                        <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-600 font-mono font-black shrink-0 flex items-center justify-center text-sm border border-red-500/20">
                                          9
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-heading font-extrabold text-red-700 text-[11px] uppercase tracking-wider">Extremo / VO2max</span>
                                          <span className="text-[10.5px] text-slate-500 font-sans mt-0.5 leading-tight">
                                            Capacidade máxima aeróbica (Z5). Músculos em forte dor ácida de queimação. Ofegante absoluto, impossível falar qualquer palavra.
                                          </span>
                                        </div>
                                      </div>

                                      {/* PSE 10 */}
                                      <div className="bg-white border border-purple-100/80 hover:border-purple-250 rounded-xl p-3 shadow-3xs flex gap-3 transition-colors">
                                        <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 font-mono font-black shrink-0 flex items-center justify-center text-sm border border-purple-500/20">
                                          10
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-heading font-extrabold text-purple-700 text-[11px] uppercase tracking-wider">Esforço Máximo</span>
                                          <span className="text-[10.5px] text-slate-500 font-sans mt-0.5 leading-tight">
                                            Sprints brutais ou picos anaeróbicos de explosão total (Z6/Z7). Sustentável por poucos segundos. Sensação de fadiga total.
                                          </span>
                                        </div>
                                      </div>

                                    </div>
                                  </div>
                                  
                                  <div className="bg-amber-100/30 p-3.5 rounded-xl border border-amber-200/50 text-xs text-amber-850 flex items-start gap-2.5">
                                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <span className="font-bold text-amber-800 shrink-0 select-none">DICA DE OURO:</span>
                                    <span className="leading-relaxed">Não encare a PSE apenas como dor nas pernas física. Pense no seu <strong>fôlego respiratório</strong> (quão ofegante você ficou) e no <strong>foco mental</strong> exigido para completar aquela sessão inteira.</span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Bento Grid of workouts (standard vertical stacking grid, no mobile lateral displacement) */}
                          <div id="weekly-workouts-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pt-2">
                            {plan?.workouts.map((wk, index) => (
                              <motion.div
                                key={`${wk.day}-${index}`}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-30px" }}
                                transition={{ duration: 0.45, delay: (index % 3) * 0.08 }}
                                className="w-full flex"
                              >
                                <WorkoutCard 
                                  workout={wk} 
                                  profile={profile}
                                  allWorkouts={plan?.workouts || []}
                                  onUpdate={(updatedWorkout) => handleUpdateWorkout(index, updatedWorkout)}
                                  onDelete={() => handleDeleteWorkout(index)}
                                  isSimpleMode={displayMode === "simples"}
                                  onUnlockClick={() => setShowSubscriptionCheckout(true)}
                                  onOpenCompleteModal={() => setCompletingWorkoutIndex(index)}
                                />
                              </motion.div>
                            ))}
                            {(!plan?.workouts || plan.workouts.length === 0) && (
                              <div className="col-span-full bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
                                <ClipboardList className="w-10 h-10 text-slate-300" />
                                <div>
                                  <h4 className="font-heading font-bold text-slate-600 text-sm">Sem treinos para exibir</h4>
                                  <p className="text-xs text-slate-400 font-sans mt-1">Sua planilha semanal está vazia no momento.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Additional Coach advice */}
                    <div id="additional-coach-advice" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Technical observations card */}
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5 }}
                        className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-3"
                      >
                        <h4 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-50 pb-2">
                          <ShieldAlert className="w-4.5 h-4.5 text-amber-600" /> Marcadores para monitoramento diário
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-line">
                          {displayMode === "simples" ? getSimplifiedText(plan?.observations) : plan?.observations}
                        </p>
                      </motion.div>

                      {/* Execution feedback card */}
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5 }}
                        className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-3"
                      >
                        <h4 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-50 pb-2">
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" /> Critérios de Sucesso (Dicas e Resultados)
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-line">{plan?.evaluation}</p>
                      </motion.div>
                    </div>

                    {/* Scientific Efficacy & Cardiovascular Safety Shield Panel */}
                    <motion.div 
                      id="physiological-safety-shield" 
                      initial={{ opacity: 0, scale: 0.95, y: 30 }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.6 }}
                      className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-white rounded-3xl p-6 sm:p-8 space-y-6"
                    >
                      
                      {/* Header Row */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                        <div className="flex items-center gap-3.5">
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
                            <Activity className="w-6 h-6 animate-pulse" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold font-heading text-emerald-400 uppercase tracking-widest block font-sans">DICAS DE PREPARAÇÃO & PRECAUÇÃO FÍSICA</span>
                            <h3 className="font-heading font-extrabold text-base text-slate-100">Guia de Segurança e Boas Práticas de Treino</h3>
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-mono">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span>SafeRide-AI Active Control</span>
                        </div>
                      </div>

                      {/* Informational Columns */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-slate-400">
                        
                        {/* Column 1: Why it is scientifically safe */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-slate-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <h4 className="font-heading font-bold text-xs uppercase tracking-wider">Distribuição Inteligente de Treinos</h4>
                          </div>
                          <p className="font-sans leading-relaxed text-[11.5px]">
                            Nossas planilhas utilizam o consagrado <strong>Equilíbrio de Treino Leve e Forte (Regra dos 80/20)</strong>. Significa que 80% dos seus treinos semanais focam no desenvolvimento de resistência básica (baixa intensidade excelente para o coração e cansaço reduzido), reservando apenas 20% para treinos curtos de ritmo forte.
                          </p>
                          <p className="font-sans leading-relaxed text-[11.5px]">
                            Essa distribuição inteligente reduz o esforço exagerado nas articulações e cansaço acumulado nas pernas em até 60% quando comparado com treinos genéricos em que o atleta tenta ir forte em todos os dias (o erro clássico de pedalar no limite sempre).
                          </p>
                        </div>

                        {/* Column 2: Safety Warnings and Medical Disclaimer */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-rose-400">
                            <ShieldAlert className="w-4 h-4 text-rose-400" />
                            <h4 className="font-heading font-bold text-xs uppercase tracking-wider">Monitoramento e Prevenção</h4>
                          </div>
                          <p className="font-sans leading-relaxed text-[11.5px]">
                            <strong>Evitando Dores Articulares:</strong> Comece cada pedal de forma tranquila para aquecer o corpo. Botar força excessiva a frio pode sobrecarregar o joelho e a lombar. Se sentir dor forte (que não seja cansaço muscular normal), pare o pedal e descanse.
                          </p>
                          <p className="font-sans leading-relaxed text-[11.5px]">
                            <strong>Aviso Importante:</strong> O uso do <em>Biker AI</em> não substitui uma consulta médica com um cardiologista ou profissional de saúde. Recomendamos fazer exames preventivos regulares se for realizar esforços nas zonas mais intensas de potência.
                          </p>
                        </div>

                        {/* Column 3: Instant Interactive Checkpoints */}
                        <div className="space-y-3 bg-slate-900/50 p-4 border border-slate-850 rounded-2xl">
                          <div className="flex items-center gap-2 text-amber-500">
                            <Heart className="w-4 h-4 text-amber-500" />
                            <h4 className="font-heading font-bold text-xs uppercase tracking-wider">Check de Segurança do Dia</h4>
                          </div>
                          <p className="text-[10px] text-slate-400 font-sans leading-normal mb-1">
                            Antes de subir no selim, certifique-se de que nenhum destes sintomas esteja ativo:
                          </p>
                          <ul className="space-y-1.5 text-[11px] font-sans text-slate-300">
                            <li className="flex items-start gap-1.5">
                              <span className="text-amber-500 mt-0.5">•</span>
                              <span>Frequência Cardíaca de repouso &gt; 8 bpm acima do normal ao acordar (Alerta de overtraining)</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="text-amber-500 mt-0.5">•</span>
                              <span>Falta de ar acentuada em repouso ou aperto opressivo no peito</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="text-amber-500 mt-0.5">•</span>
                              <span>Desidratação grave ou ingestão calórica insuficiente nas últimas 12h</span>
                            </li>
                          </ul>
                          <div className="pt-2 text-[10px] text-slate-500 italic leading-snug">
                            Se houver fadiga anormal ou sintomas, priorize o repouso ativo e evite treinos intensivos.
                          </div>
                        </div>

                      </div>
                    </motion.div>

                  </motion.div>
                )}

                {activeTab === "desempenho" && (
                  <motion.div 
                    key="tab-desempenho" 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AchievementsDashboard profile={profile} plan={plan} workoutLogs={workoutLogs} />
                  </motion.div>
                )}

                {activeTab === "zonas" && (
                  <motion.div 
                    key="tab-zonas" 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ZoneCalculator profile={profile} isSimpleMode={displayMode === "simples"} />
                  </motion.div>
                )}

                {activeTab === "chat" && (
                  <motion.div 
                    key="tab-chat" 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CoachChat 
                      profile={profile}
                      plan={plan}
                      onApplyPlanUpdate={(updatedPlan) => setPlan(updatedPlan)}
                      isPendingUser={isPendingUser}
                      onUnlockClick={() => setShowSubscriptionCheckout(true)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Shortcut for AI Coach */}
        {plan && activeTab !== "chat" && (
          <button
            type="button"
            onClick={() => {
              setActiveTab("chat");
              MetaPixelEvents.viewContent("Chat Treinador IA", "Navegação do Atleta");
            }}
            className="fixed bottom-6 right-6 z-40 bg-slate-950 hover:bg-slate-900 text-white p-3 sm:px-4 sm:py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
            title="Falar com o Treinador IA"
          >
            <div className="w-9 h-9 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center font-heading font-black shadow-xs relative">
              <Bot className="w-5 h-5 text-slate-950" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
            </div>
            <div className="hidden sm:flex flex-col text-left pr-1">
              <span className="text-[10px] font-mono text-lime-400 uppercase font-black tracking-wider leading-none">Online</span>
              <span className="text-xs font-heading font-black text-white leading-tight">Coach IA</span>
            </div>
          </button>
        )}

      </main>
      )}

      {/* Footer */}
      <AppFooter setShowContact={setShowContact} setShowPrivacy={setShowPrivacy} setShowTerms={setShowTerms} />

      {/* Install Instruction Guide Overlay Modal for main screen */}
      <InstallGuideModal setShowInstallGuide={setShowInstallGuide} showInstallGuide={showInstallGuide} />

      {/* Sleek Password Challenge for Coach Access */}
      <AdminPasswordModal adminPasswordError={adminPasswordError} adminPasswordInput={adminPasswordInput} setAdminPasswordError={setAdminPasswordError} setAdminPasswordInput={setAdminPasswordInput} setShowAdminPanel={setShowAdminPanel} setShowAdminPasswordPrompt={setShowAdminPasswordPrompt} showAdminPasswordPrompt={showAdminPasswordPrompt} />

      {/* Premium Feedback Modal for Athletes */}
      <FeedbackModal feedbackSuccess={feedbackSuccess} feedbackText={feedbackText} handleSendFeedback={handleSendFeedback} setFeedbackText={setFeedbackText} setShowFeedbackModal={setShowFeedbackModal} showFeedbackModal={showFeedbackModal} submittingFeedback={submittingFeedback} />

      {/* Subscription Checkout Modal Dialog */}
      <SubscriptionCheckoutModal accessInfo={accessInfo} currentUser={currentUser} profile={profile} refreshUserSession={refreshUserSession} setProfile={setProfile} setShowSubscriptionCheckout={setShowSubscriptionCheckout} showSubscriptionCheckout={showSubscriptionCheckout} />

      {/* Workout Completion 5-Question Modal */}
      {completingWorkoutIndex !== null && plan && plan.workouts && plan.workouts[completingWorkoutIndex] && (
        <WorkoutCompletionModal
          isOpen={true}
          onClose={() => setCompletingWorkoutIndex(null)}
          workout={plan.workouts[completingWorkoutIndex]}
          workoutIndex={completingWorkoutIndex}
          weekNumber={plan.weekNumber || 1}
          onSaveLog={handleSaveWorkoutLog}
        />
      )}

      {/* Modais Legais e de Contato */}
      <TermsOfUseModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />

      {/* Floating Email Support Button */}
      <a
        href="mailto:bikeraisupport@gmail.com"
        className="fixed bottom-3.5 right-3.5 sm:bottom-5 sm:right-5 z-40 flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 bg-slate-900/95 hover:bg-slate-900 text-lime-400 hover:text-white border border-lime-500/40 hover:border-lime-500/80 rounded-full shadow-xl hover:shadow-2xl transition-all cursor-pointer group backdrop-blur-md max-w-[calc(100vw-2rem)]"
        title="Dúvidas? Envie um email para bikeraisupport@gmail.com"
      >
        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-lime-500 flex items-center justify-center text-slate-950 shrink-0 group-hover:scale-110 transition-transform">
          <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
        <div className="flex flex-col text-left pr-0.5">
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-lime-400 leading-none">Suporte Biker AI</span>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 leading-tight">bikeraisupport@gmail.com</span>
        </div>
      </a>

    </div>
  );
}
