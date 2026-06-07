import React, { useState } from "react";
import { UserAccount, UserProfile, ChatMessage } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Dumbbell, ShieldAlert, Sparkles, Mail, Lock, User, Eye, EyeOff, Bike, ChevronRight, CheckCircle } from "lucide-react";
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

  const validateEmail = (input: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    // Load existing users database
    const savedUsers = localStorage.getItem("coach_users");
    let usersMap: Record<string, any> = {};
    if (savedUsers) {
      try {
        usersMap = JSON.parse(savedUsers);
      } catch (err) {
        usersMap = {};
      }
    }

    const emailKey = email.trim().toLowerCase();

    if (isLogin) {
      // Login flow
      const user = usersMap[emailKey];
      if (!user) {
        setError("Nenhum cadastro encontrado com este e-mail. Crie uma conta ao lado!");
        return;
      }

      if (user.password !== password) {
        setError("Senha incorreta. Verifique os dados e tente novamente.");
        return;
      }

      // Login success
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
      // Registration flow
      if (usersMap[emailKey]) {
        setError("Este endereço de e-mail já está cadastrado. Faça login para acessar.");
        return;
      }

      // Welcome message customized to user's registered name
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
        onboardingStep: 1 // Start at step 1 since name is already collected upon registration!
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

      setSuccessMsg("Conta criada com sucesso! Carregando questionário...");
      setTimeout(() => {
        onLoginSuccess({
          email: newUserEntry.email,
          profile: newUserEntry.profile,
          chatHistory: newUserEntry.chatHistory,
          plan: newUserEntry.plan
        });
      }, 1000);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 md:py-20 bg-linear-to-b from-slate-900 to-slate-950 text-white min-h-[calc(100vh-4rem)] relative overflow-hidden select-none">
      
      {/* Background ambient lighting glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-lime-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-4xl bg-slate-900/80 border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]"
      >
        {/* Left Side: Modern Bicycle Hero Presentation Panel */}
        <div className="hidden md:flex md:col-span-5 relative flex-col justify-between p-8 overflow-hidden">
          
          {/* Cover image of sports bicycle */}
          <div className="absolute inset-0 z-0">
            <img 
              src={bikerHero} 
              alt="Professional high-end road bicycle" 
              className="w-full h-full object-cover opacity-50 scale-100 hover:scale-105 transition-transform duration-[2000ms] ease-out"
              referrerPolicy="no-referrer"
            />
            {/* Smooth gradient wash */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/80"></div>
          </div>

          {/* Quick Badge & Brand Name over image */}
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-lime-500/15 border border-lime-500/30 text-lime-400 rounded-full text-[9px] font-bold font-heading uppercase tracking-widest leading-none">
              <Bike className="w-3.5 h-3.5 shrink-0" />
              <span>TREINO INTELIGENTE</span>
            </div>
            <h3 className="font-heading font-black text-2xl tracking-tight text-white leading-tight">
              Evolua com o <br />
              <span className="text-lime-400 bg-linear-to-r from-lime-400 to-emerald-400 bg-clip-text text-transparent">Melhor Direcionamento</span>
            </h3>
            <p className="text-[11px] text-slate-350 leading-relaxed font-sans max-w-xs">
              Deixe que nosso sistema de treinamento monte suas planilhas de forma simples, ajustando o esforço de cada pedalada para garantir a sua evolução.
            </p>
          </div>

          {/* Core sport indicators */}
          <div className="relative z-10 space-y-4 pt-6 border-t border-white/5 bg-slate-950/40 p-4 rounded-xl backdrop-blur-xs">
            <div className="space-y-2 text-[11.5px] font-sans text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_#84cc16]"></span>
                <span className="font-medium">Treinos Leves e Fortes Equilibrados (80/20)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_#84cc16]"></span>
                <span className="font-medium">Carga de Exercícios sob Medida para Você</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_#84cc16]"></span>
                <span className="font-medium">Adaptação Inteligente do seu Pedal</span>
              </div>
            </div>

            <div className="text-[9px] text-slate-500 font-mono tracking-widest uppercase flex items-center gap-1 font-semibold">
              <span>FÔLEGO MÉDIO</span>
              <span>•</span>
              <span>ZONAS DE RITMO</span>
              <span>•</span>
              <span>RESISTÊNCIA</span>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Forms Column */}
        <div className="col-span-12 md:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-slate-900/90 border-l border-slate-800/80 relative">
          
          <div>
            {/* Header Branding */}
            <div className="text-center mb-6 space-y-1.5">
              <div className="inline-flex p-3 bg-lime-500/10 border border-lime-500/20 rounded-2xl mb-1 text-lime-400">
                <Bike className="w-7 h-7" />
              </div>
              <h2 className="font-heading font-black text-xl tracking-tight uppercase">
                BIKER <span className="text-lime-400">AI</span>
              </h2>
              <p className="text-[11px] text-slate-450 font-sans max-w-sm mx-auto leading-relaxed">
                Planos de pedalada simples e sob medida para apaixonados por ciclismo de estrada, MTB e gravel.
              </p>
            </div>

            {/* Tab Selector */}
            <div className="flex p-0.5 bg-slate-950 rounded-xl mb-6 border border-slate-850">
              <button 
                type="button"
                onClick={() => { setIsLogin(true); setError(""); setSuccessMsg(""); }}
                className={`flex-1 py-1.5 text-[11px] font-bold font-heading rounded-lg uppercase transition-all cursor-pointer ${isLogin ? 'bg-slate-800 text-lime-400 shadow-sm border border-slate-700' : 'text-slate-400 hover:text-white'}`}
              >
                Entrar
              </button>
              <button 
                type="button"
                onClick={() => { setIsLogin(false); setError(""); setSuccessMsg(""); }}
                className={`flex-1 py-1.5 text-[11px] font-bold font-heading rounded-lg uppercase transition-all cursor-pointer ${!isLogin ? 'bg-slate-800 text-lime-400 shadow-sm border border-slate-700' : 'text-slate-400 hover:text-white'}`}
              >
                Cadastrar Atleta
              </button>
            </div>

            {/* Status Alerts */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex gap-2.5 items-start"
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
                  className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex gap-2.5 items-start"
                >
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Form container */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Campo Nome (Only on sign up) */}
              {!isLogin && (
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Nome Completo do Atleta</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Pedro Ramos"
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
          </div>

          {/* Bottom Branding info */}
          <div className="mt-8 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1 font-heading">
              <Sparkles className="w-3.5 h-3.5 text-lime-400 shrink-0" />
              <span>Zonas de Ritmo & Potência</span>
            </span>
            <span className="font-mono">v2.1</span>
          </div>

        </div>

      </motion.div>
    </div>
  );
}
