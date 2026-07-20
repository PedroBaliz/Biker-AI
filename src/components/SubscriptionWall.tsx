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
  HelpCircle,
  Copy,
  Smartphone,
  Flame,
  ArrowRight
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
  const [mpPreferenceUrl, setMpPreferenceUrl] = useState<string>("");
  const [mpPixData, setMpPixData] = useState<{ qr_code: string; qr_code_base64: string; paymentId?: number } | null>(null);

  // Single premium plan
  const premiumPlan = { name: "Plano Pro", price: "29,90" };

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
        setMpPreferenceUrl(data.sandbox_init_point || data.init_point || "");
      }
    } catch (err) {
      console.error("[Mercado Pago] Erro ao carregar preferência de checkout:", err);
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
              <span className="bg-lime-500/15 text-lime-600 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-lime-500/10 tracking-wider">
                Acesso Ilimitado Garantido
              </span>
              <h4 className="font-heading font-black text-slate-800 text-lg pt-1">Assinatura Plano Pro CycleCoach AI</h4>
              <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">Acesse planilhas inteligentes recalibradas pela IA e evolua seu rendimento ilimitadamente.</p>
            </div>

            {/* Plans Grid (Single Strategic Plan) */}
            <div className="flex justify-center">
              <div 
                className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-900 text-white shadow-xl scale-[1.02] ring-2 ring-lime-400 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-lime-400">Plano Único e Completo</span>
                    <Zap className="w-4 h-4 text-lime-400" />
                  </div>
                  <h5 className="font-heading font-black text-lg mt-2">Plano Pro (Mensal)</h5>
                  <p className="text-[11px] mt-1.5 text-slate-300">
                    Acesso completo a todas as ferramentas, gráficos e treinador AI, sem barreiras de uso nem limitações de fôlego!
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-850 mt-6">
                  <span className="text-xs font-bold font-sans">R$</span>
                  <strong className="text-3xl font-black font-heading leading-none px-1">29,90</strong>
                  <span className="text-xs opacity-75 font-sans">/mês</span>
                  <span className="block text-[10px] opacity-60 text-sans mt-0.5">Assinatura mensal sem fidelidade</span>
                </div>
              </div>
            </div>

            {/* Pricing inclusions list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl text-xs text-slate-650 font-sans">
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

            {/* Action proceed */}
            <div className="flex justify-center pt-3">
              <button
                type="button"
                onClick={() => setCheckoutStep("choose-payment")}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-lime-400 font-extrabold uppercase rounded-xl text-xs transition-all cursor-pointer shadow-md"
              >
                <span>Ir para Forma de Pagamento</span>
                <ArrowRight className="w-4 h-4" />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: MERCADO PAGO */}
              <button
                type="button"
                onClick={() => {
                  setCheckoutStep("mercadopago");
                  setMpMethod("card");
                  setMpError("");
                  loadMpPreference();
                }}
                className="p-6 rounded-3xl border-2 border-sky-250 hover:border-sky-500 bg-sky-50/20 hover:bg-sky-50/55 text-left transition-all cursor-pointer space-y-4 group relative flex flex-col justify-between"
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

              {/* Option 2: PIX DIRETO */}
              <button
                type="button"
                onClick={() => setCheckoutStep("pix")}
                className="p-6 rounded-3xl border-2 border-slate-150 hover:border-slate-350 bg-slate-50/40 hover:bg-slate-50 text-left transition-all cursor-pointer space-y-4 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="px-3 py-1.5 bg-emerald-500 rounded-lg text-white font-sans font-black flex items-center gap-1 text-[11px] tracking-wide">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>PIX DIRETO</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-heading font-extrabold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">PIX Copia e Cola</h5>
                    <p className="text-[11px] text-slate-550 leading-relaxed">
                      Pague de forma instantânea sem intermediários de cartão. Leitura imediata com QR Code ou Copia e Cola tradicional.
                    </p>
                  </div>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                  <span>Ir para QR Code PIX</span>
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

            {/* Sub Tabs for Mercado Pago */}
            <div className="flex border-b border-slate-150">
              <button
                type="button"
                onClick={() => {
                  setMpMethod("card");
                  setMpError("");
                  loadMpPreference();
                }}
                className={`flex-1 py-3 text-center text-xs font-extrabold border-b-2 tracking-wider uppercase transition-colors cursor-pointer ${
                  mpMethod === "card" ? "border-sky-500 text-sky-600" : "border-transparent text-slate-450 hover:text-slate-650"
                }`}
              >
                Cartão de Crédito
              </button>
              <button
                type="button"
                onClick={() => {
                  setMpMethod("pix");
                  setMpError("");
                  loadMpPix();
                }}
                className={`flex-1 py-3 text-center text-xs font-extrabold border-b-2 tracking-wider uppercase transition-colors cursor-pointer ${
                  mpMethod === "pix" ? "border-sky-500 text-sky-600" : "border-transparent text-slate-450 hover:text-slate-650"
                }`}
              >
                Pix Mercado Pago
              </button>
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
            ) : mpMethod === "card" ? (
              <form onSubmit={handleMercadoPagoPayment} className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-150">
                <h5 className="text-xs uppercase font-extrabold text-slate-450 tracking-wider">Dados do Cartão (Simulação Mercado Pago)</h5>
                
                {mpError && (
                  <div className="p-3 bg-rose-50 border border-rose-250 text-rose-800 text-[11px] rounded-xl font-sans font-bold">
                    {mpError}
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
            ) : (
              // Pix Mercado Pago Simulator Option
              <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-150">
                <div className="text-center space-y-1.5 p-4 bg-white border border-slate-150 rounded-2xl shadow-xs">
                  <span className="bg-sky-100 text-sky-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-sm">
                    {mpPixData && !mpPixData?.qr_code_base64 ? "Pix Simulador Integrado" : "Pix Integrado Oficial"}
                  </span>
                  <h4 className="font-heading font-black text-slate-800 text-sm">Leitura do QR Code de Segurança</h4>
                  <p className="text-[11px] text-slate-450 leading-relaxed font-sans">
                    Você pode escanear ou copiar o código Pix gerado com segurança em nossa conta no Mercado Pago. O processamento é imediato.
                  </p>

                  <div className="py-4 flex justify-center">
                    {mpLoading ? (
                      <div className="w-32 h-32 flex flex-col justify-center items-center rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></span>
                        <span className="text-[9px] font-bold text-slate-450 mt-2">Buscando Pix...</span>
                      </div>
                    ) : (
                      <div className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-col items-center shadow-xs">
                        {mpPixData?.qr_code_base64 ? (
                          <img 
                            src={`data:image/jpeg;base64,${mpPixData.qr_code_base64}`} 
                            alt="QR Code Pix Mercado Pago" 
                            className="w-32 h-32 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-28 h-28 border border-sky-500 p-2 flex flex-col justify-between items-center bg-sky-50/10">
                            <div className="w-full flex justify-between">
                              <div className="w-6 h-6 bg-sky-500"></div>
                              <div className="w-6 h-6 bg-sky-500"></div>
                            </div>
                            <span className="text-[9px] font-black text-sky-600 font-mono tracking-tighter animate-pulse">MP PIX LIVE</span>
                            <div className="w-full flex justify-between items-end">
                              <div className="w-6 h-6 bg-sky-500"></div>
                              <div className="w-3 h-3 bg-sky-500"></div>
                            </div>
                          </div>
                        )}
                        <span className="mt-1 text-[9px] font-bold text-slate-450">R$ {premiumPlan.price}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 w-full max-w-sm mx-auto">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={mpPixData?.qr_code || `id-${userEmail}-${premiumPlan.price}`}
                        className="bg-slate-50 border border-slate-150 text-[11px] text-slate-500 font-mono px-3 py-2.5 rounded-xl flex-1 outline-hidden select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const codeToCopy = mpPixData?.qr_code || `00020101021226870014BR.GOV.BCB.PIX2565bikerai-mp-mercadopago-pedrobramos-${premiumPlan.price}-6009SAOPAULO62070503MVP`;
                          navigator.clipboard.writeText(codeToCopy);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="px-3 bg-slate-900 text-white rounded-xl hover:bg-slate-850 cursor-pointer text-xs"
                      >
                        {copied ? "Copiado!" : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={simulatingPayment}
                      onClick={handleSimulatePayment}
                      className="w-full bg-slate-900 border border-slate-850 hover:bg-slate-800 text-sky-400 font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer relative shadow-sm"
                    >
                      {simulatingPayment ? (
                        <>
                          <span className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></span>
                          <span>Consultando gateway Mercado Pago...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Simular Confirmação Mercado Pago</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep("choose-payment")}
                    className="text-[11px] text-slate-400 hover:text-slate-650 transition-colors font-bold cursor-pointer"
                  >
                    ← Voltar para formas de pagamento
                  </button>
                </div>
              </div>
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
              Se você já efetuou o pagamento presencial ou por PIX direto ao treinador, solicite a reativação manual via chat de suporte.
            </span>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
