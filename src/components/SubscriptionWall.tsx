import React, { useState } from "react";
import { UserProfile } from "../types";
import { apiFetch } from "../firebase";
import { MetaPixelEvents } from "../lib/metaPixel";
import TermsOfUseModal from "./TermsOfUseModal";
import PrivacyPolicyModal from "./PrivacyPolicyModal";
import ContactModal from "./ContactModal";
import { 
  ShieldAlert, 
  ShieldCheck,
  Shield,
  RefreshCw,
  CheckCircle, 
  Lock, 
  Sparkles, 
  Zap, 
  ArrowRight, 
  Mail,
  ExternalLink,
  CheckCircle2,
  Clock,
  HelpCircle,
  FileText
} from "lucide-react";

interface SubscriptionWallProps {
  userEmail: string;
  userName: string;
  currentStatus: 'expired' | 'pending_payment' | 'trial_expired' | 'trial';
  onActivated: (updatedProfile: UserProfile) => void;
}

export default function SubscriptionWall({ userEmail, userName, currentStatus, onActivated }: SubscriptionWallProps) {
  // Status check states
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [checkMessage, setCheckMessage] = useState("");

  // Modals for Terms, Privacy, and Contact
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);

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
    MetaPixelEvents.initiateCheckout(16.90, "BRL");
    window.open(MERCADO_PAGO_CHECKOUT_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div id="subscription-wall-container" className="max-w-4xl mx-auto w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-4 sm:p-8 space-y-5 sm:space-y-6 animate-fadeInUp">
      {/* Alert Header */}
      <div className={`flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border ${
        currentStatus === "expired"
          ? "bg-rose-50 border-rose-200 text-rose-900"
          : currentStatus === "trial_expired"
          ? "bg-amber-50 border-amber-200 text-amber-900"
          : currentStatus === "trial"
          ? "bg-emerald-50 border-emerald-200 text-emerald-950"
          : "bg-sky-50 border-sky-200 text-sky-900"
      }`}>
        <div className={`p-2.5 sm:p-3 rounded-xl text-white shrink-0 shadow-sm animate-pulse ${
          currentStatus === "expired" 
            ? "bg-rose-600" 
            : currentStatus === "trial_expired" 
            ? "bg-amber-500" 
            : currentStatus === "trial"
            ? "bg-emerald-600"
            : "bg-sky-500"
        }`}>
          <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-heading font-extrabold text-xs sm:text-base">
            {currentStatus === "expired" 
              ? "Acesso aos Treinos Bloqueado / Assinatura Expirada" 
              : currentStatus === "trial_expired"
              ? "Período de Teste Gratuito Expirado (3 dias)"
              : currentStatus === "trial"
              ? "Aderir ao Plano Pro Biker AI • R$ 16,90/mês"
              : "Pagamento de Assinatura Pendente"}
          </h3>
          <p className="text-[11px] sm:text-xs leading-relaxed font-sans opacity-90">
            {currentStatus === "expired" ? (
              <>Olá, <strong>{userName}</strong>. O seu acesso aos treinos estruturados foi bloqueado ou sua assinatura expirou. Para reativar seu plano e liberar imediatamente a conclusão de treinos e estruturas minuto a minuto, assine o <strong>Biker AI</strong>.</>
            ) : currentStatus === "trial_expired" ? (
              <>Olá, <strong>{userName}</strong>. Seus 3 dias de avaliação gratuita foram concluídos com sucesso! Para desbloquear os treinos estruturados minuto a minuto, continuar evoluindo de semana e registrando suas conclusões, ative sua assinatura do <strong>Biker AI</strong>.</>
            ) : currentStatus === "trial" ? (
              <>Olá, <strong>{userName}</strong>. Você está em período de teste gratuito! Antecipe sua adesão por apenas <strong>R$ 16,90/mês</strong> e assegure treinos ilimitados, evolução contínua e suporte do treinador inteligente.</>
            ) : (
              <>Olá, <strong>{userName}</strong>. O seu fôlego e evolução no pedal não podem parar! Para liberar o seu acesso total ao treinador e às planilhas personalizadas do <strong>Biker AI</strong>, conclua a sua assinatura.</>
            )}
          </p>
        </div>
      </div>

      {/* Discrete Trust Banner Above CTA */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-2 px-3 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] text-slate-600 font-medium">
        <span className="flex items-center gap-1.5 font-bold text-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          Pagamento seguro
        </span>
        <span className="text-slate-300 hidden sm:inline">•</span>
        <span className="flex items-center gap-1.5 font-bold text-slate-700">
          <RefreshCw className="w-3.5 h-3.5 text-lime-600 shrink-0" />
          Cancele quando quiser
        </span>
        <span className="text-slate-300 hidden sm:inline">•</span>
        <span className="flex items-center gap-1.5 font-bold text-slate-700">
          <Shield className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          Seus dados protegidos
        </span>
      </div>

      {/* Top Quick Subscribe Button */}
      <div className="w-full">
        <button
          type="button"
          onClick={handleProceedToMercadoPago}
          className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-lime-400 font-heading font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-xl transition-all text-center flex items-center justify-center gap-2.5 cursor-pointer group border border-slate-800 ring-2 ring-lime-400/60 hover:ring-lime-400"
        >
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-lime-400 text-lime-400 shrink-0" />
          <span>Aderir ao Plano Agora • R$ 16,90/mês</span>
          <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>
      </div>

      {/* Pricing Card with Full Transparency */}
      <div className="flex justify-center">
        <div className="w-full max-w-lg p-6 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-850 text-white shadow-xl ring-2 ring-lime-400/80 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold tracking-wider text-lime-400 bg-lime-400/10 px-2.5 py-1 rounded-full border border-lime-400/20">
                Transparência Total
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                Cobrança Mensal Recorrente
              </span>
            </div>
            
            <h5 className="font-heading font-black text-xl mt-3 text-white">Plano Pro Biker AI</h5>
            
            {/* Price & Periodicity */}
            <div className="flex flex-wrap items-baseline gap-1 mt-2">
              <span className="text-xs font-bold text-slate-400">R$</span>
              <span className="text-3xl sm:text-4xl font-mono font-black text-lime-400">16,90</span>
              <span className="text-xs text-slate-300 font-sans font-medium">/ mês</span>
              <span className="ml-auto text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                R$ 0,56 por dia
              </span>
            </div>

            <p className="text-xs mt-2.5 text-slate-300 leading-relaxed font-sans">
              Acesso total e contínuo ao seu treinador com inteligência artificial para recalibrar suas planilhas semanais e acompanhar sua evolução no pedal.
            </p>
          </div>

          {/* Discrete Trust Signals Inside Card */}
          <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Pagamento seguro</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-lime-400 shrink-0" />
              <span>Cancele quando quiser</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Seus dados protegidos</span>
            </div>
          </div>
        </div>
      </div>

      {/* What is Included Section */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-heading font-black text-slate-800 uppercase tracking-wider text-left flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-lime-600" />
          <span>O que está incluído na sua assinatura:</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-slate-50 p-4 rounded-2xl text-xs text-slate-700 font-sans border border-slate-100">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Treinos minuto a minuto:</strong> Estruturas de aquecimento, estímulos e desaquecimento.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Recalibração semanal:</strong> A IA adapta as próximas semanas com base no seu feedback real.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Métricas de evolução:</strong> Registro de treinos em 5 perguntas, consistência e volume.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Calculadora de zonas:</strong> Potência (FTP), frequência cardíaca e escala de esforço (PSE).</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Treinador AI no chat:</strong> Dúvidas ilimitadas sobre cadência, nutrição e recuperação.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Exportação em PDF:</strong> Baixe e imprima seu plano completo a qualquer momento.</span>
          </div>
        </div>
      </div>

      {/* How Cancellation Works (Clear & Honest) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-3 border border-slate-800 text-left">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-lime-400/15 text-lime-400 flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide text-white">
              Como funciona o cancelamento?
            </h5>
            <span className="text-[11px] text-lime-400 font-mono">Simples, rápido e sem burocracia</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs text-slate-300">
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-white block">1. Sem fidelidade</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Você não fica preso a nenhum contrato anual ou taxa de rescisão. Cancele quando quiser.
            </p>
          </div>
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-white block">2. Como solicitar</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cancele diretamente na sua conta do Mercado Pago em 1 clique ou enviando um e-mail para bikeraisupport@gmail.com.
            </p>
          </div>
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-white block">3. Acesso mantido</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ao cancelar, você mantém acesso integral a todas as planilhas até o último dia do período mensal já pago.
            </p>
          </div>
        </div>
      </div>

      {/* Guarantee Badge */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-slate-700 text-xs font-sans space-y-2">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl shrink-0 mt-0.5 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-left">
            <h6 className="font-heading font-black text-emerald-900 text-xs uppercase tracking-wide">
              Garantia de 7 Dias
            </h6>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Experimente seu plano por até 7 dias corridos. Se por qualquer motivo desejar o cancelamento nesse período, devolvemos 100% do valor pago. Basta solicitar pelo e-mail do suporte.
            </p>
          </div>
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
            <span>Aderir ao Plano • Mercado Pago</span>
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

      {/* Transparent Links Footer with Terms, Privacy & Contact */}
      <div className="pt-4 border-t border-slate-100 text-center space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500 font-medium">
          <button
            type="button"
            onClick={() => setShowTerms(true)}
            className="hover:text-slate-800 underline transition-colors cursor-pointer"
          >
            Termos de Uso
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setShowPrivacy(true)}
            className="hover:text-slate-800 underline transition-colors cursor-pointer"
          >
            Política de Privacidade
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setShowContact(true)}
            className="hover:text-slate-800 underline transition-colors cursor-pointer"
          >
            Contato & Suporte
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-sans block">
          Dúvidas sobre o pagamento ou liberação de acesso?
        </span>
        
        <button
          type="button"
          onClick={() => setShowContact(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold text-lime-400 transition-all shadow-sm cursor-pointer"
        >
          <Mail className="w-4 h-4 text-lime-400" />
          <span>Falar com o suporte oficial: bikeraisupport@gmail.com</span>
        </button>
      </div>

      {/* Modals for legal pages and contact */}
      <TermsOfUseModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} userEmail={userEmail} />
    </div>
  );
}

