import React, { useState } from "react";
import { UserAccount, UserProfile, ChatMessage } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth, apiFetch } from "../firebase";
import { 
  Dumbbell, ShieldAlert, Sparkles, Mail, Lock, User, Eye, EyeOff, Bike, 
  ChevronRight, CheckCircle, Download, Smartphone, Share, X, ExternalLink,
  Activity, TrendingUp, Zap, Award, MessageSquare, Calendar, Heart, Percent, Star, Check,
  Play, Pause, Sliders, Gauge
} from "lucide-react";
// @ts-ignore
import bikerHero from "../assets/images/biker_hero_1780860230528.png";

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
          const response = await apiFetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailKey })
          });
          
          if (!response.ok) {
            throw new Error(`Erro ao recuperar os dados da conta no servidor (Código: ${response.status})`);
          }
          const sessionData = await response.json();
          userObj = sessionData.user;
        }

        setSuccessMsg(`Bem-vindo de volta, ${userObj.profile.name}!`);
        setTimeout(() => {
          onLoginSuccess({
            email: userObj.email,
            profile: userObj.profile,
            chatHistory: userObj.chatHistory || [],
            plan: userObj.plan || null
          });
        }, 800);

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

        setSuccessMsg("Conta criada com sucesso! Redirecionando para a página de pagamento no Mercado Pago (R$ 24,89)...");
        setTimeout(() => {
          onLoginSuccess({
            email: user.email,
            profile: user.profile,
            chatHistory: user.chatHistory || [],
            plan: user.plan || null
          });
        }, 1200);
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
            <a href="#como-funciona" className="text-xs font-semibold text-slate-300 hover:text-lime-450 transition-colors">
              Como Funciona
            </a>
            <a href="#beneficios" className="text-xs font-semibold text-slate-300 hover:text-lime-450 transition-colors">
              Benefícios
            </a>
            <a href="#precos" className="text-xs font-semibold text-slate-300 hover:text-lime-450 transition-colors">
              Preços
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

          <div className="flex flex-col sm:flex-row gap-4 pt-2 pb-4">
            <a 
              href="#auth-section"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-linear-to-r from-lime-500 to-emerald-500 hover:from-lime-450 hover:to-emerald-450 active:scale-98 text-slate-950 text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-lime-500/20 transition-all cursor-pointer"
            >
              <span>Criar Conta</span>
              <ChevronRight className="w-4 h-4" />
            </a>
            <a 
              href="#como-funciona"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-slate-900/80 hover:bg-slate-850 text-white text-xs font-bold uppercase tracking-wider rounded-2xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
            >
              <span>Ver Como Funciona</span>
            </a>
          </div>

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

        {/* Hero Image Graphic (Right 5 Cols) */}
        <div className="lg:col-span-5 relative flex justify-center items-center">
          <div className="absolute inset-0 bg-linear-to-r from-lime-500/10 to-emerald-500/10 rounded-full blur-3xl -z-10 opacity-55"></div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950/40 p-2 group"
          >
            <img 
              src={bikerHero} 
              alt="Biker AI Hero" 
              className="rounded-2xl max-w-full h-auto object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950/40 via-transparent to-transparent opacity-60"></div>
          </motion.div>
        </div>
      </section>

      {/* SEÇÃO COMPARATIVA: PDF VS BIKER AI */}
      <section className="relative py-16 px-4 sm:px-6 md:px-12 bg-slate-900/40 border-t border-slate-900">
        <div className="max-w-4xl mx-auto rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden relative shadow-xl">
          <div className="absolute -inset-y-12 -inset-x-12 bg-radial-to-r from-lime-500/5 to-transparent opacity-40 pointer-events-none"></div>
          <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 text-left items-center">
            <div className="space-y-4">
              <span className="text-[9px] font-mono font-bold tracking-widest text-lime-400 uppercase bg-lime-500/10 border border-lime-500/20 px-2.5 py-1 rounded-md">
                Diferencial Exclusivo
              </span>
              <h4 className="text-2xl md:text-3xl font-heading font-black text-white leading-tight">Por que planilhas em PDF comuns não funcionam?</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                Comprar um PDF genérico estático na internet parece barato, mas as tabelas de papel ou planilha travadas falham ao menor sinal de imprevisto. Se chover, se você adoecer, viajar ou trabalhar até mais tarde e pular a terça-feira, o PDF não muda sozinho para te salvar.
              </p>
              <div className="text-xs text-lime-400 font-bold block pt-1">
                No Biker AI, a planilha se curva à sua vida real, e nunca o contrário.
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 font-sans text-xs">
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
                  <p className="text-slate-300">Você simplesmente atualiza sua disponibilidade nas configurações. Nossa IA reorganiza a planilha e os descansos do restante da semana instantaneamente para se ajustar à sua rotina real.</p>
                </div>
              </div>
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
              Sem Complicação
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
                  Nossa IA calcula suas zonas de esforço de forma automática (por percepção de esforço ou watts de forma totalmente invisível). Você não precisa entender de tabelas difíceis: a IA faz todo o cálculo chato nos bastidores por você.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-850 space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">A IA Cuida de Tudo nos Bastidores:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-lime-400 bg-lime-500/5 px-2 py-0.5 rounded border border-lime-500/10 font-medium">Zonas de Ritmo Descomplicadas</span>
                  <span className="text-[10px] text-lime-400 bg-lime-500/5 px-2 py-0.5 rounded border border-lime-500/10 font-medium">Watts & Frequência Automáticos</span>
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
                  Marcou o pedal como finalizado? Registre de forma super rápida suas sensações e percepção de esforço. Se precisar saltar algum treino por imprevisto, o sistema reagenda toda a semana de forma inteligente!
                </p>
              </div>

              <div className="pt-4 border-t border-slate-850 space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Flexibilidade Real:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-[#00E676] bg-[#00E676]/5 px-2 py-0.5 rounded border border-[#00E676]/10">Registro de Esforço</span>
                  <span className="text-[10px] text-[#00E676] bg-[#00E676]/5 px-2 py-0.5 rounded border border-[#00E676]/10">Adaptação sob Imprevistos</span>
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
                  <Sliders className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-black text-base text-white">Zonas de Ritmo Claras</h4>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Zonas de esforço sob medida para você (tanto pelo Modo Simples com sensações quanto pelo Modo Técnico com watts/frequência), evitando cansaço excessivo.
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Guia de Zonas</span>
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





      {/* SEÇÃO DE PREÇOS TRANSPARENTE COM TRIAL */}
      <section id="precos" className="relative py-24 px-4 sm:px-6 md:px-12 bg-slate-900/30 border-t border-slate-900 scroll-mt-24">
        <div className="absolute inset-0 bg-radial-to-b from-emerald-500/5 via-transparent to-transparent opacity-40 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto w-full space-y-16 relative z-10">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-black px-3 py-1 rounded-full uppercase tracking-widest font-mono">
              Preço Transparente
            </span>
            <h3 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-white">
              Um único plano, sem surpresas na assinatura
            </h3>
            <p className="text-sm sm:text-base text-slate-400 font-sans leading-relaxed">
              Você não precisa cadastrar cartão de crédito para ver o preço ou testar. Criamos uma política simples e focada em valor real para a sua evolução no pedal.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="p-8 rounded-3xl bg-slate-900 border border-lime-500/30 relative flex flex-col justify-between space-y-8 text-left shadow-2xl shadow-lime-500/5 overflow-hidden font-sans">
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-lime-500 text-slate-950 font-black text-[9px] uppercase tracking-widest font-mono rounded-bl-2xl shadow-sm">
                Melhor Escolha
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-heading font-black text-lg text-white uppercase tracking-wider">Plano Pro Completo</h4>
                  <p className="text-xs text-slate-400 mt-1">Acesso ilimitado a todas as ferramentas e treinos inteligentes.</p>
                </div>

                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-xl font-heading text-slate-400 font-medium">R$</span>
                  <span className="text-5xl font-heading font-black text-white tracking-tight">24,89</span>
                  <span className="text-xs text-slate-400 font-mono font-semibold">/ mês</span>
                </div>

                <div className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-lime-500/10 border border-lime-500/20 text-lime-400 rounded-lg text-[10px] font-black uppercase tracking-wider font-heading">
                  Liberação Imediata Após Assinatura
                </div>
              </div>

              {/* Recursos inclusos */}
              <div className="space-y-3.5 border-t border-slate-800 pt-6">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Tudo o que você recebe:</p>
                
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                    <span>Planilhas de Treino Adaptativas geradas por IA</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                    <span>Calculador de zonas simplificado e prático</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                    <span>Sem anúncios ou taxas ocultas de adesão</span>
                  </li>
                </ul>
              </div>

              {/* Botão de CTA */}
              <div className="pt-4">
                <a 
                  href="#auth-section"
                  className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-4 bg-linear-to-r from-lime-500 to-emerald-500 hover:from-lime-450 hover:to-emerald-450 active:scale-98 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-lime-500/10 cursor-pointer"
                >
                  <span>Criar Conta</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
                <p className="text-[10px] text-slate-400 text-center mt-2.5 font-sans leading-normal">
                  Pagamento seguro de R$ 24,89 processado via Mercado Pago (<a href="https://mpago.la/24PgikU" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline hover:text-sky-300">link oficial</a>). Cancele quando quiser.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>



      {/* Centered Auth Section placed AFTER "Como Funciona" */}
      <section id="auth-section" className="relative py-24 px-4 sm:px-6 md:px-12 bg-slate-950 border-t border-slate-900 scroll-mt-24">
        <div className="absolute inset-0 bg-radial-to-b from-lime-500/5 via-transparent to-transparent opacity-60"></div>
        <div className="max-w-xl mx-auto w-full relative z-10 space-y-8">
          
          <div className="absolute inset-0 bg-linear-to-r from-lime-500/10 to-emerald-500/10 rounded-3xl blur-2xl -z-10 opacity-70"></div>
          
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md relative z-10 space-y-6">
            
            {/* Logo e Welcome */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex p-2.5 bg-lime-500/10 border border-lime-500/20 rounded-2xl text-lime-400 mb-1">
                <Bike className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-black text-lg tracking-tight uppercase text-white">
                {isLogin ? "Entrar na sua conta" : "Criar sua conta nova"}
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                {isLogin 
                  ? "Coloque seu e-mail e senha abaixo para ver seus treinos de hoje." 
                  : "Crie seu cadastro rápido para receber treinos fáceis e personalizados de verdade."
                }
              </p>
            </div>

            {/* Selector de Abas */}
            <div className="flex p-0.5 bg-slate-950 rounded-xl border border-slate-850">
              <button 
                type="button"
                onClick={() => { setIsLogin(true); setError(""); setSuccessMsg(""); }}
                className={`flex-1 py-2 text-[11px] font-bold font-heading rounded-lg uppercase transition-all cursor-pointer ${isLogin ? 'bg-slate-800 text-lime-400 shadow-sm border border-slate-700' : 'text-slate-455 hover:text-white'}`}
              >
                Entrar
              </button>
              <button 
                type="button"
                onClick={() => { setIsLogin(false); setError(""); setSuccessMsg(""); }}
                className={`flex-1 py-2 text-[11px] font-bold font-heading rounded-lg uppercase transition-all cursor-pointer ${!isLogin ? 'bg-slate-800 text-lime-400 shadow-sm border border-slate-700' : 'text-slate-455 hover:text-white'}`}
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
      <footer className="border-t border-slate-900 bg-slate-950 py-12 px-4 sm:px-6 md:px-12 text-slate-500 font-sans text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 rounded-lg text-lime-400 border border-slate-850">
              <Bike className="w-5 h-5" />
            </div>
            <p className="text-xs font-extrabold text-white">BIKER AI — Smart Assessment</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#beneficios" className="hover:text-white transition-colors">Benefícios</a>
            <a href="#precos" className="hover:text-white transition-colors">Preços</a>
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
                  <span className="font-extrabold select-none">VANTAGENS:</span>
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
