import React from "react";
import { ShieldAlert } from "lucide-react";

interface ApiErrorBannerProps {
  globalError: {
    url: string;
    method: string;
    status: number;
    statusText: string;
    message: string;
  } | null;
  setGlobalError: React.Dispatch<React.SetStateAction<{
    url: string;
    method: string;
    status: number;
    statusText: string;
    message: string;
  } | null>>;
}

// Extraído do App.tsx (issue #8): mesmo JSX, com o estado recebido por props.
export default function ApiErrorBanner({ globalError, setGlobalError }: ApiErrorBannerProps) {
  return (
    <>
      {globalError && (
        <div id="api-error-alert" className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-4 animate-fadeInUp">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 shadow-lg text-slate-900 relative">
            <div className="flex gap-4 items-start">
              <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-md shrink-0">
                <ShieldAlert className="w-5 h-5 shrink-0" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-heading font-extrabold text-sm sm:text-base text-rose-900 flex items-center gap-2">
                    Erro de API Detectado (Código {globalError.status || "Conexão"})
                  </h3>
                  <span className="text-[10px] font-mono uppercase tracking-widest bg-rose-100 text-rose-800 px-2.5 py-1 rounded border border-rose-200 font-bold self-start sm:self-center">
                    {globalError.method} {globalError.url.split('?')[0]}
                  </span>
                </div>

                <p className="text-xs text-rose-800 font-sans font-semibold">
                  {globalError.message}
                </p>

                {/* Diagnostics and helpful tips based on status code */}
                <div className="mt-3 pt-3 border-t border-rose-200/50 space-y-1 text-slate-700 text-xs font-sans">
                  <div className="font-semibold text-rose-900 mb-1">Guia de Diagnóstico:</div>
                  {globalError.status === 404 ? (
                    <p className="text-rose-800 leading-relaxed">
                      O endpoint chamado não foi encontrado (404). Isso normalmente ocorre por uma configuração incorreta de rotas no servidor ou falta de redirecionamento no <code className="font-mono bg-rose-100/80 px-1 py-0.5 rounded text-[11px] text-rose-900">vercel.json</code>. Certifique-se de que o backend está respondendo nas rotas correspondentes e que o proxy de reescrita está apontando corretamente.
                    </p>
                  ) : globalError.status === 500 ? (
                    <div className="text-rose-800 space-y-1 leading-relaxed">
                      <p>O servidor backend falhou internamente ao processar o seu pedido (500). Causas comuns mais prováveis:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Falta da chave de acesso da inteligência artificial (<code className="font-mono bg-rose-100/80 px-1 py-0.5 rounded text-[11px] text-rose-900">GEMINI_API_KEY</code>) ou valor inválido/expirado nas variáveis de ambiente.</li>
                        <li>Verifique se o seu arquivo local de produção ou desenvolvimento <code className="font-mono bg-rose-100/80 px-1 py-0.5 rounded text-[11px] text-rose-900">.env</code> possui a variável declarada exatamente na raiz.</li>
                        <li>Configuração de rede ou problemas transitórios de banco de dados e arquivos locais.</li>
                      </ul>
                    </div>
                  ) : (
                    <p className="text-rose-800 leading-relaxed">
                      Não foi possível estabelecer contato com o servidor (Status 0). Verifique se o servidor de desenvolvimento backend está devidamente iniciado e rodando, ou se há bloqueios de CORS por conta de acessos via iframes.
                    </p>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setGlobalError(null)}
                    className="px-4 py-2 bg-rose-900/10 hover:bg-rose-900/20 text-rose-950 font-heading text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Fechar Alerta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
