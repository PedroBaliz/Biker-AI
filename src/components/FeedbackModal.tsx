import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { MessageSquare } from "lucide-react";

interface FeedbackModalProps {
  feedbackSuccess: boolean;
  feedbackText: string;
  handleSendFeedback: (e: React.FormEvent) => Promise<void>;
  setFeedbackText: React.Dispatch<React.SetStateAction<string>>;
  setShowFeedbackModal: React.Dispatch<React.SetStateAction<boolean>>;
  showFeedbackModal: boolean;
  submittingFeedback: boolean;
}

// Extraído do App.tsx (issue #8): mesmo JSX, com o estado recebido por props.
export default function FeedbackModal({ feedbackSuccess, feedbackText, handleSendFeedback, setFeedbackText, setShowFeedbackModal, showFeedbackModal, submittingFeedback }: FeedbackModalProps) {
  return (
    <>
      <AnimatePresence>
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative text-left"
            >
              <div className="text-center space-y-1.5">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-base font-heading font-black text-slate-800">
                  Enviar Feedback ao Treinador
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Sua sugestão, dúvida ou elogio será entregue diretamente na área privada de controle do treinador.
                </p>
              </div>

              {feedbackSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center space-y-1"
                >
                  <p className="text-xs font-bold font-heading">Feedback Enviado com Sucesso!</p>
                  <p className="text-[11px] text-emerald-600 font-sans">Seu treinador já pode visualizar sua mensagem no painel privado.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSendFeedback} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Mensagem de Feedback</label>
                    <textarea
                      placeholder="Ex: nos fale o que pode melhorar no aplicativo..."
                      rows={4}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl p-3 text-xs outline-hidden transition-all text-slate-800 placeholder:text-slate-400 resize-none font-sans"
                    />
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowFeedbackModal(false)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer text-center border border-slate-150"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submittingFeedback || !feedbackText.trim()}
                      className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 text-lime-400 font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50 text-center"
                    >
                      {submittingFeedback ? "Enviando..." : "Enviar Agora"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}
