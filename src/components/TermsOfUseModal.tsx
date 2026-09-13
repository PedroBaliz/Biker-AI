import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  X, 
  ShieldAlert, 
  CheckCircle, 
  Mail, 
  CreditCard, 
  RefreshCw, 
  Activity, 
  Scale,
  ArrowLeft
} from "lucide-react";

interface TermsOfUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsOfUseModal({ isOpen, onClose }: TermsOfUseModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="terms-of-use-modal-backdrop" 
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="terms-of-use-modal-content"
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
              <div className="p-2.5 bg-lime-500/10 border border-lime-500/20 rounded-2xl text-lime-400 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-lime-400">
                  Documento Legal & Termos
                </span>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-white">
                  Termos de Uso do Biker AI
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
              Bem-vindo ao <strong>Biker AI</strong>. Ao criar uma conta, acessar nossa plataforma ou utilizar nossos serviços de geração e acompanhamento de treinos de ciclismo, você concorda com os presentes Termos de Uso. Recomendamos a leitura atenta deste documento.
            </p>
          </div>

          {/* Sections List */}
          <div className="space-y-6 text-xs sm:text-sm leading-relaxed">
            
            {/* 1. Objeto */}
            <section className="space-y-2">
              <h3 className="text-sm sm:text-base font-heading font-extrabold text-white flex items-center gap-2">
                <span className="text-lime-400 font-mono">1.</span> Objeto da Plataforma
              </h3>
              <p className="text-slate-300">
                O Biker AI é um software web que oferece sugestões de planilhas semanais de treinamento para ciclismo, estruturação de sessões (minuto a minuto), acompanhamento de evolução física e assistência conversacional com base em inteligência artificial adaptativa.
              </p>
            </section>

            {/* 2. Isenção de Responsabilidade Médica (CRUCIAL) */}
            <section className="space-y-2.5 bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-amber-200">
              <div className="flex items-center gap-2 font-heading font-black text-amber-300 text-sm uppercase tracking-wide">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>2. Isenção de Responsabilidade Médica e de Saúde</span>
              </div>
              <p className="text-xs leading-relaxed text-amber-100/90">
                <strong>Atenção:</strong> O Biker AI e as rotinas sugeridas por seus algoritmos têm caráter estritamente esportivo e educacional. <strong>Não constituem recomendação médica, laudo clínico, diagnóstico ou prescrição de saúde individualizada.</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-amber-200/90">
                <li>O ciclismo é uma atividade de alta exigência cardiovascular e muscular. Antes de iniciar qualquer rotina de treinos intensos, você deve consultar um médico habilitado e obter liberação clínica.</li>
                <li>Caso sinta dores agudas, tonturas, palpitações, falta de ar anormal ou desconforto durante qualquer treino, interrompa imediatamente a atividade e procure assistência médica.</li>
                <li>Você assume voluntariamente os riscos inerentes à prática esportiva em vias públicas, trilhas ou rolos de treino indoor.</li>
              </ul>
            </section>

            {/* 3. Assinatura, Preço e Periodicidade */}
            <section className="space-y-2.5">
              <h3 className="text-sm sm:text-base font-heading font-extrabold text-white flex items-center gap-2">
                <span className="text-lime-400 font-mono">3.</span> Assinatura, Preço e Periodicidade
              </h3>
              <p className="text-slate-300">
                O acesso contínuo aos recursos completos do Biker AI é disponibilizado mediante assinatura do plano Pro:
              </p>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center text-white">
                  <span className="text-slate-400">Preço atual:</span>
                  <span className="text-lime-400 font-bold font-heading text-sm">R$ 16,90</span>
                </div>
                <div className="flex justify-between items-center text-white">
                  <span className="text-slate-400">Periodicidade de cobrança:</span>
                  <span>Mensal recorrente (a cada 30 dias)</span>
                </div>
                <div className="flex justify-between items-center text-white">
                  <span className="text-slate-400">Forma de pagamento:</span>
                  <span>Pix ou Cartão via Mercado Pago</span>
                </div>
              </div>
              <p className="text-slate-400 text-xs">
                O valor é cobrado em moeda corrente nacional (Reais - BRL). Eventuais alterações de preço serão previamente comunicadas por e-mail aos usuários ativos com no mínimo 30 dias de antecedência.
              </p>
            </section>

            {/* 4. Como Funciona o Cancelamento */}
            <section className="space-y-2.5 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              <h3 className="text-sm sm:text-base font-heading font-extrabold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-lime-400 shrink-0" />
                <span>4. Cancelamento sem Fidelidade ou Multas</span>
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Acreditamos na confiança e liberdade do atleta:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
                <li><strong>Cancele quando quiser:</strong> Não há período de fidelidade, carência ou taxa rescisória.</li>
                <li><strong>Como cancelar:</strong> O cancelamento da renovação pode ser realizado a qualquer instante diretamente na área de assinaturas do Mercado Pago ou enviando um e-mail simples para <strong className="text-lime-400">bikeraisupport@gmail.com</strong> solicitando o cancelamento.</li>
                <li><strong>Acesso até o fim do ciclo:</strong> Ao cancelar, você continuará tendo acesso completo a todas as funções e treinos até o último dia do período mensal que já foi faturado. Não haverá novas cobranças futuras.</li>
              </ul>
            </section>

            {/* 5. Garantia Incondicional de 7 Dias */}
            <section className="space-y-2">
              <h3 className="text-sm sm:text-base font-heading font-extrabold text-white flex items-center gap-2">
                <span className="text-lime-400 font-mono">5.</span> Direito de Arrependimento e Garantia de 7 Dias
              </h3>
              <p className="text-slate-300">
                Em conformidade com o artigo 49 do Código de Defesa do Consumidor, garantimos o direito de arrependimento em até <strong>7 (sete) dias corridos</strong> após a primeira adesão à assinatura. Caso solicite o reembolso dentro deste prazo enviando uma mensagem para <span className="text-lime-400">bikeraisupport@gmail.com</span>, devolveremos 100% do valor pago, sem qualquer burocracia.
              </p>
            </section>

            {/* 6. Responsabilidades do Usuário */}
            <section className="space-y-2">
              <h3 className="text-sm sm:text-base font-heading font-extrabold text-white flex items-center gap-2">
                <span className="text-lime-400 font-mono">6.</span> Cadastro e Responsabilidades do Atleta
              </h3>
              <p className="text-slate-300">
                Você se compromete a fornecer informações verdadeiras sobre seu nível de condicionamento, limitações articulares ou cardíacas e disponibilidade semanal para que as planilhas sejam calibradas de forma segura. Você é o único responsável pela guarda e confidencialidade de suas credenciais de acesso.
              </p>
            </section>

            {/* 7. Propriedade Intelectual */}
            <section className="space-y-2">
              <h3 className="text-sm sm:text-base font-heading font-extrabold text-white flex items-center gap-2">
                <span className="text-lime-400 font-mono">7.</span> Propriedade Intelectual
              </h3>
              <p className="text-slate-300">
                A marca Biker AI, código-fonte, algoritmos, logotipos e layouts visuais são de propriedade exclusiva do Biker AI. É concedida ao usuário uma licença pessoal, revogável, não transferível e não exclusiva para uso individual da plataforma.
              </p>
            </section>

            {/* 8. Suporte e Contato */}
            <section className="space-y-2 border-t border-slate-800 pt-4">
              <h3 className="text-sm sm:text-base font-heading font-extrabold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-lime-400" />
                <span>8. Canal Oficial de Atendimento</span>
              </h3>
              <p className="text-slate-300">
                Para qualquer esclarecimento sobre estes Termos, solicitações de cancelamento ou suporte técnico, entre em contato através do e-mail oficial:
              </p>
              <div className="inline-block p-3 rounded-xl bg-slate-950 border border-slate-800 text-lime-400 font-mono font-bold text-xs">
                bikeraisupport@gmail.com
              </div>
            </section>

          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
            >
              Compreendi e Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
