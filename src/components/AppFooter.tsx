import React from "react";
import { Bike, Mail, ShieldCheck, CheckCircle2, Lock } from "lucide-react";

interface AppFooterProps {
  setShowContact: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPrivacy: React.Dispatch<React.SetStateAction<boolean>>;
  setShowTerms: React.Dispatch<React.SetStateAction<boolean>>;
}

// Extraído do App.tsx (issue #8): mesmo JSX, com o estado recebido por props.
export default function AppFooter({ setShowContact, setShowPrivacy, setShowTerms }: AppFooterProps) {
  return (
    <>
      <footer className="bg-slate-950 text-slate-400 text-xs font-sans border-t border-slate-900 py-8 px-4 sm:px-6 lg:px-8 mt-12 pb-24 sm:pb-12 shrink-0 space-y-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 rounded-lg text-lime-400 border border-slate-800">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-white text-xs">&copy; 2026 Biker AI. Todos os direitos reservados.</span>
              <p className="text-[10px] text-slate-500 font-mono">Planilhas e Periodização Inteligente</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-400">
            <span>Treino Equilibrado</span>
            <span className="text-slate-800">•</span>
            <span>Controle de Esforço</span>
            <span className="text-slate-800">•</span>
            <span>Zonas de Intensidade</span>
          </div>

          <button 
            type="button"
            onClick={() => setShowContact(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-lime-400 border border-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-lime-400 shrink-0" />
            <span>Fale Conosco / Suporte</span>
          </button>
        </div>

        {/* Links Institucionais: Termos de Uso, Política de Privacidade, Contato & Selos de Confiança */}
        <div className="max-w-7xl mx-auto pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-slate-400 hover:text-lime-400 transition-colors cursor-pointer underline-offset-4 hover:underline"
            >
              Termos de Uso
            </button>
            <span className="text-slate-800">•</span>
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="text-slate-400 hover:text-lime-400 transition-colors cursor-pointer underline-offset-4 hover:underline"
            >
              Política de Privacidade
            </button>
            <span className="text-slate-800">•</span>
            <button
              type="button"
              onClick={() => setShowContact(true)}
              className="text-slate-400 hover:text-lime-400 transition-colors cursor-pointer underline-offset-4 hover:underline"
            >
              Contato
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% gratuito
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
              Sem cartão de crédito
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              Seus dados protegidos
            </span>
          </div>
        </div>
      </footer>

    </>
  );
}
