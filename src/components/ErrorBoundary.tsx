import React, { ReactNode, useState, useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, fallback }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error("[Uncaught Window Error]:", event.error);
      setErrorMessage(event.error?.message || "Erro inesperado na aplicação");
      setHasError(true);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn("[Background Async Warning]:", event.reason);
      // Prevent unhandled rejection from crashing the UI for non-fatal background syncs
      event.preventDefault();
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  const handleReset = () => {
    setHasError(false);
    setErrorMessage(null);
    window.location.reload();
  };

  if (hasError) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-7 h-7" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-heading font-black text-lg text-white">
              Algo não saiu como esperado
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Identificamos uma oscilação temporária na interface. Seus treinos e dados estão salvos com segurança.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-400 overflow-x-auto text-left max-h-24">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleReset}
            className="w-full bg-lime-400 hover:bg-lime-300 text-slate-950 font-heading font-black text-sm py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-lime-400/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recarregar Aplicação</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ErrorBoundary;
