import React, { useState } from "react";
import { UserAccount, UserProfile, ChatMessage } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Dumbbell, ShieldAlert, Sparkles, Mail, Lock, User, Eye, EyeOff, Bike, 
  ChevronRight, CheckCircle, Download, Smartphone, Share, X, ExternalLink,
  Activity, TrendingUp, Zap, Award, MessageSquare, Calendar, Heart, Percent, Star, Check,
  Play, Pause, Sliders, Gauge
} from "lucide-react";
const bikerHero = "/src/assets/images/biker_hero_1780860230528.png";

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

    try {
      if (isLogin) {
        // Contact the cloud server for login
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailKey, password })
        });

        const status = response.status;
        const resText = await response.text().catch(() => "");
        
        let errData: any = null;
        try {
          if (resText) {
            errData = JSON.parse(resText);
          }
        } catch (e) {
          console.warn("Retorno do servidor não é um JSON válido no login:", resText);
        }

        if (!response.ok) {
          const errMsg = errData?.error || `Erro de comunicação com o servidor central (Código: ${status})`;
          throw new Error(errMsg);
        }

        const data = errData || {};
        const user = data.user;

        // Save session locally as cache
        localStorage.setItem("current_coach_user", JSON.stringify(user));

        const savedUsers = localStorage.getItem("coach_users");
        let usersMap: Record<string, any> = {};
        if (savedUsers) {
          try { usersMap = JSON.parse(savedUsers); } catch (ex) { }
        }
        usersMap[emailKey] = { ...user, password };
        localStorage.setItem("coach_users", JSON.stringify(usersMap));

        // Let user entry succeed
        setSuccessMsg(`Bem-vindo de volta, ${user.profile.name}!`);
        setTimeout(() => {
          onLoginSuccess({
            email: user.email,
            profile: user.profile,
            chatHistory: user.chatHistory,
            plan: user.plan
          });
        }, 800);

      } else {
        // Contact the cloud server for registration
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailKey, password, name })
        });

        const status = response.status;
        const resText = await response.text().catch(() => "");

        let errData: any = null;
        try {
          if (resText) {
            errData = JSON.parse(resText);
          }
        } catch (e) {
          console.warn("Retorno do servidor não é um JSON válido no cadastro:", resText);
        }

        if (!response.ok) {
          const errMsg = errData?.error || `Erro de rede no cadastro central (Código: ${status})`;
          throw new Error(errMsg);
        }

        const data = errData || {};
        const user = data.user;

        // Save session locally as cache
        localStorage.setItem("current_coach_user", JSON.stringify(user));

        const savedUsers = localStorage.getItem("coach_users");
        let usersMap: Record<string, any> = {};
        if (savedUsers) {
          try { usersMap = JSON.parse(savedUsers); } catch (ex) { }
        }
        usersMap[emailKey] = { ...user, password };
        localStorage.setItem("coach_users", JSON.stringify(usersMap));

        setSuccessMsg("Conta criada com sucesso! Carregando questionário...");
        setTimeout(() => {
          onLoginSuccess({
            email: user.email,
            profile: user.profile,
            chatHistory: user.chatHistory,
            plan: user.plan
          });
        }, 1000);
      }
    } catch (err: any) {
      console.warn("Server Authentication failed, utilizing local fallback:", err.message);

      // Backwards compatible offline client-side fallback
      const savedUsers = localStorage.getItem("coach_users");
      let usersMap: Record<string, any> = {};
      if (savedUsers) {
        try {
          usersMap = JSON.parse(savedUsers);
        } catch (ex) {
          usersMap = {};
        }
      }

      if (isLogin) {
        const user = usersMap[emailKey];
        if (!user) {
          setError(err.message || "Nenhum cadastro encontrado com este e-mail.");
          return;
        }

        if (user.password !== password) {
          setError("Senha incorreta. Verifique os dados e tente novamente.");
          return;
        }

        // Offline Login Succeeded
        setSuccessMsg(`Bem-vindo de volta [Local], ${user.profile.name}!`);
        setTimeout(() => {
          onLoginSuccess({
            email: user.email,
            profile: user.profile,
            chatHistory: user.chatHistory,
            plan: user.plan
          });
        }, 800);

      } else {
        if (usersMap[emailKey]) {
          setError("Este endereço de e-mail já está cadastrado localmente.");
          return;
        }

        // Offline Registration Succeeded
        const customWelcomeText = `Olá, ${name.trim()}! Que excelente ver você aqui na Biker AI. Eu sou o seu Treinador de Ciclismo pessoal.\n\nMinhas planilhas e conselhos são focados em melhorar o seu fôlego e resistência de forma simples e segura, ajustando seus treinos por potência, batimentos do coração ou pelas suas percepções de cansaço.\n\nPara começarmos a planejar sua evolução de forma personalizada, preciso te conhecer melhor através de algumas perguntas rápidas no nosso chat.\n\nComo você já se cadastrou, podemos iniciar o questionário agora mesmo. **Qual é o seu tempo médio pedalando ou seu nível atual no ciclismo?**`;

        const newProfile: UserProfile = {
          name: name.trim(),
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
          onboardingStep: 1
        };

        const initialChat: ChatMessage[] = [
          {
            id: "welcome-registered",
            sender: "treinador",
            text: customWelcomeText,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          }
        ];

        const newUserEntry = {
          email: emailKey,
          password: password,
          profile: newProfile,
          chatHistory: initialChat,
          plan: null
        };

        usersMap[emailKey] = newUserEntry;
        localStorage.setItem("coach_users", JSON.stringify(usersMap));

        // Attempt background backup to server in case of partial connection
        fetch("/api/auth/save-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailKey, userAccount: newUserEntry, password })
        }).catch(() => {});

        setSuccessMsg("Conta criada localmente! Carregando...");
        setTimeout(() => {
          onLoginSuccess({
            email: newUserEntry.email,
            profile: newUserEntry.profile,
            chatHistory: newUserEntry.chatHistory,
            plan: newUserEntry.plan
          });
        }, 1000);
      }
    }
  };



  return (
    <div className="w-full flex flex-col bg-slate-950 text-white min-h-screen relative overflow-x-hidden font-sans">
      
      {/* Background ambient lighting glows */}
      <div className="absolute top-[10%] right-5 w-[600px] h-[600px] bg-lime-500/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-[40%] left-[-100px] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-1/4 w-[600px] h-[600px] bg-lime-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Elegant Landing Header / Navigation Bar */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50 py-4 px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-lime-500/10 border border-lime-500/20 rounded-xl text-lime-400 shadow-sm shadow-lime-500/5">
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
            <a href="#preview-do-app" className="text-xs font-semibold text-slate-300 hover:text-lime-450 transition-colors">
              Conhecer o App
            </a>
            <a href="#beneficios" className="text-xs font-semibold text-slate-300 hover:text-lime-450 transition-colors">
              Benefícios
            </a>
            <a href="#como-funciona" className="text-xs font-semibold text-slate-300 hover:text-lime-450 transition-colors">
              Como Funciona
            </a>
          </div>
          <div>
            <a 
              href="#auth-section" 
              className="px-4 py-2 bg-linear-to-r from-lime-500/10 to-emerald-500/10 hover:from-lime-500/20 hover:to-emerald-500/20 text-lime-400 border border-lime-500/30 hover:border-lime-400 rounded-xl text-xs font-black uppercase transition-all shadow-md shadow-lime-500/5"
            >
              Acessar Portal
            </a>
          </div>
        </div>
      </header>

      {/* Hero Split Section */}
      <section className="relative pt-10 pb-20 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Hero Copy (Left 7 Cols) */}
        <div className="lg:col-span-7 space-y-6 text-left">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-lime-500/10 border border-lime-500/20 text-lime-400 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Treino de Ciclismo Simples e Inteligente</span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black tracking-tight text-white leading-[1.1]">
            Eleve seu desempenho.<br />
            Domine as subidas.<br />
            <span className="bg-linear-to-r from-lime-400 to-emerald-400 bg-clip-text text-transparent">Treine como os profissionais.</span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed max-w-2xl">
            Descubra as planilhas semanais que se adaptam de verdade à sua vida. Ajustamos seus treinos de acordo com o seu cansaço e o seu tempo livre. Chega de treinar no escuro seguindo planilhas de papel ou PDFs parados!
          </p>

          {/* Key Metrics grid */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-900">
            <div className="space-y-0.5">
              <p className="text-2xl sm:text-3xl font-heading font-black text-lime-400 tracking-tight">Mais Força</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Aumente seus watts</p>
              <p className="text-[10px] text-slate-500 leading-normal font-sans">Pedale com mais facilidade e canse muito menos</p>
            </div>
            <div className="space-y-0.5 border-l border-slate-900 pl-4">
              <p className="text-2xl sm:text-3xl font-heading font-black text-emerald-400 tracking-tight">Mais Fôlego</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Subidas fáceis</p>
              <p className="text-[10px] text-slate-500 leading-normal font-sans">Sinta menos cansaço nas pernas e suba no seu ritmo</p>
            </div>
            <div className="space-y-0.5 border-l border-slate-900 pl-4">
              <p className="text-2xl sm:text-3xl font-heading font-black text-yellow-400 tracking-tight font-heading">No Seu Tempo</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Treinos Flexíveis</p>
              <p className="text-[10px] text-slate-500 leading-normal font-sans">As sessões cabem no seu tempo livre, dia a dia</p>
            </div>
          </div>



        </div>

        {/* Auth Floating Card (Right 5 Cols) */}
        <div id="auth-section" className="lg:col-span-5 relative scroll-mt-24">
          <div className="absolute inset-0 bg-linear-to-r from-lime-500/10 to-emerald-500/10 rounded-3xl blur-2xl -z-10 opacity-70"></div>
          
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md relative z-10 space-y-6">
            
            {/* Logo e Welcome */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex p-2.5 bg-lime-500/10 border border-lime-500/20 rounded-2xl text-lime-400 mb-1">
                <Bike className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-black text-lg tracking-tight uppercase">
                {isLogin ? "Entrar na sua conta" : "Criar sua conta nova"}
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                {isLogin 
                  ? "Coloque seu e-mail e senha abaixo para ver seus treinos de hoje e falar com o treinador." 
                  : "Crie seu cadastro rápido para receber treinos fáceis e personalizados de verdade."
                }
              </p>
            </div>

            {/* Selector de Abas */}
            <div className="flex p-0.5 bg-slate-950 rounded-xl border border-slate-850">
              <button 
                type="button"
                onClick={() => { setIsLogin(true); setError(""); setSuccessMsg(""); }}
                className={`flex-1 py-2 text-[11px] font-bold font-heading rounded-lg uppercase transition-all cursor-pointer ${isLogin ? 'bg-slate-800 text-lime-400 shadow-sm border border-slate-700' : 'text-slate-450 hover:text-white'}`}
              >
                Entrar
              </button>
              <button 
                type="button"
                onClick={() => { setIsLogin(false); setError(""); setSuccessMsg(""); }}
                className={`flex-1 py-2 text-[11px] font-bold font-heading rounded-lg uppercase transition-all cursor-pointer ${!isLogin ? 'bg-slate-800 text-lime-400 shadow-sm border border-slate-700' : 'text-slate-450 hover:text-white'}`}
              >
                Criar Conta
              </button>
            </div>

            {/* Alertas de Status */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex gap-2.5 items-start text-left"
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
                  className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex gap-2.5 items-start text-left"
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
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Seu Nome de Atleta</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Pedro Henrique"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-lime-500/40 rounded-xl pl-10 pr-4 py-3 text-xs outline-hidden focus:ring-1 focus:ring-lime-500/40 transition-all text-white placeholder:text-slate-600 font-heading font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Campo Email */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">E-mail de Cadastro</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input 
                    type="email"
                    required
                    placeholder="atleta@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-lime-500/40 rounded-xl pl-10 pr-4 py-3 text-xs outline-hidden focus:ring-1 focus:ring-lime-500/40 transition-all text-white placeholder:text-slate-600 font-mono"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Senha Privada</label>
                  {isLogin && <span className="text-[9px] text-slate-500 select-none">Mínimo 6 dígitos</span>}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-lime-500/40 rounded-xl pl-10 pr-10 py-3 text-xs outline-hidden focus:ring-1 focus:ring-lime-500/40 transition-all text-white placeholder:text-slate-600 font-mono"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-linear-to-r from-lime-500 to-emerald-500 hover:from-lime-450 hover:to-emerald-450 active:scale-98 text-slate-950 py-3.5 px-4 rounded-xl text-xs font-black font-heading uppercase tracking-wider flex items-center justify-center gap-2 transition-all mt-6 shadow-lg shadow-lime-500/20 cursor-pointer"
              >
                <span>{isLogin ? "Acessar Portal do Atleta" : "Confirmar e Iniciar Cadastro"}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            {/* App installation container */}
            <div className="pt-4 border-t border-slate-800/60 text-center">
              {isPortable ? (
                <div className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Aplicativo Instalado com Sucesso</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="inline-flex justify-center items-center gap-1.5 text-xs text-slate-400 hover:text-lime-400 transition-colors uppercase tracking-wider font-bold"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Baixar Biker AI no seu Celular</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* SEÇÃO DE PREVIEW INTERATIVO DO APP (MOCKUP ALTA FIDELIDADE) */}
      <section id="preview-do-app" className="relative py-24 px-4 sm:px-6 md:px-12 bg-slate-950 border-t border-slate-900 scroll-mt-24">
        <div className="absolute inset-0 bg-radial-to-b from-lime-500/5 via-transparent to-transparent opacity-60"></div>
        <div className="max-w-7xl mx-auto w-full space-y-12 relative z-10">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[10px] bg-lime-500/10 border border-lime-500/25 text-lime-400 font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Teste sem Cadastro
            </span>
            <h3 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-white">
              Veja como o Biker AI é <span className="text-lime-400">simples de usar</span>
            </h3>
            <p className="text-sm text-slate-400 font-sans leading-relaxed">
              Toque nos botões das abas abaixo para testar o aplicativo por dentro. É rápido, prático e em português.
            </p>
          </div>

          {/* Interface do App Simulado */}
          <div className="max-w-4xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            
            {/* Barra Superior Simula Dispositivo */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-850 flex justify-between items-center text-slate-500 text-[10px] sm:text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/40 animate-pulse"></span>
                <span className="text-slate-400 font-bold tracking-wider uppercase">SIMULADOR BIKER AI v2.1</span>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-slate-450">
                <span>Sinal: Excelente</span>
                <span>Bateria: 94%</span>
                <span className="text-lime-400 font-black">● SEU ACESSO DE TESTES</span>
              </div>
            </div>

            {/* Abas Internas */}
            <div className="bg-slate-900/60 p-2 sm:p-4 border-b border-slate-850 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPreviewTab("planilha")}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-heading font-black uppercase transition-all cursor-pointer ${
                  previewTab === "planilha" ? "bg-lime-500 text-slate-950 shadow-md transform scale-[1.02]" : "bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-950/85"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Minha Planilha</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPreviewTab("desempenho")}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-heading font-black uppercase transition-all cursor-pointer ${
                  previewTab === "desempenho" ? "bg-lime-500 text-slate-950 shadow-md transform scale-[1.02]" : "bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-950/85"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Desempenho</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab("zonas")}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-heading font-black uppercase transition-all cursor-pointer ${
                  previewTab === "zonas" ? "bg-lime-500 text-slate-950 shadow-md transform scale-[1.02]" : "bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-950/85"
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Zonas de Watts</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab("chat")}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-heading font-black uppercase transition-all cursor-pointer ${
                  previewTab === "chat" ? "bg-lime-500 text-slate-950 shadow-md transform scale-[1.02]" : "bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-950/85"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Falar Treinador</span>
              </button>
            </div>

            {/* Conteúdo Dinâmico do Preview */}
            <div className="p-6 sm:p-8 min-h-[380px] bg-slate-950/30 text-white relative">
              <AnimatePresence mode="wait">
                
                {/* PLANILHA TAB */}
                {previewTab === "planilha" && (
                  <motion.div
                    key="planilha"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-6 text-left"
                  >
                    {/* Barra de dias da semana */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Planilha da Semana - Selecione o Dia (Teste clicando neles):</label>
                      <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {[
                          { label: "Seg", dayNum: 0, title: "🛌 Descanso", desc: "Folga total na planilha para recuperar as pernas.", checked: false },
                          { label: "Ter", dayNum: 1, title: "🚀 Giro Focado", desc: "45 min em Zona 2 para manter a constância ativa.", checked: true },
                          { label: "Qua", dayNum: 2, title: "⚡ Subida Forte", desc: "Série estruturada para melhorar potência máxima nas subidas.", checked: false },
                          { label: "Qui", dayNum: 3, title: "🛌 Descanso", desc: "Repouso total ou regenerativo leve de soltura.", checked: false },
                          { label: "Sex", dayNum: 4, title: "📈 Ritmo Limiar", desc: "Treino firme de manutenção de ritmo constante.", checked: false },
                          { label: "Sáb", dayNum: 5, title: "🏔️ Pedal Longo", desc: "Treino aeróbico focado em volume e resistência.", checked: false },
                          { label: "Dom", dayNum: 6, title: "🛌 Recuperação", desc: "Desaquecimento e massagem nas pernas.", checked: false }
                        ].map((d, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setPreviewDay(d.dayNum);
                              setSecondsLeft(120);
                              setIsTimerRunning(false);
                            }}
                            className={`py-2 px-1 rounded-lg text-center transition-all cursor-pointer ${
                              previewDay === d.dayNum 
                                ? "bg-slate-800 text-lime-400 font-black border border-lime-400/40" 
                                : "bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-400 text-xs"
                            }`}
                          >
                            <span className="block text-[10px] font-heading font-black">{d.label}</span>
                            <span className="text-[9px] mt-0.5 inline-block opacity-80 font-mono">
                              {d.checked ? "✓" : d.dayNum === 2 ? "★" : "•"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Detalhes do Dia Selecionado */}
                    {previewDay === 2 ? (
                      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 relative overflow-hidden">
                        <div className="flex flex-wrap justify-between items-start gap-2">
                          <div>
                            <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest text-[#FFDD00] uppercase bg-[#FFDD00]/10 border border-[#FFDD00]/30 px-2 py-0.5 rounded-full">
                              Treino Recomendado de Quarta-feira ⭐
                             </span>
                            <h4 className="text-base sm:text-lg font-heading font-black mt-1 text-white flex items-center gap-2">
                              ⚡ Subir com Mais Fôlego (Célula de Força: 1h15)
                            </h4>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-xs font-mono font-black text-lime-400 block">Esforço: Fácil a Médio</span>
                            <span className="text-[10px] text-slate-500 block font-mono">Esforço Acumulado: 75</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 max-w-2xl font-sans leading-relaxed">
                          Sessão criada pela nossa Inteligência Artificial para aumentar seu fôlego pulmonar, ajudando você a subir ladeiras sem queimar a musculatura ou cansar muito rápido.
                        </p>

                        <div className="p-3 bg-slate-950/60 rounded-xl space-y-1.5 text-xs border border-slate-850">
                          <p className="text-slate-400"><strong>🚴 1. Começo (15 min):</strong> Giro bem leve para aquecer o corpo.</p>
                          <p className="text-lime-400 font-bold">🔥 2. Foco Principal (3x de 4 min): Ritmo ligeiramente firme subindo, com 3 min de descanso leve.</p>
                          <p className="text-slate-400"><strong>🛌 3. Soltura (10 min):</strong> Giro suave para relaxar as pernas.</p>
                        </div>

                        {/* Interactive Widgets de Teste */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          
                          {/* Timer Interval Widget */}
                          <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-4">
                            <div>
                               <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block font-mono">⏱️ cronômetro do treino (Simulado)</span>
                              <span className="text-lg sm:text-2xl font-mono tracking-wider font-extrabold text-lime-400 block mt-0.5">
                                {Math.floor(secondsLeft / 60).toString().padStart(2, "0")}:{(secondsLeft % 60).toString().padStart(2, "0")}
                              </span>
                              <span className="text-[10px] text-slate-400 block">Série 2 de 3 • Toque no Play</span>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setIsTimerRunning(!isTimerRunning)}
                                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                  isTimerRunning ? "bg-amber-500 text-slate-950 hover:bg-amber-450" : "bg-lime-500 text-slate-950 hover:bg-lime-450"
                                }`}
                              >
                                {isTimerRunning ? <Pause className="w-4 h-4 stroke-[3]" /> : <Play className="w-4 h-4 stroke-[3]" />}
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setIsTimerRunning(false);
                                  setSecondsLeft(120);
                                }}
                                className="w-9 h-9 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <span className="text-[10px] font-mono font-bold uppercase">Reset</span>
                              </button>
                            </div>
                          </div>

                          {/* Checkbox Done Widget */}
                          <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-3 text-left">
                            <div className="space-y-0.5">
                               <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block font-mono">✅ terminou seu pedal hoje?</span>
                              <span className="text-xs font-bold text-slate-200 block">
                                {previewWorkoutDone ? "🏆 Parabéns Atleta!" : "Pronto para finalizar?"}
                              </span>
                              <span className="text-[10px] text-slate-400 leading-normal block">
                                {previewWorkoutDone ? "Sinal verde! Seu treino foi gravado." : "Toque ao lado para simular o fim"}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setPreviewWorkoutDone(!previewWorkoutDone)}
                              className={`h-9 px-3 text-[10px] uppercase font-black font-heading rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                                previewWorkoutDone 
                                  ? "bg-slate-900 border border-emerald-500/30 text-[#00E676]" 
                                  : "bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white"
                              }`}
                            >
                              {previewWorkoutDone ? <Check className="w-3.5 h-3.5 text-[#00E676] stroke-[3]" /> : null}
                              <span>{previewWorkoutDone ? "Gravar! ✓" : "Terminei"}</span>
                            </button>
                          </div>

                        </div>
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-center py-8">
                        <Dumbbell className="w-10 h-10 text-slate-500 mx-auto opacity-40" />
                        <div className="space-y-1">
                           <h4 className="font-heading font-black text-sm uppercase">🛌 Dia de Descanso ou Recuperação</h4>
                           <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                             Hoje é dia de pernas para cima! O descanso adequado reconstrói as fibras musculares, deixando você mais forte e descansado para aproveitar o pedal do próximo dia.
                           </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewDay(2)}
                           className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-lime-400 border border-lime-400/20 hover:border-lime-400/40 text-[10px] font-black uppercase rounded-lg transition-all font-heading cursor-pointer"
                        >
                           Toque aqui para ver o treino de Quarta-feira
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* DESEMPENHO TAB */}
                {previewTab === "desempenho" && (
                  <motion.div
                    key="desempenho"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-6 text-left"
                  >
                    <div className="flex flex-wrap justify-between items-center gap-3">
                      <div>
                        <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest text-lime-400 uppercase bg-lime-500/10 border border-lime-500/30 px-2 py-0.5 rounded-full">
                          Acompanhe seu Ganho de Força 📈
                        </span>
                        <h4 className="text-sm sm:text-base font-heading font-black text-white mt-1">Sua evolução real explicada de forma simples</h4>
                      </div>
                      
                      <div className="text-xs text-slate-400 font-mono">
                        Período: Último mês e meio
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      
                      {/* Simulação de Gráfico FTP via SVG limpo e minimalista */}
                      <div className="md:col-span-8 p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>Sua força no pedal (Em Watts)</span>
                          <span className="text-lime-400 font-bold">📈 Você evoluiu +18 Watts (+9% mais força!)</span>
                        </div>
                        
                        <div className="relative">
                          {/* SVG Plotting */}
                          <svg viewBox="0 0 500 120" className="w-full h-24 sm:h-32 text-lime-400" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#A3E635" stopOpacity="0.25"/>
                                <stop offset="100%" stopColor="#A3E635" stopOpacity="0"/>
                              </linearGradient>
                            </defs>
                            
                            {/* Gridlines */}
                            <line x1="0" y1="100" x2="500" y2="100" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,3" />
                            <line x1="0" y1="60" x2="500" y2="60" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,3" />
                            <line x1="0" y1="20" x2="500" y2="20" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,3" />

                            {/* Área do Gráfico */}
                            <path d="M 0,110 L 0,90 Q 100,80 200,60 T 400,30 L 500,10 L 500,120 L 0,120 Z" fill="url(#chartGrad)" />
                            
                            {/* Linha de Evolução */}
                            <path d="M 0,90 L 100,80 Q 200,60 300,50 T 400,30 L 500,10" fill="none" stroke="#A3E635" strokeWidth="3.5" strokeLinecap="round" />
                            
                            {/* Marcadores de Dados */}
                            <circle cx="0" cy="90" r="5" className="fill-slate-900 stroke-lime-400 stroke-[3]" />
                            <circle cx="100" cy="80" r="5" className="fill-slate-900 stroke-lime-400 stroke-[3]" />
                            <circle cx="200" cy="65" r="5" className="fill-slate-900 stroke-lime-400 stroke-[3]" />
                            <circle cx="300" cy="50" r="5" className="fill-slate-900 stroke-lime-400 stroke-[3]" />
                            <circle cx="400" cy="30" r="5" className="fill-slate-900 stroke-lime-400 stroke-[3]" />
                            <circle cx="500" cy="10" r="6" className="fill-lime-400 stroke-slate-950 stroke-[2] animate-bounce" />
                          </svg>
                          
                          {/* Legenda Vertical de Watts */}
                          <div className="absolute left-1 top-0 h-full flex flex-col justify-between text-[11px] font-mono text-slate-500 pointer-events-none">
                            <span>{previewFtp}W</span>
                            <span>{Math.round(previewFtp - 15)}W</span>
                            <span>{Math.round(previewFtp - 30)}W</span>
                          </div>
                        </div>

                        {/* Rótulos Horizontais (Semanas) */}
                        <div className="flex justify-between text-[9px] font-mono text-slate-450 px-2">
                          <span>Início</span>
                          <span>Semana 2</span>
                          <span>Semana 3</span>
                          <span>Semana 4</span>
                          <span>Semana 5</span>
                          <span className="text-lime-400 font-bold">Hoje (Semana 6)</span>
                        </div>
                      </div>

                      {/* Principais Estatísticas Médias */}
                      <div className="md:col-span-4 space-y-4 text-left">
                        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-850 space-y-1">
                          <span className="text-[9px] font-mono font-bold uppercase text-slate-500">SUA FORÇA ESTIMADA ATUAL</span>
                          <div className="flex items-baseline gap-1.5 font-heading font-black">
                            <span className="text-xl text-lime-400">{previewFtp} Watts</span>
                            <span className="text-xs text-slate-400 font-sans">({Math.round((previewFtp/70)*10)/10} por kg)</span>
                          </div>
                          <span className="text-[10px] text-slate-450 block leading-normal">Quanto maior esse número, mais rápido você pedala.</span>
                        </div>

                        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-850 space-y-1">
                          <span className="text-[9px] font-mono font-bold uppercase text-slate-500">FOCO E CONSTÂNCIA</span>
                          <div className="flex items-baseline gap-1.5 font-heading font-black text-emerald-400">
                            <span className="text-xl">96% concluído</span>
                            <span className="text-[10px] text-slate-400 font-normal">Super focado</span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-400 h-full w-[96%] rounded-full"></div>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-850 space-y-1">
                          <span className="text-[9px] font-mono font-bold uppercase text-slate-500">TEMPO SOBRE A BIKE</span>
                          <div className="flex items-baseline gap-1.5 font-heading font-black text-yellow-400">
                            <span className="text-xl">06h45</span>
                            <span className="text-xs text-slate-400 font-normal font-sans">esta semana</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}

                {/* ZONAS TAB */}
                {previewTab === "zonas" && (
                  <motion.div
                    key="zonas"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-6 text-left"
                  >
                    <div>
                      <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest text-lime-400 uppercase bg-lime-500/10 border border-lime-500/30 px-2 py-0.5 rounded-full">
                        Calculadora Dinâmica de Potência ⚡
                      </span>
                      <h4 className="text-sm sm:text-base font-heading font-black mt-1">Suas 6 Velocidades de Esforço Personalizadas</h4>
                      <p className="text-xs text-slate-400 font-sans mt-1">
                        Arraste a barra abaixo para fingir que tem mais ou menos força. Veja como as suas 6 intensidades de pedal são recalculadas de forma automática na hora!
                      </p>
                    </div>

                    {/* Silders Control */}
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                      
                      <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-850">
                        <span className="text-xs text-slate-300 font-medium">Sua Força de Referência (Métricas de Watts):</span>
                        <span className="px-3 py-1.5 bg-lime-500/10 border border-lime-500/30 text-lime-400 rounded-lg text-sm font-mono font-black animate-pulse">
                          {previewFtp} Watts
                        </span>
                      </div>

                      <div className="space-y-1">
                        <input
                          type="range"
                          min="150"
                          max="380"
                          value={previewFtp}
                          onChange={(e) => setPreviewFtp(parseInt(e.target.value))}
                          className="w-full accent-lime-400 bg-slate-950 rounded-lg appearance-none h-2 cursor-pointer border border-slate-800"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
                          <span>150W (Fácil ou Iniciante)</span>
                          <span>220W (Intermediário)</span>
                          <span>300W (Avançado)</span>
                          <span>380W (Super Atleta)</span>
                        </div>
                      </div>

                    </div>

                    {/* Zonas Output Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { z: "Z1", name: "Giro Super Leve", pc: "< 55%", color: "border-slate-800 text-slate-400 bg-slate-900/40", range: `< ${Math.round(previewFtp * 0.55)}W`, desc: "Giro super solto de aquecimento leve ou para descansar as pernas." },
                        { z: "Z2", name: "Ritmo de Conversa", pc: "56% - 75%", color: "border-[#00E676]/30 text-[#00E676] bg-[#00E676]/5", range: `${Math.round(previewFtp * 0.56)}W - ${Math.round(previewFtp * 0.75)}W`, desc: "Sua velocidade padrão de passeio. Otimiza queima de gordura e não cansa." },
                        { z: "Z3", name: "Ritmo Firme / Plano", pc: "76% - 90%", color: "border-sky-500/30 text-sky-450 bg-sky-500/5", range: `${Math.round(previewFtp * 0.76)}W - ${Math.round(previewFtp * 0.90)}W`, desc: "Intensidade moderada. Força constante para pedalar no plano contra o vento." },
                        { z: "Z4", name: "Subida e Cardio", pc: "91% - 105%", color: "border-[#FFDD00]/30 text-[#FFDD00] bg-[#FFDD00]/5", range: `${Math.round(previewFtp * 0.91)}W - ${Math.round(previewFtp * 1.05)}W`, desc: "Ponto limite tolerável. Ideal para subir ladeiras com força focada." },
                        { z: "Z5", name: "VO2 Máximo / Estouro", pc: "106% - 120%", color: "border-rose-500/30 text-rose-400 bg-rose-500/5", range: `${Math.round(previewFtp * 1.06)}W - ${Math.round(previewFtp * 1.20)}W`, desc: "Fôlego limite máximo para aumentar explosão respiratória em sprints." },
                        { z: "Z6", name: "Explosão Total", pc: "> 121%", color: "border-purple-500/30 text-purple-400 bg-purple-500/5", range: `> ${Math.round(previewFtp * 1.21)}W`, desc: "Microtiros de arrancada com força máxima para ultrapassagens de 10 seg." }
                      ].map((zone, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border text-left space-y-1.5 transition-all ${zone.color}`}>
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs font-black font-mono tracking-wider">{zone.z} • {zone.name}</span>
                            <span className="text-[10px] font-mono opacity-80">{zone.pc}</span>
                          </div>
                          <p className="text-lg font-mono font-black tracking-tight">{zone.range}</p>
                          <p className="text-[10px] opacity-70 font-sans leading-relaxed">{zone.desc}</p>
                        </div>
                      ))}
                    </div>

                  </motion.div>
                )}

                {/* CHAT TAB */}
                {previewTab === "chat" && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-6 text-left"
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div>
                        <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest text-[#00E676] uppercase bg-[#00E676]/10 border border-[#00E676]/30 px-2 py-0.5 rounded-full">
                          Treinador de Bolso AI 💬
                        </span>
                        <h4 className="text-sm sm:text-base font-heading font-black text-white mt-1">Converse com seu Orientador Virtual</h4>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setPreviewChatMessages([
                          { sender: "bot", text: "Olá! Como está o seu corpo após as últimas pedaladas? Tem alguma dúvida sobre alimentação, cansaço ou quer ajustar seus treinos?" }
                        ])}
                        className="text-[10px] text-slate-500 hover:text-slate-300 font-mono underline"
                      >
                        Limpar Chat
                      </button>
                    </div>

                    {/* Chat Frame Interface */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden h-72">
                      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin">
                        {previewChatMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col max-w-[85%] ${
                              msg.sender === "user" ? "ml-auto text-right" : "mr-auto text-left"
                            }`}
                          >
                            <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-widest px-1 font-mono">
                              {msg.sender === "user" ? "Você Ciclista" : "Treinador Virtual (Biker AI)"}
                            </span>
                            <div
                              className={`p-3 rounded-2xl text-xs leading-relaxed mt-1 font-medium ${
                                msg.sender === "user"
                                  ? "bg-lime-500 text-slate-950 rounded-tr-none font-sans"
                                  : "bg-slate-950/80 text-slate-200 border border-slate-850 rounded-tl-none font-sans"
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        ))}

                        {/* Typing simulate indicator */}
                        {isTypingSimulated && (
                          <div className="mr-auto text-left max-w-[80%] flex flex-col">
                            <span className="text-[8px] text-slate-500 font-mono">Digitando orientação...</span>
                            <div className="p-3 bg-slate-950/80 text-slate-400 border border-slate-850 rounded-2xl rounded-tl-none text-xs flex gap-1.5 items-center mt-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse duration-500"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse duration-700"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse duration-900"></span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Input mockup line */}
                      <div className="bg-slate-950 p-2.5 border-t border-slate-850 text-slate-500 text-[10px] font-mono flex items-center justify-between">
                        <span>Toque em uma das perguntas prontas abaixo para ver a IA responder:</span>
                        <span className="text-lime-400">Ativo ✓</span>
                      </div>
                    </div>

                    {/* Clickable predefined options header */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clique abaixo para perguntar:</span>
                      
                      <div className="flex flex-wrap gap-2">
                        {[
                          {
                            q: "💡 Como posso cansar menos em subidas?",
                            a: "Nas subidas longas, o segredo é manter um ritmo constante sem forçar demais logo no começo e respirar de forma profunda. O Biker AI monta treinos que acostumam seu coração e suas pernas a esse esforço aos poucos."
                          },
                          {
                            q: "🤒 Estou me sentindo cansado hoje. Devo pedalar?",
                            a: "Se o corpo estiver exausto, o melhor é descansar! O descanso é fundamental para o músculo se fortalecer. Se decidir folgar, a nossa IA reorganiza automaticamente os treinos da sua semana sem problemas."
                          },
                          {
                            q: "🍌 O que comer antes de pedalar?",
                            a: "Coma alimentos leves e com carboidratos cerca de 1 hora antes de pedalar, como pão com geleia ou banana com aveia. Isso te dá energia rápida e constante para render bem sem pesar no estômago!"
                          }
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            disabled={isTypingSimulated}
                            onClick={() => handlePresetQuestion(preset.q, preset.a)}
                            className="bg-slate-900 border border-slate-800 hover:border-lime-500/20 hover:bg-slate-850 px-3 py-2 rounded-xl text-[11px] text-slate-300 hover:text-white text-left transition-all max-w-full truncate cursor-pointer disabled:opacity-50"
                          >
                            {preset.q}
                          </button>
                        ))}
                      </div>
                    </div>

                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Rodapé Simulado do App */}
            <div className="bg-slate-900 p-4 border-t border-slate-850 flex justify-between items-center text-xs text-slate-400 font-sans">
              <span>Gostou de como funciona?</span>
              <a
                href="#auth-section"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-500/10 border border-lime-500/20 text-lime-400 hover:text-white font-bold text-[10px] uppercase tracking-wider transition-all"
              >
                <span>Inscrever-se Grátis</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* Benefits Section with Bento Grid Layout */}
      <section id="beneficios" className="bg-slate-900/30 border-y border-slate-900 py-24 px-4 sm:px-6 md:px-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto w-full space-y-12">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[10px] bg-lime-500/10 border border-lime-500/25 text-lime-400 font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Ecossistema Completo
            </span>
            <h3 className="text-3xl sm:text-4xl font-heading font-black tracking-tight">
              Os Benefícios de Treinar Com a <span className="text-lime-400">Biker AI</span>
            </h3>
            <p className="text-sm text-slate-400 font-sans leading-relaxed">
              Pensamos em cada detalhe para ajudar ciclistas que precisam dividir o tempo entre família, trabalho e o prazer de pedalar com qualidade, sem complicação.
            </p>
          </div>

          {/* Bento grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-lime-500/20 transition-all group space-y-4 text-left">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-lime-500/10 border border-lime-500/20 text-lime-400 flex items-center justify-center">
                  <Activity className="w-5 h-5 group-hover:animate-pulse" />
                </div>
                <h4 className="font-heading font-black text-base text-white">Planilhas Fáceis de Seguir</h4>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Treinos pensados totalmente para a sua rotina diária. O sistema cria e ajusta as sessões de acordo com o seu cansaço e o seu tempo livre.
                </p>
              </div>
              <span className="text-[10px] font-bold text-lime-400 uppercase tracking-widest font-mono">100% Adaptável</span>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-emerald-500/20 transition-all group space-y-4 text-left">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-black text-base text-white">Ajuda a Qualquer Hora</h4>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                   Tire dúvidas na hora sobre o que comer antes de pedalar, como se recuperar de forma mais fácil ou receitas saudáveis para o dia a dia.
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Assistente 24h</span>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-yellow-500/20 transition-all group space-y-4 text-left">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-black text-base text-white">Progresso Sem Mistério</h4>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Gráficos super simples e limpos que mostram as suas metas de treino, total de horas pedaladas e a evolução da sua resistência semanal.
                </p>
              </div>
              <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest font-mono">Painel Claro</span>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-blue-500/20 transition-all group space-y-4 text-left">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-black text-base text-white">Pedaladas Automáticas</h4>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Grave seus treinos ou junte suas atividades para que suas pedaladas fiquem registradas diretamente em sua conta sem trabalho manual no dia a dia.
                </p>
              </div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono">Fácil Sem Esforço</span>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-purple-500/20 transition-all group space-y-4 text-left">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-black text-base text-white">Funciona No Celular</h4>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Instale o aplicativo em seu celular e leve a lista de treinos e o cronômetro para a estrada de forma rápida, mesmo sem sinal de internet.
                </p>
              </div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest font-mono">Modo Offline</span>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-sky-500/20 transition-all group space-y-4 text-left">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-black text-base text-white">Organize do Seu Jeito</h4>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Selecione os dias da semana em que você tem fôlego ou disponibilidade para pedalar. O sistema cria e distribui os treinos de acordo com o seu plano.
                </p>
              </div>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest font-mono">Controle Completo</span>
            </div>

          </div>

        </div>
      </section>



      {/* "Como Funciona" Step-by-Step Road */}
      <section id="como-funciona" className="bg-slate-900/30 border-y border-slate-900 py-24 px-4 sm:px-6 md:px-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto w-full space-y-16">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[10px] bg-lime-500/10 border border-lime-500/25 text-lime-400 font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Simples e Prático
            </span>
            <h3 className="text-3xl sm:text-4xl font-heading font-black tracking-tight">
              Como tudo funciona, passo a passo
            </h3>
            <p className="text-sm text-slate-400 font-sans leading-relaxed">
              Sem termos complicados ou burocracia. O processo leva menos de 5 minutos para criar o seu plano ideal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
            
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-lime-500 to-emerald-500 text-slate-950 flex items-center justify-center font-heading font-black text-lg">
                1
              </div>
              <h4 className="font-heading font-black text-base">Conversa rápida</h4>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Você responde algumas perguntas fáceis no nosso chat para o robô entender o seu nível atual e de quanto tempo precisa.
              </p>
            </div>

            <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-900 pt-6 md:pt-0 md:pl-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-350 flex items-center justify-center font-heading font-black text-lg">
                2
              </div>
              <h4 className="font-heading font-black text-base">Seus dias e horários</h4>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Você escolhe em quais dias da semana quer treinar e quanto tempo livre tem em cada dia para dividirmos as sessões.
              </p>
            </div>

            <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-900 pt-6 md:pt-0 md:pl-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-350 flex items-center justify-center font-heading font-black text-lg">
                3
              </div>
              <h4 className="font-heading font-black text-base">Treino na tela</h4>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Os treinos aparecem na sua tela. Dá para usar o nosso cronômetro no celular ou salvar o treino para ler quando quiser.
              </p>
            </div>

            <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-900 pt-6 md:pt-0 md:pl-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-lime-450 flex items-center justify-center font-heading font-black text-lg">
                4
              </div>
              <h4 className="font-heading font-black text-base">Resultados reais</h4>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Você pedala no seu ritmo, marca o treino como feito e sente seu corpo cansando bem menos e subindo mais rápido.
              </p>
            </div>

          </div>

          {/* Expanded extra benefits section */}
          <div className="mt-20 pt-12 border-t border-slate-850">
            <h4 className="text-center font-heading font-black text-lg text-white mb-8">
              Ainda mais motivos para treinar com a gente:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-850 space-y-2">
                <span className="text-xs font-black text-lime-400 uppercase tracking-widest block">Menos Desculpas</span>
                <p className="text-xs text-slate-300 font-medium">
                  Se chover ou não der tempo de treinar na rua, você avisa no chat e o sistema remarca o dia ou adapta para um treino mais curto de rolo em casa.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-850 space-y-2">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block">Mais Disposição</span>
                <p className="text-xs text-slate-300 font-medium">
                  Os treinos não te deixam exausto para o resto do dia. Pelo contrário: você ganha mais energia para trabalhar e aproveitar o tempo livre.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-850 space-y-2">
                <span className="text-xs font-black text-yellow-400 uppercase tracking-widest block">Sem Planilhas Presas</span>
                <p className="text-xs text-slate-300 font-medium">
                  Sinta-se livre para mudar seus dias preferidos a qualquer momento. Suas metas semanais mudam sozinhas para você não perder o ritmo.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 text-center">
            <a 
              href="#auth-section"
              className="inline-flex items-center gap-2.5 px-6 py-4 bg-linear-to-r from-lime-500 to-emerald-500 hover:from-lime-450 hover:to-emerald-450 text-slate-950 text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-lime-500/10 cursor-pointer"
            >
              <span>Criar Minha Conta Grátis Agora</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

        </div>
      </section>



      {/* Modern Landing Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 px-4 sm:px-6 md:px-12 text-slate-500 font-sans text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 rounded-lg text-lime-400 border border-slate-850">
              <Bike className="w-5 h-5" />
            </div>
            <p className="text-xs font-extrabold text-white">BIKER AI — Smart Assessment</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#preview-do-app" className="hover:text-white transition-colors">Conhecer o App</a>
            <a href="#beneficios" className="hover:text-white transition-colors">Benefícios</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#auth-section" className="text-lime-400 hover:text-white transition-colors">Entrar no Portal</a>
          </div>
          <div className="text-[10px] text-slate-600 font-mono">
            <span>© 2026 Biker AI. Versão de Produção 2.1 • Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>

      {/* Guide overlay installation guide */}
      <AnimatePresence>
        {showInstallGuide && (
          <div id="install-guide-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
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
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-950/40 hover:bg-slate-850 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="p-2.5 bg-lime-500/15 border border-lime-500/30 rounded-2xl text-lime-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm uppercase tracking-wide">
                    Como Instalar o Biker AI 📲
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
                  <span className="font-extrabold select-none">💡 VANTAGENS:</span>
                  <span className="leading-relaxed text-slate-300">Instalar o aplicativo garante carregamento instantâneo, menos consumo de internet, suporte offline e navegação livre de barras do navegador!</span>
                </div>

              </div>

              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="w-full bg-slate-800 hover:bg-slate-755 text-white font-bold font-heading py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
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
