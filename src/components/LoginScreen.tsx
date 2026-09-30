import React, { useState, useEffect } from "react";
import { UserAccount, UserProfile, ChatMessage } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth, apiFetch } from "../firebase";
import { MetaPixelEvents } from "../lib/metaPixel";
import { updateSeoMeta, HOME_SEO_CONFIG } from "../utils/seoHead";
import { SEO_ARTICLES } from "../data/seoArticlesData";
import { 
  Dumbbell, ShieldAlert, ShieldCheck, Sparkles, Mail, Lock, User, Eye, EyeOff, Bike, 
  ChevronRight, CheckCircle, Download, Smartphone, Share, X, ExternalLink,
  Activity, TrendingUp, Zap, Award, MessageSquare, Calendar, Heart, Percent, Star, Check,
  Play, Pause, Sliders, Gauge, Instagram, Loader2, Bot, Clock, Flame, Smile, Compass, Target, MessageSquareCode, BookOpen
} from "lucide-react";
// @ts-ignore
import bikerHero from "../assets/images/biker_hero_1780860230528.png";
import TermsOfUseModal from "./TermsOfUseModal";
import PrivacyPolicyModal from "./PrivacyPolicyModal";
import ContactModal from "./ContactModal";

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
  onNavigateSlug?: (slug: string) => void;
}

