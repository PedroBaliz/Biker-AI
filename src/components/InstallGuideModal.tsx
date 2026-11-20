import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Smartphone, Share, Lightbulb } from "lucide-react";

interface InstallGuideModalProps {
  setShowInstallGuide: React.Dispatch<React.SetStateAction<boolean>>;
  showInstallGuide: boolean;
}

// Extraído do App.tsx (issue #8): mesmo JSX, com o estado recebido por props.
export default function InstallGuideModal({ setShowInstallGuide, showInstallGuide }: InstallGuideModalProps) {
  return (
    <>
      <AnimatePresence>
        {showInstallGuide && (
          <div id="main-install-guide-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md text-white font-sans">
            <motion.div
              id="main-install-guide-modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 relative text-left"
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
                  <Smartphone className="w-5 h-5 animate-bounce" />
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
                  <Lightbulb className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                  <span className="font-extrabold select-none">VANTAGENS:</span>
                  <span className="leading-relaxed">Instalar o aplicativo garante carregamento instantâneo, menos consumo de internet, suporte offline e navegação livre de barras do navegador!</span>
                </div>

              </div>

              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="w-full bg-slate-800 hover:bg-slate-750 text-white font-bold font-heading py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Entendi, fechar instrução
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}
