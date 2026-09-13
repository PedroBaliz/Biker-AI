import React, { useState } from "react";
import { Workout, UserProfile, isRestDay } from "../types";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  ChevronRight, 
  Calendar, 
  Bike, 
  Zap, 
  Sparkles, 
  Coffee, 
  ArrowRight,
  ShieldCheck,
  Flame,
  Info,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TodayWorkoutCardProps {
  workouts: Workout[];
  onUpdateWorkout: (index: number, updated: Workout) => void;
  onOpenFullWorkout: (index: number) => void;
  onOpenCompleteModal?: (index: number) => void;
  profile?: UserProfile;
  isSimpleMode?: boolean;
}

// Helpers
function getDayIndex(dayStr: string): number {
  if (!dayStr) return -1;
  const d = dayStr.toLowerCase();
  if (d.includes("segunda")) return 1;
  if (d.includes("terça") || d.includes("terca")) return 2;
  if (d.includes("quarta")) return 3;
  if (d.includes("quinta")) return 4;
  if (d.includes("sexta")) return 5;
  if (d.includes("sábado") || d.includes("sabado")) return 6;
  if (d.includes("domingo")) return 0;
  return -1;
}

function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours > 0 && remaining > 0) {
    return `${hours}h${remaining < 10 ? '0' : ''}${remaining}`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${remaining} min`;
}

function getZoneTag(zone: string): string {
  if (!zone || !zone.trim()) return "Zona 2";
  const z = zone.toUpperCase();
  if (z.includes("Z1") || z.includes("RECUPERAÇÃO") || z.includes("REGENERATIVO")) return "Zona 1";
  if (z.includes("Z2") || z.includes("ENDURANCE") || z.includes("RESISTÊNCIA")) return "Zona 2";
  if (z.includes("Z3") || z.includes("TEMPO") || z.includes("RITMO")) return "Zona 3";
  if (z.includes("Z4") || z.includes("LIMIAR") || z.includes("LACTATO") || z.includes("FTP")) return "Zona 4";
  if (z.includes("Z5") || z.includes("VO2") || z.includes("MÁXIMO")) return "Zona 5";
  if (z.includes("Z6") || z.includes("ANAERÓBICA")) return "Zona 6";
  if (z.includes("Z7") || z.includes("NEUROMUSCULAR")) return "Zona 7";
  return zone;
}

function estimateDistance(durationMin: number, type: string): number {
  if (!durationMin || durationMin <= 0) return 0;
  const hours = durationMin / 60;
  const t = (type || "").toLowerCase();
  let avgKmh = 25; // default moderate speed
  if (t.includes("recupera") || t.includes("regenerat")) avgKmh = 20;
  else if (t.includes("endurance") || t.includes("resist")) avgKmh = 26;
  else if (t.includes("interval") || t.includes("limiar") || t.includes("vo2")) avgKmh = 28;
  else if (t.includes("longo") || t.includes("pedal")) avgKmh = 25;
  return Math.round(hours * avgKmh);
}

export const TodayWorkoutCard: React.FC<TodayWorkoutCardProps> = ({
  workouts,
  onUpdateWorkout,
  onOpenFullWorkout,
  onOpenCompleteModal,
  profile,
  isSimpleMode = true
}) => {
  const [showQuickDetails, setShowQuickDetails] = useState(false);

  if (!workouts || workouts.length === 0) return null;

  // Find today's workout
  const todayDayOfWeek = new Date().getDay(); // 0 (Sun) to 6 (Sat)
  
  let todayIndex = workouts.findIndex(w => getDayIndex(w.day) === todayDayOfWeek);
  
  // Fallback: if not found by exact day, look for the first non-completed workout or default to 0
  if (todayIndex === -1) {
    const firstIncomplete = workouts.findIndex(w => !w.completed);
    todayIndex = firstIncomplete !== -1 ? firstIncomplete : 0;
  }

  const todayWorkout = workouts[todayIndex];
  const isRest = !todayWorkout || isRestDay(todayWorkout);

  // Find next upcoming non-rest workout (from tomorrow onwards or next in list)
  let nextWorkout: { workout: Workout; index: number } | null = null;
  for (let offset = 1; offset < workouts.length; offset++) {
    const checkIdx = (todayIndex + offset) % workouts.length;
    const candidate = workouts[checkIdx];
    if (candidate && !isRestDay(candidate)) {
      nextWorkout = { workout: candidate, index: checkIdx };
      break;
    }
  }

  const durationMin = todayWorkout?.duration || todayWorkout?.durationMinutes || 60;
  const formattedDur = formatMinutes(durationMin);
  const zoneTag = getZoneTag(todayWorkout?.targetZone || "");
  const approxKm = estimateDistance(durationMin, todayWorkout?.type || "");

  // Main type title
  const workoutTypeTitle = (todayWorkout?.type || "Endurance").toUpperCase();
  const workoutGoal = todayWorkout?.goal || "Desenvolver resistência aeróbica.";

  const handleToggleComplete = () => {
    if (!todayWorkout) return;
    if (todayWorkout.completed) {
      // Toggle back to incomplete
      onUpdateWorkout(todayIndex, {
        ...todayWorkout,
        completed: false,
        completedDate: undefined
      });
    } else {
      // If modal handler is provided, open the 5-question completion wizard
      if (onOpenCompleteModal) {
        onOpenCompleteModal(todayIndex);
      } else {
        onUpdateWorkout(todayIndex, {
          ...todayWorkout,
          completed: true,
          completedDate: new Date().toISOString().slice(0, 10)
        });
      }
    }
  };

  return (
    <div id="today-workout-hero-card" className="w-full">
      {/* REST DAY CARD */}
      {isRest ? (
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3.5 py-1.5 bg-emerald-400 text-slate-950 font-black text-xs rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5" />
                  Descanso
                </span>
                <span className="text-slate-400 text-xs font-bold font-mono">
                  {todayWorkout?.day || "Descanso Programado"}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                Hoje é dia de recuperação.
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                O descanso biológico é onde seu músculo e coração se reconstroem mais fortes. Mantenha boa hidratação, alimentação leve e sono reparador.
              </p>

              {/* Next Workout Preview if available */}
              {nextWorkout && (
                <div className="pt-2">
                  <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-400 flex items-center justify-center shrink-0">
                        <Bike className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-lime-400 uppercase tracking-wider block">
                          Próximo Treino • {nextWorkout.workout.day}
                        </span>
                        <div className="text-sm font-black text-white">
                          {nextWorkout.workout.type} ({formatMinutes(nextWorkout.workout.duration || 60)})
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenFullWorkout(nextWorkout!.index)}
                      className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      <span>Ver detalhes</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 shrink-0">
              {nextWorkout && (
                <button
                  type="button"
                  onClick={() => onOpenFullWorkout(nextWorkout!.index)}
                  className="px-6 py-3.5 bg-lime-400 hover:bg-lime-350 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Ver próximo treino</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE TODAY WORKOUT CARD */
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-lime-400/50 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Header: Badge & Day */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="px-3.5 py-1.5 bg-lime-400 text-slate-950 font-black text-xs rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 fill-slate-950" />
                  Treino de hoje
                </span>
                <span className="text-slate-400 text-xs font-bold font-mono">
                  {todayWorkout.day}
                </span>
              </div>

              {todayWorkout.completed && (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Concluído hoje
                </span>
              )}
            </div>

            {/* Main Big Spec Grid: ENDURANCE | 1h20 | Zona 2 | ≈ 35 km */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 py-2 border-y border-slate-800/80">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">
                  Tipo
                </span>
                <div className="text-lg sm:text-xl font-black text-lime-400 truncate tracking-tight">
                  {workoutTypeTitle}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">
                  Duração
                </span>
                <div className="text-lg sm:text-xl font-black text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{formattedDur}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">
                  Intensidade
                </span>
                <div className="text-lg sm:text-xl font-black text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{zoneTag}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">
                  Distância Est.
                </span>
                <div className="text-lg sm:text-xl font-black text-white flex items-center gap-1.5">
                  <Bike className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>≈ {approxKm} km</span>
                </div>
              </div>
            </div>

            {/* Objetivo */}
            <div className="space-y-1.5 max-w-3xl">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                Objetivo:
              </span>
              <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
                "{workoutGoal}"
              </p>
            </div>

            {/* Collapsible Fast Structure preview */}
            {todayWorkout.structure && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowQuickDetails(prev => !prev)}
                  className="text-xs font-bold text-lime-400 hover:text-lime-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{showQuickDetails ? "Ocultar estrutura de blocos" : "Ver estrutura rápida do treino"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showQuickDetails ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showQuickDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-2"
                    >
                      <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 font-mono leading-relaxed">
                        {todayWorkout.structure}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Actions: "Ver treino completo" & "Marcar como concluído" */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                id="today-workout-see-full-btn"
                onClick={() => onOpenFullWorkout(todayIndex)}
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-750 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700/80 shadow-md cursor-pointer hover:border-slate-600"
              >
                <span>Ver treino completo</span>
                <ChevronRight className="w-4 h-4 text-lime-400" />
              </button>

              <button
                type="button"
                id="today-workout-toggle-complete-btn"
                onClick={handleToggleComplete}
                className={`px-6 py-3.5 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                  todayWorkout.completed
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-lime-400 hover:bg-lime-350 text-slate-950 shadow-lime-500/10"
                }`}
              >
                {todayWorkout.completed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                    <span>Concluído! (Clique para desmarcar)</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4 stroke-[2.5]" />
                    <span>Concluir treino</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayWorkoutCard;
