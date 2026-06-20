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

      {/* SEÇÃO COMO É FÁCIL USAR O BIKER AI */}
      <section id="como-funciona" className="relative py-24 px-4 sm:px-6 md:px-12 bg-slate-950 border-t border-slate-900 scroll-mt-24">
        <div className="absolute inset-0 bg-radial-to-b from-lime-500/5 via-transparent to-transparent opacity-60"></div>
        <div className="max-w-7xl mx-auto w-full space-y-16 relative z-10">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-[10px] bg-lime-500/10 border border-lime-500/25 text-lime-400 font-black px-3 py-1 rounded-full uppercase tracking-widest font-mono">
              Sem Complicação ⚡
            </span>
            <h3 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-white">
              Sua planilha de treinos no piloto automático: <span className="text-lime-400">veja como é fácil</span>
            </h3>
            <p className="text-sm sm:text-base text-slate-400 font-sans leading-relaxed">
              Você não precisa entender de fisiologia de esporte, cálculos de watts ou passar horas configurando tabelas confusas. A inteligência artificial cuida de tudo para você pedalar melhor em apenas 3 passos simples.
            </p>
          </div>

          {/* Gráfico de Passos Simplificado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Passo 1 */}
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 text-left relative overflow-hidden group hover:border-slate-700/50 transition-all">
              <div className="absolute top-0 right-0 p-8 bg-lime-500/5 rounded-full pointer-events-none blur-2xl"></div>
              
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400 flex items-center justify-center font-heading font-black text-lg">
                  1
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850">
                  Leva 1 minuto
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-heading font-black text-white">Nos conte seus objetivos</h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                  Responda a perguntas rápidas sobre quantos dias quer treinar na semana, seu nível atual e seus objetivos reais — seja ganhar fôlego em subidas, perder peso ou completar um desafio de longa distância com amigos.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-850 space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">O que você responde:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-850">"Tenho 3 dias livres por semana"</span>
                  <span className="text-[10px] text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-850">"Quero subir sem cansar tanto"</span>
                </div>
              </div>
            </div>

            {/* Passo 2 */}
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 text-left relative overflow-hidden group hover:border-slate-700/50 transition-all">
              <div className="absolute top-0 right-0 p-8 bg-lime-500/5 rounded-full pointer-events-none blur-2xl"></div>
              
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
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                  Nossa IA calcula suas zonas de esforço personalizadas com estimativas automáticas de força em Watts (ou por percepção se não tiver sensor) e ajusta as intensidades precisas para a sua evolução no pedal.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-850 space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Métricas Calculadas para Você:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-lime-400 bg-lime-500/5 px-2 py-0.5 rounded border border-lime-500/10">Zonas de Potência</span>
                  <span className="text-[10px] text-lime-400 bg-lime-500/5 px-2 py-0.5 rounded border border-lime-500/10">Volume e Ritmo Inteligente</span>
                </div>
              </div>
            </div>

            {/* Passo 3 */}
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 text-left relative overflow-hidden group hover:border-slate-700/50 transition-all">
              <div className="absolute top-0 right-0 p-8 bg-lime-500/5 rounded-full pointer-events-none blur-2xl"></div>
              
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400 flex items-center justify-center font-heading font-black text-lg">
                  3
                </div>
                <span className="text-[10px] font-mono text-slate-405 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850 font-bold">
                  Recalibrar é Rápido
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-heading font-black text-white">Flexibilidade que te entende</h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                  Marcou o pedal como finalizado? Comente em português como foi o esforço ou se sentiu cansaço. Nossa IA elogia seu foco e, o melhor de tudo, se precisar saltar algum treino por imprevisto, ela reagenda toda a semana!
                </p>
              </div>

              <div className="pt-4 border-t border-slate-850 space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Flexibilidade Real:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-[#00E676] bg-[#00E676]/5 px-2 py-0.5 rounded border border-[#00E676]/10">Coach de Bolso no Feedback</span>
                  <span className="text-[10px] text-[#00E676] bg-[#00E676]/5 px-2 py-0.5 rounded border border-[#00E676]/10">Adaptação sob Imprevistos</span>
                </div>
              </div>
            </div>

          </div>

          {/* Comparativo Explicativo de Valor */}
          <div className="max-w-4xl mx-auto rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden relative">
            <div className="absolute -inset-y-12 -inset-x-12 bg-radial-to-r from-lime-500/5 to-transparent opacity-40 pointer-events-none"></div>
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 text-left items-center">
              <div className="space-y-3">
                <h4 className="text-xl sm:text-2xl font-heading font-black text-white leading-tight">Por que planilhas em PDF comuns não funcionam?</h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                  Comprar um PDF genérico estático na internet parece barato, mas as tabelas travadas falham ao menor sinal de imprevisto. Se chover, se você adoecer, viajar ou trabalhar até mais tarde e pular a terça-feira, o PDF não muda sozinho para te resgatar.
                </p>
                <div className="text-xs text-lime-400 font-bold block pt-1">
                  💡 No Biker AI, a planilha se curva à sua vida real, e nunca o contrário.
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-905 border border-slate-800 space-y-4 font-sans text-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-slate-850 pb-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></span>
                  <span>O que acontece se você perder um treino?</span>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="font-bold text-rose-400 block tracking-wider uppercase text-[10px] font-mono">Planilhas Gerais Estáticas:</span>
                    <p className="text-slate-400">Você se sente culpado, tenta empilhar o treino perdido, treina dolorido sem orientação e acaba se fadigando ou lesionando.</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-[#00E676] block tracking-wider uppercase text-[10px] font-mono font-black">Biker AI Inteligente:</span>
                    <p className="text-slate-300">Você simplesmente clica no botão ou avisa no chat: <span className="italic block mt-1 bg-slate-950 p-2 rounded text-slate-350 font-mono text-[11px] border border-slate-850 font-medium">"Hoje tive um imprevisto!"</span>. Nossa IA reorganiza a planilha e os descansos do restante da semana instantaneamente.</p>
                  </div>
                </div>
              </div>
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
