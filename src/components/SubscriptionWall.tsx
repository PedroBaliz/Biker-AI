import React, { useState } from "react";
import { UserProfile } from "../types";
import { apiFetch } from "../firebase";
import { MetaPixelEvents } from "../lib/metaPixel";
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
  ArrowRight, 
  Mail,
  ExternalLink,
  CheckCircle2,
  Clock
} from "lucide-react";

interface SubscriptionWallProps {
  userEmail: string;
  userName: string;
  currentStatus: 'expired' | 'pending_payment';
  onActivated: (updatedProfile: UserProfile) => void;
}

export default function SubscriptionWall({ userEmail, userName, currentStatus, onActivated }: SubscriptionWallProps) {
  // Status check states
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [checkMessage, setCheckMessage] = useState("");

  // Official Mercado Pago subscription link
  const MERCADO_PAGO_CHECKOUT_URL = "https://mpago.la/24PgikU";

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

  const handleProceedToMercadoPago = () => {
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

      {/* Plan Details & Value Proposition */}
      <div className="text-center space-y-1 pt-1">
        <span className="bg-lime-500/15 text-lime-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-lime-500/20 tracking-wider">
          Acesso Ilimitado Garantido
        </span>
        <h4 className="font-heading font-black text-slate-800 text-lg sm:text-xl pt-1">Assinatura Plano Pro Biker AI</h4>
        <p className="text-xs text-slate-500 font-sans max-w-md mx-auto">
          Acesse planilhas inteligentes recalibradas pela IA, gráficos de evolução e suporte completo.
        </p>
      </div>

      {/* Pricing Card */}
      <div className="flex justify-center">
        <div className="w-full max-w-md p-6 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-850 text-white shadow-xl ring-2 ring-lime-400/80 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold tracking-wider text-lime-400">Plano Único e Completo</span>
              <Zap className="w-4 h-4 text-lime-400" />
            </div>
            <h5 className="font-heading font-black text-xl mt-2 text-white">Plano Pro Biker AI</h5>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xs font-bold text-slate-400">R$</span>
              <span className="text-3xl sm:text-4xl font-mono font-black text-lime-400">10,90</span>
              <span className="text-xs text-slate-400 font-sans">/ mês</span>
            </div>
            <p className="text-xs mt-2.5 text-slate-300 leading-relaxed font-sans">
              Acesso total a todas as ferramentas, gráficos, treinos adaptativos e treinador AI. Sem pegadinhas nem taxas adicionais.
            </p>
          </div>

          {/* Payment Methods Accepted */}
          <div className="mt-5 pt-4 border-t border-slate-800 space-y-2.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-mono">
              Formas aceitas no Mercado Pago:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="leading-tight">
                  <span className="text-[11px] font-bold text-slate-200 block">Cartão de Crédito</span>
                  <span className="text-[9.5px] text-slate-400">Recorrente em até 12x • Liberação imediata</span>
                </div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="leading-tight">
                  <span className="text-[11px] font-bold text-slate-200 block">Boleto Bancário</span>
                  <span className="text-[9.5px] text-slate-400">Compensação em até 3 dias úteis</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between text-[11px] font-bold text-lime-400 font-sans">
            <span>Cancele quando quiser em 1 clique</span>
            <CheckCircle className="w-4 h-4 text-lime-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* Guarantees & Trust Badges */}
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

      {/* Pricing Inclusions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl text-xs text-slate-650 font-sans">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Planejamento dinâmico de planilhas adaptado ao seu fôlego</span>
        </div>
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Interações ilimitadas com o Treinador AI</span>
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

      {/* Direct Payment Action Buttons */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleProceedToMercadoPago}
            className="w-full sm:flex-1 py-4 px-6 bg-slate-900 hover:bg-slate-800 text-lime-400 font-heading font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-xl transition-all text-center flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Assinar Agora no Mercado Pago</span>
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            disabled={checkingStatus}
            onClick={handleCheckStatus}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold uppercase rounded-2xl text-xs transition-all cursor-pointer border border-slate-200 shrink-0"
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

        {checkMessage && (
          <div className={`p-4 rounded-2xl text-xs font-sans leading-relaxed border flex items-start gap-3 backdrop-blur-md ${
            checkMessage.includes("sucesso") 
              ? "bg-emerald-900/90 border-emerald-400/50 text-emerald-100" 
              : "bg-slate-900/90 border-amber-400/50 text-amber-100"
          }`}>
            <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${checkMessage.includes("sucesso") ? "text-emerald-300" : "text-amber-300"}`} />
            <div className="space-y-1">
              <p className="font-bold">{checkMessage}</p>
              {!checkMessage.includes("sucesso") && (
                <p className="text-[11px] opacity-90 leading-normal">
                  Após a confirmação do pagamento no Mercado Pago, seu acesso às planilhas personalizadas será liberado automaticamente.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

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
