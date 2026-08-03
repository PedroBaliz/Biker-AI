import React, { useState } from "react";
import { UserProfile } from "../types";
import { 
  User, 
  CheckCircle2, 
  Activity, 
  TrendingUp, 
  Calendar, 
  Zap, 
  Clock, 
  Settings, 
  ChevronDown, 
  Sparkles, 
  Loader2 
} from "lucide-react";

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
  const [showAdvancedOnboarding, setShowAdvancedOnboarding] = useState(false);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-10 space-y-9 relative">
      {/* Step 1: Name Input */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-lime-400 font-mono font-black text-xs flex items-center justify-center shrink-0">1</span>
          <label className="text-xs sm:text-sm font-heading font-extrabold uppercase tracking-wider text-slate-800">
            Como podemos te chamar?
          </label>
        </div>
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <User className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            value={profile.name}
            onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Pedro, Camila, Rodrigo..."
            className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-slate-800 focus:ring-2 focus:ring-slate-900/10 rounded-2xl text-sm font-bold text-slate-800 transition-all outline-hidden shadow-2xs"
          />
        </div>
      </div>

      {/* Step 2: Level Chips */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-lime-400 font-mono font-black text-xs flex items-center justify-center shrink-0">2</span>
          <label className="text-xs sm:text-sm font-heading font-extrabold uppercase tracking-wider text-slate-800">
            Qual o seu nível de experiência no pedal?
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {[
            { id: "iniciante", title: "Iniciante", desc: "Recém no pedal (0 a 1 ano)" },
            { id: "intermediário", title: "Intermediário", desc: "Pedalo com frequência semanal" },
            { id: "avançado", title: "Avançado", desc: "Treinos fortes / Provas e eventos" },
          ].map((lvl) => {
            const isSelected = (profile.level || "intermediário") === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setProfile(prev => ({ ...prev, level: lvl.id }))}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 relative ${
                  isSelected
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg ring-2 ring-lime-400/40"
                    : "bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/90 text-slate-800"
                }`}
              >
                <div className="space-y-1 pr-2">
                  <div className="font-heading font-extrabold text-sm">{lvl.title}</div>
                  <div className={`text-[11px] leading-snug ${isSelected ? "text-slate-300 font-medium" : "text-slate-500"}`}>{lvl.desc}</div>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected ? "bg-lime-400 text-slate-950" : "border border-slate-300 text-transparent"
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Goal Chips */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-lime-400 font-mono font-black text-xs flex items-center justify-center shrink-0">3</span>
          <label className="text-xs sm:text-sm font-heading font-extrabold uppercase tracking-wider text-slate-800">
            Qual é seu objetivo principal no momento?
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: "melhorar condicionamento", title: "Condicionamento", desc: "Ganhar fôlego e resistência", icon: Activity },
            { id: "perder peso", title: "Emagrecer", desc: "Queimar calorias pedalando", icon: TrendingUp },
            { id: "completar um evento", title: "Evento / Prova", desc: "Desafio com data marcada", icon: Calendar },
            { id: "competir", title: "Performance", desc: "Aumentar velocidade e potência", icon: Zap },
          ].map((g) => {
            const isSelected = (profile.goal || "melhorar condicionamento") === g.id;
            const IconComp = g.icon;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setProfile(prev => ({ ...prev, goal: g.id }))}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg ring-2 ring-lime-400/40"
                    : "bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/90 text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-2 rounded-xl ${isSelected ? "bg-lime-400/10 text-lime-400" : "bg-slate-200/60 text-slate-600"}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    isSelected ? "bg-lime-400 text-slate-950" : "border border-slate-300 text-transparent"
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="font-heading font-extrabold text-xs sm:text-sm">{g.title}</div>
                  <div className={`text-[11px] leading-tight mt-0.5 ${isSelected ? "text-slate-300 font-medium" : "text-slate-500"}`}>{g.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 4 & 5: Availability & Duration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-lime-400 font-mono font-black text-xs flex items-center justify-center shrink-0">4</span>
            <label className="text-xs sm:text-sm font-heading font-extrabold uppercase tracking-wider text-slate-800">
              Dias disponíveis por semana
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {[2, 3, 4, 5, 6].map((days) => {
              const isSelected = (profile.daysPerWeek || 3) === days;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => setProfile(prev => ({ ...prev, daysPerWeek: days }))}
                  className={`px-4 py-3 rounded-xl font-heading font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 text-lime-400 shadow-md ring-2 ring-slate-900"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>{days} Dias</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-lime-400 font-mono font-black text-xs flex items-center justify-center shrink-0">5</span>
            <label className="text-xs sm:text-sm font-heading font-extrabold uppercase tracking-wider text-slate-800">
              Tempo médio por treino
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {[45, 60, 90, 120].map((mins) => {
              const isSelected = (profile.durationPerSession || 60) === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setProfile(prev => ({ ...prev, durationPerSession: mins }))}
                  className={`px-4 py-3 rounded-xl font-heading font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 text-lime-400 shadow-md ring-2 ring-slate-900"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{mins} min</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Optional Advanced Accordion */}
      <div className="pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowAdvancedOnboarding(prev => !prev)}
          className="text-xs font-extrabold text-slate-600 hover:text-slate-900 flex items-center gap-2 transition-colors cursor-pointer py-1"
        >
          <Settings className="w-4 h-4 text-slate-500" />
          <span>{showAdvancedOnboarding ? "Ocultar Ajustes Avançados" : "Ajustes Avançados Opcionais (Potência, FCmáx e Limitações)"}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedOnboarding ? "rotate-180" : ""}`} />
        </button>

        {showAdvancedOnboarding && (
          <div className="mt-4 p-5 bg-slate-50/90 rounded-2xl border border-slate-200/90 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Potência Base (FTP em Watts)
              </label>
              <input 
                type="number"
                value={profile.ftp || ""}
                onChange={(e) => setProfile(prev => ({ ...prev, ftp: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="Ex: 200 Watts"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Frequência Cardíaca Máxima (bpm)
              </label>
              <input 
                type="number"
                value={profile.maxHeartRate || ""}
                onChange={(e) => setProfile(prev => ({ ...prev, maxHeartRate: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="Ex: 185 bpm"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Dores ou Limitações Físicas Recentes
              </label>
              <input 
                type="text"
                value={profile.limitations}
                onChange={(e) => setProfile(prev => ({ ...prev, limitations: e.target.value }))}
                placeholder="Ex: Desconforto leve na lombar em treinos com mais de 2h..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 shadow-2xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Action Button & Micro-copy */}
      <div className="pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
        <button 
          onClick={onGeneratePlan}
          disabled={isGeneratingPlan}
          className="w-full max-w-xl bg-slate-900 hover:bg-slate-850 text-lime-400 font-heading font-black text-base sm:text-lg py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.005] active:scale-[0.995] transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
        >
          {isGeneratingPlan ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
              <span>Estruturando Sua Planilha com Inteligência...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-lime-400 animate-pulse" />
              <span>Gerar Minha Planilha Semanal Agora</span>
            </>
          )}
        </button>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-slate-400 font-sans font-medium">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-lime-500" />
            Metodologia Fisiológica 80/20
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-lime-500" />
            Sem Necessidade de Medidor de Potência
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-lime-500" />
            Ajustável Toda Semana
          </span>
        </div>
      </div>
    </div>
  );
};

export default OnboardingForm;
