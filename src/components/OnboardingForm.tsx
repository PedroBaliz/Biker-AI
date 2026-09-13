import React, { useState } from "react";
import { UserProfile } from "../types";
import { 
  Sparkles, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Target, 
  Activity, 
  Zap, 
  TrendingUp, 
  Trophy, 
  Clock, 
  Calendar, 
  Bike, 
  Navigation, 
  Check, 
  Flame
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OnboardingFormProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onGeneratePlan: () => void;
  isGeneratingPlan: boolean;
}

export const OnboardingForm: React.FC<OnboardingFormProps> = ({
  profile,
  setProfile,
  onGeneratePlan,
  isGeneratingPlan,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Defaults if not already set
  const selectedGoal = profile.goal || "aumentar resistência";
  const selectedLevel = profile.level || "iniciante";
  const selectedDays = profile.daysPerWeek || 3;
  const selectedDuration = profile.durationPerSession || 60;
  const selectedBike = profile.bikeType || "MTB";
  const selectedDistance = profile.avgDistance !== undefined && profile.avgDistance !== null ? profile.avgDistance : 25;

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
    } else {
      onGeneratePlan();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
      {/* Top Progress Bar */}
      <div className="bg-slate-900 text-white px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-lime-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
            {currentStep}
          </div>
          <div>
            <div className="text-xs font-black text-lime-400 uppercase tracking-widest">
              Etapa {currentStep} de 6
            </div>
            <div className="text-sm font-black text-white">
              {currentStep === 1 && "Qual é seu objetivo?"}
              {currentStep === 2 && "Qual seu nível?"}
              {currentStep === 3 && "Quantos dias por semana pode treinar?"}
              {currentStep === 4 && "Quanto tempo normalmente possui para cada treino?"}
              {currentStep === 5 && "Qual bicicleta utiliza?"}
              {currentStep === 6 && "Qual sua distância média atualmente?"}
            </div>
          </div>
        </div>

        {/* Visual Progress Dots / Bar */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {[1, 2, 3, 4, 5, 6].map(step => (
            <button
              key={step}
              type="button"
              onClick={() => step < currentStep && setCurrentStep(step)}
              className={`h-2 rounded-full transition-all duration-300 ${
                step === currentStep 
                  ? "w-8 bg-lime-400" 
                  : step < currentStep 
                    ? "w-4 bg-lime-500/50 hover:bg-lime-400 cursor-pointer" 
                    : "w-2 bg-slate-700"
              }`}
              title={`Ir para etapa ${step}`}
              aria-label={`Etapa ${step}`}
            />
          ))}
        </div>
      </div>

      {/* Step Content with Motion Animations */}
      <div className="p-6 sm:p-10 min-h-[380px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {/* ETAPA 1: Qual é seu objetivo? */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  1. Qual é seu objetivo?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  O treinador IA vai modular os treinos semanais com base na sua meta.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: "melhorar condicionamento",
                    label: "Melhorar condicionamento",
                    desc: "Ganhar fôlego, vitalidade e bem-estar",
                    icon: Activity
                  },
                  {
                    id: "aumentar resistência",
                    label: "Aumentar resistência",
                    desc: "Pedalar distâncias maiores sem cansar tanto",
                    icon: Target
                  },
                  {
                    id: "aumentar velocidade",
                    label: "Aumentar velocidade",
                    desc: "Evoluir ritmo médio, potência e subidas",
                    icon: Zap
                  },
                  {
                    id: "perder peso",
                    label: "Emagrecer",
                    desc: "Queima calórica eficiente com treinos balanceados",
                    icon: Flame
                  },
                  {
                    id: "preparar para uma prova",
                    label: "Preparar para uma prova",
                    desc: "Periodização para evento ou desafio com data marcada",
                    icon: Trophy,
                    colSpan: "sm:col-span-2"
                  }
                ].map((item) => {
                  const isSelected = selectedGoal.toLowerCase() === item.id.toLowerCase();
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setProfile(prev => ({ ...prev, goal: item.id as any }));
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        item.colSpan || ""
                      } ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-lime-400"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-lime-400 text-slate-950 font-bold" : "bg-white border border-slate-200 text-slate-700"
                        }`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm sm:text-base leading-tight">
                            {item.label}
                          </div>
                          <div className={`text-xs mt-0.5 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                            {item.desc}
                          </div>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-lime-400 text-slate-950" : "border border-slate-300 text-transparent"
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ETAPA 2: Qual seu nível? */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  2. Qual seu nível?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Isso define a curva de intensidade e os dias de recuperação biológica.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    id: "iniciante",
                    label: "Iniciante",
                    desc: "Começando no ciclismo ou retornando agora após um tempo parado",
                    badge: "Adaptação Aeróbica"
                  },
                  {
                    id: "intermediário",
                    label: "Intermediário",
                    desc: "Pedala com frequência semanal e já tem boa regularidade no fôlego",
                    badge: "Evolução & Limiar"
                  },
                  {
                    id: "avançado",
                    label: "Avançado",
                    desc: "Treina forte, faz treinos longos e busca alta performance",
                    badge: "Potência & VO2max"
                  }
                ].map((item) => {
                  const isSelected = (profile.level || "iniciante").toLowerCase() === item.id.toLowerCase();
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setProfile(prev => ({ ...prev, level: item.id as any }));
                      }}
                      className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-lime-400"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            isSelected ? "bg-lime-400 text-slate-950" : "bg-slate-200 text-slate-700"
                          }`}>
                            {item.badge}
                          </span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-lime-400 text-slate-950" : "border border-slate-300 text-transparent"
                          }`}>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        </div>
                        <h4 className="text-lg font-black">{item.label}</h4>
                        <p className={`text-xs leading-relaxed ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ETAPA 3: Quantos dias por semana pode treinar? */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  3. Quantos dias por semana pode treinar?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Os dias restantes serão programados como descanso biológico ou folga ativa.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { days: 2, label: "2 dias", sub: "Rotina corrida" },
                  { days: 3, label: "3 dias", sub: "Mais popular" },
                  { days: 4, label: "4 dias", sub: "Ótima constância" },
                  { days: 5, label: "5 dias", sub: "Alta dedicação" },
                  { days: 6, label: "6 dias", sub: "Atleta diário" },
                ].map((item) => {
                  const isSelected = selectedDays === item.days;
                  return (
                    <button
                      key={item.days}
                      type="button"
                      onClick={() => {
                        setProfile(prev => ({ ...prev, daysPerWeek: item.days }));
                      }}
                      className={`p-5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-lime-400"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                      }`}
                    >
                      <span className="text-2xl sm:text-3xl font-black">
                        {item.days}
                      </span>
                      <span className="text-xs font-bold block">
                        {item.label}
                      </span>
                      <span className={`text-[10px] ${isSelected ? "text-lime-400 font-bold" : "text-slate-400"}`}>
                        {item.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-lime-600 shrink-0" />
                <span>
                  Você selecionou <strong>{selectedDays} dias de treino</strong> por semana (e {7 - selectedDays} dias de descanso programado).
                </span>
              </div>
            </motion.div>
          )}

          {/* ETAPA 4: Quanto tempo normalmente possui para cada treino? */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  4. Quanto tempo normalmente possui para cada treino?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  A duração exata das sessões será ajustada à sua disponibilidade real.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {[
                  { minutes: 45, label: "45 min", tag: "Rápido & Eficiente" },
                  { minutes: 60, label: "1 hora", tag: "Ideal (60 min)" },
                  { minutes: 90, label: "1h30", tag: "Resistência (90 min)" },
                  { minutes: 120, label: "2 horas+", tag: "Volume Longo" }
                ].map((item) => {
                  const isSelected = selectedDuration === item.minutes;
                  return (
                    <button
                      key={item.minutes}
                      type="button"
                      onClick={() => {
                        setProfile(prev => ({ ...prev, durationPerSession: item.minutes }));
                      }}
                      className={`p-5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-lime-400"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                      }`}
                    >
                      <Clock className={`w-5 h-5 ${isSelected ? "text-lime-400" : "text-slate-400"}`} />
                      <span className="text-xl sm:text-2xl font-black">
                        {item.label}
                      </span>
                      <span className={`text-[10px] ${isSelected ? "text-lime-300 font-bold" : "text-slate-500"}`}>
                        {item.tag}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  Sessões planejadas com duração média de <strong>{selectedDuration} minutos</strong> por treino.
                </span>
              </div>
            </motion.div>
          )}

          {/* ETAPA 5: Qual bicicleta utiliza? */}
          {currentStep === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  5. Qual bicicleta utiliza?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Cada modalidade possui demandas específicas de cadência, terreno e esforço.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {[
                  {
                    id: "MTB",
                    title: "MTB",
                    desc: "Mountain Bike, trilhas e estradão de terra",
                    icon: Bike
                  },
                  {
                    id: "Speed",
                    title: "Speed",
                    desc: "Ciclismo de estrada, asfalto e velocidade",
                    icon: Zap
                  },
                  {
                    id: "Gravel",
                    title: "Gravel",
                    desc: "Misto entre asfalto, cascalho e terra",
                    icon: Navigation
                  },
                  {
                    id: "Urbana/Outra",
                    title: "Urbana / Outra",
                    desc: "Deslocamentos, ciclovia, spinning ou rolo",
                    icon: Activity
                  }
                ].map((item) => {
                  const isSelected = selectedBike.toLowerCase() === item.id.toLowerCase();
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setProfile(prev => ({ ...prev, bikeType: item.id }));
                      }}
                      className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-lime-400"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isSelected ? "bg-lime-400 text-slate-950 font-bold" : "bg-white border border-slate-200 text-slate-700"
                        }`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-lime-400 text-slate-950" : "border border-slate-300 text-transparent"
                        }`}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                      <div>
                        <div className="font-black text-base">{item.title}</div>
                        <div className={`text-[11px] leading-tight mt-1 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ETAPA 6: Qual sua distância média atualmente? */}
          {currentStep === 6 && (
            <motion.div
              key="step-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  6. Qual sua distância média atualmente?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Quanto você costuma pedalar em uma volta típica ou treino habitual.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {[
                  { km: 15, label: "Até 15 km", desc: "Voltas curtas / Início" },
                  { km: 25, label: "15 a 30 km", desc: "Média comum de pedal" },
                  { km: 45, label: "30 a 50 km", desc: "Pedais médios e fortes" },
                  { km: 70, label: "Mais de 50 km", desc: "Pedais longos / Provas" }
                ].map((item) => {
                  const isSelected = Number(selectedDistance) === item.km;
                  return (
                    <button
                      key={item.km}
                      type="button"
                      onClick={() => {
                        setProfile(prev => ({ ...prev, avgDistance: item.km }));
                      }}
                      className={`p-5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-lime-400"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                      }`}
                    >
                      <Navigation className={`w-5 h-5 ${isSelected ? "text-lime-400" : "text-slate-400"}`} />
                      <span className="text-base sm:text-lg font-black">
                        {item.label}
                      </span>
                      <span className={`text-[10px] ${isSelected ? "text-lime-300 font-bold" : "text-slate-500"}`}>
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Input livre para distância exata caso queira customizar */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700">
                  Ou digite sua quilometragem aproximada habitual:
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={profile.avgDistance || selectedDistance || ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : "";
                      setProfile(prev => ({ ...prev, avgDistance: val }));
                    }}
                    placeholder="Ex: 25"
                    className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 text-center outline-hidden focus:border-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-600">km / treino</span>
                </div>
              </div>

              {/* Resumo Final antes de Gerar */}
              <div className="p-4 rounded-2xl bg-lime-500/10 border border-lime-500/20 text-slate-900 space-y-1">
                <div className="flex items-center gap-2 text-xs font-black text-lime-700">
                  <CheckCircle2 className="w-4 h-4 text-lime-600" />
                  <span>Tudo pronto para criar sua semana sob medida!</span>
                </div>
                <p className="text-xs text-slate-600">
                  Objetivo: <strong>{selectedGoal}</strong> • Nível: <strong>{selectedLevel}</strong> • {selectedDays}x/semana • {selectedDuration}min • {selectedBike} • ≈{selectedDistance} km
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Controls: Voltar & Avançar / Gerar meu plano */}
        <div className="pt-8 border-t border-slate-100 flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isGeneratingPlan}
              className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-3">
            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-lime-400 font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Próxima etapa</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onGeneratePlan}
                disabled={isGeneratingPlan}
                className="px-8 py-3.5 bg-lime-400 hover:bg-lime-350 text-slate-950 font-black text-sm rounded-xl flex items-center gap-2.5 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPlan ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Gerando seu plano com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Gerar meu plano</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingForm;
