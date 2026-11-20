import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { apiFetch } from "../firebase";

interface AdminPasswordModalProps {
  adminPasswordError: string;
  adminPasswordInput: string;
  setAdminPasswordError: React.Dispatch<React.SetStateAction<string>>;
  setAdminPasswordInput: React.Dispatch<React.SetStateAction<string>>;
  setShowAdminPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAdminPasswordPrompt: React.Dispatch<React.SetStateAction<boolean>>;
  showAdminPasswordPrompt: boolean;
}

// Extraído do App.tsx (issue #8): mesmo JSX, com o estado recebido por props.
export default function AdminPasswordModal({ adminPasswordError, adminPasswordInput, setAdminPasswordError, setAdminPasswordInput, setShowAdminPanel, setShowAdminPasswordPrompt, showAdminPasswordPrompt }: AdminPasswordModalProps) {
  return (
    <>
      <AnimatePresence>
        {showAdminPasswordPrompt && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-805 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative"
            >
              <div className="text-center space-y-1.5">
                <div className="w-10 h-10 bg-lime-400/10 text-lime-400 rounded-full flex items-center justify-center mx-auto border border-lime-400/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm uppercase font-black tracking-widest text-white font-heading">
                  Acesso Reservado
                </h3>
                <p className="text-xs text-slate-400">
                  Insira a Credencial do Treinador para abrir o painel administrativo.
                </p>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await apiFetch("/api/admin/verify-access", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ password: adminPasswordInput })
                    });
                    if (res.ok) {
                      setShowAdminPanel(true);
                      setShowAdminPasswordPrompt(false);
                      setAdminPasswordInput("");
                      setAdminPasswordError("");
                    } else {
                      setAdminPasswordError("Chave de acesso ou permissão inválida");
                    }
                  } catch (err) {
                    setAdminPasswordError("Erro ao validar acesso administrativo");
                  }
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <input
                    type="password"
                    placeholder="Chave de Acesso"
                    autoFocus
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      if (adminPasswordError) setAdminPasswordError("");
                    }}
                    className={`w-full bg-slate-950 border text-center text-sm px-4 py-3 rounded-xl font-mono text-lime-400 placeholder:text-slate-600 outline-hidden transition-all ${
                      adminPasswordError 
                        ? "border-rose-500/50 focus:border-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
                        : "border-slate-800 focus:border-lime-500/50 focus:shadow-[0_0_15px_rgba(132,204,22,0.1)]"
                    }`}
                  />
                  {adminPasswordError && (
                    <span className="block text-[10px] text-center text-rose-450 font-bold uppercase tracking-wider font-sans mt-1">
                      {adminPasswordError}
                    </span>
                  )}
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminPasswordPrompt(false);
                      setAdminPasswordInput("");
                      setAdminPasswordError("");
                    }}
                    className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-[10px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-lime-400 hover:bg-lime-350 text-slate-950 font-black rounded-xl text-[10px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}
