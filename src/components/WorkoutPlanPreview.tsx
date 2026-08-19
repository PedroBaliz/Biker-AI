import React from "react";
import { TrainingPlan, UserProfile, isRestDay, formatGoal, formatLevel } from "../types";
import { motion } from "motion/react";
import { 
  Lock, 
  Zap, 
  CheckCircle, 
  Calendar, 
  Clock, 
  Bike, 
  Activity, 
  Sparkles, 
  ShieldCheck,
  ChevronRight,
  Flame,
  Unlock
} from "lucide-react";

interface WorkoutPlanPreviewProps {
  plan: TrainingPlan;
  profile: UserProfile;
  onUnlockClick: () => void;
}

export default function WorkoutPlanPreview({ plan, profile, onUnlockClick }: WorkoutPlanPreviewProps) {
  const activeWorkouts = plan.workouts ? plan.workouts.filter(w => !isRestDay(w)).length : 0;
  const totalMinutes = plan.workouts ? plan.workouts.reduce((acc, w) => acc + (w.duration || 0), 0) : 0;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const volumeFormatted = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}min` : ""}` : `${mins}min`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 rounded-3xl border border-slate-800 p-6 md:p-8 text-white shadow-xl relative overflow-hidden mb-8"
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-lime-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 space-y-6">
        {/* Top Lock Badge & Title */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full">
              <Lock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Preview da Planilha Personalizada</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black font-heading tracking-tight text-white flex items-center gap-2 mt-2">
              Biker AI <span className="text-lime-400">Preview Desbloqueado</span>
            </h2>
            <p className="text-xs text-slate-300 font-sans max-w-2xl leading-relaxed">
              Sua planilha foi calculada com sucesso pela nossa IA fisiológica para o atleta <strong className="text-white">{profile.name || "Ciclista"}</strong>. Confira o resumo e a lista de treinos abaixo.
            </p>
          </div>

          <button
            onClick={onUnlockClick}
            className="bg-linear-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 active:scale-98 text-slate-950 font-black font-heading text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-lime-500/20 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Unlock className="w-4 h-4 fill-slate-950" />
            <span>Desbloquear Plano Completo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Total de Treinos</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-heading text-lime-400">{activeWorkouts}</span>
              <span className="text-xs text-slate-400 font-sans">treinos na semana</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Volume Total Estimado</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-heading text-lime-400">{volumeFormatted}</span>
              <span className="text-xs text-slate-400 font-sans">na semana</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Nível & Objetivo</span>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-200 block">{formatLevel(profile.level)}</span>
              <span className="text-[10.5px] text-slate-400 block break-words line-clamp-2 leading-snug">{formatGoal(profile.goal)}</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Status do Conteúdo</span>
            <div className="mt-2 flex items-center gap-1.5 text-amber-400 font-bold text-xs">
              <Lock className="w-3.5 h-3.5" />
              <span>Detalhes Bloqueados</span>
            </div>
          </div>
        </div>

        {/* What is Visible vs What is Locked Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs font-sans">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold font-heading">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Liberado no Preview Gratuito</span>
            </div>
            <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
              <li>Nome e tipo de cada treino (ex: Intervalado VO2max, Rolo)</li>
              <li>Dia da semana e duração exata em minutos</li>
              <li>Zona fisiológica alvo (ex: Z4 Limiar de Lactato)</li>
            </ul>
          </div>

          <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold font-heading">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Liberado após a Assinatura</span>
            </div>
            <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
              <li>Estrutura minuto a minuto (% FTP, cadência e séries)</li>
              <li>Instruções detalhadas de aquecimento e volta à calma</li>
              <li>Dicas fisiológicas e nutricionais do treinador para cada treino</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
