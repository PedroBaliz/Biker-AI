import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Shield, 
  X, 
  Lock, 
  Eye, 
  Database, 
  CreditCard, 
  Trash2, 
  Mail, 
  CheckCircle2 
} from "lucide-react";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="privacy-policy-modal-backdrop" 
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="privacy-policy-modal-content"
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl my-auto max-h-[90vh] overflow-y-auto text-slate-300 font-sans space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Transparência e Privacidade
                </span>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-white">
                  Política de Privacidade do Biker AI
                </h2>
                <p className="text-xs text-slate-400">Última atualização: Setembro de 2026</p>
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

          {/* Intro Notice */}
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl text-xs leading-relaxed text-slate-300 space-y-2">
            <p>
              Sua privacidade e a integridade de seus dados são fundamentais para nós. Esta Política de Privacidade explica com total clareza quais informações coletamos, como elas são utilizadas para estruturar seus treinos e como você mantém o controle de sua conta.
            </p>
          </div>

          {/* Sections List */}
          <div className="space-y-6 text-xs sm:text-sm leading-relaxed">
            
            {/* 1. Informações que Coletamos */}
            <section className="space-y-2.5">
              <h3 className="text-sm sm:text-base font-heading font-extrabold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>1. Quais informações coletamos</span>
              </h3>
              <p className="text-slate-300">
                Coletamos apenas as informações necessárias para operar o serviço e gerar seus treinos de forma personalizada:
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Dados de Identificação e Cadastro:</strong>
                    Endereço de e-mail e nome informados para criação de conta e login.
                  </div>
                </li>
                <li className="flex items-start gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Perfil Atlético e Fisiológico Declarado:</strong>
                    Nível de pedalada (iniciante, intermediário, avançado), objetivo principal, dias e horas disponíveis por semana, limitações físicas declaradas voluntariamente e, quando informados pelo atleta, estimativa de FTP e frequência cardíaca máxima.
                  </div>
                </li>
                <li className="flex items-start gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Registros de Execução de Treino:</strong>
                    Respostas fornecidas no formulário de conclusão de treino (status de execução, percepção de dificuldade, distância percorrida, tempo realizado e anotações opcionais).
                  </div>
                </li>
              </ul>
            </section>

            {/* 2. Como Usamos os Dados */}
            <section className="space-y-2">
              <h3 className="text-sm sm:text-base font-heading font-extrabold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>2. Finalidade e Uso dos Dados</span>
              </h3>
              <p className="text-slate-300">
                Seus dados são empregados estritamente para os seguintes propósitos:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
                <li>Montar, ajustar e recalibrar suas planilhas semanais de treino com base nas suas metas e limitações;</li>
                <li>Calcular suas zonas de treinamento (potência, frequência cardíaca ou percepção subjetiva de esforço);</li>
                <li>Exibir o histórico de treinos e métricas na aba Evolução;</li>
                <li>Responder a perguntas ou orientações no chat do Treinador AI com o contexto do seu plano;</li>
                <li>Identificar sua assinatura e liberar o acesso às funcionalidades completas.</li>
              </ul>
            </section>

            {/* 3. Pagamento Seguro e Dados Financeiros */}
            <section className="space-y-2.5 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center gap-2 font-heading font-bold text-white text-sm">
                <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>3. Processamento de Pagamento por Parceiro Especializado</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">
                <strong>O Biker AI não armazena dados de cartão de crédito nem dados bancários nos seus servidores.</strong>
              </p>
              <p className="text-xs leading-relaxed text-slate-400">
                Todas as operações financeiras de assinatura são processadas pelo intermediador de pagamento parceiro <strong>Mercado Pago</strong>. O Mercado Pago processa as transações diretamente e apenas nos notifica sobre a aprovação ou cancelamento da assinatura para liberação do acesso em sua conta.
              </p>
            </section>

            {/* 4. Armazenamento e Proteção */}
            <section className="space-y-2">
              <h3 className="text-sm sm:text-base font-heading font-extrabold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>4. Armazenamento e Proteção das Informações</span>
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Os dados da sua conta e os registros de treino ficam associados ao seu e-mail e são armazenados em infraestrutura de banco de dados em nuvem voltada para a execução da plataforma. O acesso aos dados de cada perfil requer autenticação de login pelo usuário.
              </p>
            </section>

            {/* 5. Não Compartilhamento e Não Venda */}
            <section className="space-y-2">
              <h3 className="text-sm sm:text-base font-heading font-extrabold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>5. Não Comercialização de Dados</span>
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Nós <strong>não vendemos, não alugamos e não compartilhamos</strong> seus dados pessoais, históricos de treinos ou contatos com empresas de publicidade terceiras ou listas de mala direta. Suas informações existem unicamente para o seu próprio planejamento de treinos dentro do Biker AI.
              </p>
            </section>

            {/* 6. Direitos do Usuário e Exclusão */}
            <section className="space-y-2.5 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center gap-2 font-heading font-bold text-white text-sm">
                <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                <span>6. Seus Direitos: Visualização, Correção e Exclusão</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Você tem o direito de:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
                <li>Alterar os dados do seu perfil ou senha a qualquer momento na aba de configurações do aplicativo;</li>
                <li>Solicitar a exportação das suas planilhas de treino;</li>
                <li>Solicitar a exclusão permanente de sua conta e de todos os registros de treino vinculados a ela.</li>
              </ul>
              <p className="text-xs text-slate-400 pt-1">
                Para solicitar a exclusão definitiva, basta enviar uma solicitação com seu e-mail cadastrado para <strong className="text-white">bikeraisupport@gmail.com</strong>.
              </p>
            </section>

            {/* 7. Contato de Privacidade */}
            <section className="space-y-2 border-t border-slate-800 pt-4">
              <h3 className="text-sm sm:text-base font-heading font-extrabold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>7. Contato para Dúvidas de Privacidade</span>
              </h3>
              <p className="text-slate-300 text-xs">
                Se você tiver dúvidas sobre o tratamento de seus dados ou sobre esta política, fale diretamente conosco:
              </p>
              <div className="inline-block p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold text-xs">
                bikeraisupport@gmail.com
              </div>
            </section>

          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
            >
              Compreendi e Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
