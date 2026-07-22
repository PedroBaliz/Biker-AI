import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { jsPDF } from "jspdf";
import confetti from "canvas-confetti";
// @ts-ignore
import cyclingActionImg from "./assets/images/cycling_action_1780860242304.png";
import { UserProfile, ChatMessage, TrainingPlan, UserAccount, Workout, isRestDay } from "./types";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, apiFetch } from "./firebase";
import WorkoutCard from "./components/WorkoutCard";
import ZoneCalculator from "./components/ZoneCalculator";
import { getSimplifiedText } from "./utils/translation";
import LoginScreen from "./components/LoginScreen";
import AccountSettings from "./components/AccountSettings";
import AdminSubscribersPanel from "./components/AdminSubscribersPanel";
import SubscriptionWall from "./components/SubscriptionWall";
import VolumeEvolutionChart from "./components/VolumeEvolutionChart";
import WeeklyCalorieChart from "./components/WeeklyCalorieChart";
import AchievementsDashboard from "./components/AchievementsDashboard";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users,
  ShieldCheck,
  Dumbbell, 
  Bike,
  Sparkles, 
  Calendar, 
  Send, 
  User, 
  Zap, 
  Activity, 
  CheckCircle2, 
  RotateCcw, 
  Heart, 
  ShieldAlert, 
  FileCheck, 
  RefreshCw, 
  TrendingUp, 
  ChevronRight, 
  Clock, 
  ClipboardList, 
  Sliders, 
  HelpCircle,
  LogOut,
  Plus,
  PlusCircle,
  Trash2,
  Trophy,
  Eye,
  EyeOff,
  Download,
  Instagram,
  Smartphone,
  Share,
  X,
  AlertTriangle,
  TrendingDown,
  MessageSquare,
  Lightbulb,
  BookOpen,
  ArrowRight
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
  
  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState<"planilha" | "desempenho" | "zonas">("planilha");
  const [showMyWorkouts, setShowMyWorkouts] = useState(false);
  const [showPseExplanation, setShowPseExplanation] = useState(false);

  // Simple / Technical display mode for workouts
  const [displayMode, setDisplayMode] = useState<"simples" | "tecnico">(() => {
    return (localStorage.getItem("biker_ai_display_mode") as "simples" | "tecnico") || "simples";
  });

  // Feedbacks states
  const [feedbacks, setFeedbacks] = useState<{ id: string; text: string; timestamp: string }[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

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

  // Derived training metrics (excluding rest/off sessions from training counts)
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
    const previousWorkout = plan.workouts[index];
    const isNowCompleted = updatedWorkout.completed && (!previousWorkout || !previousWorkout.completed);

    const updatedWorkouts = [...plan.workouts];
    updatedWorkouts[index] = updatedWorkout;
    const updatedPlan = {
      ...plan,
      workouts: updatedWorkouts
    };
    setPlan(updatedPlan);

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
  }, [plan]);

  const handleDeleteWorkout = useCallback((index: number) => {
    if (!plan) return;
    if (!window.confirm("Deseja realmente remover este treino da sua planilha?")) return;
    const updatedWorkouts = plan.workouts.filter((_, i) => i !== index);
    const updatedPlan = {
      ...plan,
      workouts: updatedWorkouts
    };
    setPlan(updatedPlan);
  }, [plan]);

  const handleExportPDF = useCallback(() => {
    if (!plan) return;
    
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const athleteName = profile.name || "Atleta";
    const levelStr = profile.level ? profile.level.charAt(0).toUpperCase() + profile.level.slice(1) : "Não especificado";
    const ftpStr = profile.ftp ? `${profile.ftp} W` : "Não configurado";
    const weekNum = plan.weekNumber || 1;

    // --- Elegant Color Scheme ---
    const primaryColor = [15, 23, 42]; // Slate-900 / Deep charcoal
    const secondaryColor = [101, 163, 13]; // Lime-600
    const accentColor = [225, 29, 72]; // Rose-600 (Health accent)
    const textColor = [51, 65, 85]; // Slate-700
    const lightBg = [248, 250, 252]; // Slate-50
    const borderSlate = [226, 232, 240]; // Slate-200

    // Simple helpers for layout
    let y = 15;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > 280) {
        doc.addPage();
        y = 15;
        drawFooter();
      }
    };

    const drawHeader = () => {
      // Top bar design
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 25, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("BIKER AI - SEU TREINADOR DE CICLISMO INTELIGENTE", margin, 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(190, 242, 100); // Light lime text
      doc.text("PLANILHA DE TREINAMENTO INDIVIDUALIZADA & SEGURA", margin, 18);

      y = 35;
    };

    const drawFooter = () => {
      const pageCount = doc.internal.pages.length - 1;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Lembre-se sempre: sua saúde é o mais importante!", margin, 287);
      doc.text(`Página ${pageCount}`, pageWidth - margin - 15, 287);
    };

    // Draw initial header
    drawHeader();

    // 1. Athlete Information Box
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3, "FD");

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`ATLETA: ${athleteName.toUpperCase()}`, margin + 5, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(`Nível: ${levelStr}`, margin + 5, y + 13);
    doc.text(`FTP Estimado: ${ftpStr}`, margin + 5, y + 19);

    doc.setFont("helvetica", "bold");
    doc.text(`PLANILHA: SEMANA ${weekNum}`, margin + 110, y + 6);
    doc.setFont("helvetica", "normal");
    const todayStr = new Date().toLocaleDateString("pt-BR");
    doc.text(`Data de Exportação: ${todayStr}`, margin + 110, y + 13);
    doc.text(`Status: Saúde em Primeiro Lugar`, margin + 110, y + 19);

    y += 32;

    // 2. Health & Safety Banner
    doc.setFillColor(255, 241, 242); // Rose-50 light background
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "FD");

    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("SAÚDE EM PRIMEIRO LUGAR", margin + 5, y + 6);

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const safetyMsg = "Lembre-se: a sua saúde é o mais importante! Caso sinta dores fora do comum, tonturas ou cansaço excessivo, interrompa o esforço imediatamente para se preservar.";
    const splitSafety = doc.splitTextToSize(safetyMsg, contentWidth - 10);
    doc.text(splitSafety, margin + 5, y + 11);

    y += 24;

    // 3. General Coach Messages / Observations (if exists)
    if (plan.coachMessage || plan.observations || plan.summary) {
      checkPageBreak(35);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("Mensagem do Treinador", margin, y);
      y += 5;

      // Draw a line
      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + 25, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      
      const message = plan.coachMessage || plan.observations || plan.summary || "Bons treinos para esta semana! Mantenha a constância e respeite as zonas de intensidade.";
      const splitMsg = doc.splitTextToSize(message, contentWidth);
      doc.text(splitMsg, margin, y);
      y += (splitMsg.length * 4) + 6;
    }

    // 4. Workout Sessions List
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Programação de Atividades", margin, y);
    y += 5;

    // Draw secondary line
    doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 25, y);
    y += 7;

    const listWorkouts = plan.workouts || [];

    listWorkouts.forEach((workout) => {
      // Calculate height needed for this workout record
      const descLines = doc.splitTextToSize(`Estrutura: ${workout.structure || workout.goal || ""}`, contentWidth - 20);
      const tipLines = workout.tip ? doc.splitTextToSize(`Dica: ${workout.tip}`, contentWidth - 20) : [];
      const recordHeight = 22 + (descLines.length * 4) + (tipLines.length > 0 ? (tipLines.length * 4) + 2 : 0) + 4;

      checkPageBreak(recordHeight);

      // Card Container for Workout
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
      doc.roundedRect(margin, y, contentWidth, recordHeight - 4, 2, 2, "FD");

      // Set vertical pointer for inside the card content
      let insideY = y + 6;

      // Header of card (e.g. Segunda-Feira | Treino Regenerativo)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${workout.day.toUpperCase()} | ${workout.type}`, margin + 5, insideY);

      // Duration badge / Zone Badge
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Duração: ${workout.duration} min`, margin + 110, insideY);
      doc.text(`Zona Alvo: ${workout.targetZone || "Livre"}`, margin + 145, insideY);

      insideY += 6;

      // Draw a thin separator inside card
      doc.setDrawColor(241, 245, 249);
      doc.line(margin + 4, insideY, margin + contentWidth - 4, insideY);
      insideY += 5;

      // Goal & Structure Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Objetivo:", margin + 5, insideY);
      doc.setFont("helvetica", "normal");
      doc.text(workout.goal || "Desenvolvimento de fôlego e técnica.", margin + 18, insideY);
      insideY += 5;

      // Structure
      doc.setFont("helvetica", "bold");
      doc.text("Estrutura:", margin + 5, insideY);
      doc.setFont("helvetica", "normal");
      doc.text(descLines, margin + 18, insideY);
      insideY += (descLines.length * 4) + 1;

      // Extra Coach TIP if exists
      if (workout.tip) {
        insideY += 2;
        doc.setFont("helvetica", "italic");
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(tipLines, margin + 5, insideY);
        insideY += (tipLines.length * 4);
      }

      // Check if Completed to display a cute checked badge
      if (workout.completed) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text("[ CONCLUÍDO ]", margin + 148, y + 11);
      }

      y += recordHeight;
    });

    // Draw footers on all pages
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawFooter();
    }

    doc.save(`Planilha_Ciclismo_Semana_${weekNum}_${athleteName.replace(/\s+/g, "_")}.pdf`);
  }, [plan, profile]);

  // Weekly Evolution States
  const [isGeneratingNextWeek, setIsGeneratingNextWeek] = useState(false);
  const [showNextWeekForm, setShowNextWeekForm] = useState(false);
  const [subjFeedback, setSubjFeedback] = useState<"otimo" | "moderado" | "muito_cansado">("otimo");
  const [textFeedback, setTextFeedback] = useState("");

  const handleGenerateNextWeek = async () => {
    if (!plan) return;
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

      // Adcciona mensagem ao histórico do chat do treinador
      setChatHistory(prev => {
        const history = [...prev, {
          id: `gen-week-${Date.now()}`,
          sender: "treinador",
          text: `**Sua Semana ${nextWeek} de Treinos Iniciou!**\n\n${data.coachMessage || "Preparei estímulos novos na planilha baseando-me nas suas sensações, cargas anteriores e nas conclusões!"}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }];
        if (data.geminiError) {
          history.push({
            id: `system-warn-${Date.now()}`,
            sender: "treinador",
            text: `**Modo de Segurança Ativado (Treinador Local)**\n\nSua nova semana foi evoluída utilizando as regras de periodização embarcada para progressão de carga (supercompensação clássica) por conta de um erro técnico na IA.\n\n**Causa do erro:** \`${data.geminiError}\`\n\n*Para obter comentários analíticos profundos de IA integrada, configure uma chave de acesso GEMINI_API_KEY válida em seu painel.*`,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          });
        }
        return history;
      });

    } catch (err: any) {
      alert("Erro detalhado ao evoluir a planilha:\n\n" + err.message + "\n\nPor favor, tente novamente ou verifique se as credenciais do servidor estão corretas.");
    } finally {
      setIsGeneratingNextWeek(false);
    }
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const workoutsSectionRef = useRef<HTMLDivElement>(null);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAdminPasswordPrompt, setShowAdminPasswordPrompt] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState("");

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
        let passwordToPreserve = "123456";
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          mergedUser = { ...sessionData.user };
          passwordToPreserve = sessionData.user.password || passwordToPreserve;
        }

        if (profileVal) mergedUser.profile = { ...profileVal, ...mergedUser.profile };
        if (planVal && !mergedUser.plan) mergedUser.plan = planVal;
        if (chatVal && (!mergedUser.chatHistory || mergedUser.chatHistory.length <= 1)) mergedUser.chatHistory = chatVal;

        // Save to Firebase Firestore via server
        await apiFetch("/api/auth/save-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, userAccount: mergedUser, password: passwordToPreserve })
        });

        console.log("[Migration] Migration to Firebase complete. Removing localStorage keys.");
      } catch (e) {
        console.error("[Migration] Error transferring data to Firebase:", e);
      } finally {
        // Clear all legacy storage keys to guarantee they are no longer in localStorage
        localStorage.removeItem("athlete_profile");
        localStorage.removeItem("athlete_training_plan");
        localStorage.removeItem("coach_chat_history");
        localStorage.removeItem("current_coach_user");
        localStorage.removeItem("coach_users");
        localStorage.removeItem("athlete_plan_history");
      }
    }
  };

  // Firebase Auth listener to automatically load/sync session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        const emailKey = firebaseUser.email.toLowerCase();
        try {
          // Trigger localStorage migration to Firestore if legacy data exists
          await migrateLocalStorageToFirebase(emailKey);

          const response = await apiFetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailKey })
          });
          if (response.ok) {
            const data = await response.json();
            if (data.user) {
              setCurrentUser(data.user);
              setProfile(data.user.profile);
              setChatHistory(data.user.chatHistory || []);
              setPlan(data.user.plan || null);
              setFeedbacks(data.user.feedbacks || []);
            }
          }
        } catch (err) {
          console.error("Erro ao sincronizar sessão do Firebase:", err);
        }
      } else {
        setCurrentUser(null);
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

  // Ensure page resets scroll position to top and cleans up URL hashes on authentication or subscription state change
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.scrollTo(0, 0);
  }, [currentUser?.email, profile?.subscriptionStatus]);

  // Real-time synchronization back to central server
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const updatedUser: UserAccount = {
      email: currentUser.email,
      profile,
      chatHistory,
      plan,
      feedbacks
    };

    const emailKey = currentUser.email.toLowerCase();
    const fallbackPassword = emailKey === "pedro.bramos@sempreceub.com" ? "Pedro23072007" : "123456";
    const preservedPassword = currentUser.password || fallbackPassword;

    // Update React state safely if they are deeply different to keep other views unified
    if (
      JSON.stringify(currentUser.profile) !== JSON.stringify(profile) ||
      JSON.stringify(currentUser.chatHistory) !== JSON.stringify(chatHistory) ||
      JSON.stringify(currentUser.plan) !== JSON.stringify(plan) ||
      JSON.stringify(currentUser.feedbacks) !== JSON.stringify(feedbacks)
    ) {
      setCurrentUser({
        ...updatedUser,
        password: preservedPassword
      });
    }

    // Async background sync with Node.js server database
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
  }, [profile, chatHistory, plan, feedbacks, currentUser?.email]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [chatHistory, isTyping]);

  // Handle message sending for onboarding or custom chat
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "atleta",
      text: inputMessage,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMsg]);
    const messageToSend = inputMessage;
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

      setChatHistory(prev => {
        const history = [...prev, coachMsg];
        if (data && data.geminiError) {
          history.push({
            id: `system-warn-${Date.now()}`,
            sender: "treinador",
            text: `**Aviso de Chamada Off-line**\n\nO coach respondeu usando respostas dinâmicas embarcadas de salvaguarda, pois a busca avançada por IA personalizada falhou.\n\n**Causa do erro:** \`${data.geminiError}\``,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          });
        }
        return history;
      });

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
      const response = await customFetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile })
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
      setProfile(prev => ({ ...prev, onboardingStep: 10 }));
      
      // Select appropriate tab
      setActiveTab("planilha");

      // Add coach announcement to chat
      setChatHistory(prev => {
        const history = [...prev, {
          id: `gen-${Date.now()}`,
          sender: "treinador",
          text: `**Planilha Semanal Gerada com Sucesso!**\n\n${profile.name || "Atleta"}, montei uma planilha de treinos sob medida baseada no seu nível (**${profile.level}**) e seu objetivo de **${profile.goal}**. Confira a aba de planilha para ver os passos e dicas de cada dia! Let's ride!`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }];
        if (data.geminiError) {
          history.push({
            id: `system-warn-${Date.now()}`,
            sender: "treinador",
            text: `**Modo de Segurança Ativado (Treinador Local)**\n\nSeus treinos foram calculados utilizando nosso motor fisiológico embarcado com base profissional na grade dos 80/20, pois a chamada para a inteligência de IA personalizada retornou um erro.\n\n**Causa do erro:** \`${data.geminiError}\`\n\n*Geralmente isso ocorre por uma chave do Gemini que expirou ou foi bloqueada pelo Google como vazada (como a chave de demonstração padrão do projeto). Para utilizar a inteligência de IA personalizada completa, atualize a chave **GEMINI_API_KEY** no seu painel de Segredos/Configurações.*`,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          });
        }
        return history;
      });

    } catch (err: any) {
      alert("Erro detalhado ao gerar a planilha:\n\n" + err.message + "\n\nPor favor, tente novamente ou verifique se as credenciais do servidor estão corretas.");
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
    setChatHistory(user.chatHistory);
    setPlan(user.plan);
    setFeedbacks(user.feedbacks || []);
    setShowAccountSettings(false);
  };

  // Handle updating athlete's security login info or profile name
  const handleUpdateAccount = (updatedUser: UserAccount, newPassword?: string): boolean => {
    if (!currentUser) return false;

    const currentEmailKey = currentUser.email.toLowerCase();
    const fallbackPassword = currentEmailKey === "pedro.bramos@sempreceub.com" ? "Pedro23072007" : "123455";
    const passwordToStore = newPassword || currentUser.password || fallbackPassword;

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

          <div className="flex items-center justify-end gap-1.5 sm:gap-2 animate-fadeInUp shrink-0">
            {currentUser && (profile.subscriptionStatus !== "expired" && profile.subscriptionStatus !== "pending_payment" || profile.role === "coach") && (
              <button 
                onClick={() => {
                  setShowAccountSettings(!showAccountSettings);
                  setShowAdminPanel(false);
                }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl border text-[11px] sm:text-xs font-bold font-heading uppercase tracking-wider transition-all cursor-pointer ${
                  showAccountSettings 
                    ? "bg-lime-400 text-slate-950 border-lime-400 hover:bg-lime-350" 
                    : "border-slate-800 bg-slate-800 text-lime-400 hover:bg-slate-750"
                }`}
                title="Sua Conta e Dados de Acesso"
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[65px] xs:max-w-[90px] sm:max-w-[130px] truncate">
                  {profile.name || currentUser.profile.name || "Atleta"}
                </span>
              </button>
            )}

            {currentUser && (
              <button 
                onClick={handleSignOut} 
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-[11px] sm:text-xs text-slate-300 font-bold font-heading uppercase tracking-wider transition-all cursor-pointer"
                title="Sair da conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Sair</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Global Error Banner */}
      {globalError && (
        <div id="api-error-alert" className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-4 animate-fadeInUp">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 shadow-lg text-slate-900 relative">
            <div className="flex gap-4 items-start">
              <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-md shrink-0">
                <ShieldAlert className="w-5 h-5 shrink-0" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-heading font-extrabold text-sm sm:text-base text-rose-900 flex items-center gap-2">
                    Erro de API Detectado (Código {globalError.status || "Conexão"})
                  </h3>
                  <span className="text-[10px] font-mono uppercase tracking-widest bg-rose-100 text-rose-800 px-2.5 py-1 rounded border border-rose-200 font-bold self-start sm:self-center">
                    {globalError.method} {globalError.url.split('?')[0]}
                  </span>
                </div>
                
                <p className="text-xs text-rose-800 font-sans font-semibold">
                  {globalError.message}
                </p>

                {/* Diagnostics and helpful tips based on status code */}
                <div className="mt-3 pt-3 border-t border-rose-200/50 space-y-1 text-slate-700 text-xs font-sans">
                  <div className="font-semibold text-rose-900 mb-1">Guia de Diagnóstico:</div>
                  {globalError.status === 404 ? (
                    <p className="text-rose-800 leading-relaxed">
                      O endpoint chamado não foi encontrado (404). Isso normalmente ocorre por uma configuração incorreta de rotas no servidor ou falta de redirecionamento no <code className="font-mono bg-rose-100/80 px-1 py-0.5 rounded text-[11px] text-rose-900">vercel.json</code>. Certifique-se de que o backend está respondendo nas rotas correspondentes e que o proxy de reescrita está apontando corretamente.
                    </p>
                  ) : globalError.status === 500 ? (
                    <div className="text-rose-800 space-y-1 leading-relaxed">
                      <p>O servidor backend falhou internamente ao processar o seu pedido (500). Causas comuns mais prováveis:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Falta da chave de acesso da inteligência artificial (<code className="font-mono bg-rose-100/80 px-1 py-0.5 rounded text-[11px] text-rose-900">GEMINI_API_KEY</code>) ou valor inválido/expirado nas variáveis de ambiente.</li>
                        <li>Verifique se o seu arquivo local de produção ou desenvolvimento <code className="font-mono bg-rose-100/80 px-1 py-0.5 rounded text-[11px] text-rose-900">.env</code> possui a variável declarada exatamente na raiz.</li>
                        <li>Configuração de rede ou problemas transitórios de banco de dados e arquivos locais.</li>
                      </ul>
                    </div>
                  ) : (
                    <p className="text-rose-800 leading-relaxed">
                      Não foi possível estabelecer contato com o servidor (Status 0). Verifique se o servidor de desenvolvimento backend está devidamente iniciado e rodando, ou se há bloqueios de CORS por conta de acessos via iframes.
                    </p>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setGlobalError(null)}
                    className="px-4 py-2 bg-rose-900/10 hover:bg-rose-900/20 text-rose-950 font-heading text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Fechar Alerta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Body */}
      {!currentUser ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (profile.subscriptionStatus === "expired" || profile.subscriptionStatus === "pending_payment") && profile.role !== "coach" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col gap-8">
          <SubscriptionWall 
            userEmail={currentUser.email}
            userName={profile.name || currentUser.profile.name || "Atleta"}
            currentStatus={profile.subscriptionStatus}
            onActivated={(updatedProfile) => {
              setProfile(updatedProfile);
              if (currentUser) {
                const refreshed = {
                  ...currentUser,
                  profile: updatedProfile
                };
                setCurrentUser(refreshed);
              }
            }}
          />
        </main>
      ) : showAccountSettings ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col gap-8">
          <AccountSettings 
            currentUser={currentUser} 
            onUpdateAccount={handleUpdateAccount} 
            onClose={() => setShowAccountSettings(false)} 
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
        
        {/* Scenario A: Onboarding Conversation Screen */}
        <AnimatePresence mode="wait">
          {!plan ? (
            <motion.div 
              key="onboarding-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              
              {/* Co-Onboarding Step Indicator / Banner */}
              <div className="lg:col-span-12 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-5 rounded-2xl text-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-lime-400 animate-pulse" />
                    <h2 className="font-heading font-extrabold text-base sm:text-lg">Montando o Seu Painel de Treino</h2>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl font-sans">
                    Responda às perguntas amigáveis do Treinador AI no chat abaixo para ajustar seus batimentos confortáveis, força de pedalada e zonas de ritmo.
                  </p>
                </div>
                
                {/* Visual Progress percentage */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Respostas Coletadas</div>
                    <div className="text-sm font-mono font-bold text-lime-400">{getAnswersCompletedCount(profile)}/10 Preenchidas</div>
                  </div>
                  <div className="w-24 h-2 rounded-full bg-slate-800 border border-slate-750 overflow-hidden">
                    <div className="bg-lime-500 h-full transition-all duration-500" style={{ width: `${getProgressPercentage()}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Chat Column (Left 7 Columns on Big screens) */}
              <div className="lg:col-span-7 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[580px]">
                {/* Chat Header */}
                <div className="bg-slate-900 text-white px-5 py-4 flex items-center gap-3 border-b border-slate-800 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-lime-500 flex items-center justify-center font-bold text-slate-950 font-heading shrink-0 shadow-sm relative">
                    AI
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm">Treinador de Ciclismo AI</h3>
                    <p className="text-[10px] text-slate-300 flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Especialista em Ciclismo & Cargas
                    </p>
                  </div>
                </div>

                {/* Messages Panel */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
                  {chatHistory.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 max-w-[85%] ${msg.sender === "atleta" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                    >
                      {/* Avatar icon */}
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold leading-none ${
                        msg.sender === "atleta" ? "bg-slate-200 text-slate-700" : "bg-slate-900 text-lime-400"
                      }`}>
                        {msg.sender === "atleta" ? <User className="w-4 h-4" /> : "TR"}
                      </div>
                      
                      <div className="space-y-1">
                        <div className={`rounded-2xl p-3 text-xs leading-relaxed font-sans shadow-xs whitespace-pre-wrap ${
                          msg.sender === "atleta" 
                            ? "bg-slate-900 text-white rounded-tr-none" 
                            : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                        }`}>
                          {msg.text}
                        </div>
                        <span className={`text-[9px] text-slate-400 font-mono tracking-wider block ${
                          msg.sender === "atleta" ? "text-right" : "text-left"
                        }`}>
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex gap-3 mr-auto">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-lime-400 flex items-center justify-center text-xs font-bold shrink-0">
                        TR
                      </div>
                      <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Form */}
                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 shrink-0 flex gap-2">
                  <input 
                    type="text" 
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isTyping}
                    placeholder="Responda seu treinador aqui ou pergunte algo..."
                    className="flex-1 bg-slate-100 hover:bg-slate-150 focus:bg-white text-xs text-slate-800 rounded-xl px-4 py-3 outline-hidden border border-slate-100 focus:border-slate-300 focus:ring-1 focus:ring-slate-300 font-sans transition-all disabled:opacity-50"
                  />
                  <button 
                    type="submit"
                    disabled={!inputMessage.trim() || isTyping}
                    className="bg-slate-900 hover:bg-slate-800 text-lime-400 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl px-4 flex items-center justify-center font-bold tracking-wide transition-all disabled:cursor-not-allowed shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Ficha Clinica Live-Updating Dashboard Column (Right 5 Columns) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Clinica Status Sheet */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-slate-800" />
                      <h3 className="font-heading font-extrabold text-sm text-slate-800">Ficha Técnica do Atleta</h3>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-mono font-bold uppercase py-0.5 px-2 rounded-full">LIVE PREVIEW</span>
                  </div>

                  {/* Manual Override inputs for profile to guarantee flexible customization */}
                  <div className="text-[11px] text-slate-500 font-sans bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <strong>Controle de Autonomia:</strong> O treinador atualiza esses campos de forma inteligente com base no chat. Se encontrar algum erro, você também pode digitar ou corrigir no painel abaixo!
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    {/* Nome */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider flex items-center justify-between text-slate-500">
                        <span>Nome do Atleta</span>
                        {!profile.name && <span className="text-[9px] text-rose-500 font-extrabold lowercase">obrigatório</span>}
                      </label>
                      <input 
                        type="text" 
                        value={profile.name}
                        onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Digite seu nome!"
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all outline-hidden ${
                          !profile.name 
                            ? 'bg-rose-50/20 border-2 border-rose-300 text-rose-800 placeholder:text-rose-450 focus:bg-white' 
                            : 'bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white text-slate-700'
                        }`}
                      />
                    </div>

                    {/* Nivel */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider flex items-center justify-between text-slate-500">
                        <span>Tempo Pedal (Nível)</span>
                        {!profile.level && <span className="text-[9px] text-rose-500 font-extrabold lowercase">obrigatório</span>}
                      </label>
                      <select 
                        value={profile.level}
                        onChange={(e: any) => setProfile(prev => ({ ...prev, level: e.target.value }))}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all outline-hidden ${
                          !profile.level 
                            ? 'bg-rose-50/20 border-2 border-rose-300 text-rose-800 focus:bg-white' 
                            : 'bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white text-slate-700'
                        }`}
                      >
                        <option value="">Precisa selecionar!</option>
                        <option value="iniciante">Iniciante</option>
                        <option value="intermediário">Intermediário</option>
                        <option value="avançado">Avançado</option>
                      </select>
                    </div>

                    {/* Objetivo */}
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider flex items-center justify-between text-slate-500">
                        <span>Objetivo Principal do Treino</span>
                        {!profile.goal && <span className="text-[9px] text-rose-500 font-extrabold lowercase">obrigatório</span>}
                      </label>
                      <select 
                        value={profile.goal}
                        onChange={(e: any) => setProfile(prev => ({ ...prev, goal: e.target.value }))}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all outline-hidden ${
                          !profile.goal 
                            ? 'bg-rose-50/20 border-2 border-rose-300 text-rose-800 focus:bg-white' 
                            : 'bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white text-slate-700'
                        }`}
                      >
                        <option value="">Precisa selecionar!</option>
                        <option value="perder peso">Perder Peso</option>
                        <option value="melhorar condicionamento">Melhorar Condicionamento</option>
                        <option value="completar um evento">Completar Evento/Prova</option>
                        <option value="competir">Competir Profissionalmente</option>
                      </select>
                    </div>

                    {/* Frequencia de Semana */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider flex items-center justify-between text-slate-500">
                        <span>Treinos Semanais (Dias)</span>
                        {!profile.daysPerWeek && <span className="text-[9px] text-rose-500 font-extrabold lowercase">obrigatório</span>}
                      </label>
                      <input 
                        type="number" 
                        value={profile.daysPerWeek || ""}
                        onChange={(e) => setProfile(prev => ({ ...prev, daysPerWeek: e.target.value ? parseInt(e.target.value) : null }))}
                        placeholder="Informe quantos dias!"
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all outline-hidden ${
                          !profile.daysPerWeek 
                            ? 'bg-rose-50/20 border-2 border-rose-300 text-rose-800 placeholder:text-rose-450 focus:bg-white' 
                            : 'bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white text-slate-700'
                        }`}
                      />
                    </div>

                    {/* Tempo de cada sessão */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider flex items-center justify-between text-slate-500">
                        <span>Minutos por Treino</span>
                        {!profile.durationPerSession && <span className="text-[9px] text-rose-500 font-extrabold lowercase">obrigatório</span>}
                      </label>
                      <input 
                        type="number" 
                        value={profile.durationPerSession || ""}
                        onChange={(e) => setProfile(prev => ({ ...prev, durationPerSession: e.target.value ? parseInt(e.target.value) : null }))}
                        placeholder="Informe os minutos!"
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all outline-hidden ${
                          !profile.durationPerSession 
                            ? 'bg-rose-50/20 border-2 border-rose-300 text-rose-800 placeholder:text-rose-450 focus:bg-white' 
                            : 'bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white text-slate-700'
                        }`}
                      />
                    </div>

                    {/* Prova com data marcada */}
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Evento / Prova Alvo</label>
                      <input 
                        type="text" 
                        value={profile.eventDate}
                        onChange={(e) => setProfile(prev => ({ ...prev, eventDate: e.target.value }))}
                        placeholder="Não informado (Opcional)"
                        className="bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 outline-hidden transition-all"
                      />
                    </div>

                    {/* Potenciômetro & FTP com explicação simples */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Medidor de Força (Seu FTP em Watts)</label>
                      <div className="flex gap-2">
                        <select 
                          value={profile.hasPowerMeter === null ? "" : profile.hasPowerMeter ? "yes" : "no"}
                          onChange={(e) => setProfile(prev => ({ ...prev, hasPowerMeter: e.target.value === "yes" ? true : e.target.value === "no" ? false : null }))}
                          className="bg-slate-50 border border-slate-100 px-2 py-2 rounded-lg text-xs font-semibold text-slate-700 select-none shrink-0"
                        >
                          <option value="">Não tenho</option>
                          <option value="yes">Sim tenho</option>
                        </select>
                        <input 
                          type="number" 
                          value={profile.ftp || ""}
                          disabled={!profile.hasPowerMeter}
                          onChange={(e) => setProfile(prev => ({ ...prev, ftp: e.target.value ? parseInt(e.target.value) : null }))}
                          placeholder="Ex: 200 Watts (sua força base por 1h)"
                          className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 outline-hidden disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Frequência Cardíaca & FCmax bpm */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Monitor Cardíaco (FCmáx do peito/relógio)</label>
                      <div className="flex gap-2">
                        <select 
                          value={profile.hasHeartRate === null ? "" : profile.hasHeartRate ? "yes" : "no"}
                          onChange={(e) => setProfile(prev => ({ ...prev, hasHeartRate: e.target.value === "yes" ? true : e.target.value === "no" ? false : null }))}
                          className="bg-slate-50 border border-slate-100 px-2 py-2 rounded-lg text-xs font-semibold text-slate-700 select-none shrink-0"
                        >
                          <option value="">Não tenho</option>
                          <option value="yes">Sim tenho</option>
                        </select>
                        <input 
                          type="number" 
                          value={profile.maxHeartRate || ""}
                          disabled={!profile.hasHeartRate}
                          onChange={(e) => setProfile(prev => ({ ...prev, maxHeartRate: e.target.value ? parseInt(e.target.value) : null }))}
                          placeholder="Ex: 185 bpm (batimentos máximos por minuto)"
                          className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 outline-hidden disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Limitacoes fisicas */}
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Dores, Lesões ou Limitações Físicas</label>
                      <textarea 
                        rows={1}
                        value={profile.limitations}
                        onChange={(e) => setProfile(prev => ({ ...prev, limitations: e.target.value }))}
                        placeholder="Nenhuma cadastrada"
                        className="bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 outline-hidden transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Submission triggers */}
                  <div className="pt-4 border-t border-slate-50 flex flex-col gap-2.5">
                    {/* Validation errors warning if clicked too early */}
                    {(!profile.name || !profile.level || !profile.goal || !profile.daysPerWeek) && (
                      <span className="text-[10px] text-amber-600 flex items-center gap-1 font-sans">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Restam campos fundamentais para preencher antes do plano.
                      </span>
                    )}
                    
                    <button 
                      onClick={generateTrainingPlan}
                      disabled={isGeneratingPlan || !profile.name || !profile.level || !profile.goal || !profile.daysPerWeek}
                      className="w-full bg-slate-900 text-lime-400 border border-slate-800 rounded-xl py-3 px-4 font-heading font-bold text-sm hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 transition-all flex items-center justify-center gap-2 shadow-sm disabled:cursor-not-allowed"
                    >
                      {isGeneratingPlan ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Calculando e Gerando Sua Planilha Semanal...</span>
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-4 h-4 text-lime-400" />
                          <span>Confirmar Perfil e Gerar Planilha Semanal</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Visual Cyclist Presentation Card */}
                <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
                  <div className="h-44 bg-slate-950 overflow-hidden relative">
                    <img 
                      src={cyclingActionImg} 
                      alt="Atleta em Movimento" 
                      className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                  </div>
                  <div className="p-5 space-y-2">
                    <h4 className="font-heading font-extrabold text-sm text-lime-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Bike className="w-4 h-4 text-lime-400" /> Seu Plano de Treino
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      Calculamos o volume e a intensidade dos treinos com base nas suas respostas, tempo disponível e nível geral, ajudando você a ganhar fôlego e evoluir sem risco de lesões.
                    </p>
                  </div>
                </div>
              </div>

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
                    {profile.name.slice(0, 2).toUpperCase()}
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                  </div>
                  <div>
                    <h2 className="font-heading font-black text-slate-800 text-lg leading-tight">Ciclista: {profile.name}</h2>
                    <p className="text-xs text-slate-405 leading-relaxed font-sans mt-1 flex flex-wrap items-center gap-2 font-medium">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">{profile.level}</span>
                      <span className="text-slate-300">•</span>
                      <span>Foco: <strong className="text-slate-850">{profile.goal}</strong></span>

                    </p>
                  </div>
                </div>

                {/* Tab select Buttons with Sporty design */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl w-full md:w-auto border border-slate-200/60 shadow-inner">
                  <button 
                    onClick={() => setActiveTab("planilha")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-4 text-[11px] sm:text-xs font-black leading-none font-heading uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === "planilha" ? "bg-slate-900 text-lime-400 shadow-sm" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span className="truncate">Planilha</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab("desempenho")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-4 text-[11px] sm:text-xs font-black leading-none font-heading uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === "desempenho" ? "bg-slate-900 text-lime-400 shadow-sm" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <Trophy className="w-4 h-4 shrink-0" />
                    <span className="truncate">Evolução</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab("zonas")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-4 text-[11px] sm:text-xs font-black leading-none font-heading uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === "zonas" ? "bg-slate-900 text-lime-400 shadow-sm" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <Sliders className="w-4 h-4 shrink-0" />
                    <span className="truncate">Meu Guia</span>
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
                            Passo Essencial 🚀
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
                    <div id="plan-block-summary" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Summary text */}
                      <motion.div 
                        initial={{ opacity: 0, y: 25 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="bg-slate-900 text-white p-6 rounded-2xl md:col-span-2 shadow-xs border border-slate-800 flex flex-col justify-between gap-4"
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

                      {/* Observations metrics boxes */}
                      <motion.div 
                        initial={{ opacity: 0, y: 25 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-3 flex flex-col justify-between"
                      >
                        <div>
                          <span className="text-[9px] font-bold font-heading text-slate-400 uppercase tracking-widest font-sans">Ciclo de Evolução</span>
                          <h4 className="font-heading font-extrabold text-emerald-600 text-base mt-0.5">Semana {plan?.weekNumber || 1}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-50 my-1 font-mono text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">VOLUME TOTAL</span>
                            <span className="text-sm font-bold text-slate-700">{profile.daysPerWeek} treinos / sem</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">DIFICULDADE DA SEMANA</span>
                            <span className="text-sm font-bold text-amber-550 flex items-center gap-0.5">
                              Nível Moderado
                            </span>
                          </div>
                        </div>
                        <div className="text-[10.5px] text-slate-550 leading-normal font-sans">
                          Siga a estrutura e os tempos propostos de cada treino para melhorar sua resistência continuamente.
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
                                  onClick={() => setShowNextWeekForm(prev => !prev)}
                                  className={`px-4 py-2 rounded-xl text-xs font-black font-heading flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                                    showNextWeekForm 
                                      ? "bg-rose-600 hover:bg-rose-700 text-white" 
                                      : "bg-gradient-to-r from-lime-500 to-emerald-500 text-slate-950 hover:shadow-md hover:brightness-105 active:scale-95"
                                  }`}
                                >
                                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                  <span>{showNextWeekForm ? "Fechar Configuração" : "Evoluir de Semana"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleExportPDF}
                                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold font-heading flex items-center gap-1.5 transition-all shadow-xs cursor-pointer focus:outline-hidden"
                                >
                                  <Download className="w-3.5 h-3.5" />
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
                                              ? "border-emerald-500 bg-emerald-50/50 text-slate-800 font-medium ring-2 ring-emerald-500/10"
                                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                          }`}
                                        >
                                          <Dumbbell className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                                          <div>
                                            <p className="font-bold text-emerald-800 text-[11px] uppercase tracking-wide">Excelente / Forte</p>
                                            <p className="text-[10px] text-slate-550 leading-tight mt-0.5">Me senti muito forte, pernas recuperadas e com energia de sobra.</p>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => setSubjFeedback("moderado")}
                                          className={`text-left p-3.5 rounded-xl border text-xs font-sans transition-all flex items-start gap-2.5 cursor-pointer ${
                                            subjFeedback === "moderado"
                                              ? "border-amber-500 bg-amber-50/40 text-slate-800 font-medium ring-2 ring-amber-500/10"
                                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                          }`}
                                        >
                                          <CheckCircle2 className="w-4 h-4 text-amber-500 mt-1 shrink-0" />
                                          <div>
                                            <p className="font-bold text-amber-800 text-[11px] uppercase tracking-wide">Equilibrado / Normal</p>
                                            <p className="text-[10px] text-slate-550 leading-tight mt-0.5">Cansaço normal esperado das sessões, mas completei bem.</p>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => setSubjFeedback("muito_cansado")}
                                          className={`text-left p-3.5 rounded-xl border text-xs font-sans transition-all flex items-start gap-2.5 cursor-pointer ${
                                            subjFeedback === "muito_cansado"
                                              ? "border-rose-500 bg-rose-50/30 text-slate-800 font-medium ring-2 ring-rose-500/10"
                                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                          }`}
                                        >
                                          <AlertTriangle className="w-4 h-4 text-rose-500 mt-1 shrink-0" />
                                          <div>
                                            <p className="font-bold text-rose-800 text-[11px] uppercase tracking-wide">Exausto / Dores</p>
                                            <p className="text-[10px] text-slate-550 leading-tight mt-0.5">Sinto dores articulares persistentes, exaustão física ou queimação pesada.</p>
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
                                        className="w-full bg-white border border-slate-200 focus:border-lime-550 focus:ring-1 focus:ring-lime-550 rounded-xl p-3 text-xs text-slate-800 outline-hidden font-sans placeholder:text-slate-400 leading-normal"
                                      />
                                    </div>

                                    {/* Progression rule visual tips based on stats */}
                                    <div className="bg-slate-200/45 p-3 rounded-xl text-[11px] text-slate-625 flex items-start gap-2.5 border border-slate-250/50">
                                      <TrendingDown className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                                      <p className="leading-relaxed font-sans">
                                        {pctW >= 75 ? (
                                          <span>Análise Fisiológica: Você concluiu <strong>{pctW}% dos treinos</strong> propostos! Atleta exemplar! Iremos propor um microciclo de <strong>Progressão de Cargas e Supercompensação Aeróbica</strong> para a Semana {(plan.weekNumber || 1) + 1}.</span>
                                        ) : (
                                          <span>Análise Fisiológica: Como você realizou <strong>{pctW}% das atividades</strong> (abaixo do limiar de consistência de 75%), priorizaremos um ciclo de <strong>Estabilização, Adaptação ou Descanso Ativo (Deload)</strong> na Semana {(plan.weekNumber || 1) + 1} para consolidar seus ganhos com saúde.</span>
                                        )}
                                      </p>
                                    </div>

                                    {/* Action button */}
                                    <div className="flex justify-end pt-2 border-t border-slate-200/50">
                                      <button
                                        type="button"
                                        disabled={isGeneratingNextWeek}
                                        onClick={handleGenerateNextWeek}
                                        className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-lime-450 hover:text-lime-400 rounded-xl text-xs font-black font-heading tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-98"
                                      >
                                        {isGeneratingNextWeek ? (
                                          <>
                                            <RefreshCw className="w-4 h-4 animate-spin text-lime-400" />
                                            <span>Montando Nova Planilha e Cargas...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="w-4 h-4 text-lime-450" />
                                            <span>Salvar Progresso & Evoluir p/ Semana {(plan.weekNumber || 1) + 1}</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Progress bar and metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                              <div className="md:col-span-3 space-y-2">
                                <div className="flex justify-between text-xs font-sans">
                                  <span className="text-slate-500 font-medium">Progresso de Conclusão Semanal</span>
                                  <span className="font-mono font-bold text-slate-800">{completedW} de {totalW} treinos concluidos ({pctW}%)</span>
                                </div>
                                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner relative">
                                  <div 
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                                    style={{ width: `${pctW}%` }}
                                  />
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between text-center md:col-span-1 shadow-2xs">
                                <div className="w-full">
                                  <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold tracking-wider">Rendimento</span>
                                  <span className="text-xl font-heading font-black text-emerald-600">
                                    {pctW === 100 ? "100%" : pctW >= 75 ? "Excelente" : pctW >= 50 ? "Bom" : pctW > 0 ? "Em progresso" : "Falta começar"}
                                  </span>
                                </div>
                              </div>
                            </div>
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
                              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                              <h3 className="font-heading font-black text-slate-800 text-sm uppercase tracking-wider">
                                Sessões de Treino Semanais
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
                          <div id="weekly-workouts-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pt-2">
                            {plan?.workouts.map((wk, index) => (
                              <motion.div
                                key={`${wk.day}-${index}`}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-30px" }}
                                transition={{ duration: 0.45, delay: (index % 4) * 0.08 }}
                                className="w-full flex"
                              >
                                <WorkoutCard 
                                  workout={wk} 
                                  profile={profile}
                                  allWorkouts={plan?.workouts || []}
                                  onUpdate={(updatedWorkout) => handleUpdateWorkout(index, updatedWorkout)}
                                  onDelete={() => handleDeleteWorkout(index)}
                                  isSimpleMode={displayMode === "simples"}
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
                    <AchievementsDashboard profile={profile} plan={plan} />
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
              </AnimatePresence>

            </motion.div>
          )}
        </AnimatePresence>

      </main>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 text-xs font-sans border-t border-slate-900 py-8 px-4 sm:px-6 lg:px-8 mt-12 pb-24 sm:pb-12 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 rounded-lg text-lime-400 border border-slate-800">
              <Bike className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-white text-xs">&copy; 2026 Biker AI. Todos os direitos reservados.</span>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-400">
            <span>Treino Equilibrado</span>
            <span className="text-slate-800">•</span>
            <span>Controle de Esforço</span>
            <span className="text-slate-800">•</span>
            <span>Zonas de Intensidade</span>
          </div>

          <a 
            href="https://www.instagram.com/biker_ai_app?igsh=MTl1ZnptN3ZjbzBhYg=="
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Instagram className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span>Suporte Direct @biker_ai_app</span>
          </a>
        </div>
      </footer>

      {/* Install Instruction Guide Overlay Modal for main screen */}
      <AnimatePresence>
        {showInstallGuide && (
          <div id="main-install-guide-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md text-white font-sans">
            <motion.div
              id="main-install-guide-modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 relative text-left"
            >
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-950/40 hover:bg-slate-850 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="p-2.5 bg-lime-500/15 border border-lime-500/30 rounded-2xl text-lime-400">
                  <Smartphone className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm uppercase tracking-wide">
                    Como Instalar o Biker AI
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    Adicione à tela inicial como um aplicativo nativo
                  </p>
                </div>
              </div>

              <div className="py-4 space-y-4">
                
                {/* iOS Instructions */}
                <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-850/80 space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded-md text-[9px] font-bold tracking-wider uppercase font-heading">
                    No iPhone (Safari / iOS)
                  </span>
                  <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed pl-1 font-medium">
                    <li>
                      Toque no botão de <span className="inline-flex items-center gap-1 px-1 py-0.5 bg-slate-850 rounded text-slate-300 text-[10px]"><Share className="w-3 h-3 text-slate-300 inline" /> Compartilhar</span> na barra inferior do Safari.
                    </li>
                    <li>
                      Role a lista de opções para baixo e toque em <strong className="text-white">"Adicionar à Tela de Início"</strong>.
                    </li>
                    <li>
                      Confirme clicando em <strong className="text-lime-400">"Adicionar"</strong> no canto superior direito. Pronto!
                    </li>
                  </ol>
                </div>

                {/* Android / Desktop Instructions */}
                <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-850/80 space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-md text-[9px] font-bold tracking-wider uppercase font-heading">
                    No Android (Chrome) ou Computador
                  </span>
                  <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed pl-1 font-medium">
                    <li>
                      Toque nos <strong className="text-white">três pontinhos (⋮)</strong> no canto superior direito do navegador.
                    </li>
                    <li>
                      Selecione a opção <strong className="text-white">"Adicionar à tela inicial"</strong> ou <strong className="text-white">"Instalar aplicativo"</strong>.
                    </li>
                    <li>
                      Confirme a instalação e o ícone do Biker AI aparecerá na sua tela de aplicativos.
                    </li>
                  </ol>
                </div>

                <div className="bg-lime-500/5 p-3 rounded-xl border border-lime-500/10 text-[11px] text-lime-400 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                  <span className="font-extrabold select-none">VANTAGENS:</span>
                  <span className="leading-relaxed font-curate">Instalar o aplicativo garante carregamento instantâneo, menos consumo de internet, suporte offline e navegação livre de barras do navegador!</span>
                </div>

              </div>

              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="w-full bg-slate-800 hover:bg-slate-750 text-white font-bold font-heading py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Entendi, fechar instrução
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sleek Password Challenge for Coach Access */}
      <AnimatePresence>
        {showAdminPasswordPrompt && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-805 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative"
            >
              <div className="text-center space-y-1.5">
                <div className="w-10 h-10 bg-lime-400/10 text-lime-400 rounded-full flex items-center justify-center mx-auto border border-lime-400/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm uppercase font-black tracking-widest text-white font-heading">
                  Acesso Reservado
                </h3>
                <p className="text-xs text-slate-400">
                  Insira a Credencial do Treinador para abrir o painel administrativo.
                </p>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adminPasswordInput === "Pedro23072007") {
                    setShowAdminPanel(true);
                    setShowAdminPasswordPrompt(false);
                    setAdminPasswordInput("");
                    setAdminPasswordError("");
                  } else {
                    setAdminPasswordError("Senha incorreta");
                  }
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <input
                    type="password"
                    placeholder="Chave de Acesso"
                    autoFocus
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      if (adminPasswordError) setAdminPasswordError("");
                    }}
                    className={`w-full bg-slate-950 border text-center text-sm px-4 py-3 rounded-xl font-mono text-lime-400 placeholder:text-slate-600 outline-hidden transition-all ${
                      adminPasswordError 
                        ? "border-rose-500/50 focus:border-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
                        : "border-slate-800 focus:border-lime-500/50 focus:shadow-[0_0_15px_rgba(132,204,22,0.1)]"
                    }`}
                  />
                  {adminPasswordError && (
                    <span className="block text-[10px] text-center text-rose-450 font-bold uppercase tracking-wider font-sans mt-1">
                      {adminPasswordError}
                    </span>
                  )}
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminPasswordPrompt(false);
                      setAdminPasswordInput("");
                      setAdminPasswordError("");
                    }}
                    className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-[10px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-lime-400 hover:bg-lime-350 text-slate-950 font-black rounded-xl text-[10px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Feedback Modal for Athletes */}
      <AnimatePresence>
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative text-left"
            >
              <div className="text-center space-y-1.5">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-base font-heading font-black text-slate-800">
                  Enviar Feedback ao Treinador
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Sua sugestão, dúvida ou elogio será entregue diretamente na área privada de controle do treinador.
                </p>
              </div>

              {feedbackSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center space-y-1"
                >
                  <p className="text-xs font-bold font-heading">Feedback Enviado com Sucesso!</p>
                  <p className="text-[11px] text-emerald-600 font-sans">Seu treinador já pode visualizar sua mensagem no painel privado.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSendFeedback} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Mensagem de Feedback</label>
                    <textarea
                      placeholder="Ex: nos fale o que pode melhorar no aplicativo..."
                      rows={4}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl p-3 text-xs outline-hidden transition-all text-slate-800 placeholder:text-slate-400 resize-none font-sans"
                    />
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowFeedbackModal(false)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer text-center border border-slate-150"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submittingFeedback || !feedbackText.trim()}
                      className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 text-lime-400 font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50 text-center"
                    >
                      {submittingFeedback ? "Enviando..." : "Enviar Agora"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Instagram Support Button */}
      <a
        href="https://www.instagram.com/biker_ai_app?igsh=MTl1ZnptN3ZjbzBhYg=="
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-3.5 right-3.5 sm:bottom-5 sm:right-5 z-40 flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 bg-slate-900/95 hover:bg-slate-900 text-pink-300 hover:text-white border border-pink-500/40 hover:border-pink-500/80 rounded-full shadow-xl hover:shadow-2xl transition-all cursor-pointer group backdrop-blur-md max-w-[calc(100vw-2rem)]"
        title="Dúvidas? Envie um Direct no Instagram @biker_ai_app"
      >
        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
          <Instagram className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
        <div className="flex flex-col text-left pr-0.5">
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-pink-400 leading-none">Suporte Direct</span>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 leading-tight">@biker_ai_app</span>
        </div>
      </a>

    </div>
  );
}