export default function LoginScreen({ onLoginSuccess, onNavigateSlug }: LoginScreenProps) {
  useEffect(() => {
    updateSeoMeta(HOME_SEO_CONFIG);
  }, []);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para modais de termos, privacidade e contato
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);

  // Estados para a seção de Preview Interativo do App
  const [previewTab, setPreviewTab] = useState<"planilha" | "desempenho" | "zonas" | "chat">("planilha");
  const [previewFtp, setPreviewFtp] = useState(220);
  const [previewWorkoutDone, setPreviewWorkoutDone] = useState(false);
  const [previewDay, setPreviewDay] = useState<number>(2); // Quarta-feira
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [previewChatMessages, setPreviewChatMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    { sender: "bot", text: "Olá! Como está o seu corpo após a pedalada de ontem? Quer ajustar as metas para os próximos dias?" }
  ]);
  const [isTypingSimulated, setIsTypingSimulated] = useState(false);
  const [demoActiveDay, setDemoActiveDay] = useState<"segunda" | "terca" | "quarta" | "quinta" | "sabado">("terca");

  React.useEffect(() => {
    let timer: any;
    if (isTimerRunning && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, secondsLeft]);

  const handlePresetQuestion = (question: string, answer: string) => {
    if (isTypingSimulated) return;
    setPreviewChatMessages(prev => [...prev, { sender: "user", text: question }]);
    setIsTypingSimulated(true);
    setTimeout(() => {
      setPreviewChatMessages(prev => [...prev, { sender: "bot", text: answer }]);
      setIsTypingSimulated(false);
    }, 1250);
  };

  const MERCADO_PAGO_CHECKOUT_URL = "https://mpago.la/24PgikU";

  const scrollToSection = (id: string, signupMode?: boolean) => {
    if (signupMode === true) {
      setIsLogin(false);
      setError("");
      setSuccessMsg("");
    } else if (signupMode === false) {
      setIsLogin(true);
      setError("");
      setSuccessMsg("");
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPortable, setIsPortable] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  React.useEffect(() => {
    // Check if the app is already in standalone mode
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

  const validateEmail = (input: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Por favor, informe um endereço de e-mail válido.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres por segurança.");
      return;
    }

    if (!isLogin && !name.trim()) {
      setError("Por favor, insira o seu nome antes de iniciar o cadastro.");
      return;
    }

    const emailKey = email.trim().toLowerCase();
    setIsSubmitting(true);

    try {
      if (isLogin) {
        let userObj: any = null;
        let firebaseCredential: any = null;

        try {
          // Attempt Firebase Auth login first
          firebaseCredential = await signInWithEmailAndPassword(auth, emailKey, password);
        } catch (fbErr: any) {
          // If the user exists in our Firestore database but not in Firebase Auth yet (legacy user)
          if (fbErr.code === "auth/user-not-found" || fbErr.code === "auth/invalid-credential") {
            console.log("[Migration] User not found in Firebase Auth, checking legacy backend DB...");
            try {
              const serverResponse = await apiFetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailKey, password })
              });
              
              if (serverResponse.ok) {
                const legacyData = await serverResponse.json();
                userObj = legacyData.user;
                
                // Automatically create Firebase Auth credentials for this legacy user
                console.log("[Migration] Linking legacy user account to Firebase Auth...");
                firebaseCredential = await createUserWithEmailAndPassword(auth, emailKey, password);
              } else {
                // If backend also fails, raise the original error or a clean wrong password warning
                throw fbErr;
              }
            } catch (backendErr) {
              throw fbErr;
            }
          } else {
            throw fbErr;
          }
        }

        // If we didn't fetch the userObj from legacy bridge, fetch it from session
        if (!userObj) {
          try {
            const response = await apiFetch("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: emailKey })
            });
            
            if (response.ok) {
              const sessionData = await response.json();
              userObj = sessionData.user;
            } else {
              // Resilient recovery: if server returned 404 or non-OK, construct safe authenticated profile
              console.warn(`[Login] Session retrieval returned status ${response.status}. Initializing user state.`);
              const isMaster = emailKey.toLowerCase() === "pedro.bramos@sempreceub.com";
              userObj = {
                email: emailKey,
                profile: {
                  name: isMaster ? "Pedro Ramos" : emailKey.split("@")[0],
                  email: emailKey,
                  role: isMaster ? "coach" : "athlete",
                  isCoach: isMaster,
                  subscriptionStatus: isMaster ? "active" : "pending_payment",
                  subscriptionPlan: isMaster ? "Acesso Master (Coach)" : "Plano Pro",
                  subscriptionExpiresAt: isMaster ? "2030-12-31" : "2026-12-31",
                  createdAt: new Date().toISOString()
                },
                chatHistory: [],
                plan: null,
                feedbacks: [],
                workoutLogs: []
              };
              // Sync to server in background
              apiFetch("/api/auth/save-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailKey, userAccount: userObj })
              }).catch(() => {});
            }
          } catch (sessionErr: any) {
            console.warn("[Login] Network/session error, proceeding with authenticated state:", sessionErr.message);
            const isMaster = emailKey.toLowerCase() === "pedro.bramos@sempreceub.com";
            userObj = {
              email: emailKey,
              profile: {
                name: isMaster ? "Pedro Ramos" : emailKey.split("@")[0],
                email: emailKey,
                role: isMaster ? "coach" : "athlete",
                isCoach: isMaster,
                subscriptionStatus: isMaster ? "active" : "pending_payment",
                subscriptionPlan: isMaster ? "Acesso Master (Coach)" : "Plano Pro",
                subscriptionExpiresAt: isMaster ? "2030-12-31" : "2026-12-31",
                createdAt: new Date().toISOString()
              },
              chatHistory: [],
              plan: null,
              feedbacks: [],
              workoutLogs: []
            };
          }
        }

        setSuccessMsg(`Bem-vindo de volta, ${userObj.profile?.name || "Atleta"}!`);
        if (window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        window.scrollTo(0, 0);
        onLoginSuccess({
          email: userObj.email,
          profile: userObj.profile,
          chatHistory: userObj.chatHistory || [],
          plan: userObj.plan || null
        });

      } else {
        // Sign up path: Create Firebase Auth credential first
        let fbCredential;
        try {
          fbCredential = await createUserWithEmailAndPassword(auth, emailKey, password);
        } catch (fbErr: any) {
          if (fbErr.code === "auth/email-already-in-use") {
            throw new Error("Este endereço de e-mail já está sendo usado por outra conta.");
          } else if (fbErr.code === "auth/weak-password") {
            throw new Error("A senha fornecida é muito fraca. Por favor, insira uma senha com pelo menos 6 caracteres.");
          } else {
            throw fbErr;
          }
        }

        // Create document in server database (Firestore)
        const response = await apiFetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailKey, password, name })
        });

        if (!response.ok) {
          const status = response.status;
          const resText = await response.text().catch(() => "");
          let errMsg = `Erro de rede no cadastro central (Código: ${status})`;
          try {
            if (resText) {
              const errJson = JSON.parse(resText);
              errMsg = errJson.error || errMsg;
            }
          } catch (e) {}
          throw new Error(errMsg);
        }

        const data = await response.json();
        const user = data.user;

        MetaPixelEvents.lead({ email: emailKey, name });
        MetaPixelEvents.completeRegistration({ email: emailKey });

        setSuccessMsg("Conta criada com sucesso! Acessando portal...");
        if (window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        window.scrollTo(0, 0);
        onLoginSuccess({
          email: user.email,
          profile: user.profile,
          chatHistory: user.chatHistory || [],
          plan: user.plan || null
        });
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      // Translate firebase error codes to user-friendly messages
      let displayError = err.message || "Erro de conexão ao autenticar.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        displayError = "E-mail ou senha incorretos. Verifique e tente novamente.";
      } else if (err.code === "auth/user-not-found") {
        displayError = "Nenhuma conta encontrada com este e-mail. Crie uma conta ao lado!";
      } else if (err.code === "auth/invalid-email") {
        displayError = "Por favor, insira um e-mail com formato válido.";
      } else if (err.code === "auth/network-request-failed") {
        displayError = "Falha de rede. Verifique se você está conectado à internet.";
      }
      setError(displayError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F17] text-white min-h-screen relative overflow-x-hidden font-sans">
      
      {/* Background ambient lighting glows - subtle, soft athletic accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.12),rgba(132,204,22,0.06),transparent_70%)] pointer-events-none -z-0"></div>
      <div className="absolute top-[8%] right-[-5%] w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[140px] pointer-events-none -z-0"></div>
      <div className="absolute top-[32%] left-[-8%] w-[500px] h-[500px] bg-lime-500/6 rounded-full blur-[150px] pointer-events-none -z-0"></div>
      <div className="absolute top-[65%] right-[2%] w-[550px] h-[550px] bg-emerald-500/8 rounded-full blur-[150px] pointer-events-none -z-0"></div>

      {/* Subtle athletic dot pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none -z-0"></div>

      {/* Elegant Landing Header / Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 py-4 px-4 sm:px-6 md:px-12 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-lime-500/10 border border-lime-500/20 rounded-xl text-lime-400 shadow-sm">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-heading font-black text-lg tracking-tight uppercase leading-none">
                BIKER <span className="text-lime-400">AI</span>
              </h1>
              <p className="text-[9px] text-slate-400 tracking-widest uppercase font-mono font-bold leading-none mt-1">Smart Cycling Coach</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button 
              type="button" 
              onClick={() => scrollToSection("como-funciona")} 
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Como Funciona
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection("exemplo-treino")} 
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Exemplo de Treino
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection("beneficios")} 
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Benefícios
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection("planos")} 
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Ver Planos
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection("auth-section", false)} 
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Entrar
            </button>
          </div>
          <div>
            <button 
              type="button" 
              onClick={() => scrollToSection("auth-section", true)} 
              className="px-4 py-2 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 active:scale-[0.98] text-slate-950 rounded-xl text-xs font-black uppercase transition-all shadow-md shadow-lime-500/20 cursor-pointer border-none"
            >
              Criar meu treino grátis
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-10 sm:pt-16 pb-14 sm:pb-18 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Hero Copy (Left 7 Cols) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Pill de Categoria & Público */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-lime-500/10 border border-lime-500/25 text-lime-400 rounded-full text-xs font-bold font-mono tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-lime-400 shrink-0" />
              <span>Para ciclistas de estrada, MTB e iniciantes</span>
            </div>

            {/* Título Principal */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black tracking-tight text-white leading-[1.08]">
              Seu treinador de ciclismo <span className="bg-gradient-to-r from-lime-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">com IA</span>
            </h2>

            {/* Subtítulo */}
            <p className="text-base sm:text-xl text-slate-300 font-sans leading-relaxed max-w-2xl font-normal">
              Receba treinos personalizados para seu objetivo, nível e rotina em menos de 1 minuto.
            </p>

            {/* CTAs: Principal de Alta Conversão + Secundários */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => scrollToSection("auth-section", true)}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 active:scale-[0.98] text-slate-950 text-sm font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-lime-500/20 hover:shadow-lime-500/30 transition-all cursor-pointer border-none group"
              >
                <span>Criar meu treino grátis</span>
                <ChevronRight className="w-4 h-4 stroke-[3] group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button 
                type="button" 
                onClick={() => scrollToSection("como-funciona")} 
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white text-sm font-bold tracking-wide rounded-2xl border border-slate-700/80 hover:border-slate-600 transition-all cursor-pointer shadow-sm"
              >
                <span>Ver como funciona</span>
              </button>
              <button 
                type="button" 
                onClick={() => scrollToSection("planos")} 
                className="inline-flex items-center justify-center gap-1.5 px-4 py-4 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer bg-transparent border-none"
              >
                <span>Ver planos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Micro Prova / Fricção Zero & Elementos Discretos de Confiança */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 pt-2 font-medium">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 text-lime-400 stroke-[3]" />
                100% Gratuito para começar
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 text-lime-400 stroke-[3]" />
                Sem cartão de crédito
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 text-lime-400 stroke-[3]" />
                Pronto em menos de 1 minuto
              </span>
            </div>

            {/* Selos Discretos de Confiança no Hero */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Pagamento seguro
              </span>
              <span className="text-slate-700 hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                Cancele quando quiser
              </span>
              <span className="text-slate-700 hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Lock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                Seus dados protegidos
              </span>
            </div>

          </div>

          {/* Hero Image Graphic (Right 5 Cols) */}
          <div className="lg:col-span-5 relative flex justify-center items-center">
            <div className="absolute inset-0 bg-lime-500/10 rounded-full blur-3xl -z-10 opacity-60"></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900/60 p-2.5 group w-full max-w-md"
            >
              <img 
                src={bikerHero} 
                alt="Biker AI Hero" 
                className="rounded-2xl max-w-full h-auto object-cover opacity-95 group-hover:opacity-100 group-hover:scale-[1.01] transition-all duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent pointer-events-none rounded-2xl"></div>

              {/* Floating Badge 1: Treino com IA */}
              <div className="absolute top-5 left-5 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-lg">
                <div className="w-7 h-7 rounded-lg bg-lime-500/20 text-lime-400 flex items-center justify-center font-bold">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-mono uppercase text-slate-400 font-bold leading-none">Prescrição com IA</p>
                  <p className="text-xs font-heading font-black text-white leading-tight mt-0.5">Zonas & Ritmo Sob Medida</p>
                </div>
              </div>

              {/* Floating Badge 2: Evolução Real */}
              <div className="absolute bottom-5 right-5 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-lg">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-mono uppercase text-emerald-400 font-bold leading-none">Evolução Contínua</p>
                  <p className="text-xs font-heading font-black text-white leading-tight mt-0.5">+Fôlego e Menos Fadiga</p>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* SEÇÃO PRINCIPAIS BENEFÍCIOS (VISUAL & MINIMALISTA) */}
      <section className="relative py-14 sm:py-18 px-4 sm:px-6 md:px-12 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto w-full space-y-10">
          
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-[10px] bg-lime-500/10 border border-lime-500/20 text-lime-400 font-black px-3.5 py-1 rounded-full uppercase tracking-widest font-mono">
              Vantagens Principais
            </span>
            <h3 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
              Tudo o que você precisa para pedalar melhor
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-sans">
              Sem tabelas confusas ou métodos ultrapassados. Desenvolvido para a sua realidade.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Benefício 1: Treinos personalizados */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/90 hover:border-lime-500/40 hover:bg-slate-900 transition-all text-left flex flex-col justify-between space-y-4 group shadow-md">
              <div className="space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-lime-500/10 border border-lime-500/25 text-lime-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Sliders className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-heading font-black text-white tracking-tight leading-snug">
                  Treinos personalizados
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Sessões calculadas sob medida para o seu ritmo, tempo disponível e capacidade física, sem planilhas genéricas.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-lime-400 uppercase tracking-wider pt-2 border-t border-slate-800/80 flex items-center gap-1">
                100% Individualizado
              </span>
            </div>

            {/* Benefício 2: Planejamento semanal */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900 transition-all text-left flex flex-col justify-between space-y-4 group shadow-md">
              <div className="space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Calendar className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-heading font-black text-white tracking-tight leading-snug">
                  Planejamento semanal
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Sua semana organizada com o equilíbrio perfeito entre treinos intensos, rodagens leves e descansos programados.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider pt-2 border-t border-slate-800/80 flex items-center gap-1">
                Rotina Organizada
              </span>
            </div>

            {/* Benefício 3: Adaptação ao nível e objetivo do ciclista */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/90 hover:border-sky-500/40 hover:bg-slate-900 transition-all text-left flex flex-col justify-between space-y-4 group shadow-md">
              <div className="space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/25 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Gauge className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-heading font-black text-white tracking-tight leading-snug">
                  Adaptação ao nível e objetivo
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Do iniciante ao atleta experiente: ganhe fôlego em subidas, aumente sua velocidade ou prepare-se para desafios longos.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider pt-2 border-t border-slate-800/80 flex items-center gap-1">
                Estrada, MTB & Urbano
              </span>
            </div>

            {/* Benefício 4: Acompanhamento da evolução */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/90 hover:border-amber-500/40 hover:bg-slate-900 transition-all text-left flex flex-col justify-between space-y-4 group shadow-md">
              <div className="space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-heading font-black text-white tracking-tight leading-snug">
                  Acompanhamento da evolução
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Visualize seu progresso a cada pedalada com métricas claras, zonas de esforço e aumento progressivo de rendimento.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider pt-2 border-t border-slate-800/80 flex items-center gap-1">
                Evolução Contínua
              </span>
            </div>

          </div>

        </div>
      </section>

      {/* SEÇÃO COMPARATIVA: PDF VS BIKER AI */}
      <section className="relative py-20 px-4 sm:px-6 md:px-12 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-4xl mx-auto rounded-3xl border border-slate-800 bg-slate-950/80 overflow-hidden relative shadow-xl backdrop-blur-md">
          <div className="absolute -inset-y-12 -inset-x-12 bg-[radial-gradient(ellipse_at_center,rgba(132,204,22,0.08),transparent_70%)] opacity-50 pointer-events-none"></div>
          <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 text-left items-center">
            <div className="space-y-4">
              <span className="text-[9px] font-mono font-bold tracking-widest text-lime-400 uppercase bg-lime-500/10 border border-lime-500/20 px-2.5 py-1 rounded-md">
                Diferencial Exclusivo
              </span>
              <h4 className="text-2xl md:text-3xl font-heading font-black text-white leading-tight">Por que planilhas em PDF comuns não funcionam?</h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                Comprar um PDF genérico estático na internet parece barato, mas as tabelas de papel ou planilha travadas falham ao menor sinal de imprevisto. Se chover, se você adoecer, viajar ou trabalhar até mais tarde e pular a terça-feira, o PDF não muda sozinho para te salvar.
              </p>
              <div className="text-xs text-lime-400 font-bold block pt-1">
                No Biker AI, a planilha se curva à sua vida real, e nunca o contrário.
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 font-sans text-xs shadow-md">
              <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-slate-800 pb-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse"></span>
                <span>O que acontece se você perder um treino?</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="font-bold text-rose-400 block tracking-wider uppercase text-[10px] font-mono">Planilhas Gerais Estáticas:</span>
                  <p className="text-slate-400">Você se sente culpado, tenta empilhar o treino perdido, treina dolorido sem orientação e acaba se fadigando ou lesionando.</p>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-[#00E676] block tracking-wider uppercase text-[10px] font-mono font-black flex items-center gap-1">
                    <Check className="w-3 h-3 text-[#00E676]" /> Biker AI Inteligente:
                  </span>
                  <p className="text-slate-200">Você simplesmente atualiza sua disponibilidade nas configurações. Nossa IA reorganiza a planilha e os descansos do restante da semana instantaneamente para se ajustar à sua rotina real.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO COMO É FÁCIL USAR O BIKER AI */}
      <section id="como-funciona" className="relative py-24 px-4 sm:px-6 md:px-12 bg-[#0B0F17] border-t border-slate-800/80 scroll-mt-24">
        <div className="max-w-7xl mx-auto w-full space-y-16 relative z-10">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-[10px] bg-lime-500/10 border border-lime-500/20 text-lime-400 font-black px-3.5 py-1 rounded-full uppercase tracking-widest font-mono">
              Sem Complicação
            </span>
            <h3 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-white">
              Sua planilha de treinos no piloto automático: <span className="text-lime-400">veja como é fácil</span>
            </h3>
            <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
              Você não precisa entender de fisiologia de esporte, cálculos de watts ou passar horas configurando tabelas confusas. A inteligência artificial cuida de tudo para você pedalar melhor em apenas 3 passos simples.
            </p>
          </div>

          {/* Gráfico de Passos Simplificado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Passo 1 */}
            <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-5 text-left relative overflow-hidden group hover:border-lime-400/40 hover:shadow-lg transition-all shadow-md backdrop-blur-xs">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400 flex items-center justify-center font-heading font-black text-lg">
                  1
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-semibold">
                  Leva 1 minuto
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-heading font-black text-white">Nos conte seus objetivos</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  Responda a perguntas rápidas sobre quantos dias quer treinar na semana, seu nível atual e seus objetivos reais — seja ganhar fôlego em subidas, perder peso ou completar um desafio de longa distância com amigos.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider block">O que você responde:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-200 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">"Tenho 3 dias livres por semana"</span>
                  <span className="text-[10px] text-slate-200 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">"Quero subir sem cansar tanto"</span>
                </div>
              </div>
            </div>

            {/* Passo 2 */}
            <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-5 text-left relative overflow-hidden group hover:border-lime-400/40 hover:shadow-lg transition-all shadow-md backdrop-blur-xs">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400 flex items-center justify-center font-heading font-black text-lg">
                  2
                </div>
                <span className="text-[10px] font-mono text-lime-400 bg-lime-500/10 px-2.5 py-1 rounded-lg border border-lime-500/20 font-bold">
                  Planilha na Hora
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-heading font-black text-white">Sua planilha sob medida</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  Nossa IA calcula suas zonas de esforço de forma automática (por percepção de esforço ou watts de forma totalmente invisível). Você não precisa entender de tabelas difíceis: a IA faz todo o cálculo chato nos bastidores por você.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider block">A IA Cuida de Tudo nos Bastidores:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-lime-400 bg-lime-500/10 px-2.5 py-1 rounded border border-lime-500/20 font-medium">Zonas de Ritmo Descomplicadas</span>
                  <span className="text-[10px] text-lime-400 bg-lime-500/10 px-2.5 py-1 rounded border border-lime-500/20 font-medium">Watts & Frequência Automáticos</span>
                </div>
              </div>
            </div>

            {/* Passo 3 */}
            <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-5 text-left relative overflow-hidden group hover:border-lime-400/40 hover:shadow-lg transition-all shadow-md backdrop-blur-xs">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400 flex items-center justify-center font-heading font-black text-lg">
                  3
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-bold">
                  Recalibrar é Rápido
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-heading font-black text-white">Flexibilidade que te entende</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  Marcou o pedal como finalizado? Registre de forma super rápida suas sensações e percepção de esforço. Se precisar saltar algum treino por imprevisto, o sistema reagenda toda a semana de forma inteligente!
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider block">Flexibilidade Real:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-[#00E676] bg-[#00E676]/10 px-2.5 py-1 rounded border border-[#00E676]/20">Registro de Esforço</span>
                  <span className="text-[10px] text-[#00E676] bg-[#00E676]/10 px-2.5 py-1 rounded border border-[#00E676]/20">Adaptação sob Imprevistos</span>
                </div>
              </div>
            </div>

          </div>

          {/* CTA Box de Alta Conversão */}
          <div className="pt-4 text-center flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button 
              type="button" 
              onClick={() => scrollToSection("auth-section", true)}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 active:scale-[0.98] text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-lime-500/20 transition-all cursor-pointer border-none"
            >
              <span>Criar meu treino grátis</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection("planos")}
              className="inline-flex items-center justify-center gap-1 px-4 py-3 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer bg-transparent border-none"
            >
              <span>Ver planos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* SEÇÃO: VEJA COMO SEU TREINO PODE FICAR (DEMONSTRAÇÃO REAL DO PRODUTO) */}
      <section id="exemplo-treino" className="py-20 sm:py-24 px-4 sm:px-6 md:px-12 bg-slate-950 border-t border-slate-800/80 scroll-mt-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto w-full space-y-12 relative z-10">
          
          {/* Cabeçalho da Seção */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[10px] bg-lime-500/10 border border-lime-500/20 text-lime-400 font-black px-3.5 py-1 rounded-full uppercase tracking-widest font-mono">
              Demonstração Real do App
            </span>
            <h3 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-white">
              Veja como seu treino pode ficar
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              Uma prévia real de como sua semana é estruturada dentro do Biker AI: intensidade balanceada, zonas fisiológicas claras e descansos estratégicos.
            </p>
          </div>

          {/* O Card Central de Demonstração (Estilo Autêntico do Biker AI) */}
          <div className="max-w-5xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xs">
            
            {/* Topo simulando o app Biker AI */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-lime-500/10 border border-lime-500/25 text-lime-400 flex items-center justify-center font-bold">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-heading font-black text-white uppercase tracking-wider">Biker AI</span>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Planilha Ativa
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans">Microciclo Personalizado de Treinamento</p>
                </div>
              </div>

              {/* Indicadores do Atleta */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-slate-300">
                  3 treinos + 2 descansos
                </span>
                <span className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-slate-300">
                  Volume: ≈ 3h50
                </span>
                <span className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-lime-400 font-bold">
                  Distância: ≈ 75 km
                </span>
              </div>
            </div>

            {/* Banner da Semana: SEMANA 1 & Objetivo: Aumentar resistência */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black uppercase tracking-widest text-lime-400 bg-lime-500/20 border border-lime-500/30 px-3 py-0.5 rounded-full">
                    SEMANA 1
                  </span>
                  <span className="text-xs text-slate-500 font-mono">•</span>
                  <span className="text-xs text-emerald-400 font-mono font-semibold">Foco: Construção de Base</span>
                </div>
                <h4 className="text-xl sm:text-2xl font-heading font-black text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-lime-400 shrink-0" />
                  <span>Objetivo: Aumentar resistência</span>
                </h4>
                <p className="text-xs text-slate-300 font-sans leading-relaxed max-w-2xl">
                  Sessões calculadas para elevar o fôlego e capacidade muscular de forma progressiva, alternando rodagens aeróbicas, intervalados de limiar e regeneração biológica.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono block">Distribuição 80/20</span>
                  <span className="text-xs font-bold text-lime-400">80% Base • 20% Limiar</span>
                </div>
              </div>
            </div>

            {/* Seletor rápido de dias no mobile para navegação instantânea */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:hidden">
              {[
                { id: "segunda", label: "Seg", title: "Descanso" },
                { id: "terca", label: "Ter", title: "Endurance 1h" },
                { id: "quarta", label: "Qua", title: "Descanso" },
                { id: "quinta", label: "Qui", title: "Intervalado 50m" },
                { id: "sabado", label: "Sáb", title: "Pedal longo 2h" },
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDemoActiveDay(d.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                    demoActiveDay === d.id
                      ? "bg-lime-400 text-slate-950 border-lime-400"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  <span className="font-black">{d.label}:</span> {d.title}
                </button>
              ))}
            </div>

            {/* Grid dos Dias da Semana (Cards com a Identidade Real do Biker AI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
              
              {/* DIA 1: SEGUNDA - DESCANSO */}
              <div 
                onClick={() => setDemoActiveDay("segunda")}
                className={`p-4 rounded-2xl bg-slate-950/80 border flex flex-col justify-between space-y-4 transition-all cursor-pointer text-left ${
                  demoActiveDay === "segunda" 
                    ? "border-amber-400/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40" 
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Segunda
                    </span>
                    <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Folga
                    </span>
                  </div>

                  <div>
                    <h5 className="text-base font-heading font-black text-white">
                      Descanso
                    </h5>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                      Recuperação Biológica
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-300 space-y-1 font-sans leading-relaxed">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[10px]">
                      <Smile className="w-3.5 h-3.5" />
                      <span>Reconstrução muscular</span>
                    </div>
                    <p className="text-[10.5px] text-slate-400">
                      Descanso passivo para iniciar a semana com baterias 100% carregadas.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl py-2 px-2.5 flex items-center justify-center gap-1.5 text-[10px] font-heading font-black uppercase tracking-wider">
                    <Smile className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Dia de Folga</span>
                  </div>
                </div>
              </div>

              {/* DIA 2: TERÇA - ENDURANCE */}
              <div 
                onClick={() => setDemoActiveDay("terca")}
                className={`p-4 rounded-2xl bg-slate-950/80 border flex flex-col justify-between space-y-4 transition-all cursor-pointer text-left ${
                  demoActiveDay === "terca" 
                    ? "border-emerald-400/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/40" 
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Terça
                    </span>
                    <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Zona 2
                    </span>
                  </div>

                  <div>
                    <h5 className="text-base font-heading font-black text-white">
                      Endurance
                    </h5>
                    <span className="text-[10px] font-mono text-emerald-400 block mt-0.5">
                      Base Aeróbica
                    </span>
                  </div>

                  {/* Métricas Principais: 1h | Zona 2 | ≈ 25 km */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-mono uppercase block">DURAÇÃO</span>
                      <span className="text-xs font-mono font-black text-white mt-0.5 block">1h</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-mono uppercase block">ZONA</span>
                      <span className="text-xs font-mono font-black text-emerald-400 mt-0.5 block">Zona 2</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 col-span-2">
                      <span className="text-[9px] text-slate-400 font-mono uppercase block">DISTÂNCIA ESTIMADA</span>
                      <span className="text-xs font-mono font-black text-lime-400 mt-0.5 block">≈ 25 km</span>
                    </div>
                  </div>

                  {/* Estrutura visual Biker AI */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10.5px] text-slate-300 font-mono space-y-1">
                    <p className="text-slate-400 text-[9px] uppercase font-bold">Estrutura:</p>
                    <p>• 10m aquecimento Z1</p>
                    <p className="text-emerald-300">• 40m constante em Z2</p>
                    <p>• 10m giro solto</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="bg-slate-900 hover:bg-slate-850 text-lime-400 border border-slate-700/80 rounded-xl py-2 px-2.5 flex items-center justify-center gap-1.5 text-[10px] font-heading font-black uppercase tracking-wider">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Concluir Treino</span>
                  </div>
                </div>
              </div>

              {/* DIA 3: QUARTA - DESCANSO */}
              <div 
                onClick={() => setDemoActiveDay("quarta")}
                className={`p-4 rounded-2xl bg-slate-950/80 border flex flex-col justify-between space-y-4 transition-all cursor-pointer text-left ${
                  demoActiveDay === "quarta" 
                    ? "border-amber-400/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40" 
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Quarta
                    </span>
                    <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Folga
                    </span>
                  </div>

                  <div>
                    <h5 className="text-base font-heading font-black text-white">
                      Descanso
                    </h5>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                      Pausa Estratégica
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-300 space-y-1 font-sans leading-relaxed">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[10px]">
                      <Heart className="w-3.5 h-3.5" />
                      <span>Assimilação de treino</span>
                    </div>
                    <p className="text-[10.5px] text-slate-400">
                      Dia livre para o corpo assimilar o endurance e chegar forte no intervalado.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl py-2 px-2.5 flex items-center justify-center gap-1.5 text-[10px] font-heading font-black uppercase tracking-wider">
                    <Smile className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Dia de Folga</span>
                  </div>
                </div>
              </div>

              {/* DIA 4: QUINTA - INTERVALADO */}
              <div 
                onClick={() => setDemoActiveDay("quinta")}
                className={`p-4 rounded-2xl bg-slate-950/80 border flex flex-col justify-between space-y-4 transition-all cursor-pointer text-left ${
                  demoActiveDay === "quinta" 
                    ? "border-orange-400/80 shadow-lg shadow-orange-500/10 ring-1 ring-orange-400/40" 
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Quinta
                    </span>
                    <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">
                      Zona 4
                    </span>
                  </div>

                  <div>
                    <h5 className="text-base font-heading font-black text-white">
                      Intervalado
                    </h5>
                    <span className="text-[10px] font-mono text-orange-400 block mt-0.5">
                      Limiar de Potência
                    </span>
                  </div>

                  {/* Métricas Principais: 50 min | 6 × 3 min forte */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-mono uppercase block">DURAÇÃO</span>
                      <span className="text-xs font-mono font-black text-white mt-0.5 block">50 min</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-mono uppercase block">INTENSIDADE</span>
                      <span className="text-xs font-mono font-black text-orange-400 mt-0.5 block">Zona 4</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 col-span-2">
                      <span className="text-[9px] text-slate-400 font-mono uppercase block">SÉRIES CHAVE</span>
                      <span className="text-xs font-mono font-black text-amber-300 mt-0.5 block">6 × 3 min forte</span>
                    </div>
                  </div>

                  {/* Estrutura visual Biker AI */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10.5px] text-slate-300 font-mono space-y-1">
                    <p className="text-slate-400 text-[9px] uppercase font-bold">Estrutura:</p>
                    <p>• 10m aquecimento</p>
                    <p className="text-orange-300">• 6x (3m Z4 + 2m Z1)</p>
                    <p>• 10m desaquecimento</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="bg-slate-900 hover:bg-slate-850 text-lime-400 border border-slate-700/80 rounded-xl py-2 px-2.5 flex items-center justify-center gap-1.5 text-[10px] font-heading font-black uppercase tracking-wider">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Concluir Treino</span>
                  </div>
                </div>
              </div>

              {/* DIA 5: SÁBADO - PEDAL LONGO */}
              <div 
                onClick={() => setDemoActiveDay("sabado")}
                className={`p-4 rounded-2xl bg-slate-950/80 border flex flex-col justify-between space-y-4 transition-all cursor-pointer text-left ${
                  demoActiveDay === "sabado" 
                    ? "border-sky-400/80 shadow-lg shadow-sky-500/10 ring-1 ring-sky-400/40" 
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Sábado
                    </span>
                    <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      Zona 2
                    </span>
                  </div>

                  <div>
                    <h5 className="text-base font-heading font-black text-white">
                      Pedal longo
                    </h5>
                    <span className="text-[10px] font-mono text-sky-400 block mt-0.5">
                      Resistência Chave
                    </span>
                  </div>

                  {/* Métricas Principais: 2h | ≈ 50 km */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-mono uppercase block">DURAÇÃO</span>
                      <span className="text-xs font-mono font-black text-white mt-0.5 block">2h</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-mono uppercase block">ZONA</span>
                      <span className="text-xs font-mono font-black text-sky-400 mt-0.5 block">Zona 2</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 col-span-2">
                      <span className="text-[9px] text-slate-400 font-mono uppercase block">DISTÂNCIA ESTIMADA</span>
                      <span className="text-xs font-mono font-black text-lime-400 mt-0.5 block">≈ 50 km</span>
                    </div>
                  </div>

                  {/* Estrutura visual Biker AI */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10.5px] text-slate-300 font-mono space-y-1">
                    <p className="text-slate-400 text-[9px] uppercase font-bold">Estrutura:</p>
                    <p>• Rodagem contínua</p>
                    <p className="text-sky-300">• Ritmo sustentável</p>
                    <p>• Hidratação 500ml/h</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="bg-slate-900 hover:bg-slate-850 text-lime-400 border border-slate-700/80 rounded-xl py-2 px-2.5 flex items-center justify-center gap-1.5 text-[10px] font-heading font-black uppercase tracking-wider">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Concluir Treino</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Texto e CTA Solicitados Abaixo do Card */}
          <div className="text-center space-y-5 max-w-xl mx-auto pt-2">
            <p className="text-sm sm:text-base text-slate-200 font-sans font-medium leading-relaxed">
              "Seu plano será criado de acordo com seu nível, objetivo e disponibilidade."
            </p>

            <div className="flex flex-col items-center gap-2.5">
              <button 
                type="button" 
                onClick={() => scrollToSection("auth-section", true)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 active:scale-[0.98] text-slate-950 text-sm font-black uppercase tracking-wider rounded-xl shadow-xl shadow-lime-500/20 transition-all cursor-pointer border-none"
              >
                <span>Criar meu treino grátis</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-slate-400 font-sans">
                Leva menos de 1 minuto • Sem necessidade de cartão de crédito
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Benefits Section with Bento Grid Layout */}
      <section id="beneficios" className="bg-slate-900/30 border-y border-slate-800/80 py-24 px-4 sm:px-6 md:px-12 scroll-mt-24 relative">
        <div className="max-w-7xl mx-auto w-full space-y-12 relative z-10">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[10px] bg-lime-500/10 border border-lime-500/20 text-lime-400 font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
              Ecossistema Completo
            </span>
            <h3 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-white">
              Os Benefícios de Treinar Com a <span className="text-lime-400">Biker AI</span>
            </h3>
            <p className="text-sm text-slate-300 font-sans leading-relaxed">
              Pensamos em cada detalhe para ajudar ciclistas que precisam dividir o tempo entre família, trabalho e o prazer de pedalar com qualidade, sem complicação.
            </p>
          </div>

          {/* Bento grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 hover:shadow-lg transition-all group space-y-4 text-left shadow-md">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-lime-500/10 border border-lime-500/20 text-lime-400 flex items-center justify-center">
                  <Activity className="w-5 h-5 group-hover:animate-pulse" />
                </div>
                <h4 className="font-heading font-black text-base text-white">Planilhas Fáceis de Seguir</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Treinos pensados totalmente para a sua rotina diária. O sistema cria e ajusta as sessões de acordo com o seu cansaço e o seu tempo livre.
                </p>
              </div>
              <span className="text-[10px] font-bold text-lime-400 uppercase tracking-widest font-mono">100% Adaptável</span>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 hover:shadow-lg transition-all group space-y-4 text-left shadow-md">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-black text-base text-white">Zonas de Ritmo Claras</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Zonas de esforço sob medida para você, adaptadas para a sua frequência cardíaca e potência, evitando cansaço excessivo.
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Guia de Zonas</span>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 hover:shadow-lg transition-all group space-y-4 text-left shadow-md">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-black text-base text-white">Progresso Sem Mistério</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gráficos super simples e limpos que mostram as suas metas de treino, total de horas pedaladas e a evolução da sua resistência semanal.
                </p>
              </div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">Painel Claro</span>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 hover:shadow-lg transition-all group space-y-4 text-left shadow-md">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-black text-base text-white">Pedaladas Automáticas</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Grave seus treinos ou junte suas atividades para que suas pedaladas fiquem registradas diretamente em sua conta sem trabalho manual no dia a dia.
                </p>
              </div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono">Fácil Sem Esforço</span>
            </div>

            {/* Card 5: Coach AI no Chat - Apoio Contínuo */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-lime-500/30 flex flex-col justify-between hover:border-lime-400/50 hover:shadow-lg transition-all group space-y-4 text-left shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3">
                <span className="text-[9px] font-mono font-black uppercase text-lime-400 bg-lime-500/10 border border-lime-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Apoio Contínuo
                </span>
              </div>
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-lime-500/10 border border-lime-500/20 text-lime-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-black text-base text-white">Coach AI • Apoio Contínuo</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tire dúvidas a qualquer hora sobre dosagem de ritmo nas subidas, nutrição intra-treino, hidratação no calor e recuperação muscular.
                </p>
              </div>
              <span className="text-[10px] font-bold text-lime-400 uppercase tracking-widest font-mono flex items-center gap-1">
                Especialista no Bolso <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 hover:shadow-lg transition-all group space-y-4 text-left shadow-md">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-black text-base text-white">Organize do Seu Jeito</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Selecione os dias da semana em que você tem fôlego ou disponibilidade para pedalar. O sistema cria e distribui os treinos de acordo com o seu plano.
                </p>
              </div>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest font-mono">Controle Completo</span>
            </div>

          </div>

          {/* CTA Box de Alta Conversão no Fim de Benefícios */}
          <div className="pt-6 text-center flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button 
              type="button" 
              onClick={() => scrollToSection("auth-section", true)}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 active:scale-[0.98] text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-lime-500/20 transition-all cursor-pointer border-none"
            >
              <span>Criar meu treino grátis</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection("planos")}
              className="inline-flex items-center justify-center gap-1 px-4 py-3 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer bg-transparent border-none"
            >
              <span>Ver planos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* Seção de Planos e Valores (Secundária no Funil) */}
      <section id="planos" className="py-20 px-4 sm:px-6 md:px-12 bg-slate-950 border-t border-slate-800/80 text-left scroll-mt-24 relative">
        <div id="garantia" className="max-w-5xl mx-auto w-full space-y-10">
          
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <span className="text-[10px] bg-lime-500/10 border border-lime-500/20 text-lime-400 font-black px-3.5 py-1 rounded-full uppercase tracking-wider font-mono">
              Planos & Valores
            </span>
            <h3 className="text-2xl sm:text-4xl font-heading font-black text-white tracking-tight">
              Experimente grátis antes de pagar
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              Crie seu primeiro treino personalizado sem custo e sem cadastrar cartão. Quando quiser acompanhamento contínuo e evolução todas as semanas, assine o plano Pro.
            </p>
          </div>

          {/* Cards de Comparação de Planos: Degustação vs Pro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* Card 1: Treino Grátis (Ação Principal Incentivada) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border-2 border-lime-400/50 hover:border-lime-400 transition-all flex flex-col justify-between space-y-6 shadow-xl relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-lime-500/20 text-lime-300 border border-lime-500/30 px-3 py-1 rounded-full">
                    Ação Recomendada
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Fricção Zero</span>
                </div>

                <div>
                  <h4 className="text-xl font-heading font-black text-white">Primeiro Treino Grátis</h4>
                  <p className="text-xs text-slate-300 mt-1">Experimente a inteligência artificial sem nenhum compromisso financeiro.</p>
                </div>

                <div className="pt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-heading font-black text-lime-400">R$ 0</span>
                  <span className="text-xs text-slate-400 font-sans">/ para começar</span>
                </div>

                <ul className="space-y-2.5 pt-4 border-t border-slate-800 text-xs text-slate-300 font-sans">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-lime-400 shrink-0 stroke-[3]" />
                    <span>Crie seu 1º treino sob medida em 1 minuto</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-lime-400 shrink-0 stroke-[3]" />
                    <span>Cálculo individual de Zonas de Ritmo e Potência</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-lime-400 shrink-0 stroke-[3]" />
                    <span>Acesso ao Coach AI para dúvidas técnicas</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-lime-400 shrink-0 stroke-[3]" />
                    <span>Sem necessidade de cartão de crédito</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => scrollToSection("auth-section", true)}
                  className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 active:scale-[0.98] text-slate-950 text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-lime-500/25 transition-all cursor-pointer border-none"
                >
                  <span>Criar meu treino grátis</span>
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-2">Acesso imediato após cadastro simples</p>
              </div>
            </div>

            {/* Card 2: Assinatura Biker AI Pro (Transparência Completa) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-6 shadow-md relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-lime-500/10 text-lime-400 border border-lime-500/20 px-3 py-1 rounded-full">
                    Plano Pro • Sem Fidelidade
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    R$ 0,56 / dia
                  </span>
                </div>

                <div>
                  <h4 className="text-xl font-heading font-black text-white">Biker AI Pro</h4>
                  <p className="text-xs text-slate-400 mt-1">Evolução contínua semanal com apoio permanente do treinador.</p>
                </div>

                {/* Preço e Periodicidade Claros */}
                <div className="pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-heading font-black text-white">R$ 16,90</span>
                    <span className="text-xs text-slate-400 font-sans">/ mês</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 block mt-1">
                    Cobrança mensal recorrente a cada 30 dias
                  </span>
                </div>

                {/* O que está incluído */}
                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-heading">
                    O que está incluído:
                  </span>
                  <ul className="space-y-2 text-xs text-slate-300 font-sans">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                      <span>Treinos minuto a minuto estruturados para seu fôlego</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                      <span>Recalibração automática quando sua rotina mudar</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                      <span>Calculadora de zonas (potência FTP, FC e PSE)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                      <span>Histórico de evolução e questionário pós-treino</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                      <span>Treinador AI no chat com orientações ilimitadas</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                      <span>Exportação e impressão das planilhas em PDF</span>
                    </li>
                  </ul>
                </div>

                {/* Como funciona o cancelamento */}
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-1 text-left">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-lime-400 block">
                    Como funciona o cancelamento?
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    Cancele a qualquer momento em 1 clique na sua conta do Mercado Pago ou enviando um e-mail para <span className="text-white">bikeraisupport@gmail.com</span>. Sem multas, sem taxas rescisórias e você continua com acesso até o fim dos 30 dias já pagos.
                  </p>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <a
                  href={MERCADO_PAGO_CHECKOUT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-heading font-black uppercase tracking-wider rounded-2xl transition-all shadow-md cursor-pointer"
                >
                  <span>Assinar Pro por R$ 16,90/mês</span>
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                </a>

                {/* Informações Discretas Próximo da Assinatura */}
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-400 text-center font-medium pt-1">
                  <span className="flex items-center gap-1 text-slate-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    Pagamento seguro
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                    Cancele quando quiser
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Lock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    Seus dados protegidos
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Selos de Confiança e Garantias */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            {/* Card 1: Garantia */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h5 className="font-heading font-bold text-xs text-white">Garantia de 7 Dias</h5>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Se não gostar da sua experiência, devolvemos 100% do seu valor dentro de 7 dias. Basta solicitar ao suporte.
              </p>
            </div>

            {/* Card 2: Sem Fidelidade */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-lime-500/10 border border-lime-500/20 text-lime-400 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <h5 className="font-heading font-bold text-xs text-white">Cancele Quando Quiser</h5>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Sem contrato de fidelidade ou taxas de rescisão. Você tem autonomia total sobre a sua assinatura.
              </p>
            </div>

            {/* Card 3: Pagamento Seguro */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h5 className="font-heading font-bold text-xs text-white">Pagamento Seguro</h5>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Processado com segurança pelo Mercado Pago via Pix ou Cartão. Seus dados financeiros não ficam nos nossos servidores.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Centered Auth Section */}
      <section id="auth-section" className="relative py-24 px-4 sm:px-6 md:px-12 bg-slate-950 border-t border-slate-800/80 scroll-mt-24">
        <div className="max-w-xl mx-auto w-full relative z-10 space-y-6">
          
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl p-6 sm:p-8 backdrop-blur-xl relative z-10 space-y-6">
            
            {/* Logo e Welcome */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex p-2.5 bg-lime-500/10 border border-lime-500/20 rounded-2xl text-lime-400 mb-1">
                <Bike className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-black text-lg tracking-tight uppercase text-white">
                {isLogin ? "Entrar no Portal do Atleta" : "Criar Meu Treino Grátis"}
              </h3>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {isLogin 
                  ? "Coloque seu e-mail e senha abaixo para ver seus treinos de hoje e falar com seu treinador." 
                  : "Cadastre-se em menos de 1 minuto para estruturar seu primeiro treino personalizado. Sem cartão de crédito."
                }
              </p>
            </div>

            {/* Destaque de Alto Valor: Coach AI Incluso na sua Conta */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-lime-500/30 text-left space-y-3 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-lime-500/15 border border-lime-500/30 text-lime-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-heading font-black text-white uppercase tracking-tight flex items-center gap-2">
                      Incluso: Coach AI • Apoio Contínuo
                      <span className="text-[9px] font-mono font-bold bg-lime-500/20 text-lime-300 px-2 py-0.5 rounded-full">No seu Bolso</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans">Apoio técnico e fisiológico para cada pedalada</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-sans">
                <div className="flex items-start gap-2">
                  <span className="text-lime-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span><strong>Estratégia de Fisiologia & Ritmo:</strong> Aprenda a dosar o esforço em subidas longas e a girar na cadência correta (85–90 RPM) para preservar os joelhos e não quebrar no trajeto.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lime-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span><strong>Nutrição & Hidratação Precisa:</strong> Saiba exatamente quanto de água, sódio (mg) e carboidrato por hora ingerir de acordo com o seu peso e a temperatura do dia.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lime-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span><strong>Mecânica & Prevenção de Dores:</strong> Dicas práticas de calibração de pneus para cada terreno, marchas ideais para aclives e alívio de desconfortos na lombar.</span>
                </div>
              </div>
            </div>

            {/* Selector de Abas */}
            <div className="flex p-0.5 bg-slate-950 rounded-xl border border-slate-800">
              <button 
                type="button"
                onClick={() => { setIsLogin(false); setError(""); setSuccessMsg(""); }}
                className={`flex-1 py-2 text-[11px] font-bold font-heading rounded-lg uppercase transition-all cursor-pointer ${!isLogin ? 'bg-slate-800 text-lime-400 shadow-sm border border-slate-700' : 'text-slate-400 hover:text-white'}`}
              >
                Criar Treino Grátis
              </button>
              <button 
                type="button"
                onClick={() => { setIsLogin(true); setError(""); setSuccessMsg(""); }}
                className={`flex-1 py-2 text-[11px] font-bold font-heading rounded-lg uppercase transition-all cursor-pointer ${isLogin ? 'bg-slate-800 text-lime-400 shadow-sm border border-slate-700' : 'text-slate-400 hover:text-white'}`}
              >
                Já Tenho Conta (Entrar)
              </button>
            </div>

            {/* Alertas de Status */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex gap-2.5 items-start text-left"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex gap-2.5 items-start text-left"
                >
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              
              {/* Campo Nome (Apenas Cadastro) */}
              {!isLogin && (
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300">Seu Nome de Atleta</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Pedro Henrique"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-lime-400 rounded-xl pl-10 pr-4 py-3 text-xs outline-hidden focus:ring-1 focus:ring-lime-400 transition-all text-white placeholder:text-slate-600 font-heading font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Campo Email */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300">E-mail de Cadastro</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="email"
                    required
                    placeholder="atleta@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-lime-400 rounded-xl pl-10 pr-4 py-3 text-xs outline-hidden focus:ring-1 focus:ring-lime-400 transition-all text-white placeholder:text-slate-600 font-mono"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300">Senha Privada</label>
                  {isLogin && <span className="text-[9px] text-slate-400 select-none">Mínimo 6 dígitos</span>}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-lime-400 rounded-xl pl-10 pr-10 py-3 text-xs outline-hidden focus:ring-1 focus:ring-lime-400 transition-all text-white placeholder:text-slate-600 font-mono"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className={`w-full bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 active:scale-98 text-slate-950 py-3.5 px-4 rounded-xl text-xs font-black font-heading uppercase tracking-wider flex items-center justify-center gap-2 transition-all mt-6 shadow-lg shadow-lime-500/20 cursor-pointer border-none ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>{isLogin ? "Acessando Portal..." : "Criando seu treino grátis..."}</span>
                  </>
                ) : (
                  <>
                    <span>{isLogin ? "Acessar Portal do Atleta" : "Criar meu treino grátis"}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Trust and Guarantees Micro-copy */}
            <div className="pt-2 text-center space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-slate-400 font-sans font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
                  Garantia de 7 Dias
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-lime-400" />
                  Cancele Quando Quiser
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-lime-400" />
                  Pagamento Seguro Mercado Pago
                </span>
              </div>
            </div>

            {/* App installation container */}
            <div className="pt-4 border-t border-slate-800 text-center space-y-3">
              {isPortable ? (
                <div className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Aplicativo Instalado com Sucesso</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="inline-flex justify-center items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors uppercase tracking-wider font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Baixar Biker AI no seu Celular</span>
                </button>
              )}

              <div className="pt-1 flex justify-center">
                <a
                  href="mailto:bikeraisupport@gmail.com"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-sm max-w-full"
                >
                  <Mail className="w-4 h-4 text-lime-400 shrink-0" />
                  <span className="leading-tight">Dúvidas? Envie um email para <strong>bikeraisupport@gmail.com</strong></span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 px-4 sm:px-6 md:px-12 text-slate-400 font-sans text-xs pb-24 sm:pb-12 space-y-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 text-center sm:text-left">
          
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 rounded-xl text-lime-400 border border-slate-800">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-white">BIKER AI</p>
              <p className="text-[10px] text-slate-500 font-mono">Planilhas Inteligentes de Ciclismo</p>
            </div>
          </div>

          {/* Navegação Principal */}
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-xs">
            <button type="button" onClick={() => scrollToSection("como-funciona")} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-slate-400">Como funciona</button>
            <span className="text-slate-700 hidden xs:inline">•</span>
            <button type="button" onClick={() => scrollToSection("exemplo-treino")} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-slate-400">Exemplo de treino</button>
            <span className="text-slate-700 hidden xs:inline">•</span>
            <button type="button" onClick={() => scrollToSection("beneficios")} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-slate-400">Benefícios</button>
            <span className="text-slate-700 hidden xs:inline">•</span>
            <button type="button" onClick={() => scrollToSection("planos")} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-slate-400">Ver planos</button>
            <span className="text-slate-700 hidden xs:inline">•</span>
            <button type="button" onClick={() => scrollToSection("auth-section", false)} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-slate-400">Entrar</button>
            <span className="text-slate-700 hidden xs:inline">•</span>
            <button type="button" onClick={() => scrollToSection("auth-section", true)} className="text-lime-400 hover:text-lime-300 font-bold transition-colors cursor-pointer bg-transparent border-none p-0">Criar treino grátis</button>
          </div>

          {/* Botão de Contato Rápido */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setShowContact(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Mail className="w-4 h-4 text-lime-400 shrink-0" />
              <span>Fale Conosco / Suporte</span>
            </button>
          </div>

        </div>

        {/* Guias e Artigos Técnicos de Ciclismo para SEO e Conhecimento */}
        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-lime-400" />
              Guias e Treinos de Ciclismo
            </span>
            <span className="text-[11px] text-slate-500">Conteúdos técnicos elaborados para sua evolução</span>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-xs">
            <a
              href="/treino-ciclismo-iniciante"
              onClick={(e) => {
                if (onNavigateSlug) {
                  e.preventDefault();
                  onNavigateSlug("treino-ciclismo-iniciante");
                }
              }}
              className="text-slate-400 hover:text-lime-400 transition-colors py-1"
            >
              Treino para Iniciantes
            </a>
            <span className="text-slate-800 hidden sm:inline">•</span>
            <a
              href="/planilha-treino-ciclismo"
              onClick={(e) => {
                if (onNavigateSlug) {
                  e.preventDefault();
                  onNavigateSlug("planilha-treino-ciclismo");
                }
              }}
              className="text-slate-400 hover:text-lime-400 transition-colors py-1"
            >
              Planilha de Treino
            </a>
            <span className="text-slate-800 hidden sm:inline">•</span>
            <a
              href="/treino-ciclismo-emagrecer"
              onClick={(e) => {
                if (onNavigateSlug) {
                  e.preventDefault();
                  onNavigateSlug("treino-ciclismo-emagrecer");
                }
              }}
              className="text-slate-400 hover:text-lime-400 transition-colors py-1"
            >
              Treino para Emagrecer
            </a>
            <span className="text-slate-800 hidden sm:inline">•</span>
            <a
              href="/treino-100km"
              onClick={(e) => {
                if (onNavigateSlug) {
                  e.preventDefault();
                  onNavigateSlug("treino-100km");
                }
              }}
              className="text-slate-400 hover:text-lime-400 transition-colors py-1"
            >
              Como Treinar para 100 km
            </a>
            <span className="text-slate-800 hidden sm:inline">•</span>
            <a
              href="/zona-2-ciclismo"
              onClick={(e) => {
                if (onNavigateSlug) {
                  e.preventDefault();
                  onNavigateSlug("zona-2-ciclismo");
                }
              }}
              className="text-slate-400 hover:text-lime-400 transition-colors py-1"
            >
              Zona 2 no Ciclismo
            </a>
          </div>
        </div>

        {/* Links Institucionais e Legais: Termos de Uso, Política de Privacidade e Contato */}
        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-xs font-medium">
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-slate-300 hover:text-lime-400 transition-colors cursor-pointer underline-offset-4 hover:underline"
            >
              Termos de Uso
            </button>
            <span className="text-slate-700">•</span>
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="text-slate-300 hover:text-lime-400 transition-colors cursor-pointer underline-offset-4 hover:underline"
            >
              Política de Privacidade
            </button>
            <span className="text-slate-700">•</span>
            <button
              type="button"
              onClick={() => setShowContact(true)}
              className="text-slate-300 hover:text-lime-400 transition-colors cursor-pointer underline-offset-4 hover:underline"
            >
              Contato
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Pagamento seguro
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-lime-400" />
              Cancele quando quiser
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              Seus dados protegidos
            </span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-4 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-center text-[10px] text-slate-500 font-mono">
          <span>© 2026 Biker AI. Versão 2.1 • Todos os direitos reservados.</span>
          <span>bikeraisupport@gmail.com</span>
        </div>
      </footer>

      {/* Modais Legais e de Contato */}
      <TermsOfUseModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />

      {/* Guide overlay installation guide */}
      <AnimatePresence>
        {showInstallGuide && (
          <div id="install-guide-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              id="install-guide-modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 relative font-sans text-white text-left"
            >
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-950 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="p-2.5 bg-lime-500/10 border border-lime-500/20 rounded-2xl text-lime-400">
                  <Smartphone className="w-5 h-5" />
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
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded-md text-[9px] font-bold tracking-wider uppercase font-heading">
                    No iPhone (Safari / iOS)
                  </span>
                  <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed pl-1 font-medium">
                    <li>
                      Toque no botão de <span className="inline-flex items-center gap-1 px-1 py-0.5 bg-slate-800 rounded text-slate-200 text-[10px]"><Share className="w-3 h-3 text-slate-300 inline" /> Compartilhar</span> na barra inferior do Safari.
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
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
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

                <div className="bg-lime-500/10 p-3 rounded-xl border border-lime-500/20 text-[11px] text-lime-300 flex items-start gap-2">
                  <span className="font-extrabold select-none">VANTAGENS:</span>
                  <span className="leading-relaxed text-slate-300">Instalar o aplicativo garante carregamento instantâneo, menos consumo de internet, suporte offline e navegação livre de barras do navegador!</span>
                </div>

              </div>

              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="w-full bg-gradient-to-r from-lime-400 to-emerald-400 text-slate-950 font-black font-heading py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all hover:from-lime-300 hover:to-emerald-300 cursor-pointer border-none shadow-md shadow-lime-500/20"
              >
                Entendi, fechar instrução
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
