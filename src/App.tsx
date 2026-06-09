import React, { useState, useEffect, useRef } from "react";
import { UserProfile, ChatMessage, TrainingPlan, UserAccount, Workout } from "./types";
import WorkoutCard from "./components/WorkoutCard";
import ZoneCalculator from "./components/ZoneCalculator";
import LoginScreen from "./components/LoginScreen";
import AccountSettings from "./components/AccountSettings";
import VolumeEvolutionChart from "./components/VolumeEvolutionChart";
import WeeklyCalorieChart from "./components/WeeklyCalorieChart";
import AchievementsDashboard from "./components/AchievementsDashboard";
import { motion, AnimatePresence } from "motion/react";
import { 
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
  Trophy
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem("current_coach_user");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return null;
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    if (currentUser) return currentUser.profile;
    const saved = localStorage.getItem("athlete_profile");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* use default */ }
    }
    return {
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
    };
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    if (currentUser) return currentUser.chatHistory;
    const saved = localStorage.getItem("coach_chat_history");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* use default */ }
    }
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
  const [activeTab, setActiveTab] = useState<"planilha" | "desempenho" | "zonas" | "chat">("planilha");
  
  // Training Plan State
  const [plan, setPlan] = useState<TrainingPlan | null>(() => {
    if (currentUser) return currentUser.plan;
    const saved = localStorage.getItem("athlete_training_plan");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return null;
  });

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const handleUpdateWorkout = (index: number, updatedWorkout: Workout) => {
    if (!plan) return;
    const updatedWorkouts = [...plan.workouts];
    updatedWorkouts[index] = updatedWorkout;
    const updatedPlan = {
      ...plan,
      workouts: updatedWorkouts
    };
    setPlan(updatedPlan);
    localStorage.setItem("athlete_training_plan", JSON.stringify(updatedPlan));
  };

  const handleAddWorkout = () => {
    if (!plan) return;
    const newWorkout: Workout = {
      day: "Sessão Extra",
      type: "Treino Personalizado",
      duration: 60,
      goal: "Foco livre do ciclista para ganho de fôlego, resistência ou recuperação ativa.",
      structure: "Pedal contínuo em ritmo confortável e prazeroso.",
      targetZone: "Z2 - Endurance",
      rpe: 3,
      tip: "Este é um treino extra! Mantenha uma cadência confortável e beba bastante água.",
      completed: false
    };
    const updatedPlan = {
      ...plan,
      workouts: [...plan.workouts, newWorkout]
    };
    setPlan(updatedPlan);
    localStorage.setItem("athlete_training_plan", JSON.stringify(updatedPlan));
  };

  const handleDeleteWorkout = (index: number) => {
    if (!plan) return;
    if (!window.confirm("Deseja realmente remover este treino da sua planilha?")) return;
    const updatedWorkouts = plan.workouts.filter((_, i) => i !== index);
    const updatedPlan = {
      ...plan,
      workouts: updatedWorkouts
    };
    setPlan(updatedPlan);
    localStorage.setItem("athlete_training_plan", JSON.stringify(updatedPlan));
  };

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
      const response = await fetch("/api/generate-next-week", {
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
        throw new Error("Erro de comunicação com o servidor ao evoluir a planilha.");
      }

      // Guardar a semana atual no histórico para visualização de volume antes de carregar a nova
      const savedHistoryStr = localStorage.getItem("athlete_plan_history");
      let historyList: TrainingPlan[] = [];
      if (savedHistoryStr) {
        try { historyList = JSON.parse(savedHistoryStr); } catch (e) {}
      }
      if (!historyList.some(p => p.weekNumber === plan.weekNumber)) {
        historyList.push(plan);
        localStorage.setItem("athlete_plan_history", JSON.stringify(historyList));
      }

      const data: TrainingPlan = await response.json();
      setPlan(data);
      localStorage.setItem("athlete_training_plan", JSON.stringify(data));

      setShowNextWeekForm(false);
      setTextFeedback("");
      setSubjFeedback("otimo");

      // Adcciona mensagem ao histórico do chat do treinador
      setChatHistory(prev => [...prev, {
        id: `gen-week-${Date.now()}`,
        sender: "treinador",
        text: `🚀 **Sua Semana ${nextWeek} de Treinos Iniciou!**\n\n${data.coachMessage || "Preparei estímulos novos na planilha baseando-me nas suas sensações, cargas anteriores e nas conclusões!"}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);

    } catch (err: any) {
      alert("Houve um erro técnico para gerar a próxima semana: " + err.message);
    } finally {
      setIsGeneratingNextWeek(false);
    }
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  // Background migration of legacy local-only accounts to the server on startup
  useEffect(() => {
    const savedUsers = localStorage.getItem("coach_users");
    if (savedUsers) {
      try {
        const usersMap = JSON.parse(savedUsers);
        Object.keys(usersMap).forEach((emailKey) => {
          const userEntry = usersMap[emailKey];
          if (userEntry && userEntry.email) {
            fetch("/api/auth/save-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: userEntry.email,
                userAccount: {
                  email: userEntry.email,
                  profile: userEntry.profile,
                  chatHistory: userEntry.chatHistory,
                  plan: userEntry.plan
                },
                password: userEntry.password
              })
            })
            .then(res => {
              if (res.ok) {
                console.log(`Conta local migrante sincronizada no servidor: ${userEntry.email}`);
              } else {
                console.warn(`Sinal de erro ao migrar conta ${userEntry.email}`);
              }
            })
            .catch((err) => {
              console.warn(`Erro de rede ao conectar para migrar conta local:`, err);
            });
          }
        });
      } catch (err) {
        console.error("Falha ao analisar banco de dados local para migração:", err);
      }
    }
  }, []);

  // Real-time synchronization back to session registry & database map & central server
  useEffect(() => {
    if (!currentUser) return;

    const updatedUser: UserAccount = {
      email: currentUser.email,
      profile,
      chatHistory,
      plan
    };

    localStorage.setItem("current_coach_user", JSON.stringify(updatedUser));

    const savedUsers = localStorage.getItem("coach_users");
    let usersMap: Record<string, any> = {};
    if (savedUsers) {
      try { usersMap = JSON.parse(savedUsers); } catch (e) { }
    }
    const emailKey = currentUser.email.toLowerCase();
    const existingEntry = usersMap[emailKey];
    usersMap[emailKey] = {
      ...updatedUser,
      password: existingEntry?.password || "123456" // fallbacks/preserves
    };
    localStorage.setItem("coach_users", JSON.stringify(usersMap));

    // Async background sync with Node.js server database
    fetch("/api/auth/save-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: currentUser.email,
        userAccount: updatedUser,
        password: existingEntry?.password || "123456"
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
  }, [profile, chatHistory, plan, currentUser?.email]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

      console.log("[ONBOARDING LOG - ANTES DO ENVIO]", {
        perguntaAtual: profile.onboardingStep,
        totalRespostasRegistradas: getRegisteredAnswersCount(profile),
        estadoCompleto: profile,
        mensagemEnviada: messageToSend,
        isOnboarding,
        endpoint
      });

      const response = await fetch(endpoint, {
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
          
          console.log("[ONBOARDING LOG - DEPOIS DA RESPOSTA (NOVO ESTADO)]", {
            perguntaAtual: updated.onboardingStep,
            totalRespostasRegistradas: getRegisteredAnswersCount(updated),
            estadoCompleto: updated,
            dadosRecebidosDoServidor: data.parsedProfile
          });

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
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile })
      });

      if (!response.ok) {
        throw new Error("Erro na geração da planilha pelo treinador.");
      }

      const data: TrainingPlan = await response.json();
      setPlan(data);
      
      // Update onboarding status to fully completed
      setProfile(prev => ({ ...prev, onboardingStep: 10 }));
      
      // Select appropriate tab
      setActiveTab("planilha");

      // Add coach announcement to chat
      setChatHistory(prev => [...prev, {
        id: `gen-${Date.now()}`,
        sender: "treinador",
        text: `✨ **Planilha Semanal Gerada com Sucesso!**\n\n${profile.name || "Atleta"}, montei uma planilha de treinos sob medida baseada no seu nível (**${profile.level}**) e seu objetivo de **${profile.goal}**. Confira a aba de planilha para ver os passos e dicas de cada dia! Let's ride! 🚴‍♂️💨`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);

    } catch (err: any) {
      alert("Houve um erro: " + err.message);
    } finally {
      setIsGeneratingPlan(false);
    }
  };



  // Success trigger from login screen
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setProfile(user.profile);
    setChatHistory(user.chatHistory);
    setPlan(user.plan);
    setShowAccountSettings(false);
  };

  // Handle updating athlete's security login info or profile name
  const handleUpdateAccount = (updatedUser: UserAccount, newPassword?: string): boolean => {
    if (!currentUser) return false;

    const savedUsers = localStorage.getItem("coach_users");
    let usersMap: Record<string, any> = {};
    if (savedUsers) {
      try {
        usersMap = JSON.parse(savedUsers);
      } catch (e) {
        usersMap = {};
      }
    }

    const currentEmailKey = currentUser.email.toLowerCase();
    const newEmailKey = updatedUser.email.toLowerCase();

    // Preserve original password unless a new one is set
    const passwordToStore = newPassword || usersMap[currentEmailKey]?.password || "123456";

    // Migrate registry if the login email address has changed
    if (currentEmailKey !== newEmailKey) {
      delete usersMap[currentEmailKey];
    }

    const updatedRegistryEntry = {
      email: updatedUser.email,
      password: passwordToStore,
      profile: {
        ...profile,
        name: updatedUser.profile.name
      },
      chatHistory,
      plan
    };

    usersMap[newEmailKey] = updatedRegistryEntry;
    localStorage.setItem("coach_users", JSON.stringify(usersMap));

    const finalizedSessionUser: UserAccount = {
      email: updatedUser.email,
      profile: updatedRegistryEntry.profile,
      chatHistory,
      plan
    };

    setCurrentUser(finalizedSessionUser);
    localStorage.setItem("current_coach_user", JSON.stringify(finalizedSessionUser));
    
    // Sync React state for imediate rendering
    setProfile(prev => ({
      ...prev,
      name: updatedUser.profile.name
    }));

    return true;
  };

  // Sign out of active athlete profile
  const handleSignOut = () => {
    localStorage.removeItem("current_coach_user");
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
  const getProgressPercentage = () => {
    return Math.min(100, Math.round((profile.onboardingStep / 10) * 100));
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans selection:bg-lime-200">
      
      {/* Upper Navigation Bar */}
      <header id="main-header" className="bg-slate-900/95 backdrop-blur-md text-white shadow-xl border-b border-slate-800/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-3.5 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 animate-fadeInUp">
            <div className="p-2.5 bg-lime-500 text-slate-950 rounded-xl shadow-[0_0_15px_rgba(132,204,22,0.3)] hover:scale-105 transition-transform duration-300">
              <Bike className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 fill-slate-950/20" />
            </div>
            <div>
              <h1 className="font-heading font-black text-base sm:text-lg tracking-wider flex items-center gap-2 uppercase">
                BIKER <span className="text-lime-400">AI</span>
                <span className="text-[9px] font-mono tracking-widest uppercase bg-slate-800 text-lime-400 px-2 py-0.5 rounded-md border border-slate-700 font-bold">TREINADOR</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-sans tracking-widest uppercase mt-0.5 font-semibold">Plataforma de Treino Inteligente de Ciclismo</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 animate-fadeInUp">
            {currentUser && (
              <button 
                onClick={() => setShowAccountSettings(!showAccountSettings)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold font-heading uppercase tracking-wider transition-all cursor-pointer ${
                  showAccountSettings 
                    ? "bg-lime-400 text-slate-950 border-lime-400 hover:bg-lime-350" 
                    : "border-slate-800 bg-slate-800 text-lime-400 hover:bg-slate-750"
                }`}
                title="Sua Conta e Dados de Acesso"
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[100px] sm:max-w-[130px] truncate">
                  <span className="hidden xs:inline">Olá, </span>
                  {profile.name || currentUser.profile.name || "Atleta"}
                </span>
              </button>
            )}
            {currentUser && plan && (
              <button 
                onClick={handleReset} 
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-xs text-slate-300 font-bold font-heading uppercase tracking-wider transition-all cursor-pointer"
                title="Resetar todos os dados"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden xs:inline">Resetar</span>
              </button>
            )}
            {currentUser && (
              <button 
                onClick={handleSignOut} 
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-xs text-slate-300 font-bold font-heading uppercase tracking-wider transition-all cursor-pointer"
                title="Sair da conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Sair</span>
              </button>
            )}
            <span className="hidden sm:inline-block text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full font-mono font-medium border border-slate-700">
              🔴 Live Preview
            </span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      {!currentUser ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : showAccountSettings ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col gap-8">
          <AccountSettings 
            currentUser={currentUser} 
            onUpdateAccount={handleUpdateAccount} 
            onClose={() => setShowAccountSettings(false)} 
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
                    <div className="text-sm font-mono font-bold text-lime-400">{profile.onboardingStep}/10 Preenchidas</div>
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
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
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
                  <div ref={chatEndRef} />
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
                    💡 <strong>Controle de Autonomia:</strong> O treinador atualiza esses campos de forma inteligente com base no chat. Se encontrar algum erro, você também pode digitar ou corrigir no painel abaixo!
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                        placeholder="⚠️ Digite seu nome!"
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
                        <option value="">⚠️ Precisa selecionar!</option>
                        <option value="iniciante">Iniciante</option>
                        <option value="intermediário">Intermediário</option>
                        <option value="avançado">Avançado</option>
                      </select>
                    </div>

                    {/* Objetivo */}
                    <div className="flex flex-col gap-1 col-span-2">
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
                        <option value="">⚠️ Precisa selecionar!</option>
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
                        placeholder="⚠️ Informe quantos dias!"
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
                        placeholder="⚠️ Informe os minutos!"
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all outline-hidden ${
                          !profile.durationPerSession 
                            ? 'bg-rose-50/20 border-2 border-rose-300 text-rose-800 placeholder:text-rose-450 focus:bg-white' 
                            : 'bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white text-slate-700'
                        }`}
                      />
                    </div>

                    {/* Prova com data marcada */}
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Evento / Prova Alvo</label>
                      <input 
                        type="text" 
                        value={profile.eventDate}
                        onChange={(e) => setProfile(prev => ({ ...prev, eventDate: e.target.value }))}
                        placeholder="Não informado (Opcional)"
                        className="bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 outline-hidden transition-all"
                      />
                    </div>

                    {/* Potenciometro & FTP */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Usa Medidor (FTP em Watts)</label>
                      <div className="flex gap-2">
                        <select 
                          value={profile.hasPowerMeter === null ? "" : profile.hasPowerMeter ? "yes" : "no"}
                          onChange={(e) => setProfile(prev => ({ ...prev, hasPowerMeter: e.target.value === "yes" ? true : e.target.value === "no" ? false : null }))}
                          className="bg-slate-50 border border-slate-100 px-2 py-2 rounded-lg text-xs font-semibold text-slate-700 select-none shrink-0"
                        >
                          <option value="">Não</option>
                          <option value="yes">Sim</option>
                        </select>
                        <input 
                          type="number" 
                          value={profile.ftp || ""}
                          disabled={!profile.hasPowerMeter}
                          onChange={(e) => setProfile(prev => ({ ...prev, ftp: e.target.value ? parseInt(e.target.value) : null }))}
                          placeholder="FTP Watts"
                          className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 outline-hidden disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Cardiofreguencia & MaxHR */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Usa Monitor (FCmax bpm)</label>
                      <div className="flex gap-2">
                        <select 
                          value={profile.hasHeartRate === null ? "" : profile.hasHeartRate ? "yes" : "no"}
                          onChange={(e) => setProfile(prev => ({ ...prev, hasHeartRate: e.target.value === "yes" ? true : e.target.value === "no" ? false : null }))}
                          className="bg-slate-50 border border-slate-100 px-2 py-2 rounded-lg text-xs font-semibold text-slate-700 select-none shrink-0"
                        >
                          <option value="">Não</option>
                          <option value="yes">Sim</option>
                        </select>
                        <input 
                          type="number" 
                          value={profile.maxHeartRate || ""}
                          disabled={!profile.hasHeartRate}
                          onChange={(e) => setProfile(prev => ({ ...prev, maxHeartRate: e.target.value ? parseInt(e.target.value) : null }))}
                          placeholder="Fmax bpm"
                          className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 outline-hidden disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Limitacoes fisicas */}
                    <div className="flex flex-col gap-1 col-span-2">
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
                      src="/src/assets/images/cycling_action_1780860242304.png" 
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
                      <span className="text-slate-300">•</span>
                      {profile.hasPowerMeter ? (
                        <span className="text-amber-600 font-extrabold font-mono">FTP: {profile.ftp}W</span>
                      ) : (
                        <span className="text-rose-600 font-extrabold font-mono">FCmax: {profile.maxHeartRate} bpm</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Tab select Buttons with Sporty design */}
                <div className="flex flex-wrap gap-1 bg-slate-100/80 p-1.5 rounded-2xl w-full md:w-auto border border-slate-200/40 shadow-inner">
                  <button 
                    onClick={() => setActiveTab("planilha")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black leading-none font-heading uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === "planilha" ? "bg-slate-900 text-lime-400 shadow-sm" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Minha Planilha</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab("desempenho")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black leading-none font-heading uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === "desempenho" ? "bg-slate-900 text-lime-400 shadow-sm" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Conquistas & Evolução</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab("zonas")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black leading-none font-heading uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === "zonas" ? "bg-slate-900 text-lime-400 shadow-sm" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Minhas Zonas</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab("chat")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black leading-none font-heading uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === "chat" ? "bg-slate-900 text-lime-400 shadow-sm" : "text-slate-600 hover:bg-slate-205 hover:text-slate-900"
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Falar com o Coach</span>
                  </button>
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
                    {plan?.coachMessage && (
                      <div id="coach-weekly-feedback-banner" className="bg-gradient-to-r from-lime-500/10 to-emerald-500/10 border border-lime-500/20 rounded-2xl p-5 flex items-start gap-4 shadow-2xs">
                        <span className="text-2xl mt-0.5 shrink-0">🗣️</span>
                        <div>
                          <h4 className="font-heading font-extrabold text-slate-800 text-sm">Feedback do Treinador AI — Semana {plan.weekNumber || 1}</h4>
                          <p className="text-xs font-sans text-slate-650 leading-relaxed mt-1 italic">
                            "{plan.coachMessage}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Weekly Plan summary card */}
                    <div id="plan-block-summary" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Summary text */}
                      <div className="bg-slate-900 text-white p-6 rounded-2xl md:col-span-2 shadow-xs border border-slate-800 space-y-3">
                        <h3 className="font-heading font-extrabold text-sm uppercase tracking-widest text-lime-400 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-lime-400" /> Macrociclo & Foco Principal
                        </h3>
                        <p className="text-xs text-slate-350 leading-relaxed font-sans">{plan?.summary}</p>
                      </div>

                      {/* Observations metrics boxes */}
                      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-3 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-bold font-heading text-slate-400 uppercase tracking-widest">Ciclo de Evolução</span>
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
                      </div>

                    </div>

                    {/* Progress Tracker Panel & Worksheet Actions */}
                    {plan && plan.workouts && (
                      (() => {
                        const totalW = plan.workouts.length;
                        const completedW = plan.workouts.filter(w => w.completed).length;
                        const pctW = totalW > 0 ? Math.round((completedW / totalW) * 100) : 0;
                        return (
                          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
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
                                  <span>{showNextWeekForm ? "Fechar Configuração" : "Evoluir de Semana 🚀"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleAddWorkout}
                                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-white hover:text-lime-400 rounded-xl text-xs font-bold font-heading flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  <span>Adicionar Treino</span>
                                </button>
                                {completedW > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm("Deseja realmente limpar o progresso de conclusão de todos os treinos?")) {
                                        const updatedWorkouts = plan.workouts.map(w => ({ ...w, completed: false }));
                                        const updatedPlan = { ...plan, workouts: updatedWorkouts };
                                        setPlan(updatedPlan);
                                        localStorage.setItem("athlete_training_plan", JSON.stringify(updatedPlan));
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
                                          <span className="text-xl shrink-0">💪</span>
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
                                          <span className="text-xl shrink-0">👍</span>
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
                                          <span className="text-xl shrink-0">⚠️</span>
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
                                      <span className="text-sm shrink-0">📉</span>
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
                                            <span>Salvar Progresso & Evoluir p/ Semana {(plan.weekNumber || 1) + 1} ⚡</span>
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
                                    {pctW === 100 ? "100% 🏆" : pctW >= 75 ? "Ótimo 🔥" : pctW >= 50 ? "Bom 👍" : pctW > 0 ? "Em progresso" : "Falta começar"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
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

                    {/* Bento Grid of workouts */}
                    <div id="weekly-workouts-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {plan?.workouts.map((wk, index) => (
                        <WorkoutCard 
                          key={`${wk.day}-${index}`} 
                          workout={wk} 
                          profile={profile}
                          onUpdate={(updatedWorkout) => handleUpdateWorkout(index, updatedWorkout)}
                          onDelete={() => handleDeleteWorkout(index)}
                        />
                      ))}
                      {(!plan?.workouts || plan.workouts.length === 0) && (
                        <div className="col-span-full bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
                          <ClipboardList className="w-10 h-10 text-slate-300" />
                          <div>
                            <h4 className="font-heading font-bold text-slate-600 text-sm">Sem treinos para exibir</h4>
                            <p className="text-xs text-slate-400 font-sans mt-1">Clique em "Adicionar Treino" acima para criar sessões personalizadas.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional Coach advice */}
                    <div id="additional-coach-advice" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Technical observations card */}
                      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-3">
                        <h4 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-50 pb-2">
                          <ShieldAlert className="w-4.5 h-4.5 text-amber-600" /> Marcadores para monitoramento diário
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-line">{plan?.observations}</p>
                      </div>

                      {/* Execution feedback card */}
                      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-3">
                        <h4 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-50 pb-2">
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" /> Critérios de Sucesso (Dicas e Resultados)
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-line">{plan?.evaluation}</p>
                      </div>
                    </div>

                    {/* Scientific Efficacy & Cardiovascular Safety Shield Panel */}
                    <div id="physiological-safety-shield" className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-white rounded-3xl p-6 sm:p-8 space-y-6">
                      
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
                            Se houver fadiga anormal ou sintomas, avise seu treinador no chat de suporte para recalcular sua planilha semanal para repouso ativo.
                          </div>
                        </div>

                      </div>
                    </div>

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
                    <ZoneCalculator profile={profile} />
                  </motion.div>
                )}

                {activeTab === "chat" && (
                  <motion.div 
                    key="tab-coachchat" 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[600px] max-w-3xl mx-auto"
                  >
                    {/* Chat Header */}
                    <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-lime-500 flex items-center justify-center font-bold text-slate-950 font-heading shrink-0 shadow-sm relative animate-pulse">
                          AI
                        </div>
                        <div>
                          <h3 className="font-heading font-bold text-sm">Central de Dúvidas do Treinador</h3>
                          <p className="text-[10px] text-lime-400 font-sans">Tire dúvidas sobre os treinos, hidratação, alimentação ou peça mudanças no seu plano</p>
                        </div>
                      </div>
                      
                      {/* Regeneration button */}
                      <button 
                        onClick={generateTrainingPlan}
                        disabled={isGeneratingPlan}
                        className="flex items-center gap-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-lime-400 font-heading font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase transition-all disabled:opacity-50"
                      >
                        {isGeneratingPlan ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        <span>Recriar Planilha</span>
                      </button>
                    </div>

                    {/* Messages Panel */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
                      {chatHistory.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`flex gap-3 max-w-[85%] ${msg.sender === "atleta" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                        >
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
                            <span className="text-[9px] text-slate-400 font-mono tracking-wider block">
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
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Form */}
                    <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 shrink-0 flex gap-2">
                      <input 
                        type="text" 
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        disabled={isTyping}
                        placeholder='Pergunte ou comente: ex: "Como faço para render mais na subida?" ou "Retire a atividade de quinta."'
                        className="flex-1 bg-slate-100 focus:bg-white text-xs text-slate-800 rounded-xl px-4 py-3 outline-hidden border border-slate-100 focus:border-slate-300 focus:ring-1 focus:ring-slate-300 font-sans transition-all disabled:opacity-50"
                      />
                      <button 
                        type="submit"
                        disabled={!inputMessage.trim() || isTyping}
                        className="bg-slate-900 hover:bg-slate-800 text-lime-400 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl px-4 flex items-center justify-center font-bold tracking-wide transition-all shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}
        </AnimatePresence>

      </main>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 text-[11px] font-sans border-t border-slate-900 py-6 mt-12 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-lime-400" />
            <span>&copy; 2026 Biker AI. Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Treino Equilibrado</span>
            <span>•</span>
            <span>Controle de Esforço</span>
            <span>•</span>
            <span>Zonas de Intensidade</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
