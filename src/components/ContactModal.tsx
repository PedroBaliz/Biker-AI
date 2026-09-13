import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mail, 
  X, 
  Send, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  HelpCircle,
  ExternalLink
} from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export default function ContactModal({ isOpen, onClose, userEmail = "" }: ContactModalProps) {
  const [subject, setSubject] = useState("Dúvida sobre o Biker AI");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText("bikeraisupport@gmail.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenEmailClient = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = `mailto:bikeraisupport@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <AnimatePresence>
      <div 
        id="contact-modal-backdrop" 
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="contact-modal-content"
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl my-auto max-h-[90vh] overflow-y-auto text-slate-300 font-sans space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-lime-500/10 border border-lime-500/20 rounded-2xl text-lime-400 shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-lime-400">
                  Canal Oficial de Atendimento
                </span>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-white">
                  Fale com a Equipe Biker AI
                </h2>
                <p className="text-xs text-slate-400">Estamos à disposição para ajudar nos seus treinos</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700 shrink-0"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Email Highlight Box */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  E-mail Oficial de Suporte
                </span>
                <span className="text-sm sm:text-base font-bold text-white font-mono select-all">
                  bikeraisupport@gmail.com
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-200 hover:text-white transition-colors border border-slate-700 cursor-pointer"
                >
                  {copied ? "E-mail Copiado!" : "Copiar E-mail"}
                </button>
                <a
                  href="mailto:bikeraisupport@gmail.com"
                  className="px-3.5 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-xs font-black text-slate-950 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Abrir no App de Email</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-850 flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-4 h-4 text-lime-400 shrink-0" />
              <span>Tempo médio de resposta: até 24 horas úteis. Atendimento dedicado a atletas.</span>
            </div>
          </div>

          {/* Quick Contact Form */}
          <form onSubmit={handleOpenEmailClient} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">Assunto da Mensagem</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-lime-400 rounded-xl p-3 text-xs text-slate-200 outline-hidden transition-all"
              >
                <option value="Dúvida sobre o Biker AI">Dúvida sobre o Biker AI</option>
                <option value="Dúvida ou ajuda com assinatura / pagamento">Dúvida ou ajuda com assinatura / pagamento</option>
                <option value="Solicitação de cancelamento de assinatura">Solicitação de cancelamento de assinatura</option>
                <option value="Dúvida técnica sobre treinos e planilhas">Dúvida técnica sobre treinos e planilhas</option>
                <option value="Sugestão de melhoria para o app">Sugestão de melhoria para o app</option>
                <option value="Solicitação de privacidade e dados">Solicitação de privacidade e dados</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">Sua Mensagem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreva sua dúvida, sugestão ou solicitação..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 focus:border-lime-400 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 outline-hidden transition-all resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Mensagem</span>
              </button>
            </div>
          </form>

          {/* Frequently Asked Inquiries */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-heading font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-lime-400" />
              <span>Respostas Rápidas</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
                <span className="font-bold text-white block">Como cancelar?</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Você pode cancelar a qualquer momento no painel do Mercado Pago ou enviando um e-mail para nós. Não há multa nem fidelidade.
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
                <span className="font-bold text-white block">Como funciona a garantia?</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Oferecemos 7 dias de garantia incondicional após a assinatura. Se solicitar reembolso nesse período, devolvemos 100% do valor.
                </p>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
