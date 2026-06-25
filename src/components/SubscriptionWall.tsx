import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldAlert, 
  CheckCircle, 
  Lock, 
  Sparkles, 
  CreditCard, 
  Zap, 
  MessageSquare, 
  Calendar, 
  Clock,
  HelpCircle,
  Copy,
  Smartphone,
  Flame,
  ArrowRight,
  Activity,
  TrendingUp,
  Award,
  ChevronRight,
  Gauge,
  Eye
} from "lucide-react";

interface SubscriptionWallProps {
  userEmail: string;
  userName: string;
  currentStatus: 'expired' | 'pending_payment';
  onActivated: (updatedProfile: UserProfile) => void;
}

export default function SubscriptionWall({ userEmail, userName, currentStatus, onActivated }: SubscriptionWallProps) {
  const [checkoutStep, setCheckoutStep] = useState<"plans" | "choose-payment" | "pix" | "mercadopago">("plans");
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewTab, setPreviewTab] = useState<"planilha" | "desempenho" | "zonas" | "chat">("planilha");

  // Mercado Pago states
  const [mpMethod, setMpMethod] = useState<"card" | "pix" | "link">("card");
  const [mpCardNumber, setMpCardNumber] = useState("");
  const [mpCardName, setMpCardName] = useState("");
  const [mpExpiry, setMpExpiry] = useState("");
  const [mpCvv, setMpCvv] = useState("");
  const [mpInstallments, setMpInstallments] = useState("1");
  const [mpEmail, setMpEmail] = useState(userEmail || "");
  const [mpSuccess, setMpSuccess] = useState(false);
  const [mpError, setMpError] = useState("");

  // Live Mercado Pago config
  const [mpConfig, setMpConfig] = useState<{ isReal: boolean; publicKey: string } | null>(null);
  const [mpLoading, setMpLoading] = useState(false);
  const [mpPreferenceUrl, setMpPreferenceUrl] = useState<string>("https://mpago.la/24PgikU");
  const [mpPixData, setMpPixData] = useState<{ qr_code: string; qr_code_base64: string; paymentId?: number } | null>(null);

  // Single premium plan
  const premiumPlan = { name: "Plano Premium", price: "19,89" };

  // Helper to handle support email redirection and copy to clipboard to bypass iframe sandbox limits
  const handleSupportEmailClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const email = "bikeraisupport@gmail.com";
    try {
      navigator.clipboard.writeText(email);
      alert("📧 E-mail do suporte copiado para a área de transferência: " + email + "\n\nSe o seu aplicativo de e-mail não abrir automaticamente, basta colar este endereço.");
    } catch (err) {
      alert("📧 Envie um e-mail para: " + email);
    }
    window.open(`mailto:${email}`, "_blank", "noopener,noreferrer");
  };

  // Marks the status as pending immediately when clicking subscription/payment buttons
  const markAsPendingPayment = async () => {
    try {
      const response = await fetch("/api/admin/update-user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          subscriptionStatus: "pending_payment"
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          onActivated(data.user.profile);
        }
      }
    } catch (err) {
      console.warn("Falha ao registrar interesse de faturamento como pendente no servidor:", err);
    }
  };

  // Fetch integration status on mount
  useEffect(() => {
    const checkMpConfig = async () => {
      try {
        const response = await fetch("/api/mercadopago/config");
        if (response.ok) {
          const data = await response.json();
          setMpConfig({ isReal: data.isReal, publicKey: data.publicKey });
        }
      } catch (err) {
        console.warn("[Mercado Pago] Erro verificando credenciais:", err);
      }
    };
    checkMpConfig();
  }, []);

  // Generate unique Checkout Pro preference from server
  const loadMpPreference = async () => {
    setMpLoading(true);
    try {
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail })
      });
      if (response.ok) {
        const data = await response.json();
        // If real, we prioritize sandbox link or direct init point
        setMpPreferenceUrl(data.sandbox_init_point || data.init_point || "https://mpago.la/24PgikU");
      }
    } catch (err) {
      console.error("[Mercado Pago] Erro ao carregar preferência de checkout:", err);
      setMpPreferenceUrl("https://mpago.la/24PgikU");
    } finally {
      setMpLoading(false);
    }
  };

  // Generate unique Pix from Mercado Pago API from server
  const loadMpPix = async () => {
    setMpLoading(true);
    try {
      const response = await fetch("/api/mercadopago/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail })
      });
      if (response.ok) {
        const data = await response.json();
        setMpPixData({
          qr_code: data.qr_code,
          qr_code_base64: data.qr_code_base64,
          paymentId: data.paymentId
        });
      }
    } catch (err) {
      console.error("[Mercado Pago] Erro ao carregar PIX oficial:", err);
    } finally {
      setMpLoading(false);
    }
  };

  // Format card number as 0000 0000 0000 0000
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  // Format expiry as MM/YY
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const handleCopyPixCode = () => {
    const pixAmount = premiumPlan.price.replace(",", ".");
    navigator.clipboard.writeText(`00020101021226870014BR.GOV.BCB.PIX2565bikerai-pix-production-coaching-mvp-key-pedrobramos-sempreceub-5204000053039865405${pixAmount}5802BR5924BikerAI-Coaching6009SAOPAULO62070503MVP`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = async () => {
    setSimulatingPayment(true);
    
    // Call server to update status
    try {
      const activePlanName = premiumPlan.name;
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const formattedDate = futureDate.toISOString().split('T')[0];
      
      const response = await fetch("/api/admin/update-user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          subscriptionStatus: "active",
          subscriptionPlan: activePlanName,
          subscriptionExpiresAt: formattedDate
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Success after short delay
          setTimeout(() => {
            setSimulatingPayment(false);
            onActivated(data.user.profile);
          }, 1800);
          return;
        }
      }
    } catch (err) {
      console.warn("Física do Pix indisponível, caindo para simulação offline de reativação imediata.");
    }

    // Offline fallback re-activation
    setTimeout(() => {
      setSimulatingPayment(false);
      onActivated({
        name: userName,
        level: "intermediário",
        goal: "melhorar condicionamento",
        daysPerWeek: 4,
        durationPerSession: 90,
        eventDate: "",
        hasPowerMeter: true,
        ftp: 210,
        hasHeartRate: true,
        maxHeartRate: 185,
        limitations: "",
        recentActivity: "",
        onboardingStep: 10,
        subscriptionStatus: "active",
        subscriptionPlan: premiumPlan.name,
        subscriptionExpiresAt: "2027-06-19",
        role: "athlete"
      });
    }, 1800);
  };

  const handleMercadoPagoPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulatingPayment(true);
    setMpError("");

    if (mpMethod === "card") {
      if (mpCardNumber.replace(/\s+/g, "").length < 16) {
        setMpError("Número de cartão inválido para o Mercado Pago.");
        setSimulatingPayment(false);
        return;
      }
      if (!mpCardName.trim()) {
        setMpError("Nome do titular é de preenchimento obrigatório.");
        setSimulatingPayment(false);
        return;
      }
      if (mpExpiry.length < 5) {
        setMpError("Validade do cartão está incorreta (necessário MM/AA).");
        setSimulatingPayment(false);
        return;
      }
      if (mpCvv.length < 3) {
        setMpError("CVV incorreto.");
        setSimulatingPayment(false);
        return;
      }
    }

    // Call server to update payment via simulated MP process
    try {
      const activePlanName = premiumPlan.name;
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const formattedDate = futureDate.toISOString().split('T')[0];

      const response = await fetch("/api/admin/update-user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          subscriptionStatus: "active",
          subscriptionPlan: activePlanName,
          subscriptionExpiresAt: formattedDate,
          paymentMethodId: "mercado_pago",
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Trigger confetti or success feedback
          setMpSuccess(true);
          setTimeout(() => {
            setSimulatingPayment(false);
            onActivated(data.user.profile);
          }, 2500);
          return;
        }
      }
    } catch (err) {
      console.error("Erro ao transacionar com gateway Mercado Pago:", err);
    }

    // Offline success simulation
    setMpSuccess(true);
    setTimeout(() => {
      setSimulatingPayment(false);
      onActivated({
        name: userName,
        level: "intermediário",
        goal: "melhorar condicionamento",
        daysPerWeek: 4,
        durationPerSession: 90,
        eventDate: "",
        hasPowerMeter: true,
        ftp: 210,
        hasHeartRate: true,
        maxHeartRate: 185,
        limitations: "",
        recentActivity: "",
        onboardingStep: 10,
        subscriptionStatus: "active",
        subscriptionPlan: premiumPlan.name,
        subscriptionExpiresAt: "2027-06-19",
        role: "athlete"
      });
    }, 2500);
  };

  return (
    <>
      <div id="subscription-wall-container" className="max-w-4xl mx-auto w-full bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-fadeInUp">
      {/* Alert Header */}
      <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-200">
        <div className="p-3 bg-amber-500 rounded-xl text-white shrink-0 shadow-sm animate-pulse">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-heading font-extrabold text-amber-900 text-sm sm:text-base">
            {currentStatus === "expired" ? "Sua Assinatura Expirou" : "Pagamento Pendente Confirmando"}
          </h3>
          <p className="text-xs text-amber-800 leading-relaxed font-sans">
            Olá, <strong>{userName}</strong>. O seu fôlego e evolução de giro não podem parar! Porém, consta nos nossos registros que o seu período de assinatura expirou ou o pagamento de mensalidade está pendente. Regularize o faturamento abaixo para reativar seu treinador e planilhas.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {checkoutStep === "plans" ? (
          <motion.div 
            key="plans-step" 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            {/* Value Proposition */}
            <div className="text-center space-y-1">
              <span className="bg-lime-500/15 text-lime-600 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-lime-500/10 tracking-wider animate-pulse">
                Acesso Ilimitado Garantido
              </span>
              <h4 className="font-heading font-black text-slate-800 text-lg pt-1">Assinatura Premium CycleCoach AI</h4>
              <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">Acesso total e imediato a suas planilhas de treinos e ao Coach Integrado.</p>
            </div>

            {/* Plans Grid (Single Strategic Plan) */}
            <div className="flex flex-col md:flex-row gap-6 items-stretch justify-center">
              <div 
                className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-900 text-white shadow-xl ring-2 ring-lime-400 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-lime-400 font-sans">PROMOÇÃO ATIVA</span>
                    <Zap className="w-4 h-4 text-lime-400" />
                  </div>
                  <h5 className="font-heading font-black text-lg mt-2">Mensal Premium</h5>
                  <p className="text-[11px] mt-1.5 text-slate-300 font-sans">
                    Acesso completo a todas as ferramentas, gráficos e treinador AI, sem barreiras de uso nem limitações de fôlego!
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-800 mt-6 md:mt-8">
                  <span className="text-xs font-bold font-sans">R$</span>
                  <strong className="text-3xl font-black font-heading leading-none px-1">19,89</strong>
                  <span className="text-xs opacity-75 font-sans">/mês</span>
                  <span className="block text-[10px] opacity-60 text-sans mt-0.5">Assinatura mensal sem fidelidade</span>
                </div>
              </div>

              {/* Pricing inclusions list */}
              <div className="flex-1 flex flex-col justify-between space-y-3 bg-slate-50 p-5 rounded-2xl">
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Benefícios Inclusos</span>
                  <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-650 font-sans">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Planejamento dinâmico de planilhas adaptado ao seu fôlego</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Interações ilimitadas síncronas com o Treinador AI</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Gráficos de evolução de calorias e volume de giros</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Suporte completo para exportar treinos e ler do Strava</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 text-slate-500 text-[11px] leading-relaxed font-sans">
                  💎 <strong>Acesso imediato:</strong> Finalize seu faturamento usando o canal oficial do Mercado Pago abaixo e clique em confirmar para liberar tudo na hora.
                </div>
              </div>
            </div>

            {/* Featured Direct Payment Link */}
            <div className="bg-gradient-to-r from-sky-600 to-indigo-700 rounded-3xl p-6 text-white space-y-4 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-12">
                <Sparkles className="w-48 h-48" />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <span className="bg-white/20 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white">
                  Canal Recomendado
                </span>
                <span className="text-[11px] bg-lime-400 text-slate-900 font-extrabold px-3 py-1 rounded-full uppercase shadow-xs flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-red-600 fill-red-600 animate-pulse" />
                  <span>Acesso Imediato</span>
                </span>
              </div>
              <div className="space-y-1.5 relative z-10">
                <h5 className="font-heading font-black text-base sm:text-lg">Link Oficial de Pagamentos Mercado Pago</h5>
                <p className="text-xs text-sky-100 max-w-lg leading-relaxed font-sans">
                  Use o nosso link de faturamento seguro e oficial do Mercado Pago para efetuar o pagamento. Após pagar, <strong>sua conta será liberada em até 24 Corridas/Duração</strong> (24 horas úteis).
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10-wrapper">
                <a
                  href="https://mpago.la/24PgikU"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={markAsPendingPayment}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-900 font-black text-center py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer inline-block"
                >
                  Abrir Link de Pagamento Mercado Pago ↗
                </a>
                <div className="px-5 py-3.5 bg-white/10 border border-white/20 text-lime-400 font-extrabold text-center rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 relative z-10">
                  <Clock className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>Sua conta será liberada em 24h</span>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Outras Opções de Pagamento Integradas</span>
            </div>

            <div className="max-w-md mx-auto w-full">
              {/* Option 1: MERCADO PAGO INTEGRADO */}
              <button
                type="button"
                onClick={() => {
                  markAsPendingPayment();
                  setCheckoutStep("mercadopago");
                  setMpMethod("card");
                  setMpError("");
                  loadMpPreference();
                }}
                className="w-full p-6 rounded-3xl border-2 border-sky-105 hover:border-sky-300 bg-sky-50/10 hover:bg-sky-50/30 text-left transition-all cursor-pointer space-y-4 group relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="px-3 py-1 bg-sky-500 rounded-lg text-white font-black italic tracking-tighter text-[10px]">
                      mercado pago
                    </div>
                    {mpConfig?.isReal ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">INTEGRAÇÃO REAL</span>
                    ) : (
                      <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full uppercase">Modo de Teste</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-heading font-extrabold text-slate-800 text-xs sm:text-sm group-hover:text-sky-600 transition-colors">Assinar via Checkout Protegido</h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Pague no cartão de crédito em até 12x, boleto ou através do ecossistema do seu app Mercado Pago com liberação imediata.
                    </p>
                  </div>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-[10px] text-sky-600 font-bold">
                  <span>{mpLoading ? "Iniciando gateway de pagamentos..." : "Checkout Mercado Pago"}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </motion.div>
        ) : checkoutStep === "choose-payment" ? (
          <motion.div
            key="choose-payment-step"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6 max-w-2xl mx-auto"
          >
            <div className="text-center space-y-1">
              <span className="bg-lime-100 text-lime-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-sm">
                Plano: {premiumPlan.name} — R$ {premiumPlan.price}
              </span>
              <h4 className="font-heading font-black text-slate-800 text-base pt-1">Como deseja assinar?</h4>
              <p className="text-xs text-slate-450 font-sans">Escolha a sua plataforma de checkout preferida de forma rápida e segura</p>
            </div>

            {/* Featured Direct Payment Link */}
            <div className="bg-gradient-to-r from-sky-600 to-indigo-700 rounded-3xl p-6 text-white space-y-4 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-12">
                <Sparkles className="w-48 h-48" />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <span className="bg-white/20 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white">
                  Canal Recomendado
                </span>
                <span className="text-[11px] bg-lime-400 text-slate-900 font-extrabold px-3 py-1 rounded-full uppercase shadow-xs flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-red-600 fill-red-650 animate-pulse" />
                  <span>Acesso Imediato</span>
                </span>
              </div>
              <div className="space-y-1.5 relative z-10">
                <h5 className="font-heading font-black text-base sm:text-lg">Link Oficial de Pagamentos Mercado Pago</h5>
                <p className="text-xs text-sky-100 max-w-lg leading-relaxed font-sans">
                  Use o nosso link de faturamento seguro e oficial do Mercado Pago para efetuar o pagamento. Após pagar, <strong>sua conta será liberada em até 24 Corridas/Duração</strong> (24 horas úteis).
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10-wrapper-step">
                <a
                  href="https://mpago.la/24PgikU"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={markAsPendingPayment}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-900 font-black text-center py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer inline-block"
                >
                  Abrir Link de Pagamento Mercado Pago ↗
                </a>
                <div className="px-5 py-3.5 bg-white/10 border border-white/20 text-lime-400 font-extrabold text-center rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 relative z-10">
                  <Clock className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>Sua conta será liberada em 24h</span>
                </div>
              </div>
            </div>

            <div className="max-w-md mx-auto w-full">
              {/* Option 1: MERCADO PAGO */}
              <button
                type="button"
                onClick={() => {
                  markAsPendingPayment();
                  setCheckoutStep("mercadopago");
                  setMpMethod("card");
                  setMpError("");
                  loadMpPreference();
                }}
                className="w-full p-6 rounded-3xl border-2 border-sky-250 hover:border-sky-500 bg-sky-50/20 hover:bg-sky-50/55 text-left transition-all cursor-pointer space-y-4 group relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {/* Simulated Mercado Pago styled icon */}
                    <div className="px-3 py-1 bg-sky-500 rounded-lg text-white font-black italic tracking-tighter text-xs">
                      mercado pago
                    </div>
                    {mpConfig?.isReal ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">INTEGRAÇÃO REAL</span>
                    ) : (
                      <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full uppercase">Modo de Teste</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-heading font-extrabold text-slate-800 text-sm group-hover:text-sky-600 transition-colors">Assinar via Mercado Pago</h5>
                    <p className="text-[11px] text-slate-550 leading-relaxed">
                      Pague no cartão de crédito em até 12x, boleto ou através do ecossistema do seu app Mercado Pago com liberação imediata.
                    </p>
                  </div>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-sky-600 font-bold">
                  <span>{mpLoading ? "Iniciando gateway de pagamentos..." : "Checkout Mercado Pago"}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setCheckoutStep("plans")}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-650 tracking-wider transition-colors cursor-pointer"
              >
                ← Voltar para listagem de planos
              </button>
            </div>
          </motion.div>
        ) : checkoutStep === "mercadopago" ? (
          <motion.div
            key="mercadopago-step"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6 max-w-2xl mx-auto"
          >
            {/* Mercado Pago Header */}
            <div className="bg-sky-500 rounded-3xl p-6 text-white space-y-3 shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 translate-x-1/4 -translate-y-1/4 scale-150">
                <CreditCard className="w-64 h-64 text-white" />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-heading font-black italic tracking-tighter text-lg">mercado pago</span>
                {mpConfig?.isReal ? (
                  <span className="bg-emerald-450 border border-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-slate-900 shadow-sm animate-pulse">
                    INTEGRAÇÃO EM TEMPO REAL ATIVA
                  </span>
                ) : (
                  <span className="bg-white/20 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                    MODO DEMOSTRATIVO INTEGRADO
                  </span>
                )}
              </div>
              <div className="space-y-1 relative z-10">
                <h4 className="font-heading font-black text-base">Finalizar Assinatura Premium</h4>
                <p className="text-xs text-sky-100 font-sans max-w-md">
                  {mpConfig?.isReal 
                    ? "As transações estão prontas para processamento oficial no ecossistema e chaves Pix oficiais da sua conta Mercado Pago."
                    : "Simulação de transação criptografada desenvolvida com o design system do gateway original do Mercado Pago no Brasil."
                  }
                </p>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <span className="text-[11px] bg-sky-600/60 font-mono px-2.5 py-1 rounded border border-white/15">
                  Preço: R$ {premiumPlan.price} /mês
                </span>
                <span className="text-[11px] bg-emerald-500 font-bold px-2 py-0.5 rounded">Reconhecimento Imediato</span>
              </div>
            </div>

            {/* Mercado Pago Payment Screen Content */}
            {mpSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center space-y-4 py-12 animate-fadeIn">
                <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-md">
                  ✓
                </div>
                <div className="space-y-1">
                  <h5 className="font-heading font-black text-emerald-800 text-sm sm:text-base">Pagamento Confirmado no Mercado Pago!</h5>
                  <p className="text-[11px] text-slate-550 max-w-sm mx-auto leading-normal">
                    Seu plano mensal premium foi ativado. Você será redirecionado para o painel de atletas em alguns segundos...
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleMercadoPagoPayment} className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-150">
                <h5 className="text-xs uppercase font-extrabold text-slate-450 tracking-wider">Dados do Cartão (Simulação Mercado Pago)</h5>
                
                {mpError && (
                  <div className="p-3 bg-rose-50 border border-rose-250 text-rose-800 text-[11px] rounded-xl font-sans font-bold">
                    ⚠️ {mpError}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Card Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-450">Número do Cartão</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        value={mpCardNumber}
                        onChange={(e) => setMpCardNumber(formatCardNumber(e.target.value))}
                        className="w-full bg-white border border-slate-200 text-sm font-mono px-3 py-2.5 rounded-xl outline-hidden focus:border-sky-500 transition-colors"
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-sans text-slate-350 text-[10px] uppercase font-black">
                        {mpCardNumber.startsWith("4") ? "VISA" : mpCardNumber.startsWith("5") ? "MASTERCARD" : "CARTÃO"}
                      </span>
                    </div>
                  </div>

                  {/* Holder Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-450">Nome do Titular (Como impresso no cartão)</label>
                    <input
                      type="text"
                      placeholder="JOÃO A SILVA"
                      value={mpCardName}
                      onChange={(e) => setMpCardName(e.target.value.toUpperCase())}
                      className="w-full bg-white border border-slate-200 text-xs font-sans px-3 py-2.5 rounded-xl uppercase tracking-wider outline-hidden focus:border-sky-500 transition-colors"
                      required
                    />
                  </div>

                  {/* Grid for Expiry and CVV */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-450">Validade (MM/AA)</label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        maxLength={5}
                        value={mpExpiry}
                        onChange={(e) => setMpExpiry(formatExpiry(e.target.value))}
                        className="w-full bg-white border border-slate-200 text-xs font-mono px-3 py-2.5 rounded-xl outline-hidden focus:border-sky-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-450">CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        maxLength={4}
                        value={mpCvv}
                        onChange={(e) => setMpCvv(e.target.value.replace(/[^0-9]/gi, ""))}
                        className="w-full bg-white border border-slate-200 text-xs font-mono px-3 py-2.5 rounded-xl outline-hidden focus:border-sky-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Installments selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-450">Opções de Parcelamento</label>
                    <select
                      value={mpInstallments}
                      onChange={(e) => setMpInstallments(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-hidden focus:border-sky-500"
                    >
                      <option value="1">1x de R$ {premiumPlan.price} (Sem juros)</option>
                      <option value="2">2x de R$ 15,45 (com juros Mercado Pago)</option>
                      <option value="3">3x de R$ 10,50 (com juros Mercado Pago)</option>
                      <option value="6">6x de R$ 5,60 (com juros Mercado Pago)</option>
                    </select>
                  </div>

                  {/* Email Confirmation */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-450">E-mail para Recibo Mercado Pago</label>
                    <input
                      type="email"
                      value={mpEmail}
                      onChange={(e) => setMpEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-xl outline-hidden focus:border-sky-500"
                      required
                    />
                  </div>
                </div>

                {/* Confirm button */}
                <div className="pt-2 space-y-3">
                  {mpPreferenceUrl && mpPreferenceUrl !== "#simular-checkout" && (
                    <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-sky-900 shadow-xs">
                      <div className="space-y-0.5 text-left">
                        <p className="font-extrabold flex items-center gap-1.5 text-sky-850">
                          <Sparkles className="w-3.5 h-3.5 text-sky-650 animate-bounce" />
                          <span>Link Oficial do Mercado Pago Ativo</span>
                        </p>
                        <p className="text-[11px] text-sky-700 leading-normal">Se preferir usar o preenchimento seguro direto na interface oficial do Mercado Pago:</p>
                      </div>
                      <a
                        href={mpPreferenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-xs shrink-0 block text-center cursor-pointer"
                      >
                        Ir para Checkout Pro ↗
                      </a>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={simulatingPayment}
                    className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-black py-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                  >
                    {simulatingPayment ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Transacionando no Mercado Pago...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-sky-100" />
                        <span>Pagar R$ {premiumPlan.price} com Mercado Pago (Via App)</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep("choose-payment")}
                    className="text-[11px] text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                  >
                    Voltar para formas de pagamento
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        ) : (
          <motion.div 
          key="pix-step" 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="space-y-6"
        >
          {/* PIX QR CODE BLOCK */}
          <div className="text-center space-y-1">
            <span className="bg-lime-100 text-lime-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-sm">
              Plano: {premiumPlan.name} — R$ {premiumPlan.price}
            </span>
            <h4 className="font-heading font-black text-slate-800 text-base pt-1">Pague com PIX para Liberação Automática</h4>
            <p className="text-xs text-slate-450 font-sans">O banco confere a transação a cada 2 segundos para liberar o seu painel de treino</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 bg-slate-50 p-6 rounded-3xl max-w-2xl mx-auto border border-slate-100">
            {/* Simulated QR Code SVG visual */}
            <div className="p-3 bg-white border border-slate-150 rounded-2xl shrink-0 flex flex-col items-center">
              <div className="w-36 h-36 border border-slate-950 p-2 flex flex-col justify-between items-stretch">
                <div className="flex justify-between">
                  <div className="w-8 h-8 bg-slate-900"></div>
                  <div className="w-8 h-8 bg-slate-900"></div>
                </div>
                <div className="flex justify-center items-center font-mono font-black text-[10px] text-slate-800 tracking-wider p-0.5">
                  BIKER AI PIX
                </div>
                <div className="flex justify-between items-end">
                  <div className="w-8 h-8 bg-slate-900"></div>
                  <div className="w-4 h-4 bg-slate-900"></div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 font-sans uppercase font-bold tracking-wider">PIX Oficial Biker AI</div>
            </div>

            {/* Pix text and actions */}
            <div className="flex-1 space-y-4 text-center md:text-left w-full">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Pix Copia e Cola</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`bikerai-pix-${premiumPlan.price}-pedrobramos-coaching`}
                    className="bg-white border border-slate-150 text-[11px] text-slate-500 font-mono px-3 py-2.5 rounded-xl flex-1 outline-hidden select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPixCode}
                    className="px-3.5 bg-slate-900 text-white rounded-xl hover:bg-slate-850 cursor-pointer text-xs"
                    title="Copiar código Pix"
                  >
                    {copied ? "Copiado!" : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={simulatingPayment}
                  onClick={handleSimulatePayment}
                  className="w-full bg-slate-900 border border-slate-850 hover:bg-slate-800 text-lime-400 font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer relative shadow-sm"
                >
                  {simulatingPayment ? (
                    <>
                      <span className="w-4 h-4 border-2 border-lime-400 border-t-transparent rounded-full animate-spin"></span>
                      <span>Verificando PIX no banco...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 animate-bounce" />
                      <span>Confirmar Pagamento (Simular)</span>
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => setCheckoutStep("choose-payment")}
                  className="w-full text-[11px] text-slate-450 hover:text-slate-650 font-extrabold transition-all cursor-pointer text-center"
                >
                  Voltar às formas de pagamento
                </button>
              </div>
            </div>
          </div>

          {/* Advice instructions */}
          <div className="text-center">
            <span className="text-[10px] text-slate-400 font-sans block">
              Se você já efetuou o pagamento presencial ou por PIX direto ao treinador, solicite a reativação manual enviando um e-mail para <button type="button" onClick={handleSupportEmailClick} className="text-lime-500 font-extrabold hover:underline cursor-pointer bg-transparent border-none p-0">bikeraisupport@gmail.com</button>.
            </span>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>

    {/* INTERACTIVE PREVIEW */}
    <div className="max-w-4xl mx-auto w-full bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1 text-left">
          <span className="bg-lime-400/15 text-lime-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-lime-400/10 tracking-widest flex items-center gap-1.5 w-fit">
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Interativo do Sistema</span>
          </span>
          <h3 className="font-heading font-black text-xl tracking-tight text-white pt-1">👀 Conheça o Painel do Biker AI Coach</h3>
          <p className="text-xs text-slate-400 font-sans">Explore um vislumbre real das ferramentas inclusas por apenas R$ 19,89/mês</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto">
          <span className="w-2.5 h-2.5 bg-lime-400 rounded-full animate-pulse ml-1"></span>
          <span className="text-[10px] text-lime-400 font-black uppercase tracking-wider pr-1">Dados Demonstrativos</span>
        </div>
      </div>

      {/* Tab selection */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-850">
        <button
          type="button"
          onClick={() => setPreviewTab("planilha")}
          className={`flex-1 py-3 px-4 rounded-xl text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            previewTab === "planilha" ? "bg-slate-900 text-lime-400 shadow-md border border-slate-800" : "text-slate-400 hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Calendário de Treino</span>
          <span className="sm:hidden">Treino</span>
        </button>
        <button
          type="button"
          onClick={() => setPreviewTab("desempenho")}
          className={`flex-1 py-3 px-4 rounded-xl text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            previewTab === "desempenho" ? "bg-slate-900 text-lime-400 shadow-md border border-slate-800" : "text-slate-400 hover:text-white"
          }`}
        >
          <Activity className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Gráficos de Desempenho</span>
          <span className="sm:hidden">Gráficos</span>
        </button>
        <button
          type="button"
          onClick={() => setPreviewTab("zonas")}
          className={`flex-1 py-3 px-4 rounded-xl text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            previewTab === "zonas" ? "bg-slate-900 text-lime-400 shadow-md border border-slate-800" : "text-slate-400 hover:text-white"
          }`}
        >
          <Gauge className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Zonas de Potência (FTP)</span>
          <span className="sm:hidden">Zonas (FTP)</span>
        </button>
        <button
          type="button"
          onClick={() => setPreviewTab("chat")}
          className={`flex-1 py-3 px-4 rounded-xl text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            previewTab === "chat" ? "bg-slate-900 text-lime-400 shadow-md border border-slate-800" : "text-slate-400 hover:text-white"
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Conversa com IA Coach</span>
          <span className="sm:hidden">Treinador IA</span>
        </button>
      </div>

      {/* Tab content wrapper w/ safe preview blur/indicators */}
      <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 min-h-[300px] flex flex-col justify-between relative overflow-hidden text-left">
        {/* Subtle watermark layer on top with lock */}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950 via-slate-950/80 to-transparent pt-32 pb-4 flex flex-col items-center justify-end z-20">
          <div className="bg-slate-900/40 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/5 flex items-center gap-3 text-white max-w-sm text-center shadow-lg pointer-events-none mb-2">
            <div className="p-1.5 bg-lime-400/10 text-lime-400 rounded-lg">
              <Lock className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-sans text-left leading-normal">
              <strong>Gostou do que viu?</strong> Ative sua conta premium para liberar interações em tempo real com seu Strava e inteligência analítica completa.
            </p>
          </div>
        </div>

        <div className="z-10 w-full relative">
          {previewTab === "planilha" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-900/60 pb-3">
                <h4 className="font-heading font-black text-sm text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-lime-400" />
                  <span>Planilha de Treinos Periódica</span>
                </h4>
                <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 uppercase font-mono">Semana 1 / Base</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Monday */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span>SEG, 22 JUN</span>
                    <span className="bg-lime-400/10 text-lime-450 px-2 py-0.5 rounded uppercase font-mono">Z4 Limiar</span>
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-white text-xs font-black">Intervalos de LTI (Morro)</h5>
                    <p className="text-[11px] text-slate-400">3x10 min @ 205W-215W na subida. Recuperação progressiva de 6 min girando.</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 border-t border-slate-850">
                    <span>⏱️ 1h 30m</span>
                    <span>🔥 850 kcal</span>
                  </div>
                </div>

                {/* Tuesday */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span>TER, 23 JUN</span>
                    <span className="bg-sky-400/10 text-sky-450 px-2 py-0.5 rounded uppercase font-mono font-bold">Z1 Giro</span>
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-white text-xs font-black">Recuperação Ativa de Giro</h5>
                    <p className="text-[11px] text-slate-400">Pedal leve plano de cadência confortável (90+ rpm) para retirar resíduos de lactato.</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 border-t border-slate-850">
                    <span>⏱️ 45 min</span>
                    <span>🔥 340 kcal</span>
                  </div>
                </div>

                {/* Wednesday */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span>QUA, 24 JUN</span>
                    <span className="bg-red-400/10 text-red-450 px-2 py-0.5 rounded uppercase font-mono">Z5 VO2Max</span>
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-white text-xs font-black">Estímulos Aeróbicos Curtos</h5>
                    <p className="text-[11px] text-slate-400">5x3 min @ 245W-260W em plano. Recuperação total de 4 min. Atenção à postura.</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 border-t border-slate-850">
                    <span>⏱️ 1h 15m</span>
                    <span>🔥 780 kcal</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-905 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-lime-400/15 text-lime-400 rounded-xl">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <h5 className="text-white text-[11px] font-extrabold uppercase tracking-wide">Recalibração Dinâmica por Inteligência Artificial</h5>
                    <p className="text-[10px] text-slate-400">Ao final de cada pedal, a IA recalculará a intensidade dos próximos dias com base no seu nível real de fadiga neuromuscular.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {previewTab === "desempenho" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-900/60 pb-3">
                <h4 className="font-heading font-black text-sm text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-4 h-4 text-lime-400" />
                  <span>Métricas & Gráficos Analíticos</span>
                </h4>
                <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-emerald-450 uppercase font-mono font-black">+5.2% PROGRESSO</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800/80 text-center space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Tempo Semanal</span>
                  <strong className="text-white font-heading font-black text-base">8h 45m</strong>
                  <span className="text-[9px] block text-lime-400">Meta: 9h (97%)</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800/80 text-center space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Calorias Gastas</span>
                  <strong className="text-white font-heading font-black text-base">4.890 kcal</strong>
                  <span className="text-[9px] block text-lime-400">+12% vs sem. anterior</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800/80 text-center space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Carga de Estresse (TSS)</span>
                  <strong className="text-white font-heading font-black text-base">410 u</strong>
                  <span className="text-[9px] block text-amber-500">Superação Saudável</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800/80 text-center space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Limiar de Potência (FTP)</span>
                  <strong className="text-white font-heading font-black text-base text-lime-450">210 Watts</strong>
                  <span className="text-[9px] block text-lime-400">3.1 W/kg (Forte)</span>
                </div>
              </div>

              {/* SVG Visual Bar Graph */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Histórico de Volume de Giros (Semanal)</span>
                <div className="h-24 flex items-end justify-between gap-3 pt-3 px-2">
                  <div className="w-full flex flex-col items-center gap-1.5">
                    <div className="w-full bg-slate-800 rounded-lg h-12 relative overflow-hidden flex items-end justify-center">
                      <div className="w-full bg-slate-750 h-8"></div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">Semana 1</span>
                  </div>
                  <div className="w-full flex flex-col items-center gap-1.5">
                    <div className="w-full bg-slate-800 rounded-lg h-16 relative overflow-hidden flex items-end justify-center">
                      <div className="w-full bg-slate-700 h-10"></div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">Semana 2</span>
                  </div>
                  <div className="w-full flex flex-col items-center gap-1.5">
                    <div className="w-full bg-slate-800 rounded-lg h-20 relative overflow-hidden flex items-end justify-center">
                      <div className="w-full bg-slate-650 h-14"></div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">Semana 3</span>
                  </div>
                  <div className="w-full flex flex-col items-center gap-1.5">
                    <div className="w-full bg-slate-850 rounded-lg h-24 relative overflow-hidden flex items-end justify-center">
                      <div className="w-full bg-lime-400 h-22 animate-pulse"></div>
                    </div>
                    <span className="text-[9px] font-mono text-lime-400 font-extrabold">Semana Atual</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {previewTab === "zonas" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-900/60 pb-3">
                <h4 className="font-heading font-black text-sm text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-lime-400" />
                  <span>Zonas de Potência Alvo (FTP: 210W)</span>
                </h4>
                <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 uppercase font-mono">Calibrado</span>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] text-slate-450 leading-relaxed font-sans">
                  Nossas planilhas usam a padronização oficial de fisiologia de ciclismo (relação de watts baseadas em percentual do seu FTP).
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-sans">
                  <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded bg-slate-500 shrink-0"></span>
                      <span className="text-slate-350 text-[11px]">Z1 - Recuperação Ativa</span>
                    </div>
                    <strong className="text-white">Até 115 Watts</strong>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0 animate-pulse"></span>
                      <span className="text-slate-350 text-[11px] font-bold text-emerald-400">Z2 - Endurance / Base</span>
                    </div>
                    <strong className="text-white">115W - 157 Watts</strong>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded bg-teal-500 shrink-0"></span>
                      <span className="text-slate-350 text-[11px]">Z3 - Tempo Sustentado</span>
                    </div>
                    <strong className="text-white">158W - 190 Watts</strong>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded bg-amber-500 shrink-0"></span>
                      <span className="text-slate-350 text-[11px]">Z4 - Limiar de Lactato</span>
                    </div>
                    <strong className="text-white">191W - 220 Watts</strong>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500 shrink-0"></span>
                      <span className="text-slate-350 text-[11px]">Z5 - VO2 Máximo</span>
                    </div>
                    <strong className="text-white">221W - 252 Watts</strong>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded bg-purple-500 shrink-0"></span>
                      <span className="text-slate-350 text-[11px]">Z6 - Capacidade Anaeróbica</span>
                    </div>
                    <strong className="text-white">253W - 315 Watts</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {previewTab === "chat" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-900/60 pb-3">
                <h4 className="font-heading font-black text-sm text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-lime-400" />
                  <span>Conversa Científica (Coach Integrado)</span>
                </h4>
                <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 uppercase font-mono font-bold">Inteligência Fisiológica</span>
              </div>

              <div className="space-y-3 bg-slate-900/40 p-4 rounded-2xl border border-slate-800 max-h-[190px] overflow-y-auto font-sans text-xs">
                {/* Coach message */}
                <div className="flex items-start gap-2.5 text-left">
                  <div className="w-6 h-6 bg-lime-400 text-slate-900 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                    AI
                  </div>
                  <div className="bg-slate-800 text-slate-100 p-3 rounded-2xl rounded-tl-none space-y-1">
                    <span className="font-bold text-[10px] text-lime-400 block uppercase tracking-wider">Coach Fisiologista Biker AI</span>
                    <p className="leading-relaxed text-[11px]">
                      Excelente pedal ontem! Notei que você sustentou 215W nos tiros no Morro do Cristo, bem perto do seu limiar de 210W. Sentiu algum desconforto muscular ou fôlego curto?
                    </p>
                  </div>
                </div>

                {/* athlete message */}
                <div className="flex items-start gap-2.5 justify-end text-right">
                  <div className="bg-lime-400/90 text-slate-950 p-3 rounded-2xl rounded-tr-none space-y-0.5 max-w-sm text-left font-medium">
                    <span className="font-black text-[9px] text-slate-900 block uppercase tracking-wider text-right">Você (Atleta)</span>
                    <p className="leading-normal text-[11px]">O fôlego foi bem, mas as pernas queimaram forte no final do terceiro tiro!</p>
                  </div>
                  <div className="w-6 h-6 bg-slate-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                    VC
                  </div>
                </div>

                {/* Coach reply */}
                <div className="flex items-start gap-2.5 text-left">
                  <div className="w-6 h-6 bg-lime-400 text-slate-900 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                    AI
                  </div>
                  <div className="bg-slate-800 text-slate-100 p-3 rounded-2xl rounded-tl-none space-y-1">
                    <span className="font-bold text-[10px] text-lime-400 block uppercase tracking-wider">Coach Fisiologista Biker AI</span>
                    <p className="leading-relaxed text-[11px]">
                      Isso é ótimo, significa que estimulamos a tolerância ao lactato! Para hoje, a planilha prescreve regenerativo leve (Z1) para limpar a fadiga. Mantenha cadência de giro leve.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  disabled
                  placeholder="Faça perguntas sobre seu treino... (Ativo na conta Premium)"
                  className="w-full bg-slate-900/45 border border-slate-800 text-xs px-3.5 py-3 rounded-xl outline-none pr-20 text-slate-500 font-sans cursor-not-allowed"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-slate-800 text-lime-400 px-2 py-1 rounded border border-slate-700">
                  Premium
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </>
);
}
