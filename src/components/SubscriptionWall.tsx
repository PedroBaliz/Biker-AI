import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { apiFetch } from "../firebase";
import { MetaPixelEvents } from "../lib/metaPixel";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldAlert, 
  ShieldCheck,
  RefreshCw,
  CheckCircle, 
  Lock, 
  Sparkles, 
  CreditCard, 
  FileText,
  Zap, 
  Calendar, 
  ArrowRight, 
  Mail,
  ExternalLink,
  Clock,
  CheckCircle2
} from "lucide-react";

interface SubscriptionWallProps {
  userEmail: string;
  userName: string;
  currentStatus: 'expired' | 'pending_payment';
  onActivated: (updatedProfile: UserProfile) => void;
}

export default function SubscriptionWall({ userEmail, userName, currentStatus, onActivated }: SubscriptionWallProps) {
  const [checkoutStep, setCheckoutStep] = useState<"plans" | "choose-payment">("plans");
  const [selectedMethod, setSelectedMethod] = useState<"card" | "boleto">("card");

  // Status check states
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [checkMessage, setCheckMessage] = useState("");

  // Official Mercado Pago subscription link
  const MERCADO_PAGO_CHECKOUT_URL = "https://mpago.la/24PgikU";

  // Single premium plan definition
  const premiumPlan = { 
    name: "Plano Pro", 
    price: "10,90",
    period: "mês"
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    setCheckMessage("");
    try {
      const response = await apiFetch("/api/auth/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.subscriptionStatus === "active" && data.profile) {
          setCheckMessage("Sua conta foi ativada com sucesso! Carregando seu painel de treinos...");
          setTimeout(() => {
            onActivated(data.profile);
          }, 1200);
          return;
        } else {
          setCheckMessage("Status Atual: Pendente de Confirmação. Caso já tenha realizado o pagamento, o acesso será liberado em instantes ou após a compensação bancária.");
        }
      } else {
        setCheckMessage("Erro ao consultar o servidor. Tente novamente em instantes.");
      }
    } catch (err) {
      setCheckMessage("Não foi possível conectar ao servidor para verificar a ativação.");
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleProceedToMercadoPago = (method: "card" | "boleto") => {
    MetaPixelEvents.addPaymentInfo();
    MetaPixelEvents.initiateCheckout(10.90, "BRL");
    window.open(MERCADO_PAGO_CHECKOUT_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div id="subscription-wall-container" className="max-w-4xl mx-auto w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-4 sm:p-8 space-y-5 sm:space-y-6 animate-fadeInUp">
      {/* Alert Header */}
      <div className="flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200">
        <div className="p-2.5 sm:p-3 bg-amber-500 rounded-xl text-white shrink-0 shadow-sm animate-pulse">
          <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-heading font-extrabold text-amber-900 text-xs sm:text-base">
            {currentStatus === "expired" ? "Sua Assinatura Expirou" : "Pagamento de Assinatura Pendente"}
          </h3>
          <p className="text-[11px] sm:text-xs text-amber-800 leading-relaxed font-sans">
            Olá, <strong>{userName}</strong>. O seu fôlego e evolução no pedal não podem parar! Para liberar ou manter o seu acesso total ao treinador e às planilhas personalizadas do <strong>Biker AI</strong>, conclua a sua assinatura.
          </p>
        </div>
      </div>

      {/* HIGHLIGHTED DIRECT MERCADO PAGO PAYMENT CARD */}
      <div className="bg-linear-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl space-y-4 relative overflow-hidden border border-emerald-500/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-lg w-full">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white max-w-full">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">Checkout Oficial Mercado Pago</span>
            </div>
            <h4 className="font-heading font-black text-base sm:text-xl text-white">
              Assinatura Oficial Biker AI — R$ 10,90/mês
            </h4>
            <p className="text-xs text-emerald-100 font-sans leading-relaxed">
              Pague com <strong>Cartão de Crédito</strong> (recorrência automática em até 12x) ou <strong>Boleto Bancário</strong> no ambiente seguro do Mercado Pago.
            </p>
            <div className="pt-1">
              <a
                href="mailto:bikeraisupport@gmail.com"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/20 hover:bg-black/30 border border-white/20 hover:border-white/40 rounded-xl text-[10px] sm:text-[11px] font-bold text-white transition-all max-w-full"
              >
                <Mail className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="leading-tight break-words">Suporte: <strong>bikeraisupport@gmail.com</strong></span>
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 w-full md:w-auto shrink-0">
            <a
              href={MERCADO_PAGO_CHECKOUT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                MetaPixelEvents.initiateCheckout(10.90, "BRL");
                MetaPixelEvents.addPaymentInfo();
              }}
              className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-xl transition-all text-center flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Iniciar Assinatura</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

        {checkMessage && (
          <div className={`mt-4 p-4 rounded-2xl text-xs font-sans leading-relaxed border flex items-start gap-3 backdrop-blur-md ${
            checkMessage.includes("sucesso") 
              ? "bg-emerald-900/80 border-emerald-400/50 text-emerald-100" 
              : "bg-slate-900/80 border-amber-400/50 text-amber-100"
          }`}>
            <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${checkMessage.includes("sucesso") ? "text-emerald-300" : "text-amber-300"}`} />
            <div className="space-y-1">
              <p className="font-bold">{checkMessage}</p>
              {!checkMessage.includes("sucesso") && (
                <p className="text-[11px] opacity-90 leading-normal">
                  Após a confirmação do pagamento, seu acesso às planilhas personalizadas será liberado imediatamente.
                </p>
              )}
            </div>
          </div>
        )}
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
              <h4 className="font-heading font-black text-slate-800 text-lg pt-1">Assinatura Plano Pro Biker AI</h4>
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
                  <h5 className="font-heading font-black text-lg mt-2">Plano Pro Biker AI</h5>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-xs font-bold text-slate-400">R$</span>
                    <span className="text-3xl font-mono font-black text-lime-400">10,90</span>
                    <span className="text-xs text-slate-400 font-sans">/ mês</span>
                  </div>
                  <p className="text-[11px] mt-2 text-slate-300 leading-relaxed">
                    Acesso completo a todas as ferramentas, gráficos e treinador AI. Sem pegadinhas nem taxas adicionais.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-800 mt-5 flex items-center justify-between text-[11px] font-bold text-lime-400 font-sans">
                  <span>Cancele quando quiser em 1 clique</span>
                  <CheckCircle className="w-4 h-4 text-lime-400 shrink-0" />
                </div>
              </div>
            </div>

            {/* Guarantees & Trust Badges (Positioned above button) */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-slate-700 text-xs font-sans space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl shrink-0 mt-0.5 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-left">
                  <h6 className="font-heading font-black text-emerald-900 text-xs uppercase tracking-wide">Garantia Incondicional de 7 Dias</h6>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Teste a plataforma por 7 dias inteiros. Se por qualquer motivo você não se adaptar ao seu plano de treinos, devolvemos 100% do seu dinheiro sem burocracia nem perguntas.
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-emerald-500/15 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Ambiente Criptografado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Sem Fidelidade</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Mercado Pago Seguro</span>
                </div>
              </div>
            </div>

            {/* Pricing inclusions list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl text-xs text-slate-650 font-sans">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Planejamento dinâmico de planilhas adaptado ao seu fôlego</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Interações ilimitadas síncronas com o Treinador AI</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Gráficos de evolução de calorias e volume de giros</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Suporte completo para exportar treinos e ler do Strava</span>
              </div>
            </div>

            {/* Action proceed */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setCheckoutStep("choose-payment");
                  MetaPixelEvents.initiateCheckout(10.90, "BRL");
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-lime-400 font-extrabold uppercase rounded-xl text-xs transition-all cursor-pointer shadow-md"
              >
                <span>Escolher Forma de Pagamento</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={checkingStatus}
                onClick={handleCheckStatus}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold uppercase rounded-xl text-xs transition-all cursor-pointer border border-slate-200"
              >
                {checkingStatus ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></span>
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Já Paguei, Verificar Acesso</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          /* STEP 2: CHOOSE PAYMENT METHOD (CREDIT CARD OR BOLETO ONLY) */
          <motion.div
            key="choose-payment-step"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6 max-w-2xl mx-auto"
          >
            <div className="text-center space-y-1">
              <span className="bg-lime-100 text-lime-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-sm">
                Plano Pro Biker AI — R$ {premiumPlan.price}/mês
              </span>
              <h4 className="font-heading font-black text-slate-800 text-base sm:text-lg pt-1">Escolha a Forma de Pagamento</h4>
              <p className="text-xs text-slate-450 font-sans">Processamento 100% criptografado e seguro através do Mercado Pago</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: CARTÃO DE CRÉDITO */}
              <div
                onClick={() => setSelectedMethod("card")}
                className={`p-5 rounded-2xl sm:rounded-3xl border-2 text-left transition-all cursor-pointer space-y-3.5 flex flex-col justify-between relative ${
                  selectedMethod === "card"
                    ? "border-sky-500 bg-sky-50/40 shadow-md ring-2 ring-sky-400/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-sky-500 rounded-xl text-white">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full uppercase">
                      Recorrência Automática
                    </span>
                  </div>
                  <div>
                    <h5 className="font-heading font-black text-slate-850 text-sm">Opção A: Cartão de Crédito</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans mt-1">
                      Cobrança mensal automática no valor de <strong>R$ 10,90/mês</strong> ou parcelamento em <strong>até 12x</strong>.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-600">
                  <span className="text-[11px]">Liberação Imediata</span>
                  <CheckCircle2 className={`w-4 h-4 ${selectedMethod === "card" ? "text-sky-600" : "text-slate-300"}`} />
                </div>
              </div>

              {/* Option B: BOLETO BANCÁRIO */}
              <div
                onClick={() => setSelectedMethod("boleto")}
                className={`p-5 rounded-2xl sm:rounded-3xl border-2 text-left transition-all cursor-pointer space-y-3.5 flex flex-col justify-between relative ${
                  selectedMethod === "boleto"
                    ? "border-amber-500 bg-amber-50/40 shadow-md ring-2 ring-amber-400/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-amber-500 rounded-xl text-white">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full uppercase">
                      Boleto Bancário
                    </span>
                  </div>
                  <div>
                    <h5 className="font-heading font-black text-slate-850 text-sm">Opção B: Boleto Bancário</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans mt-1">
                      Gere o boleto bancário no checkout oficial do Mercado Pago.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
                  <span className="text-[10px]">Compensação até 3 dias úteis</span>
                  <CheckCircle2 className={`w-4 h-4 ${selectedMethod === "boleto" ? "text-amber-600" : "text-slate-300"}`} />
                </div>
              </div>
            </div>

            {/* Warning / Note for selected method */}
            {selectedMethod === "boleto" ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-sans flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>Atenção sobre Boleto Bancário:</strong> A liberação do seu acesso só ocorre após a compensação bancária oficial, que pode levar de <strong>1 a 3 dias úteis</strong> dependendo do seu banco emissor.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900 font-sans flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>Cartão de Crédito:</strong> Acesso <strong>liberado imediatamente</strong> após a aprovação da operadora do cartão com cobrança recorrente sem fidelidade.
                </p>
              </div>
            )}

            {/* Direct Proceed Button to Mercado Pago */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => handleProceedToMercadoPago(selectedMethod)}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-lime-400 font-heading font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-xl transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Pagar {selectedMethod === "card" ? "com Cartão de Crédito" : "com Boleto Bancário"} no Mercado Pago</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutStep("plans")}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 tracking-wider transition-colors cursor-pointer"
                >
                  ← Voltar para detalhes do plano
                </button>

                <button
                  type="button"
                  disabled={checkingStatus}
                  onClick={handleCheckStatus}
                  className="text-[11px] font-bold text-lime-600 hover:text-lime-700 tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? "animate-spin" : ""}`} />
                  <span>Já paguei, verificar ativação</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Support Footer */}
      <div className="pt-4 border-t border-slate-100 text-center space-y-2">
        <span className="text-[10px] text-slate-400 font-sans block">
          Precisa de ajuda ou tem dúvidas sobre a sua assinatura? Fale diretamente com nossa equipe.
        </span>
        <a
          href="mailto:bikeraisupport@gmail.com"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold text-lime-400 transition-all shadow-sm"
        >
          <Mail className="w-4 h-4 text-lime-400" />
          <span>Envie um email para bikeraisupport@gmail.com — suporte oficial Biker AI</span>
        </a>
      </div>
    </div>
  );
}
